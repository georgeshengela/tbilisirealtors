/**
 * Everything a registered member can do from the public site: saved listings,
 * saved searches and their own property submissions.
 *
 * Submissions never publish themselves — they land at `moderation_status =
 * 'pending'` and stay invisible until staff approves them.
 */

import { Router, Response } from 'express';
import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import {
  properties,
  userFavorites,
  savedSearches,
  users,
} from '../schema.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { allocateListingId } from '../services/listingId.js';

const router = Router();
router.use(requireAuth);

/** Fields a member is allowed to set. Everything else is staff territory. */
const MEMBER_FIELDS = [
  'title', 'description', 'price', 'rentPrice', 'address', 'city', 'district',
  'type', 'status', 'bedrooms', 'bathrooms', 'area', 'floor', 'totalFloors',
  'yearBuilt', 'images', 'amenities', 'features', 'coordinates',
] as const;

type MemberListingInput = Record<string, unknown>;

function numberOrNull(value: unknown): string | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(n) : null;
}

function stringList(value: unknown, max = 30): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, max)
    : [];
}

function memberListingValues(data: MemberListingInput) {
  const title = typeof data.title === 'string' ? data.title.trim().slice(0, 500) : '';
  const price = numberOrNull(data.price);
  const area = numberOrNull(data.area);

  const coordinates = data.coordinates && typeof data.coordinates === 'object'
    ? data.coordinates as { lat: number; lng: number }
    : null;

  const pricePerSqm = price && area && Number(area) > 0
    ? String(Math.round(Number(price) / Number(area)))
    : null;

  return {
    title,
    description: typeof data.description === 'string' ? data.description.slice(0, 8000) : null,
    price,
    rentPrice: 'rentPrice' in data ? numberOrNull(data.rentPrice) : null,
    pricePerSqm,
    address: typeof data.address === 'string' ? data.address.trim().slice(0, 500) : null,
    city: typeof data.city === 'string' && data.city.trim() ? data.city.trim() : 'თბილისი',
    district: typeof data.district === 'string' ? data.district.trim().slice(0, 255) : null,
    type: typeof data.type === 'string' ? data.type.slice(0, 50) : 'apartment',
    status: data.status === 'rent' || data.status === 'both' ? data.status : 'sale',
    bedrooms: Number.isFinite(Number(data.bedrooms)) ? Number(data.bedrooms) : null,
    bathrooms: Number.isFinite(Number(data.bathrooms)) ? Number(data.bathrooms) : null,
    area,
    floor: Number.isFinite(Number(data.floor)) ? Number(data.floor) : null,
    totalFloors: Number.isFinite(Number(data.totalFloors)) ? Number(data.totalFloors) : null,
    yearBuilt: Number.isFinite(Number(data.yearBuilt)) ? Number(data.yearBuilt) : null,
    images: stringList(data.images, 30),
    amenities: stringList(data.amenities, 40),
    features: stringList(data.features, 40),
    coordinates,
  };
}

/** Members only see their own, non-private view of a listing. */
function toMemberListing(row: typeof properties.$inferSelect) {
  const {
    owner: _owner,
    contracts: _contracts,
    internalNotes: _internalNotes,
    agentTaxId: _agentTaxId,
    invoiceRef: _invoiceRef,
    lifecycleNote: _lifecycleNote,
    lastCallAt: _lastCallAt,
    lastCallOutcome: _lastCallOutcome,
    nextFollowUpAt: _nextFollowUpAt,
    assignedByUserId: _assignedByUserId,
    assignedAt: _assignedAt,
    ...rest
  } = row;
  // moderationStatus / moderationNote / moderationChecklist stay: the member is
  // entitled to know why their submission was sent back.
  return rest;
}

/** Blocks staff-only endpoints from being reached with a staff token by mistake. */
function memberId(req: AuthRequest): number {
  return req.user!.id;
}

/* ── Favourites ──────────────────────────────────────────────────────────── */

router.get('/favorites', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({ propertyId: userFavorites.propertyId, createdAt: userFavorites.createdAt })
      .from(userFavorites)
      .where(eq(userFavorites.userId, memberId(req)))
      .orderBy(desc(userFavorites.createdAt));

    res.json({ ids: rows.map(row => row.propertyId) });
  } catch (err) {
    console.error('Favorites list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Merges the guest localStorage list into the account after sign-in. */
router.post('/favorites/merge', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids = stringList(req.body?.ids, 200);
    if (ids.length) {
      const existing = await db
        .select({ id: properties.id })
        .from(properties)
        .where(inArray(properties.id, ids));

      if (existing.length) {
        await db
          .insert(userFavorites)
          .values(existing.map(row => ({ userId: memberId(req), propertyId: row.id })))
          .onConflictDoNothing();
      }
    }

    const rows = await db
      .select({ propertyId: userFavorites.propertyId })
      .from(userFavorites)
      .where(eq(userFavorites.userId, memberId(req)));

    res.json({ ids: rows.map(row => row.propertyId) });
  } catch (err) {
    console.error('Favorite merge error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Declared after /merge so the literal path is not swallowed by :propertyId.
router.post('/favorites/:propertyId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const propertyId = String(req.params.propertyId);
    const [property] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    await db
      .insert(userFavorites)
      .values({ userId: memberId(req), propertyId })
      .onConflictDoNothing();

    res.json({ success: true, propertyId });
  } catch (err) {
    console.error('Favorite add error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/favorites/:propertyId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db
      .delete(userFavorites)
      .where(and(
        eq(userFavorites.userId, memberId(req)),
        eq(userFavorites.propertyId, String(req.params.propertyId)),
      ));
    res.json({ success: true });
  } catch (err) {
    console.error('Favorite remove error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Saved searches ──────────────────────────────────────────────────────── */

router.get('/saved-searches', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(savedSearches)
      .where(eq(savedSearches.userId, memberId(req)))
      .orderBy(desc(savedSearches.createdAt));
    res.json({ data: rows });
  } catch (err) {
    console.error('Saved searches error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/saved-searches', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 160) : '';
    if (!name) {
      res.status(400).json({ error: 'დასახელება სავალდებულოა' });
      return;
    }

    const [existing] = await db
      .select({ count: count() })
      .from(savedSearches)
      .where(eq(savedSearches.userId, memberId(req)));

    if (Number(existing.count) >= 30) {
      res.status(400).json({ error: 'შენახული ძიებების ლიმიტი ამოიწურა' });
      return;
    }

    const query = req.body.query && typeof req.body.query === 'object'
      ? req.body.query as Record<string, unknown>
      : {};

    const [created] = await db
      .insert(savedSearches)
      .values({ userId: memberId(req), name, query })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Saved search create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/saved-searches/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db
      .delete(savedSearches)
      .where(and(
        eq(savedSearches.userId, memberId(req)),
        eq(savedSearches.id, parseInt(String(req.params.id))),
      ));
    res.json({ success: true });
  } catch (err) {
    console.error('Saved search delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── My listings ─────────────────────────────────────────────────────────── */

router.get('/my-listings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(properties)
      .where(eq(properties.createdByUserId, memberId(req)))
      .orderBy(desc(properties.createdAt));

    res.json({ data: rows.map(toMemberListing) });
  } catch (err) {
    console.error('My listings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/my-listings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { price, ...values } = memberListingValues(req.body ?? {});

    if (!values.title) {
      res.status(400).json({ error: 'სათაური სავალდებულოა' });
      return;
    }
    if (!price) {
      res.status(400).json({ error: 'ფასი სავალდებულოა' });
      return;
    }

    const [pending] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(
        eq(properties.createdByUserId, memberId(req)),
        eq(properties.moderationStatus, 'pending'),
      ));

    if (Number(pending.count) >= 5) {
      res.status(400).json({ error: 'გაქვთ 5 განცხადება განხილვაში — დაელოდეთ პასუხს' });
      return;
    }

    const [me] = await db
      .select({ name: users.name, phone: users.phone, email: users.email })
      .from(users)
      .where(eq(users.id, memberId(req)));

    const id = await allocateListingId();
    const [created] = await db
      .insert(properties)
      .values({
        id,
        ...values,
        price,
        listedDate: new Date().toISOString().split('T')[0],
        viewCount: 0,
        isFeatured: false,
        isPremium: false,
        isNew: true,
        showAddress: false,
        agentName: me?.name ?? null,
        agentPhone: me?.phone ?? null,
        agentEmail: me?.email ?? null,
        createdByUserId: memberId(req),
        moderationStatus: 'pending',
        moderationRequestedAt: new Date(),
        lifecycleState: 'new',
      })
      .returning();

    res.status(201).json(toMemberListing(created));
  } catch (err) {
    console.error('My listing create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/my-listings/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db
      .select()
      .from(properties)
      .where(and(
        eq(properties.id, String(req.params.id)),
        eq(properties.createdByUserId, memberId(req)),
      ));

    if (!existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const { price, ...values } = memberListingValues({ ...existing, ...req.body });
    if (!values.title || !price) {
      res.status(400).json({ error: 'სათაური და ფასი სავალდებულოა' });
      return;
    }

    const [updated] = await db
      .update(properties)
      .set({
        ...values,
        price,
        // Any edit goes back through review, restarting the SLA clock.
        moderationStatus: 'pending',
        moderationNote: null,
        moderationChecklist: {},
        moderationRequestedAt: new Date(),
        moderatedByUserId: null,
        moderatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, String(req.params.id)))
      .returning();

    res.json(toMemberListing(updated));
  } catch (err) {
    console.error('My listing update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/my-listings/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(and(
        eq(properties.id, String(req.params.id)),
        eq(properties.createdByUserId, memberId(req)),
      ));

    if (!existing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    await db.delete(properties).where(eq(properties.id, existing.id));
    res.json({ success: true });
  } catch (err) {
    console.error('My listing delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ── Overview ────────────────────────────────────────────────────────────── */

router.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = memberId(req);

    const [favCount] = await db
      .select({ count: count() })
      .from(userFavorites)
      .where(eq(userFavorites.userId, id));

    const listings = await db
      .select({
        id: properties.id,
        moderationStatus: properties.moderationStatus,
        viewCount: properties.viewCount,
      })
      .from(properties)
      .where(eq(properties.createdByUserId, id));

    const [searchCount] = await db
      .select({ count: count() })
      .from(savedSearches)
      .where(eq(savedSearches.userId, id));

    res.json({
      favorites: Number(favCount.count),
      listings: listings.length,
      pending: listings.filter(row => row.moderationStatus === 'pending').length,
      approved: listings.filter(row => row.moderationStatus === 'approved').length,
      rejected: listings.filter(row => row.moderationStatus === 'rejected').length,
      totalViews: listings.reduce((sum, row) => sum + (row.viewCount ?? 0), 0),
      savedSearches: Number(searchCount.count),
    });
  } catch (err) {
    console.error('Account overview error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export { MEMBER_FIELDS };
export default router;
