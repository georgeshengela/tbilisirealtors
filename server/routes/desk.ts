/**
 * Manager desk API — the operational side of the panel:
 *
 *   /assignment   who carries what, plus the unassigned intake queue
 *   /callbacks    owners that need a phone call, with the call journal
 *   /moderation   member submissions with SLA timers, checklist and templates
 *   /tasks        "call the owner Friday" jobs, mentions and the overdue feed
 *   /performance  per-broker scoreboard
 *
 * Reads come from services/managerDesk; this file owns validation, permission
 * gating, PII stripping and the audit trail.
 */
import { Router, Response } from 'express';
import { and, asc, count, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../db.js';
import {
  activityLog,
  listingCallLogs,
  listingTasks,
  moderationTemplates,
  properties,
  users,
} from '../schema.js';
import { requireStaff, requirePermission, AuthRequest } from '../middleware/auth.js';
import {
  STAFF_ROLES,
  can,
  sanitizeListingFor,
  type PermissionActor,
} from '../permissions.js';
import { buildLifecycleFields, asDateOnly } from '../services/listingLifecycle.js';
import {
  MODERATION_CHECKS,
  MODERATION_CHECK_KEYS,
  MODERATION_SLA_HOURS,
  assignableStaff,
  assignmentListings,
  brokerPerformance,
  callLogsFor,
  callbackQueue,
  isCallOutcome,
  isTaskKind,
  isTaskPriority,
  taskFeed,
} from '../services/managerDesk.js';

const router = Router();

router.use(requireStaff);

/* ── Shared helpers ──────────────────────────────────────────────────────── */

function actorOf(req: AuthRequest): PermissionActor {
  return req.user!;
}

/** null means "no restriction"; a number restricts to that person's listings. */
function scopeUserId(actor: PermissionActor): number | null {
  return actor.scope === 'own' ? actor.id : null;
}

function trimmed(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function intOrNull(value: unknown): number | null {
  if (value === null || value === '' || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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
    console.error('Desk activity log error:', err);
  }
}

/** Ids that exist, are staff and are still active. */
async function activeStaffIds(ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), inArray(users.role, STAFF_ROLES), eq(users.isActive, true)));
  return new Set(rows.map(row => row.id));
}

function fail(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

/* ── Badge counters for the desk navigation ──────────────────────────────── */

router.get('/summary', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const mine = scopeUserId(actor);

    const [unassigned] = can(actor, 'listings.assign')
      ? await db.select({ count: count() }).from(properties).where(isNull(properties.assignedToUserId))
      : [{ count: 0 }];

    const [pending] = can(actor, 'listings.moderate')
      ? await db.select({ count: count() }).from(properties).where(eq(properties.moderationStatus, 'pending'))
      : [{ count: 0 }];

    const [breached] = can(actor, 'listings.moderate')
      ? await db
        .select({ count: count() })
        .from(properties)
        .where(and(
          eq(properties.moderationStatus, 'pending'),
          sql`coalesce(${properties.moderationRequestedAt}, ${properties.createdAt})
              < now() - make_interval(hours => ${MODERATION_SLA_HOURS})`,
        ))
      : [{ count: 0 }];

    const callbackScope = mine === null
      ? sql`true`
      : sql`(${properties.createdByUserId} = ${mine} or ${properties.assignedToUserId} = ${mine})`;

    const [callbacks] = await db
      .select({ count: count() })
      .from(properties)
      .where(and(
        sql`(${properties.lifecycleState} in ('old', 'new_r')
             or (${properties.nextFollowUpAt} is not null and ${properties.nextFollowUpAt} <= current_date))`,
        callbackScope,
      ));

    const [overdueTasks] = await db
      .select({ count: count() })
      .from(listingTasks)
      .where(and(
        eq(listingTasks.status, 'open'),
        sql`${listingTasks.dueAt} is not null and ${listingTasks.dueAt} < current_date`,
        mine === null ? sql`true` : eq(listingTasks.assignedToUserId, mine),
      ));

    const [myTasks] = await db
      .select({ count: count() })
      .from(listingTasks)
      .where(and(eq(listingTasks.status, 'open'), eq(listingTasks.assignedToUserId, actor.id)));

    res.json({
      unassigned: Number(unassigned.count),
      pendingModeration: Number(pending.count),
      slaBreached: Number(breached.count),
      callbacksDue: Number(callbacks.count),
      overdueTasks: Number(overdueTasks.count),
      myOpenTasks: Number(myTasks.count),
    });
  } catch (err) {
    console.error('Desk summary error:', err);
    fail(res, 500, 'Server error');
  }
});

/** Staff shortlist for assignee pickers and @mentions. */
router.get('/staff-options', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        jobTitle: users.jobTitle,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(inArray(users.role, STAFF_ROLES), eq(users.isActive, true)))
      .orderBy(asc(users.name));

    res.json({ data: rows });
  } catch (err) {
    console.error('Staff options error:', err);
    fail(res, 500, 'Server error');
  }
});

/** Type-ahead for pickers that need to point at a listing. */
router.get('/listing-search', requirePermission('listings.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const term = trimmed(req.query.q, 80);
    const mine = scopeUserId(actorOf(req));
    const like = `%${term.toLowerCase()}%`;

    const rows = await db
      .select({
        id: properties.id,
        title: properties.title,
        city: properties.city,
        district: properties.district,
        images: properties.images,
        lifecycleState: properties.lifecycleState,
      })
      .from(properties)
      .where(and(
        term
          ? sql`(lower(${properties.title}) like ${like} or lower(${properties.id}) like ${like}
                 or lower(coalesce(${properties.district}, '')) like ${like})`
          : undefined,
        mine === null
          ? undefined
          : sql`(${properties.createdByUserId} = ${mine} or ${properties.assignedToUserId} = ${mine})`,
      ))
      .orderBy(sql`${properties.updatedAt} desc nulls last`)
      .limit(25);

    res.json({
      data: rows.map(row => ({ ...row, image: row.images?.[0] ?? null, images: undefined })),
    });
  } catch (err) {
    console.error('Listing search error:', err);
    fail(res, 500, 'Server error');
  }
});

/* ── Assignment desk ─────────────────────────────────────────────────────── */

router.get('/assignment', requirePermission('listings.assign'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [staff, listings] = await Promise.all([
      assignableStaff(),
      assignmentListings({ limit: 500 }),
    ]);

    res.json({
      staff,
      listings,
      unassigned: listings.filter(row => row.assignedToUserId === null).map(row => row.id),
    });
  } catch (err) {
    console.error('Assignment board error:', err);
    fail(res, 500, 'Server error');
  }
});

/**
 * Bulk assign / reassign / unassign. One endpoint drives drag-and-drop, the
 * multi-select bar and the "clear assignee" action.
 */
router.post('/assign', requirePermission('listings.assign'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids = Array.isArray(req.body?.propertyIds)
      ? req.body.propertyIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0).slice(0, 200)
      : [];

    if (ids.length === 0) {
      fail(res, 400, 'აირჩიეთ მინიმუმ ერთი განცხადება');
      return;
    }

    const assignedToUserId = intOrNull(req.body?.assignedToUserId);

    if (assignedToUserId !== null && !(await activeStaffIds([assignedToUserId])).has(assignedToUserId)) {
      fail(res, 400, 'აირჩიეთ აქტიური თანამშრომელი');
      return;
    }

    const existing = await db
      .select({ id: properties.id, title: properties.title, assignedToUserId: properties.assignedToUserId })
      .from(properties)
      .where(inArray(properties.id, ids));

    if (existing.length === 0) {
      fail(res, 404, 'განცხადებები ვერ მოიძებნა');
      return;
    }

    const changing = existing.filter(row => row.assignedToUserId !== assignedToUserId);
    if (changing.length === 0) {
      res.json({ updated: 0, data: [] });
      return;
    }

    const updated = await db
      .update(properties)
      .set({
        assignedToUserId,
        assignedByUserId: assignedToUserId === null ? null : req.user!.id,
        assignedAt: assignedToUserId === null ? null : new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(properties.id, changing.map(row => row.id)))
      .returning({ id: properties.id, assignedToUserId: properties.assignedToUserId, assignedAt: properties.assignedAt });

    await logActivity(req, assignedToUserId === null ? 'listing.unassign' : 'listing.assign', 'property', null, {
      propertyIds: changing.map(row => row.id),
      assignedToUserId,
    });

    res.json({ updated: updated.length, data: updated });
  } catch (err) {
    console.error('Assign error:', err);
    fail(res, 500, 'Server error');
  }
});

/* ── Call-back / lifecycle desk ──────────────────────────────────────────── */

router.get('/callbacks', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const rows = await callbackQueue(scopeUserId(actor));

    // Owner phone is PII — hand it out only to actors cleared for it.
    const data = rows.map(row => sanitizeListingFor(actor, row as unknown as Record<string, unknown>));

    res.json({
      data,
      buckets: {
        expired: rows.filter(row => row.lifecycleState === 'new_r').length,
        followUpDue: rows.filter(row => row.daysUntilFollowUp !== null && row.daysUntilFollowUp <= 0).length,
        expiringSoon: rows.filter(row =>
          row.lifecycleState === 'old' && row.daysUntilExpiry !== null && row.daysUntilExpiry >= 0 && row.daysUntilExpiry <= 30,
        ).length,
        neverCalled: rows.filter(row => row.lastCallAt === null).length,
      },
    });
  } catch (err) {
    console.error('Callback queue error:', err);
    fail(res, 500, 'Server error');
  }
});

router.get('/listings/:id/calls', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const propertyId = String(req.params.id);
    const [listing] = await db
      .select({ createdByUserId: properties.createdByUserId, assignedToUserId: properties.assignedToUserId })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!listing) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    const mine = scopeUserId(actorOf(req));
    if (mine !== null && listing.createdByUserId !== mine && listing.assignedToUserId !== mine) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    res.json({ data: await callLogsFor(propertyId) });
  } catch (err) {
    console.error('Call log read error:', err);
    fail(res, 500, 'Server error');
  }
});

/**
 * Records an owner call. The listing keeps a denormalised "last call" and the
 * next follow-up date so the desk can sort without touching the journal.
 */
router.post('/listings/:id/calls', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const propertyId = String(req.params.id);
    const outcome = req.body?.outcome;

    if (!isCallOutcome(outcome)) {
      fail(res, 400, 'აირჩიეთ ზარის შედეგი');
      return;
    }

    const [listing] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!listing) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    const mine = scopeUserId(actor);
    if (mine !== null && listing.createdByUserId !== mine && listing.assignedToUserId !== mine) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    const note = trimmed(req.body?.note, 1000);
    const followUpAt = asDateOnly(req.body?.followUpAt);
    const phone = trimmed(req.body?.phone, 50) || listing.owner?.phone || null;
    const now = new Date();

    const [logged] = await db
      .insert(listingCallLogs)
      .values({
        propertyId,
        actorUserId: actor.id,
        actorName: actor.name,
        outcome,
        phone,
        note: note || null,
        followUpAt,
      })
      .returning();

    const updates: Record<string, unknown> = {
      lastCallAt: now,
      lastCallOutcome: outcome,
      nextFollowUpAt: followUpAt,
      updatedAt: now,
    };

    // A call is the natural moment to move the listing on — if allowed.
    const nextState = req.body?.lifecycleState;
    if (typeof nextState === 'string' && nextState && nextState !== listing.lifecycleState) {
      if (!can(actor, 'listings.lifecycle')) {
        fail(res, 403, 'სტატუსის შეცვლის უფლება არ გაქვთ');
        return;
      }
      Object.assign(updates, buildLifecycleFields({ ...req.body, lifecycleNote: note || listing.lifecycleNote }, listing));
    }

    const [updated] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, propertyId))
      .returning();

    await logActivity(req, 'listing.call', 'property', propertyId, { outcome, followUpAt });

    res.json({
      call: logged,
      listing: sanitizeListingFor(actor, updated as unknown as Record<string, unknown>),
    });
  } catch (err) {
    console.error('Call log error:', err);
    fail(res, 500, 'Server error');
  }
});

/* ── Moderation inbox ────────────────────────────────────────────────────── */

const DEFAULT_TEMPLATES: { kind: 'approve' | 'reject'; label: string; body: string; sortOrder: number }[] = [
  { kind: 'approve', label: 'ყველაფერი რიგზეა', body: 'განცხადება შემოწმებულია და გამოქვეყნებულია. მადლობა!', sortOrder: 10 },
  { kind: 'approve', label: 'გამოქვეყნდა მცირე კორექტირებით', body: 'განცხადება გამოქვეყნებულია. ჩვენ დავაზუსტეთ მისამართი და კატეგორია.', sortOrder: 20 },
  { kind: 'reject', label: 'ფოტოები არასაკმარისია', body: 'ფოტოები ბუნდოვანია ან არ ასახავს ობიექტს. გთხოვთ ატვირთოთ მინიმუმ 5 ნათელი ფოტო დღის სინათლეზე.', sortOrder: 30 },
  { kind: 'reject', label: 'ფასი არარეალურია', body: 'მითითებული ფასი მნიშვნელოვნად განსხვავდება ბაზრის ფასისგან. გთხოვთ დააზუსტოთ.', sortOrder: 40 },
  { kind: 'reject', label: 'აღწერაში კონტაქტებია', body: 'აღწერაში მითითებულია ტელეფონი ან ბმული. გთხოვთ ამოიღოთ — მყიდველი ფორმიდან დაგიკავშირდებათ.', sortOrder: 50 },
  { kind: 'reject', label: 'მისამართი არასრულია', body: 'რაიონი ან მისამართი არ არის მითითებული სწორად. გთხოვთ დააზუსტოთ ლოკაცია რუკაზე.', sortOrder: 60 },
  { kind: 'reject', label: 'დუბლიკატი', body: 'ასეთი განცხადება უკვე არსებობს საიტზე. გთხოვთ დაარედაქტიროთ არსებული.', sortOrder: 70 },
  { kind: 'reject', label: 'მესაკუთრე ვერ დაგვიდასტურა', body: 'ვერ დავუკავშირდით მითითებულ ნომერზე. გთხოვთ დააზუსტოთ საკონტაქტო ინფორმაცია.', sortOrder: 80 },
];

/** Ships the panel with usable wording on first open, without a re-seed. */
async function ensureTemplates() {
  const [existing] = await db.select({ count: count() }).from(moderationTemplates);
  if (Number(existing.count) === 0) {
    await db.insert(moderationTemplates).values(DEFAULT_TEMPLATES);
  }
  return db
    .select()
    .from(moderationTemplates)
    .where(eq(moderationTemplates.isActive, true))
    .orderBy(asc(moderationTemplates.sortOrder), asc(moderationTemplates.id));
}

router.get('/moderation/templates', requirePermission('listings.moderate'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ data: await ensureTemplates(), checks: MODERATION_CHECKS });
  } catch (err) {
    console.error('Templates read error:', err);
    fail(res, 500, 'Server error');
  }
});

router.post('/moderation/templates', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const kind = req.body?.kind === 'approve' ? 'approve' : 'reject';
    const label = trimmed(req.body?.label, 160);
    const body = trimmed(req.body?.body, 600);

    if (!label || !body) {
      fail(res, 400, 'სათაური და ტექსტი სავალდებულოა');
      return;
    }

    const [created] = await db
      .insert(moderationTemplates)
      .values({ kind, label, body, sortOrder: Number(req.body?.sortOrder) || 100 })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Template create error:', err);
    fail(res, 500, 'Server error');
  }
});

router.delete('/moderation/templates/:id', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = intOrNull(req.params.id);
    if (id === null) {
      fail(res, 400, 'არასწორი id');
      return;
    }
    await db.update(moderationTemplates).set({ isActive: false }).where(eq(moderationTemplates.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error('Template delete error:', err);
    fail(res, 500, 'Server error');
  }
});

/** The queue itself: submissions with waiting time, submitter and photo count. */
router.get('/moderation', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requested = typeof req.query.status === 'string' ? req.query.status : 'pending';
    const allowed = ['pending', 'changes_requested', 'rejected', 'approved', 'draft'];
    const status = allowed.includes(requested) ? requested : 'pending';

    const rows = await db
      .select({
        property: properties,
        submitterId: users.id,
        submitterName: users.name,
        submitterEmail: users.email,
        submitterPhone: users.phone,
        submitterCreatedAt: users.createdAt,
        waitingHours: sql<number>`
          round(extract(epoch from (
            now() - coalesce(${properties.moderationRequestedAt}, ${properties.createdAt})
          )) / 3600.0, 1)`,
      })
      .from(properties)
      .leftJoin(users, eq(users.id, properties.createdByUserId))
      .where(eq(properties.moderationStatus, status))
      .orderBy(asc(sql`coalesce(${properties.moderationRequestedAt}, ${properties.createdAt})`))
      .limit(200);

    const submitterIds = [...new Set(rows.map(row => row.submitterId).filter((id): id is number => typeof id === 'number'))];

    // How many listings this member already had approved — trust signal for the reviewer.
    const historyRows = submitterIds.length
      ? await db
        .select({
          userId: properties.createdByUserId,
          approved: sql<number>`count(*) filter (where ${properties.moderationStatus} = 'approved')::int`,
          rejected: sql<number>`count(*) filter (where ${properties.moderationStatus} = 'rejected')::int`,
        })
        .from(properties)
        .where(inArray(properties.createdByUserId, submitterIds))
        .groupBy(properties.createdByUserId)
      : [];

    const historyById = new Map(historyRows.map(row => [Number(row.userId), row]));
    const actor = actorOf(req);

    res.json({
      status,
      slaHours: MODERATION_SLA_HOURS,
      checks: MODERATION_CHECKS,
      data: rows.map(row => {
        const history = row.submitterId === null ? undefined : historyById.get(row.submitterId);
        const waitingHours = Number(row.waitingHours) || 0;
        return {
          ...sanitizeListingFor(actor, row.property as unknown as Record<string, unknown>),
          waitingHours,
          slaBreached: status === 'pending' && waitingHours > MODERATION_SLA_HOURS,
          photoCount: row.property.images?.length ?? 0,
          submitter: row.submitterId === null ? null : {
            id: row.submitterId,
            name: row.submitterName,
            email: row.submitterEmail,
            phone: row.submitterPhone,
            memberSince: row.submitterCreatedAt,
            approvedCount: Number(history?.approved ?? 0),
            rejectedCount: Number(history?.rejected ?? 0),
          },
        };
      }),
    });
  } catch (err) {
    console.error('Moderation inbox error:', err);
    fail(res, 500, 'Server error');
  }
});

const DECISION_STATUS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  changes: 'changes_requested',
};

/**
 * One decision endpoint for all three outcomes. "changes" sends the listing back
 * to the member with a reason instead of killing it outright.
 */
router.post('/moderation/:id/decision', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const decision = String(req.body?.decision ?? '');
    const nextStatus = DECISION_STATUS[decision];

    if (!nextStatus) {
      fail(res, 400, 'decision უნდა იყოს approve, reject ან changes');
      return;
    }

    const propertyId = String(req.params.id);
    const [existing] = await db
      .select({ id: properties.id, title: properties.title, createdByUserId: properties.createdByUserId })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!existing) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    const note = trimmed(req.body?.note, 500);
    if (decision !== 'approve' && !note) {
      fail(res, 400, 'მიზეზის მითითება სავალდებულოა');
      return;
    }

    const checklist: Record<string, boolean> = {};
    const rawChecklist = req.body?.checklist;
    if (rawChecklist && typeof rawChecklist === 'object') {
      for (const key of MODERATION_CHECK_KEYS) {
        if (key in (rawChecklist as Record<string, unknown>)) {
          checklist[key] = Boolean((rawChecklist as Record<string, unknown>)[key]);
        }
      }
    }

    const [updated] = await db
      .update(properties)
      .set({
        moderationStatus: nextStatus,
        moderationNote: note || null,
        moderationChecklist: checklist,
        moderatedByUserId: req.user!.id,
        moderatedAt: new Date(),
        // Sending it back reopens the clock the moment the member resubmits.
        moderationRequestedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, propertyId))
      .returning();

    await logActivity(req, `listing.moderate.${decision}`, 'property', propertyId, {
      title: existing.title,
      note,
      checklist,
    });

    res.json(sanitizeListingFor(actorOf(req), updated as unknown as Record<string, unknown>));
  } catch (err) {
    console.error('Moderation decision error:', err);
    fail(res, 500, 'Server error');
  }
});

/** Bulk approve — only for submissions that pass every checklist item. */
router.post('/moderation/bulk-approve', requirePermission('listings.moderate'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ids = Array.isArray(req.body?.propertyIds)
      ? req.body.propertyIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 100)
      : [];

    if (ids.length === 0) {
      fail(res, 400, 'აირჩიეთ მინიმუმ ერთი განცხადება');
      return;
    }

    const note = trimmed(req.body?.note, 500);
    const updated = await db
      .update(properties)
      .set({
        moderationStatus: 'approved',
        moderationNote: note || null,
        moderatedByUserId: req.user!.id,
        moderatedAt: new Date(),
        moderationRequestedAt: null,
        updatedAt: new Date(),
      })
      .where(and(inArray(properties.id, ids), ne(properties.moderationStatus, 'approved')))
      .returning({ id: properties.id });

    await logActivity(req, 'listing.moderate.bulkApprove', 'property', null, {
      propertyIds: updated.map(row => row.id),
    });

    res.json({ updated: updated.length, ids: updated.map(row => row.id) });
  } catch (err) {
    console.error('Bulk approve error:', err);
    fail(res, 500, 'Server error');
  }
});

/* ── Tasks ───────────────────────────────────────────────────────────────── */

router.get('/tasks', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const seesTeam = can(actor, 'listings.tasksAll') && actor.scope !== 'own';

    const statusParam = String(req.query.status ?? 'open');
    const status = ['open', 'done', 'cancelled', 'all'].includes(statusParam)
      ? (statusParam as 'open' | 'done' | 'cancelled' | 'all')
      : 'open';

    const data = await taskFeed({
      status,
      assigneeId: intOrNull(req.query.assignee),
      propertyId: typeof req.query.propertyId === 'string' && req.query.propertyId ? req.query.propertyId : undefined,
      overdueOnly: req.query.overdue === '1' || req.query.overdue === 'true',
      scopedToUserId: seesTeam ? null : actor.id,
      limit: 300,
    });

    res.json({ data, seesTeam });
  } catch (err) {
    console.error('Task feed error:', err);
    fail(res, 500, 'Server error');
  }
});

router.post('/tasks', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const propertyId = trimmed(req.body?.propertyId, 50);
    const title = trimmed(req.body?.title, 300);

    if (!propertyId || !title) {
      fail(res, 400, 'განცხადება და დავალების სათაური სავალდებულოა');
      return;
    }

    const [listing] = await db
      .select({ id: properties.id, createdByUserId: properties.createdByUserId, assignedToUserId: properties.assignedToUserId })
      .from(properties)
      .where(eq(properties.id, propertyId));

    if (!listing) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    const mine = scopeUserId(actor);
    if (mine !== null && listing.createdByUserId !== mine && listing.assignedToUserId !== mine) {
      fail(res, 404, 'განცხადება ვერ მოიძებნა');
      return;
    }

    // Only someone who can reassign work may point a task at another person.
    let assignedToUserId = intOrNull(req.body?.assignedToUserId);
    if (assignedToUserId !== null && assignedToUserId !== actor.id && !can(actor, 'listings.assign')) {
      fail(res, 403, 'სხვა თანამშრომელზე დავალების მიბმის უფლება არ გაქვთ');
      return;
    }
    if (assignedToUserId === null) assignedToUserId = actor.id;

    const mentionIds: number[] = Array.isArray(req.body?.mentionedUserIds)
      ? [...new Set(
        (req.body.mentionedUserIds as unknown[])
          .map(id => Number(id))
          .filter(id => Number.isInteger(id) && id > 0),
      )].slice(0, 10)
      : [];

    const valid = await activeStaffIds([assignedToUserId, ...mentionIds]);
    if (!valid.has(assignedToUserId)) {
      fail(res, 400, 'აირჩიეთ აქტიური თანამშრომელი');
      return;
    }

    const [created] = await db
      .insert(listingTasks)
      .values({
        propertyId,
        title,
        kind: isTaskKind(req.body?.kind) ? req.body.kind : 'other',
        priority: isTaskPriority(req.body?.priority) ? req.body.priority : 'normal',
        assignedToUserId,
        mentionedUserIds: mentionIds.filter((id: number) => valid.has(id) && id !== assignedToUserId),
        dueAt: asDateOnly(req.body?.dueAt),
        note: trimmed(req.body?.note, 4000) || null,
        createdByUserId: actor.id,
        createdByName: actor.name,
      })
      .returning();

    await logActivity(req, 'task.create', 'property', propertyId, { taskId: created.id, title, assignedToUserId });

    const [hydrated] = await taskFeed({ status: 'all', propertyId, limit: 300 })
      .then(rows => rows.filter(row => row.id === created.id));

    res.status(201).json(hydrated ?? created);
  } catch (err) {
    console.error('Task create error:', err);
    fail(res, 500, 'Server error');
  }
});

router.patch('/tasks/:id', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const id = intOrNull(req.params.id);
    if (id === null) {
      fail(res, 400, 'არასწორი id');
      return;
    }

    const [task] = await db.select().from(listingTasks).where(eq(listingTasks.id, id));
    if (!task) {
      fail(res, 404, 'დავალება ვერ მოიძებნა');
      return;
    }

    const owns = task.assignedToUserId === actor.id || task.createdByUserId === actor.id;
    if (!owns && !can(actor, 'listings.assign')) {
      fail(res, 403, 'ამ დავალების შეცვლის უფლება არ გაქვთ');
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof req.body?.status === 'string' && ['open', 'done', 'cancelled'].includes(req.body.status)) {
      updates.status = req.body.status;
      if (req.body.status === 'done') {
        updates.completedAt = new Date();
        updates.completedByUserId = actor.id;
        updates.completedByName = actor.name;
      } else {
        updates.completedAt = null;
        updates.completedByUserId = null;
        updates.completedByName = null;
      }
    }

    if ('title' in (req.body ?? {})) {
      const title = trimmed(req.body.title, 300);
      if (!title) {
        fail(res, 400, 'სათაური სავალდებულოა');
        return;
      }
      updates.title = title;
    }

    if ('note' in (req.body ?? {})) updates.note = trimmed(req.body.note, 4000) || null;
    if ('dueAt' in (req.body ?? {})) updates.dueAt = asDateOnly(req.body.dueAt);
    if (isTaskKind(req.body?.kind)) updates.kind = req.body.kind;
    if (isTaskPriority(req.body?.priority)) updates.priority = req.body.priority;

    if ('assignedToUserId' in (req.body ?? {})) {
      if (!can(actor, 'listings.assign')) {
        fail(res, 403, 'გადაბმის უფლება არ გაქვთ');
        return;
      }
      const next = intOrNull(req.body.assignedToUserId);
      if (next === null || !(await activeStaffIds([next])).has(next)) {
        fail(res, 400, 'აირჩიეთ აქტიური თანამშრომელი');
        return;
      }
      updates.assignedToUserId = next;
    }

    await db.update(listingTasks).set(updates).where(eq(listingTasks.id, id));
    await logActivity(req, 'task.update', 'property', task.propertyId, { taskId: id, ...updates });

    const [hydrated] = await taskFeed({ status: 'all', propertyId: task.propertyId, limit: 300 })
      .then(rows => rows.filter(row => row.id === id));

    res.json(hydrated ?? { ...task, ...updates });
  } catch (err) {
    console.error('Task update error:', err);
    fail(res, 500, 'Server error');
  }
});

router.delete('/tasks/:id', requirePermission('listings.tasks'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const actor = actorOf(req);
    const id = intOrNull(req.params.id);
    if (id === null) {
      fail(res, 400, 'არასწორი id');
      return;
    }

    const [task] = await db.select().from(listingTasks).where(eq(listingTasks.id, id));
    if (!task) {
      fail(res, 404, 'დავალება ვერ მოიძებნა');
      return;
    }

    if (task.createdByUserId !== actor.id && !can(actor, 'listings.assign')) {
      fail(res, 403, 'წაშლის უფლება არ გაქვთ');
      return;
    }

    await db.delete(listingTasks).where(eq(listingTasks.id, id));
    await logActivity(req, 'task.delete', 'property', task.propertyId, { taskId: id, title: task.title });
    res.json({ success: true });
  } catch (err) {
    console.error('Task delete error:', err);
    fail(res, 500, 'Server error');
  }
});

/* ── Broker performance ──────────────────────────────────────────────────── */

router.get('/performance', requirePermission('analytics.full'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await brokerPerformance();

    const totals = rows.reduce(
      (acc, row) => ({
        liveListings: acc.liveListings + row.liveListings,
        totalViews: acc.totalViews + row.totalViews,
        needsAttention: acc.needsAttention + row.needsAttention,
        overdueTasks: acc.overdueTasks + row.overdueTasks,
        callsLast30: acc.callsLast30 + row.callsLast30,
        dealsLast90: acc.dealsLast90 + row.dealsLast90,
      }),
      { liveListings: 0, totalViews: 0, needsAttention: 0, overdueTasks: 0, callsLast30: 0, dealsLast90: 0 },
    );

    res.json({ data: rows, totals, generatedAt: new Date().toISOString(), actorRole: req.user!.role });
  } catch (err) {
    console.error('Performance board error:', err);
    fail(res, 500, 'Server error');
  }
});

export default router;
