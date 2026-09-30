import { Router, Response } from 'express';
import { db } from '../db.js';
import { properties, agents, blogPosts, users, constructionProjects } from '../schema.js';
import { and, count, desc, eq, inArray, ne, asc } from 'drizzle-orm';
import { mapProjectFromApi } from '../../src/lib/projects.ts';
import { toPublicTeamMember } from '../utils/adminProfile.js';
import { recordPropertyView } from '../services/propertyViews.js';
import { STAFF_ROLES, isStaffRole } from '../permissions.js';
import { optionalAuth, type AuthRequest } from '../middleware/auth.js';
import { toPublicAddress } from '../lib/publicAddress.js';

const router = Router();

type PropertyRow = typeof properties.$inferSelect;

/**
 * Only approved listings exist as far as the public site is concerned.
 * Member submissions sit at 'pending' until staff signs them off.
 */
const publiclyVisible = and(
  eq(properties.moderationStatus, 'approved'),
  ne(properties.lifecycleState, 'old'),
);

/**
 * Admin-only columns are stripped here — owner records, agreements, private
 * notes and held-back photos must never reach the public API. Listings that
 * opt out of `showAddress` also lose the exact building number.
 */
function toPublic(row: PropertyRow, _viewerRole?: string) {
  const {
    owner: _owner,
    contracts: _contracts,
    internalNotes: _internalNotes,
    hiddenImages: _hiddenImages,
    agentTaxId: _agentTaxId,
    invoiceRef: _invoiceRef,
    lifecycleNote: _lifecycleNote,
    lifecycleOutcome: _lifecycleOutcome,
    lifecycleDealPrice: _lifecycleDealPrice,
    cadastralCode,
    cadastralRegistry: _cadastralRegistry,
    moderationStatus: _moderationStatus,
    moderationNote: _moderationNote,
    moderatedByUserId: _moderatedByUserId,
    moderatedAt: _moderatedAt,
    moderationRequestedAt: _moderationRequestedAt,
    moderationChecklist: _moderationChecklist,
    createdByUserId: _createdByUserId,
    assignedToUserId: _assignedToUserId,
    assignedByUserId: _assignedByUserId,
    assignedAt: _assignedAt,
    source: _source,
    sourceUrl: _sourceUrl,
    sourceId: _sourceId,
    placement: _placement,
    placementPackage: _placementPackage,
    lastCallAt: _lastCallAt,
    lastCallOutcome: _lastCallOutcome,
    nextFollowUpAt: _nextFollowUpAt,
    touchedAt: _touchedAt,
    touchedByUserId: _touchedByUserId,
    touchedByName: _touchedByName,
    touchAction: _touchAction,
    ...pub
  } = row;

  pub.address = toPublicAddress(pub.address, pub.showAddress, pub.district, pub.city)
    || [pub.district, pub.city].filter(Boolean).join(', ');

  if (pub.showCadastral && cadastralCode) {
    return { ...pub, cadastralCode };
  }

  return pub;
}

router.get('/stats/counts', async (_req, res: Response): Promise<void> => {
  try {
    const [propCount] = await db.select({ count: count() }).from(properties).where(publiclyVisible);
    const [agentCount] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.isActive, true));
    const [blogCount] = await db
      .select({ count: count() })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));

    res.json({
      properties: Number(propCount.count),
      agents: Number(agentCount.count),
      blog: Number(blogCount.count),
    });
  } catch (err) {
    console.error('Public counts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties', async (req, res: Response): Promise<void> => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '500'))));
    const data = await db
      .select()
      .from(properties)
      .where(publiclyVisible)
      .orderBy(desc(properties.createdAt))
      .limit(limit);

    const [total] = await db.select({ count: count() }).from(properties).where(publiclyVisible);
    res.json({ data: data.map(toPublic), total: Number(total.count) });
  } catch (err) {
    console.error('Public properties error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Staff preview archived / pending listings from the admin (same public fields only).
    const staffViewer = isStaffRole(req.user?.role ?? '');
    const [property] = await db
      .select()
      .from(properties)
      .where(staffViewer
        ? eq(properties.id, String(req.params.id))
        : and(eq(properties.id, String(req.params.id)), publiclyVisible));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const hidden = property.moderationStatus !== 'approved' || property.lifecycleState === 'old';
    if (hidden) {
      res.json(toPublic(property, req.user?.role));
      return;
    }

    const sessionKey = req.headers['x-view-session'] ?? req.query.sid;
    const { viewCount } = await recordPropertyView(
      property.id,
      sessionKey,
      property.viewCount ?? 0,
    );

    res.json({ ...toPublic(property, req.user?.role), viewCount });
  } catch (err) {
    console.error('Public property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/agents', async (_req, res: Response): Promise<void> => {
  try {
    const data = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(desc(agents.createdAt));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Public agents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Admins who opted into "show on frontend". Names stay hidden unless the toggle is on.
 * DOB and email are never included.
 */
router.get('/team', async (_req, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        dateOfBirth: users.dateOfBirth,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        jobTitle: users.jobTitle,
        bio: users.bio,
        showOnFrontend: users.showOnFrontend,
        role: users.role,
      })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        eq(users.showOnFrontend, true),
        // Registered members never appear on the team page, only staff.
        inArray(users.role, STAFF_ROLES),
      ))
      .orderBy(users.firstName);

    const data = rows.map(toPublicTeamMember).filter(Boolean);
    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Public team error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/agents/:id', async (req, res: Response): Promise<void> => {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, req.params.id), eq(agents.isActive, true)));

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (err) {
    console.error('Public agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blog', async (_req, res: Response): Promise<void> => {
  try {
    const data = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishDate));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Public blog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blog/:id', async (req, res: Response): Promise<void> => {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, req.params.id), eq(blogPosts.isPublished, true)));

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json(post);
  } catch (err) {
    console.error('Public blog post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/projects', async (_req, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(constructionProjects)
      .where(eq(constructionProjects.published, true))
      .orderBy(asc(constructionProjects.sortOrder), desc(constructionProjects.createdAt));
    res.json({
      data: rows.map(row => {
        const mapped = mapProjectFromApi(row as unknown as Record<string, unknown>);
        return { ...mapped, projectUnits: [] };
      }),
    });
  } catch (err) {
    console.error('Public projects list error:', err);
    res.status(500).json({ error: 'პროექტები ვერ ჩაიტვირთა' });
  }
});

router.get('/projects/:slug', async (req, res: Response): Promise<void> => {
  try {
    const slug = String(req.params.slug || '').trim();
    const [row] = await db.select().from(constructionProjects)
      .where(and(eq(constructionProjects.slug, slug), eq(constructionProjects.published, true)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'პროექტი ვერ მოიძებნა' });
      return;
    }
    res.json(mapProjectFromApi(row as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('Public project get error:', err);
    res.status(500).json({ error: 'პროექტი ვერ ჩაიტვირთა' });
  }
});

export default router;
