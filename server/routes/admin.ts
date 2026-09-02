import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import {
  properties, propertyPriceHistory, users, agents, blogPosts, siteSettings,
  rolePermissions, activityLog,
  type PropertyOwner, type PropertyContract, type InternalNote,
} from '../schema.js';
import { activeProvider, translateFromGeorgian, type TargetLang } from '../services/translate.js';
import { eq, desc, count, sql, inArray, and, ne, or, ilike, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  listingOrigin,
  normalizePlacement,
  normalizePlacementPackage,
} from '../lib/listingMeta.js';
import {
  requireStaff,
  requirePermission,
  invalidateRoleTemplates,
  ADMIN_ONLY_MESSAGE,
  AuthRequest,
} from '../middleware/auth.js';
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_DEFAULT_SCOPE,
  STAFF_ROLES,
  type PermissionActor,
  type Role,
  can,
  canManageUser,
  effectivePermissions,
  filterGrantablePermissions,
  forbiddenListingFields,
  isAdminOrAbove,
  isPermissionKey,
  isRole,
  isStaffRole,
  sanitizeListingFor,
} from '../permissions.js';
import { nanoid } from '../utils.js';
import { allocateListingId } from '../services/listingId.js';
import { monthlyActivitySeries } from '../services/propertyViews.js';
import {
  ImportError,
  auditImport,
  classifyImportError,
  importListingFromUrl,
} from '../services/listingImport.js';
import {
  linkImportToListing,
  recordImportFailure,
  recordImportSuccess,
} from '../services/importQuality.js';
import {
  buildLifecycleFields,
  recordPriceChange,
  refreshExpiredRentals,
  type PriceSource,
} from '../services/listingLifecycle.js';
import { offerCountsForProperties } from '../services/propertyOffers.js';
import { buildDisplayName, profileFieldsFromBody, splitLegacyName } from '../utils/adminProfile.js';

const router = Router();

const listingCreator = alias(users, 'listing_creator');
const listingAssignee = alias(users, 'listing_assignee');

/** Who to credit for an edit in the price history. */
function editorName(req: AuthRequest): string {
  return req.user?.name || req.user?.email || 'admin';
}

/** Short name for the agent column — firstName (e.g. თეო) when set. */
function staffAgentName(actor: PermissionActor | undefined | null): string {
  if (!actor) return '';
  return (actor.firstName || actor.name || '').trim();
}

function nonempty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function priceSource(value: unknown): PriceSource {
  return value === 'import' || value === 'system' ? value : 'admin';
}

/** Fields that are plain pass-through on create and update. */
function ownerFrom(value: unknown): PropertyOwner | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const owner: PropertyOwner = {};
  for (const key of ['name', 'phone', 'email', 'idNumber', 'address', 'note'] as const) {
    const field = raw[key];
    if (typeof field === 'string' && field.trim()) owner[key] = field.trim().slice(0, 500);
  }
  return Object.keys(owner).length > 0 ? owner : null;
}

function contractsFrom(value: unknown, editor: string): PropertyContract[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item): PropertyContract => ({
      id: typeof item.id === 'string' && item.id ? item.id : `c${nanoid(6)}`,
      title: String(item.title ?? 'ხელშეკრულება').slice(0, 200),
      url: String(item.url ?? '').slice(0, 600),
      kind: item.kind === 'pdf' || item.kind === 'image' ? item.kind : 'link',
      addedAt: typeof item.addedAt === 'string' ? item.addedAt : new Date().toISOString(),
      addedBy: typeof item.addedBy === 'string' ? item.addedBy : editor,
    }))
    .filter(contract => contract.url);
}

function notesFrom(value: unknown, editor: string): InternalNote[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map(item => ({
      id: typeof item.id === 'string' && item.id ? item.id : `n${nanoid(6)}`,
      text: String(item.text ?? '').slice(0, 4000),
      author: typeof item.author === 'string' ? item.author : editor,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    }))
    .filter(note => note.text.trim());
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

/** Attaches the recent price edits of each listing so the table can show the delta. */
async function withPriceHistory<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return [] as (T & { priceHistory: unknown[] })[];

  const changes = await db
    .select()
    .from(propertyPriceHistory)
    .where(inArray(propertyPriceHistory.propertyId, rows.map(row => row.id)))
    .orderBy(desc(propertyPriceHistory.createdAt));

  const byProperty = new Map<string, typeof changes>();
  for (const change of changes) {
    const list = byProperty.get(change.propertyId);
    if (list) list.push(change);
    else byProperty.set(change.propertyId, [change]);
  }

  return rows.map(row => ({ ...row, priceHistory: (byProperty.get(row.id) ?? []).slice(0, 8) }));
}

/* ── Scope, sanitization and audit ───────────────────────────────────────── */

/**
 * `own` scope no longer hides the listing table. Brokers see the whole base;
 * owner phone / email are stripped in sanitizeListingFor unless the row is
 * theirs. Dashboard widgets still use this condition so personal KPIs stay
 * about their own book.
 *
 * Write access stays with the creator (or anyone on `all` scope).
 */
function portfolioCondition(actor: PermissionActor) {
  return actor.scope === 'own'
    ? or(eq(properties.createdByUserId, actor.id), eq(properties.assignedToUserId, actor.id))
    : undefined;
}

type ScopedListing = { createdByUserId: number | null; assignedToUserId?: number | null };

/** Write access: the creator, or anyone whose scope is not restricted. */
function canEditListing(actor: PermissionActor, listing: ScopedListing): boolean {
  return actor.scope !== 'own' || listing.createdByUserId === actor.id;
}

/** Strips owner PII / contracts / notes / billing the actor is not cleared for. */
function clean<T extends Record<string, unknown>>(req: AuthRequest, listing: T): T {
  return sanitizeListingFor(req.user, listing);
}

function cleanAll<T extends Record<string, unknown>>(req: AuthRequest, rows: T[]): T[] {
  return rows.map(row => clean(req, row));
}

/**
 * Rejects a body that tries to write a private field the actor cannot see.
 * Returns true when the request was already answered.
 */
function blockedPrivateWrite(req: AuthRequest, res: Response): boolean {
  const forbidden = forbiddenListingFields(req.user).filter(field => field in req.body);
  if (!forbidden.length) return false;
  res.status(403).json({ error: 'ამ ველების შეცვლის უფლება არ გაქვთ', fields: forbidden });
  return true;
}

async function logActivity(
  req: AuthRequest,
  action: string,
  entity: string,
  entityId: string | number | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(activityLog).values({
      actorUserId: req.user?.id ?? null,
      actorName: req.user?.name ?? null,
      action,
      entity,
      entityId: entityId === null ? null : String(entityId),
      meta,
    });
  } catch (err) {
    // Never let the audit trail break the operation it is recording.
    console.error('Activity log error:', err);
  }
}

// Every admin route needs a staff account; individual routes add their permission.
router.use(requireStaff);

// ─── IMPORT LISTING FROM EXTERNAL URL ───────────────────────────────────────────

/**
 * Parses an external ad and records the attempt either way. `retryOf` links a
 * re-run back to the attempt it came from so the report can tell a flapping source
 * from a permanently broken one.
 */
export async function runImport(
  req: AuthRequest,
  res: Response,
  url: string,
  retryOfId: number | null,
): Promise<void> {
  const actor = { id: req.user?.id ?? null, name: req.user?.name ?? null };
  const startedAt = Date.now();

  try {
    const data = await importListingFromUrl(url);
    const audit = auditImport(data);
    const attemptId = await recordImportSuccess({
      url,
      actor,
      durationMs: Date.now() - startedAt,
      retryOfId,
      data,
      quality: audit.quality,
      missingFields: audit.missingFields,
      warnings: audit.warnings,
    });
    await logActivity(req, 'listing.import', 'import', attemptId, {
      source: data.source,
      status: audit.quality,
      missing: audit.missingFields,
    });
    res.json({ ...data, attemptId });
  } catch (err) {
    const { code, message } = classifyImportError(err);
    const source = err instanceof ImportError ? err.source : 'unknown';
    const attemptId = await recordImportFailure({
      url,
      actor,
      durationMs: Date.now() - startedAt,
      retryOfId,
      source,
      code,
      message,
    });
    await logActivity(req, 'listing.import.fail', 'import', attemptId, { source, code });
    res.status(400).json({ error: message, code, attemptId });
  }
}

router.post('/import-listing', requirePermission('listings.import'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { url } = req.body as { url?: string };
  if (!url?.trim()) {
    res.status(400).json({ error: 'URL სავალდებულოა' });
    return;
  }
  await runImport(req, res, url.trim(), null);
});

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────────

router.get('/stats', requirePermission('dashboard.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await refreshExpiredRentals();

    const actor = req.user!;
    const mine = portfolioCondition(actor);
    const ownerId = actor.scope === 'own' ? actor.id : null;

    const [propCount] = await db.select({ count: count() }).from(properties).where(mine);
    const [blogCount] = await db.select({ count: count() }).from(blogPosts);
    const [staffCount] = await db
      .select({ count: count() })
      .from(users)
      .where(inArray(users.role, STAFF_ROLES));
    const [memberCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.role, 'user'));
    const [pendingCount] = await db
      .select({ count: count() })
      .from(properties)
      .where(eq(properties.moderationStatus, 'pending'));

    const totalViews = await db
      .select({ total: sql<number>`COALESCE(SUM(view_count), 0)` })
      .from(properties)
      .where(mine);

    const recentProperties = await db
      .select()
      .from(properties)
      .where(mine)
      .orderBy(desc(properties.createdAt))
      .limit(5);

    const lifecycleRows = await db
      .select({ state: properties.lifecycleState, count: count() })
      .from(properties)
      .where(mine)
      .groupBy(properties.lifecycleState);

    const lifecycle = { new: 0, current: 0, old: 0, new_r: 0 } as Record<string, number>;
    for (const row of lifecycleRows) {
      lifecycle[row.state ?? 'new'] = Number(row.count);
    }

    // Rentals whose term ends within a month — worth a call before they free up.
    const [freeingSoon] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(
        sql`lifecycle_state = 'old' AND rent_expires_at IS NOT NULL
            AND rent_expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'`,
        mine,
      ));

    const monthly = await monthlyActivitySeries(ownerId);

    res.json({
      properties: Number(propCount.count),
      agents: await countBrokerPanel(),
      blogPosts: Number(blogCount.count),
      adminUsers: Number(staffCount.count),
      members: Number(memberCount.count),
      pendingModeration: can(actor, 'listings.moderate') ? Number(pendingCount.count) : 0,
      totalViews: Number(totalViews[0]?.total ?? 0),
      recentProperties: cleanAll(req, recentProperties),
      lifecycle,
      needsCall: lifecycle.new_r ?? 0,
      freeingSoon: Number(freeingSoon?.count ?? 0),
      monthly,
      scope: actor.scope,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PROPERTIES ────────────────────────────────────────────────────────────────

router.get('/properties', requirePermission('listings.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await refreshExpiredRentals();

    const page = Math.max(1, parseInt(String(req.query.page ?? '1')) || 1);
    const limit = Math.min(200, parseInt(String(req.query.limit ?? '20')) || 20);
    const offset = (page - 1) * limit;
    const conditions: SQL[] = [];

    const staffId = Number(req.query.staffId);
    if (Number.isFinite(staffId) && staffId > 0) {
      conditions.push(or(
        eq(properties.createdByUserId, staffId),
        eq(properties.assignedToUserId, staffId),
      ));
    }

    const memberQ = typeof req.query.member === 'string' ? req.query.member.trim().slice(0, 80) : '';
    if (memberQ) {
      const fuzzy = `%${memberQ}%`;
      const members = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          eq(users.role, 'user'),
          or(
            ilike(users.name, fuzzy),
            ilike(users.firstName, fuzzy),
            ilike(users.lastName, fuzzy),
            ilike(users.phone, fuzzy),
            ilike(users.email, fuzzy),
          ),
        ))
        .limit(50);
      if (members.length === 0) {
        res.json({
          data: [],
          total: 0,
          page,
          limit,
          summary: { total: 0, sale: 0, rent: 0, new: 0, current: 0, old: 0, new_r: 0 },
        });
        return;
      }
      conditions.push(inArray(properties.createdByUserId, members.map(row => row.id)));
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    if (q) {
      const fuzzy = `%${q}%`;
      conditions.push(or(
        eq(properties.id, q),
        ilike(properties.title, fuzzy),
        ilike(properties.address, fuzzy),
        ilike(properties.district, fuzzy),
        ilike(properties.city, fuzzy),
        sql`coalesce(${properties.owner}->>'name','') ILIKE ${fuzzy}`,
        sql`coalesce(${properties.owner}->>'phone','') ILIKE ${fuzzy}`,
      ));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const all = await db
      .select({
        property: properties,
        creatorName: listingCreator.name,
        creatorFirstName: listingCreator.firstName,
        creatorPhone: listingCreator.phone,
        creatorEmail: listingCreator.email,
        creatorRole: listingCreator.role,
        assigneeName: listingAssignee.name,
        assigneeFirstName: listingAssignee.firstName,
        assigneeRole: listingAssignee.role,
        assigneeJobTitle: listingAssignee.jobTitle,
      })
      .from(properties)
      .leftJoin(listingCreator, eq(listingCreator.id, properties.createdByUserId))
      .leftJoin(listingAssignee, eq(listingAssignee.id, properties.assignedToUserId))
      .where(where)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(properties).where(where);

    const grouped = await db
      .select({
        lifecycleState: properties.lifecycleState,
        status: properties.status,
        n: count(),
      })
      .from(properties)
      .where(where)
      .groupBy(properties.lifecycleState, properties.status);

    const summary = { total: 0, sale: 0, rent: 0, new: 0, current: 0, old: 0, new_r: 0 };
    for (const row of grouped) {
      const n = Number(row.n);
      summary.total += n;
      if (row.status === 'sale' || row.status === 'both') summary.sale += n;
      if (row.status === 'rent' || row.status === 'both') summary.rent += n;
      if (row.lifecycleState === 'new') summary.new += n;
      else if (row.lifecycleState === 'current') summary.current += n;
      else if (row.lifecycleState === 'old') summary.old += n;
      else if (row.lifecycleState === 'new_r') summary.new_r += n;
    }

    const editable = new Map(all.map(row => [row.property.id, canEditListing(req.user!, row.property)]));
    const offerCounts = await offerCountsForProperties(all.map(row => row.property.id));

    const enriched = all.map(row => {
      const { property, creatorName, creatorFirstName, creatorPhone, creatorEmail, creatorRole,
        assigneeName, assigneeFirstName, assigneeRole, assigneeJobTitle } = row;
      const creatorLabel = (creatorFirstName || creatorName || '').trim();
      const staffLabel = (assigneeFirstName || assigneeName || creatorLabel).trim();
      return {
        ...property,
        agentName: nonempty(property.agentName) || creatorLabel || null,
        agentPhone: nonempty(property.agentPhone) || creatorPhone || null,
        agentEmail: nonempty(property.agentEmail) || creatorEmail || null,
        staffName: staffLabel || null,
        staffRole: assigneeRole || creatorRole || null,
        staffJobTitle: assigneeJobTitle || null,
        creatorRole: creatorRole || null,
        origin: listingOrigin({
          source: property.source,
          sourceUrl: property.sourceUrl,
          creatorRole,
        }),
      };
    });

    res.json({
      data: cleanAll(req, await withPriceHistory(enriched)).map(row => ({
        ...row,
        canEdit: editable.get(row.id as string) ?? true,
        offersLast30Days: offerCounts.get(row.id)?.offersLast30Days ?? 0,
        offersLast60Days: offerCounts.get(row.id)?.offersLast60Days ?? 0,
      })),
      total: Number(total.count),
      page,
      limit,
      summary,
    });
  } catch (err) {
    console.error('Properties list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Staff names for the portfolio filter — listings.view is enough. */
router.get('/listing-staff', requirePermission('listings.view'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        jobTitle: users.jobTitle,
      })
      .from(users)
      .where(and(inArray(users.role, [...STAFF_ROLES]), eq(users.isActive, true)))
      .orderBy(users.name);

    res.json(rows.map(row => ({
      id: row.id,
      name: (row.firstName || row.name || '').trim(),
      fullName: row.name,
      role: row.role,
      jobTitle: row.jobTitle,
    })));
  } catch (err) {
    console.error('Listing staff error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Member submissions waiting for a decision. */
router.get('/moderation', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const allowed = ['pending', 'rejected', 'approved', 'draft'];

    const rows = await db
      .select({
        property: properties,
        submitterName: users.name,
        submitterEmail: users.email,
        submitterPhone: users.phone,
      })
      .from(properties)
      .leftJoin(users, eq(users.id, properties.createdByUserId))
      .where(eq(properties.moderationStatus, allowed.includes(status) ? status : 'pending'))
      .orderBy(desc(properties.createdAt))
      .limit(200);

    res.json({
      data: rows.map(row => ({
        ...clean(req, row.property),
        submitter: row.submitterName
          ? { name: row.submitterName, email: row.submitterEmail, phone: row.submitterPhone }
          : null,
      })),
    });
  } catch (err) {
    console.error('Moderation list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', requirePermission('listings.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const [withHistory] = await withPriceHistory([property]);
    let creatorRole: string | null = null;
    if (property.createdByUserId) {
      const [creator] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, property.createdByUserId))
        .limit(1);
      creatorRole = creator?.role ?? null;
    }
    res.json({
      ...clean(req, withHistory),
      canEdit: canEditListing(req.user!, property),
      origin: listingOrigin({
        source: property.source,
        sourceUrl: property.sourceUrl,
        creatorRole,
      }),
    });
  } catch (err) {
    console.error('Property get error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id/price-history', requirePermission('listings.price'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [property] = await db
      .select({ createdByUserId: properties.createdByUserId })
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const history = await db
      .select()
      .from(propertyPriceHistory)
      .where(eq(propertyPriceHistory.propertyId, String(req.params.id)))
      .orderBy(desc(propertyPriceHistory.createdAt))
      .limit(50);

    res.json({ data: history });
  } catch (err) {
    console.error('Price history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/properties', requirePermission('listings.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (blockedPrivateWrite(req, res)) return;

    const id = await allocateListingId();
    const data = req.body;
    const lifecycle = buildLifecycleFields({
      ...data,
      lifecycleState: 'current',
      lifecycleOutcome: null,
    });
    const canFlag = can(req.user, 'listings.flags');

    const [created] = await db
      .insert(properties)
      .values({
        id,
        title: data.title,
        description: data.description,
        descriptionEn: data.descriptionEn || null,
        descriptionRu: data.descriptionRu || null,
        price: data.price,
        rentPrice: data.rentPrice ?? null,
        pricePerSqm: data.pricePerSqm,
        address: data.address,
        city: data.city || 'თბილისი',
        district: data.district,
        type: data.type || 'apartment',
        status: data.status || 'sale',
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        floor: data.floor,
        totalFloors: data.totalFloors,
        yearBuilt: data.yearBuilt,
        images: data.images || [],
        amenities: data.amenities || [],
        features: data.features || [],
        isFeatured: canFlag ? (data.isFeatured || false) : false,
        isNew: canFlag ? Boolean(data.isNew) : false,
        isPremium: canFlag ? (data.isPremium || false) : false,
        coordinates: data.coordinates,
        viewCount: 0,
        listedDate: new Date().toISOString().split('T')[0],
        agentId: data.agentId,
        agentName: nonempty(data.agentName) || staffAgentName(req.user) || null,
        agentPhone: nonempty(data.agentPhone) || req.user?.phone || null,
        agentEmail: nonempty(data.agentEmail) || req.user?.email || null,
        agentCompany: data.agentCompany || null,
        agentTaxId: data.agentTaxId || null,
        invoiceRef: data.invoiceRef || null,
        hiddenImages: stringList(data.hiddenImages),
        owner: ownerFrom(data.owner),
        contracts: contractsFrom(data.contracts, editorName(req)),
        internalNotes: notesFrom(data.internalNotes, editorName(req)),
        showAddress: data.showAddress ?? true,
        cadastralCode: typeof data.cadastralCode === 'string' ? data.cadastralCode.trim().slice(0, 80) || null : null,
        source: data.source || null,
        sourceUrl: data.sourceUrl || null,
        sourceId: data.sourceId ? String(data.sourceId) : null,
        placement: normalizePlacement(data.placement),
        placementPackage: normalizePlacement(data.placement) === 'paid'
          ? normalizePlacementPackage(data.placementPackage)
          : null,
        createdByUserId: req.user!.id,
        moderationStatus: 'approved',
        ...lifecycle,
      })
      .returning();

    await recordPriceChange({
      propertyId: created.id,
      oldPrice: null,
      newPrice: created.price,
      changedBy: editorName(req),
      source: priceSource(data.priceSource ?? (data.sourceUrl ? 'import' : 'admin')),
    });

    // Turns the import attempt into a conversion in the quality report.
    if (created.sourceUrl) await linkImportToListing(created.sourceUrl, created.id);

    await logActivity(req, 'listing.create', 'property', created.id, { title: created.title });

    res.status(201).json(clean(req, created));
  } catch (err) {
    console.error('Property create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/properties/:id', requirePermission('listings.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (blockedPrivateWrite(req, res)) return;

    const data = req.body;

    const [existing] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (!canEditListing(req.user!, existing)) {
      res.status(403).json({ error: 'რედაქტირება მხოლოდ საკუთარ განცხადებაზე შეგიძლიათ' });
      return;
    }

    const canFlag = can(req.user, 'listings.flags');
    const lifecycle = can(req.user, 'listings.lifecycle')
      ? buildLifecycleFields(data, existing)
      : {};

    const [updated] = await db
      .update(properties)
      .set({
        title: data.title,
        description: data.description,
        descriptionEn: data.descriptionEn ?? existing.descriptionEn,
        descriptionRu: data.descriptionRu ?? existing.descriptionRu,
        price: data.price,
        rentPrice: data.rentPrice ?? null,
        pricePerSqm: data.pricePerSqm,
        address: data.address,
        city: data.city,
        district: data.district,
        type: data.type,
        status: data.status,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        floor: data.floor,
        totalFloors: data.totalFloors,
        yearBuilt: data.yearBuilt,
        images: data.images,
        amenities: data.amenities,
        features: data.features,
        isFeatured: canFlag ? data.isFeatured : existing.isFeatured,
        isNew: canFlag ? data.isNew : existing.isNew,
        isPremium: canFlag ? data.isPremium : existing.isPremium,
        coordinates: data.coordinates,
        agentName: data.agentName,
        agentPhone: data.agentPhone,
        agentEmail: data.agentEmail,
        agentCompany: data.agentCompany ?? existing.agentCompany,
        agentTaxId: data.agentTaxId ?? existing.agentTaxId,
        invoiceRef: data.invoiceRef ?? existing.invoiceRef,
        hiddenImages: 'hiddenImages' in data ? stringList(data.hiddenImages) : existing.hiddenImages,
        owner: 'owner' in data ? ownerFrom(data.owner) : existing.owner,
        contracts: 'contracts' in data ? contractsFrom(data.contracts, editorName(req)) : existing.contracts,
        internalNotes: 'internalNotes' in data
          ? notesFrom(data.internalNotes, editorName(req))
          : existing.internalNotes,
        showAddress: data.showAddress ?? existing.showAddress,
        cadastralCode: 'cadastralCode' in data
          ? (typeof data.cadastralCode === 'string' ? data.cadastralCode.trim().slice(0, 80) || null : null)
          : existing.cadastralCode,
        source: data.source ?? existing.source,
        sourceUrl: data.sourceUrl ?? existing.sourceUrl,
        sourceId: data.sourceId ? String(data.sourceId) : existing.sourceId,
        placement: 'placement' in data ? normalizePlacement(data.placement, existing.placement === 'paid' ? 'paid' : 'free') : existing.placement,
        placementPackage: 'placement' in data || 'placementPackage' in data
          ? (normalizePlacement(data.placement, existing.placement === 'paid' ? 'paid' : 'free') === 'paid'
            ? normalizePlacementPackage(data.placementPackage ?? existing.placementPackage)
            : null)
          : existing.placementPackage,
        ...lifecycle,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, String(req.params.id)))
      .returning();

    await recordPriceChange({
      propertyId: updated.id,
      oldPrice: existing.price,
      newPrice: updated.price,
      changedBy: editorName(req),
      source: priceSource(data.priceSource),
    });

    const [withHistory] = await withPriceHistory([updated]);
    await logActivity(req, 'listing.update', 'property', updated.id, { title: updated.title });
    res.json(clean(req, withHistory));
  } catch (err) {
    console.error('Property update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/properties/:id', requirePermission('listings.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db
      .select({
        id: properties.id,
        title: properties.title,
        createdByUserId: properties.createdByUserId,
        contracts: properties.contracts,
        invoiceRef: properties.invoiceRef,
        agentTaxId: properties.agentTaxId,
      })
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!existing || !canEditListing(req.user!, existing)) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    /**
     * Deleting the row takes the signed contracts and the invoice reference with
     * it, and there is no undo. Managers and brokers may clear ordinary listings;
     * anything with paperwork attached needs an admin.
     */
    const carriesFinancials = Boolean(
      (existing.contracts?.length ?? 0) > 0 || existing.invoiceRef || existing.agentTaxId,
    );
    if (carriesFinancials && !isAdminOrAbove(req.user)) {
      res.status(403).json({
        error: 'ხელშეკრულებით ან ინვოისით დაკავშირებულ განცხადებას მხოლოდ ადმინი შლის',
        adminOnly: ['listings.financialDelete'],
      });
      return;
    }

    await db.delete(properties).where(eq(properties.id, String(req.params.id)));
    await logActivity(req, 'listing.delete', 'property', existing.id, {
      title: existing.title,
      carriedFinancials: carriesFinancials,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Property delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Approve or reject a member submission. */
router.post('/properties/:id/moderate', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const decision = req.body?.decision;
    if (decision !== 'approve' && decision !== 'reject') {
      res.status(400).json({ error: 'decision must be approve or reject' });
      return;
    }

    const [existing] = await db
      .select({ id: properties.id, title: properties.title })
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    if (decision === 'reject' && !note) {
      res.status(400).json({ error: 'უარყოფისას მიზეზი სავალდებულოა' });
      return;
    }

    const [updated] = await db
      .update(properties)
      .set({
        moderationStatus: decision === 'approve' ? 'approved' : 'rejected',
        moderationNote: note || null,
        moderatedByUserId: req.user!.id,
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(properties.id, String(req.params.id)))
      .returning();

    await logActivity(req, `listing.${decision}`, 'property', updated.id, {
      title: updated.title,
      note,
    });

    res.json(clean(req, updated));
  } catch (err) {
    console.error('Moderation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inline edits from the admin table: flags, price, lifecycle state, source link
router.patch('/properties/:id', requirePermission('listings.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (blockedPrivateWrite(req, res)) return;

    const [existing] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    if (!canEditListing(req.user!, existing)) {
      res.status(403).json({ error: 'რედაქტირება მხოლოდ საკუთარ განცხადებაზე შეგიძლიათ' });
      return;
    }

    const actor = req.user!;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (['isFeatured', 'isNew', 'isPremium'].some(key => key in req.body)) {
      if (!can(actor, 'listings.flags')) {
        res.status(403).json({ error: 'ნიშნების შეცვლის უფლება არ გაქვთ' });
        return;
      }
      for (const key of ['isFeatured', 'isNew', 'isPremium'] as const) {
        if (key in req.body) updates[key] = Boolean(req.body[key]);
      }
    }

    for (const key of ['source', 'sourceUrl', 'sourceId'] as const) {
      if (key in req.body) updates[key] = req.body[key] ? String(req.body[key]) : null;
    }

    if ('placement' in req.body) {
      updates.placement = normalizePlacement(req.body.placement);
      if (updates.placement === 'free') updates.placementPackage = null;
    }
    if ('placementPackage' in req.body && (updates.placement ?? existing.placement) === 'paid') {
      updates.placementPackage = normalizePlacementPackage(req.body.placementPackage);
    }

    if ('showAddress' in req.body) updates.showAddress = Boolean(req.body.showAddress);
    if ('owner' in req.body) updates.owner = ownerFrom(req.body.owner);
    if ('contracts' in req.body) updates.contracts = contractsFrom(req.body.contracts, editorName(req));
    if ('internalNotes' in req.body) updates.internalNotes = notesFrom(req.body.internalNotes, editorName(req));

    if ('assignedToUserId' in req.body) {
      if (!can(actor, 'listings.assign')) {
        res.status(403).json({ error: 'გადაბმის უფლება არ გაქვთ' });
        return;
      }
      const assignee = Number(req.body.assignedToUserId);
      updates.assignedToUserId = Number.isFinite(assignee) ? assignee : null;
    }

    if ('rentPrice' in req.body) {
      if (!can(actor, 'listings.price')) {
        res.status(403).json({ error: 'ფასის შეცვლის უფლება არ გაქვთ' });
        return;
      }
      const nextRent = Number(req.body.rentPrice);
      updates.rentPrice = req.body.rentPrice === null || req.body.rentPrice === ''
        ? null
        : (Number.isFinite(nextRent) && nextRent >= 0 ? String(nextRent) : existing.rentPrice);
    }

    if ('status' in req.body && ['sale', 'rent', 'both'].includes(req.body.status)) {
      updates.status = req.body.status;
    }

    let priceChanged = false;
    if ('price' in req.body) {
      if (!can(actor, 'listings.price')) {
        res.status(403).json({ error: 'ფასის შეცვლის უფლება არ გაქვთ' });
        return;
      }
      const nextPrice = Number(req.body.price);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        res.status(400).json({ error: 'არასწორი ფასი' });
        return;
      }
      updates.price = String(nextPrice);

      const area = Number(existing.area);
      if (Number.isFinite(area) && area > 0) {
        updates.pricePerSqm = String(Math.round(nextPrice / area));
      }
      priceChanged = true;
    }

    const lifecycleKeys = [
      'lifecycleState', 'rentTermMonths', 'rentStartedAt', 'rentExpiresAt',
      'lifecycleNote', 'lifecycleOutcome', 'lifecycleDealPrice',
    ];
    if (lifecycleKeys.some(key => key in req.body)) {
      if (!can(actor, 'listings.lifecycle')) {
        res.status(403).json({ error: 'სტატუსის შეცვლის უფლება არ გაქვთ' });
        return;
      }
      Object.assign(updates, buildLifecycleFields(req.body, existing));
    }

    const [updated] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, String(req.params.id)))
      .returning();

    if (priceChanged) {
      await recordPriceChange({
        propertyId: updated.id,
        oldPrice: existing.price,
        newPrice: updated.price,
        changedBy: editorName(req),
        source: priceSource(req.body.priceSource),
      });
    }

    const [withHistory] = await withPriceHistory([updated]);
    res.json(clean(req, withHistory));
  } catch (err) {
    console.error('Property patch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Georgian description → English + Russian, for the translate button in the form
router.post('/translate', requirePermission('listings.translate'), async (req: AuthRequest, res: Response): Promise<void> => {
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const requested: TargetLang[] = Array.isArray(req.body?.targets)
    ? req.body.targets.filter((lang: unknown): lang is TargetLang => lang === 'en' || lang === 'ru')
    : ['en', 'ru'];

  if (!text.trim()) {
    res.status(400).json({ error: 'ჯერ ქართული აღწერა შეავსეთ' });
    return;
  }

  if (!activeProvider()) {
    res.status(501).json({
      error: 'თარგმნის სერვისი არ არის კონფიგურირებული — დაამატეთ OPENAI_API_KEY, DEEPL_API_KEY ან GOOGLE_TRANSLATE_API_KEY',
    });
    return;
  }

  try {
    const entries = await Promise.all(
      requested.map(async lang => [lang, await translateFromGeorgian(text, lang)] as const),
    );
    res.json(Object.fromEntries(entries));
  } catch (err) {
    console.error('Translate error:', err);
    res.status(502).json({ error: 'თარგმნა ვერ მოხერხდა, სცადეთ ხელახლა' });
  }
});

// ─── BROKERS (agents table — public marketing profiles) ────────────────────────

type BrokerListingStats = {
  agentId: string;
  liveListings: number;
  forSale: number;
  forRent: number;
  featured: number;
  totalViews: number;
  needsAttention: number;
};

async function brokerListingStats(): Promise<Map<string, BrokerListingStats>> {
  const rows = await db
    .select({
      agentId: properties.agentId,
      liveListings: count(),
      forSale: sql<number>`count(*) filter (where ${properties.status} in ('sale', 'both'))::int`,
      forRent: sql<number>`count(*) filter (where ${properties.status} in ('rent', 'both', 'daily_rent'))::int`,
      featured: sql<number>`count(*) filter (where ${properties.isFeatured} = true or ${properties.isPremium} = true)::int`,
      totalViews: sql<number>`coalesce(sum(${properties.viewCount}), 0)::int`,
      needsAttention: sql<number>`count(*) filter (where ${properties.lifecycleState} in ('old', 'new_r'))::int`,
    })
    .from(properties)
    .where(sql`${properties.agentId} is not null and ${properties.agentId} <> ''`)
    .groupBy(properties.agentId);

  const map = new Map<string, BrokerListingStats>();
  for (const row of rows) {
    if (!row.agentId) continue;
    map.set(row.agentId, {
      agentId: row.agentId,
      liveListings: Number(row.liveListings) || 0,
      forSale: Number(row.forSale) || 0,
      forRent: Number(row.forRent) || 0,
      featured: Number(row.featured) || 0,
      totalViews: Number(row.totalViews) || 0,
      needsAttention: Number(row.needsAttention) || 0,
    });
  }
  return map;
}

const STAFF_BROKER_PREFIX = 'staff-';

function staffBrokerVirtualId(userId: number): string {
  return `${STAFF_BROKER_PREFIX}${userId}`;
}

function parseStaffBrokerId(id: string): number | null {
  if (!id.startsWith(STAFF_BROKER_PREFIX)) return null;
  const n = Number(id.slice(STAFF_BROKER_PREFIX.length));
  return Number.isInteger(n) && n > 0 ? n : null;
}

const staffBrokerColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  role: users.role,
  scope: users.scope,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
  phone: users.phone,
  avatarUrl: users.avatarUrl,
  showOnFrontend: users.showOnFrontend,
  jobTitle: users.jobTitle,
  bio: users.bio,
  createdAt: users.createdAt,
};

type StaffBrokerRow = {
  id: number;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  scope: string | null;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  phone: string | null;
  avatarUrl: string | null;
  showOnFrontend: boolean;
  jobTitle: string | null;
  bio: string | null;
  createdAt: Date | string | null;
};

function toLinkedStaff(staff: StaffBrokerRow) {
  return {
    id: staff.id,
    email: staff.email,
    name: buildDisplayName(staff.firstName, staff.lastName, staff.name),
    role: staff.role,
    scope: staff.scope,
    isActive: staff.isActive,
    lastLoginAt: staff.lastLoginAt,
    phone: staff.phone,
    avatarUrl: staff.avatarUrl,
    showOnFrontend: staff.showOnFrontend,
  };
}

function virtualStaffBroker(staff: StaffBrokerRow, stats: BrokerListingStats) {
  const id = staffBrokerVirtualId(staff.id);
  return {
    id,
    name: buildDisplayName(staff.firstName, staff.lastName, staff.name),
    email: staff.email,
    phone: staff.phone,
    photo: staff.avatarUrl,
    company: 'TBILISIREALTOR.GE',
    verified: false,
    isActive: staff.isActive,
    propertyCount: stats.liveListings,
    rating: null,
    reviewCount: 0,
    yearsExperience: 0,
    bio: staff.bio,
    languages: ['ქართული'],
    specialization: staff.jobTitle ? [staff.jobTitle] : [],
    createdAt: staff.createdAt,
    updatedAt: null,
    stats,
    linkedStaff: toLinkedStaff(staff),
    source: 'staff' as const,
  };
}

async function staffPortfolioStats(userIds: number[]): Promise<Map<number, BrokerListingStats>> {
  const map = new Map<number, BrokerListingStats>();
  for (const id of userIds) map.set(id, emptyBrokerStats(staffBrokerVirtualId(id)));
  if (userIds.length === 0) return map;

  const rows = await db
    .select({
      assignedToUserId: properties.assignedToUserId,
      createdByUserId: properties.createdByUserId,
      status: properties.status,
      isFeatured: properties.isFeatured,
      isPremium: properties.isPremium,
      viewCount: properties.viewCount,
      lifecycleState: properties.lifecycleState,
    })
    .from(properties)
    .where(or(
      inArray(properties.assignedToUserId, userIds),
      inArray(properties.createdByUserId, userIds),
    ));

  for (const row of rows) {
    const owners = new Set<number>();
    if (row.assignedToUserId && map.has(row.assignedToUserId)) owners.add(row.assignedToUserId);
    if (row.createdByUserId && map.has(row.createdByUserId)) owners.add(row.createdByUserId);
    for (const uid of owners) {
      const s = map.get(uid)!;
      s.liveListings += 1;
      if (row.status === 'sale' || row.status === 'both') s.forSale += 1;
      if (row.status === 'rent' || row.status === 'both' || row.status === 'daily_rent') s.forRent += 1;
      if (row.isFeatured || row.isPremium) s.featured += 1;
      s.totalViews += Number(row.viewCount) || 0;
      if (row.lifecycleState === 'old' || row.lifecycleState === 'new_r') s.needsAttention += 1;
    }
  }
  return map;
}

/** Catalog agents plus staff with role=broker who are not already linked by email. */
async function countBrokerPanel(): Promise<number> {
  const [catalog, staff] = await Promise.all([
    db.select({ email: agents.email }).from(agents),
    db.select({ email: users.email }).from(users).where(eq(users.role, 'broker')),
  ]);
  const linked = new Set(
    catalog.map(a => a.email?.toLowerCase()).filter((email): email is string => Boolean(email)),
  );
  const extra = staff.filter(s => !s.email || !linked.has(s.email.toLowerCase())).length;
  return catalog.length + extra;
}

function emptyBrokerStats(agentId: string): BrokerListingStats {
  return {
    agentId,
    liveListings: 0,
    forSale: 0,
    forRent: 0,
    featured: 0,
    totalViews: 0,
    needsAttention: 0,
  };
}

const listingPreviewColumns = {
  id: properties.id,
  title: properties.title,
  price: properties.price,
  rentPrice: properties.rentPrice,
  status: properties.status,
  city: properties.city,
  district: properties.district,
  type: properties.type,
  images: properties.images,
  viewCount: properties.viewCount,
  isFeatured: properties.isFeatured,
  isPremium: properties.isPremium,
  lifecycleState: properties.lifecycleState,
  moderationStatus: properties.moderationStatus,
  listedDate: properties.listedDate,
  updatedAt: properties.updatedAt,
};

router.get('/agents', requirePermission('agents.view'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [all, statsMap, staffBrokers] = await Promise.all([
      db.select().from(agents).orderBy(desc(agents.createdAt)),
      brokerListingStats(),
      db
        .select(staffBrokerColumns)
        .from(users)
        .where(eq(users.role, 'broker')),
    ]);

    const staffByEmail = new Map(
      staffBrokers
        .filter(s => s.email)
        .map(s => [s.email.toLowerCase(), s]),
    );

    const linkedEmails = new Set<string>();
    const enriched = all.map(agent => {
      const stats = statsMap.get(agent.id) ?? emptyBrokerStats(agent.id);
      const linkedStaff = agent.email
        ? staffByEmail.get(agent.email.toLowerCase()) ?? null
        : null;
      if (agent.email) linkedEmails.add(agent.email.toLowerCase());
      return {
        ...agent,
        propertyCount: stats.liveListings,
        stats,
        linkedStaff,
        source: 'catalog' as const,
      };
    });

    const unmatched = staffBrokers.filter(s => !s.email || !linkedEmails.has(s.email.toLowerCase()));
    const staffStats = await staffPortfolioStats(unmatched.map(s => s.id));
    const fromStaff = unmatched.map(s => (
      virtualStaffBroker(s, staffStats.get(s.id) ?? emptyBrokerStats(staffBrokerVirtualId(s.id)))
    ));

    res.json([...fromStaff, ...enriched]);
  } catch (err) {
    console.error('Brokers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/agents/:id/listings', requirePermission('agents.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const staffId = parseStaffBrokerId(id);

    if (staffId) {
      const [staff] = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.id, staffId), eq(users.role, 'broker')));
      if (!staff) {
        res.status(404).json({ error: 'Broker not found' });
        return;
      }

      const conds = [
        eq(properties.assignedToUserId, staffId),
        eq(properties.createdByUserId, staffId),
      ];
      if (staff.email) conds.push(eq(properties.agentEmail, staff.email));

      const rows = await db
        .select(listingPreviewColumns)
        .from(properties)
        .where(or(...conds))
        .orderBy(desc(properties.updatedAt))
        .limit(40);

      res.json({ data: rows });
      return;
    }

    const rows = await db
      .select(listingPreviewColumns)
      .from(properties)
      .where(eq(properties.agentId, id))
      .orderBy(desc(properties.updatedAt))
      .limit(40);

    res.json({ data: rows });
  } catch (err) {
    console.error('Broker listings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/agents', requirePermission('agents.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = `a${nanoid(6)}`;
    const data = req.body;

    const [created] = await db
      .insert(agents)
      .values({
        id,
        name: data.name,
        photo: data.photo,
        phone: data.phone,
        email: data.email,
        rating: data.rating || '5.0',
        reviewCount: data.reviewCount || 0,
        propertyCount: data.propertyCount || 0,
        yearsExperience: data.yearsExperience || 0,
        specialization: data.specialization || [],
        bio: data.bio,
        company: data.company || 'TbilisiRealtor.GE',
        verified: data.verified ?? false,
        languages: data.languages || ['ქართული'],
        isActive: true,
      })
      .returning();

    await logActivity(req, 'broker.create', 'agent', id, { name: data.name });
    res.status(201).json({
      ...created,
      propertyCount: 0,
      stats: emptyBrokerStats(id),
      linkedStaff: null,
      source: 'catalog' as const,
    });
  } catch (err) {
    console.error('Broker create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/agents/:id', requirePermission('agents.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const id = String(req.params.id);
    const staffId = parseStaffBrokerId(id);

    if (staffId) {
      const [existing] = await db
        .select(staffBrokerColumns)
        .from(users)
        .where(and(eq(users.id, staffId), eq(users.role, 'broker')));
      if (!existing) {
        res.status(404).json({ error: 'Broker not found' });
        return;
      }

      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof data.name === 'string') {
        const name = data.name.trim() || existing.name;
        const parts = splitLegacyName(name);
        patch.name = name;
        patch.firstName = parts.firstName || null;
        patch.lastName = parts.lastName || null;
      }
      if (data.phone !== undefined) patch.phone = String(data.phone || '').trim() || null;
      if (data.photo !== undefined) patch.avatarUrl = String(data.photo || '').trim() || null;
      if (data.bio !== undefined) patch.bio = String(data.bio || '').trim() || null;
      if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
      if (Array.isArray(data.specialization) && data.specialization[0]) {
        patch.jobTitle = String(data.specialization[0]).trim() || null;
      }

      const [updated] = await db
        .update(users)
        .set(patch)
        .where(eq(users.id, staffId))
        .returning(staffBrokerColumns);

      await logActivity(req, 'broker.update', 'staff', String(staffId));
      const stats = (await staffPortfolioStats([staffId])).get(staffId)
        ?? emptyBrokerStats(id);
      res.json(virtualStaffBroker(updated ?? { ...existing, ...patch } as StaffBrokerRow, stats));
      return;
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    for (const key of [
      'name', 'photo', 'phone', 'email', 'bio', 'company',
      'verified', 'isActive', 'languages', 'specialization',
    ] as const) {
      if (data[key] !== undefined) patch[key] = data[key];
    }
    if (data.yearsExperience !== undefined) {
      patch.yearsExperience = Number(data.yearsExperience) || 0;
    }
    if (data.rating !== undefined) patch.rating = String(data.rating);
    if (data.reviewCount !== undefined) patch.reviewCount = Number(data.reviewCount) || 0;

    const [updated] = await db
      .update(agents)
      .set(patch)
      .where(eq(agents.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Broker not found' });
      return;
    }

    await logActivity(req, 'broker.update', 'agent', id);
    const stats = (await brokerListingStats()).get(id) ?? emptyBrokerStats(id);
    res.json({ ...updated, propertyCount: stats.liveListings, stats, linkedStaff: null, source: 'catalog' as const });
  } catch (err) {
    console.error('Broker update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/agents/:id', requirePermission('agents.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    if (parseStaffBrokerId(id)) {
      res.status(400).json({ error: 'ეს ბროკერი თანამშრომელია. წაშალეთ თანამშრომლებიდან.' });
      return;
    }
    await db.delete(agents).where(eq(agents.id, id));
    await logActivity(req, 'broker.delete', 'agent', id);
    res.json({ success: true });
  } catch (err) {
    console.error('Broker delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BLOG POSTS ────────────────────────────────────────────────────────────────

router.get('/blog', requirePermission('blog.view'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    res.json(all);
  } catch (err) {
    console.error('Blog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/blog', requirePermission('blog.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = `b${nanoid(8)}`;
    const data = req.body;
    const canPublish = can(req.user, 'blog.publish');

    const [created] = await db
      .insert(blogPosts)
      .values({
        id,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        authorId: String(req.user!.id),
        authorName: req.user!.name,
        category: data.category,
        tags: data.tags || [],
        image: data.image,
        publishDate: data.publishDate || new Date().toISOString().split('T')[0],
        readTime: data.readTime || 5,
        isFeatured: data.isFeatured || false,
        isPublished: canPublish ? (data.isPublished ?? true) : false,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Blog create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/blog/:id', requirePermission('blog.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;
    const [current] = await db
      .select({ isPublished: blogPosts.isPublished })
      .from(blogPosts)
      .where(eq(blogPosts.id, String(req.params.id)));

    if (!current) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    const canPublish = can(req.user, 'blog.publish');

    const [updated] = await db
      .update(blogPosts)
      .set({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        tags: data.tags,
        image: data.image,
        readTime: data.readTime,
        isFeatured: data.isFeatured,
        isPublished: canPublish ? data.isPublished : current.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, String(req.params.id)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Blog update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/blog/:id', requirePermission('blog.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, String(req.params.id)));
    await logActivity(req, 'blog.delete', 'blog', String(req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Blog delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ROLES & PERMISSIONS ───────────────────────────────────────────────────────

const USER_SELECT = {
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
  scope: users.scope,
  permissions: users.permissions,
  isActive: users.isActive,
  blockedReason: users.blockedReason,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
};

type UserRow = {
  [K in keyof typeof USER_SELECT]: unknown;
} & {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  permissions: Record<string, boolean> | null;
};

async function templateFor(role: string): Promise<string[]> {
  const [row] = await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
  if (row?.permissions?.length) return row.permissions;
  return isRole(role) ? ROLE_DEFAULT_PERMISSIONS[role] : [];
}

/** Adds the resolved permission list so the UI can show what a person can really do. */
async function decorate<T extends UserRow>(row: T) {
  return {
    ...row,
    name: buildDisplayName(row.firstName, row.lastName, row.name),
    permissions: row.permissions ?? {},
    effectivePermissions: effectivePermissions(row.role, await templateFor(row.role), row.permissions),
  };
}

/** How many active super admins remain, so the last one cannot lock everyone out. */
async function activeSuperAdmins(excludeId?: number): Promise<number> {
  const conditions = [eq(users.role, 'super_admin'), eq(users.isActive, true)];
  if (excludeId !== undefined) conditions.push(ne(users.id, excludeId));
  const [row] = await db.select({ count: count() }).from(users).where(and(...conditions));
  return Number(row.count);
}

router.get('/permissions/catalog', requirePermission('staff.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(rolePermissions);
    const templates: Record<string, string[]> = {};
    for (const role of ROLES) {
      const stored = rows.find(row => row.role === role);
      templates[role] = stored?.permissions?.length
        ? stored.permissions
        : ROLE_DEFAULT_PERMISSIONS[role];
    }

    res.json({
      catalog: PERMISSIONS,
      roles: ROLES,
      staffRoles: STAFF_ROLES,
      defaultScope: ROLE_DEFAULT_SCOPE,
      templates,
      grantable: req.user!.role === 'super_admin' ? PERMISSION_KEYS : req.user!.permissions,
      actorRole: req.user!.role,
    });
  } catch (err) {
    console.error('Permission catalog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Editing a role template touches everyone who holds that role — super admin only. */
router.put('/roles/:role', requirePermission('staff.permissions'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = String(req.params.role);
    if (!isRole(role)) {
      res.status(400).json({ error: 'Unknown role' });
      return;
    }
    if (role === 'super_admin') {
      res.json({ role, permissions: PERMISSION_KEYS, locked: true });
      return;
    }

    const requested = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permissions = filterGrantablePermissions(req.user!, requested);

    await db
      .insert(rolePermissions)
      .values({ role, permissions, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: rolePermissions.role,
        set: { permissions, updatedAt: new Date() },
      });

    invalidateRoleTemplates();
    await logActivity(req, 'role.permissions', 'role', role, { permissions });

    res.json({ role, permissions });
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── STAFF ─────────────────────────────────────────────────────────────────────

router.get('/staff', requirePermission('staff.view'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db
      .select(USER_SELECT)
      .from(users)
      .where(inArray(users.role, STAFF_ROLES))
      .orderBy(desc(users.createdAt));

    res.json(await Promise.all(all.map(decorate)));
  } catch (err) {
    console.error('Staff list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/staff', requirePermission('staff.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const role: Role = isRole(req.body.role) && req.body.role !== 'user' ? req.body.role : 'broker';

    if (!canManageUser(req.user!, role)) {
      res.status(403).json({ error: 'ამ როლის შექმნის უფლება არ გაქვთ' });
      return;
    }

    const profile = profileFieldsFromBody(req.body);
    const firstName = (profile.firstName as string | null) ?? '';
    const lastName = (profile.lastName as string | null) ?? '';
    const name = (profile.name as string)
      || buildDisplayName(firstName, lastName, typeof req.body.name === 'string' ? req.body.name : '');

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, სახელი და პაროლი სავალდებულოა' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' });
      return;
    }

    const scope = req.body.scope === 'own' || req.body.scope === 'all'
      ? req.body.scope
      : ROLE_DEFAULT_SCOPE[role];

    const overrides = sanitizeOverrides(req.user!, req.body.permissions);
    const passwordHash = await bcrypt.hash(password, 12);

    const [created] = await db
      .insert(users)
      .values({
        email: String(email).toLowerCase().trim(),
        name,
        firstName: firstName || null,
        lastName: lastName || null,
        dateOfBirth: (profile.dateOfBirth as string | null) ?? null,
        phone: (profile.phone as string | null) ?? null,
        avatarUrl: (profile.avatarUrl as string | null) ?? null,
        jobTitle: (profile.jobTitle as string | null) ?? null,
        bio: (profile.bio as string | null) ?? null,
        showOnFrontend: Boolean(profile.showOnFrontend),
        passwordHash,
        role,
        scope,
        permissions: overrides,
        isActive: true,
      })
      .returning(USER_SELECT);

    await logActivity(req, 'staff.create', 'user', created.id, { role, scope });

    res.status(201).json(await decorate(created));
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    console.error('Staff create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Keeps only the overrides the actor is themselves allowed to hand out. */
function sanitizeOverrides(actor: PermissionActor, raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, boolean> = {};
  const grantable = new Set(
    actor.role === 'super_admin' ? PERMISSION_KEYS : actor.permissions,
  );

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isPermissionKey(key)) continue;
    // Revoking is always allowed; granting requires holding the permission.
    if (value === true && !grantable.has(key)) continue;
    out[key] = Boolean(value);
  }
  return out;
}

/**
 * Per-user overrides on top of the role template. Separate from the profile
 * route so it can sit behind `staff.permissions` rather than `staff.edit`.
 */
router.put('/staff/:id/permissions', requirePermission('staff.permissions'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const actor = req.user!;
    const [existing] = await db.select().from(users).where(eq(users.id, id));

    if (!existing || !isStaffRole(existing.role)) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (existing.id === actor.id) {
      res.status(403).json({ error: 'საკუთარი უფლებების შეცვლა არ შეიძლება' });
      return;
    }
    if (!canManageUser(actor, existing.role)) {
      res.status(403).json({ error: 'ამ მომხმარებლის შეცვლის უფლება არ გაქვთ' });
      return;
    }

    // No token bump needed: every request re-reads the row, so the new set is
    // live on the target's very next call without forcing them to sign in again.
    const permissions = sanitizeOverrides(actor, req.body.permissions);
    const updates: Record<string, unknown> = {
      permissions,
      updatedAt: new Date(),
    };

    if (req.body.scope === 'own' || req.body.scope === 'all') updates.scope = req.body.scope;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning(USER_SELECT);

    await logActivity(req, 'staff.permissions', 'user', id, { permissions, scope: updates.scope });

    res.json(await decorate(updated));
  } catch (err) {
    console.error('Staff permissions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/staff/:id', requirePermission('staff.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const actor = req.user!;
    const [existing] = await db.select().from(users).where(eq(users.id, id));

    if (!existing || !isStaffRole(existing.role)) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (existing.id !== actor.id && !canManageUser(actor, existing.role)) {
      res.status(403).json({ error: 'ამ მომხმარებლის შეცვლის უფლება არ გაქვთ' });
      return;
    }

    const profile = profileFieldsFromBody(req.body, existing.name);
    const updates: Record<string, unknown> = { ...profile, updatedAt: new Date() };
    let bumpToken = false;

    if ('role' in req.body) {
      const nextRole = req.body.role;
      if (!isRole(nextRole) || nextRole === 'user') {
        res.status(400).json({ error: 'არასწორი როლი' });
        return;
      }
      if (nextRole !== existing.role) {
        if (existing.id === actor.id) {
          res.status(403).json({ error: 'საკუთარი როლის შეცვლა არ შეიძლება' });
          return;
        }
        if (!canManageUser(actor, nextRole)) {
          res.status(403).json({ error: 'ამ როლის მინიჭების უფლება არ გაქვთ' });
          return;
        }
        if (existing.role === 'super_admin' && await activeSuperAdmins(existing.id) === 0) {
          res.status(400).json({ error: 'ბოლო სუპერ ადმინის როლის შეცვლა არ შეიძლება' });
          return;
        }
        updates.role = nextRole;
        updates.scope = ROLE_DEFAULT_SCOPE[nextRole];
      }
    }

    if ('scope' in req.body && (req.body.scope === 'own' || req.body.scope === 'all')) {
      updates.scope = req.body.scope;
    }

    if ('isActive' in req.body) {
      const nextActive = Boolean(req.body.isActive);
      if (!nextActive) {
        if (existing.id === actor.id) {
          res.status(400).json({ error: 'საკუთარი ანგარიშის გათიშვა არ შეიძლება' });
          return;
        }
        if (existing.role === 'super_admin' && await activeSuperAdmins(existing.id) === 0) {
          res.status(400).json({ error: 'ბოლო სუპერ ადმინის გათიშვა არ შეიძლება' });
          return;
        }
      }
      updates.isActive = nextActive;
      if (!nextActive) bumpToken = true;
      updates.blockedReason = nextActive
        ? null
        : (typeof req.body.blockedReason === 'string' ? req.body.blockedReason.slice(0, 255) : null);
    }

    if ('permissions' in req.body) {
      if (!can(actor, 'staff.permissions')) {
        res.status(403).json({ error: 'უფლებების მართვის უფლება არ გაქვთ' });
        return;
      }
      if (!isAdminOrAbove(actor)) {
        res.status(403).json({ error: ADMIN_ONLY_MESSAGE });
        return;
      }
      if (existing.id === actor.id) {
        res.status(403).json({ error: 'საკუთარი უფლებების შეცვლა არ შეიძლება' });
        return;
      }
      updates.permissions = sanitizeOverrides(actor, req.body.permissions);
    }

    if ('firstName' in profile || 'lastName' in profile) {
      updates.name = buildDisplayName(
        (profile.firstName as string | null) ?? existing.firstName,
        (profile.lastName as string | null) ?? existing.lastName,
        existing.name,
      );
    }

    if (req.body.password) {
      if (String(req.body.password).length < 6) {
        res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' });
        return;
      }
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
      bumpToken = true;
    }

    // Role, scope and permission changes need no bump — they are re-read on
    // every request. Only a new password or a block must kill live sessions.
    if (bumpToken) updates.tokenVersion = sql`${users.tokenVersion} + 1`;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning(USER_SELECT);

    await logActivity(req, 'staff.update', 'user', id, {
      role: updates.role ?? existing.role,
      permissionsChanged: 'permissions' in updates,
    });

    res.json(await decorate(updated));
  } catch (err) {
    console.error('Staff update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/staff/:id', requirePermission('staff.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const actor = req.user!;

    if (actor.id === id) {
      res.status(400).json({ error: 'საკუთარი ანგარიშის წაშლა არ შეიძლება' });
      return;
    }

    const [existing] = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, id));

    if (!existing || !isStaffRole(existing.role)) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (!canManageUser(actor, existing.role)) {
      res.status(403).json({ error: 'ამ მომხმარებლის წაშლის უფლება არ გაქვთ' });
      return;
    }
    if (existing.role === 'super_admin' && await activeSuperAdmins(existing.id) === 0) {
      res.status(400).json({ error: 'ბოლო სუპერ ადმინის წაშლა არ შეიძლება' });
      return;
    }

    await db.delete(users).where(eq(users.id, id));
    await logActivity(req, 'staff.delete', 'user', id, { email: existing.email, role: existing.role });

    res.json({ success: true });
  } catch (err) {
    console.error('Staff delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── MEMBERS (public site accounts) ────────────────────────────────────────────

router.get('/members', requirePermission('members.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const all = await db
      .select(USER_SELECT)
      .from(users)
      .where(eq(users.role, 'user'))
      .orderBy(desc(users.createdAt))
      .limit(500);

    const listingCounts = await db
      .select({ userId: properties.createdByUserId, count: count() })
      .from(properties)
      .groupBy(properties.createdByUserId);
    const byUser = new Map(listingCounts.map(row => [row.userId, Number(row.count)]));

    const rows = all
      .map(row => ({
        ...row,
        name: buildDisplayName(row.firstName, row.lastName, row.name),
        listingCount: byUser.get(row.id) ?? 0,
      }))
      .filter(row => !search
        || row.name.toLowerCase().includes(search)
        || row.email.toLowerCase().includes(search)
        || (row.phone ?? '').includes(search));

    res.json(rows);
  } catch (err) {
    console.error('Members list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/members/:id', requirePermission('members.block'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, id));

    if (!existing || existing.role !== 'user') {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const isActive = Boolean(req.body.isActive);
    const [updated] = await db
      .update(users)
      .set({
        isActive,
        blockedReason: isActive
          ? null
          : (typeof req.body.blockedReason === 'string' ? req.body.blockedReason.slice(0, 255) : null),
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(USER_SELECT);

    await logActivity(req, isActive ? 'member.unblock' : 'member.block', 'user', id);

    res.json({ ...updated, name: buildDisplayName(updated.firstName, updated.lastName, updated.name) });
  } catch (err) {
    console.error('Member update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/members/:id', requirePermission('members.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, id));

    if (!existing || existing.role !== 'user') {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await db.delete(users).where(eq(users.id, id));
    await logActivity(req, 'member.delete', 'user', id, { email: existing.email });

    res.json({ success: true });
  } catch (err) {
    console.error('Member delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ACTIVITY LOG ──────────────────────────────────────────────────────────────

router.get('/activity', requirePermission('staff.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(200, parseInt(String(req.query.limit ?? '50')) || 50);
    const rows = await db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
    res.json({ data: rows });
  } catch (err) {
    console.error('Activity log error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SITE SETTINGS ─────────────────────────────────────────────────────────────

router.get('/settings', requirePermission('settings.view'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db.select().from(siteSettings).orderBy(siteSettings.key);
    res.json(all);
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', requirePermission('settings.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string; label?: string }> };

    for (const s of settings) {
      await db
        .insert(siteSettings)
        .values({ key: s.key, value: s.value, label: s.label, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: s.value, updatedAt: new Date() },
        });
    }

    await logActivity(req, 'settings.update', 'settings', null, {
      keys: settings.map(s => s.key),
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
