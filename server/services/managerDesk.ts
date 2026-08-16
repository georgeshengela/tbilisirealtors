/**
 * Read models for the manager desk: who carries which listing, which owners are
 * due a call, what the team owes, and how each broker is actually performing.
 *
 * Every query here is read-only and returns plain rows; permission filtering and
 * PII stripping stay in the route layer so there is exactly one place that decides
 * what an actor is allowed to see.
 */
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../db.js';
import { listingCallLogs, listingTasks, properties, users } from '../schema.js';
import { STAFF_ROLES } from '../permissions.js';

/** Lifecycle states that mean "somebody has to pick up the phone". */
export const CALLBACK_STATES = ['old', 'new_r'] as const;

export const CALL_OUTCOMES = [
  'reached',
  'no_answer',
  'interested',
  'not_interested',
  'rented_elsewhere',
  'wrong_number',
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export function isCallOutcome(value: unknown): value is CallOutcome {
  return typeof value === 'string' && (CALL_OUTCOMES as readonly string[]).includes(value);
}

export const TASK_KINDS = ['call', 'visit', 'photo', 'document', 'price', 'other'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export function isTaskKind(value: unknown): value is TaskKind {
  return typeof value === 'string' && (TASK_KINDS as readonly string[]).includes(value);
}

export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value);
}

/** The checklist a reviewer ticks off before publishing a member submission. */
export const MODERATION_CHECKS = [
  { key: 'photos', label: 'ფოტოები ნათელია და ობიექტს შეესაბამება' },
  { key: 'address', label: 'მისამართი და რაიონი სწორია' },
  { key: 'price', label: 'ფასი რეალისტურია ბაზრისთვის' },
  { key: 'description', label: 'აღწერა სრულია, კონტაქტების გარეშე' },
  { key: 'area', label: 'ფართი და ოთახები შეესაბამება ფოტოებს' },
  { key: 'contact', label: 'განმცხადებელთან დაკავშირება შესაძლებელია' },
] as const;

export const MODERATION_CHECK_KEYS = MODERATION_CHECKS.map(item => item.key);

/** Hours a submission may wait before the queue flags it as breached. */
export const MODERATION_SLA_HOURS = 24;

const staffRoleFilter = inArray(users.role, STAFF_ROLES);

/** A listing belongs to whoever it is assigned to, falling back to its creator. */
const ownerUserId = sql<number | null>`coalesce(${properties.assignedToUserId}, ${properties.createdByUserId})`;

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/* ── Assignment desk ─────────────────────────────────────────────────────── */

export interface AssignableStaff {
  id: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  jobTitle: string | null;
  assignedCount: number;
  liveCount: number;
  attentionCount: number;
  openTasks: number;
}

/** Staff who can carry listings, with their current load. */
export async function assignableStaff(): Promise<AssignableStaff[]> {
  const [staff, loadRows, taskRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        scope: users.scope,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        isActive: users.isActive,
        jobTitle: users.jobTitle,
      })
      .from(users)
      .where(staffRoleFilter)
      .orderBy(users.name),

    db
      .select({
        userId: properties.assignedToUserId,
        assignedCount: sql<number>`count(*)::int`,
        liveCount: sql<number>`count(*) filter (where ${properties.lifecycleState} in ('new', 'current'))::int`,
        attentionCount: sql<number>`count(*) filter (where ${properties.lifecycleState} in ('old', 'new_r'))::int`,
      })
      .from(properties)
      .where(sql`${properties.assignedToUserId} is not null`)
      .groupBy(properties.assignedToUserId),

    db
      .select({
        userId: listingTasks.assignedToUserId,
        openTasks: sql<number>`count(*)::int`,
      })
      .from(listingTasks)
      .where(and(eq(listingTasks.status, 'open'), sql`${listingTasks.assignedToUserId} is not null`))
      .groupBy(listingTasks.assignedToUserId),
  ]);

  const loadById = new Map(loadRows.map(row => [row.userId, row]));
  const tasksById = new Map(taskRows.map(row => [row.userId, row]));

  return staff.map(member => {
    const load = loadById.get(member.id);
    return {
      ...member,
      assignedCount: num(load?.assignedCount),
      liveCount: num(load?.liveCount),
      attentionCount: num(load?.attentionCount),
      openTasks: num(tasksById.get(member.id)?.openTasks),
    };
  });
}

export interface AssignmentListingRow {
  id: string;
  title: string;
  price: string | null;
  rentPrice: string | null;
  status: string | null;
  type: string | null;
  city: string | null;
  district: string | null;
  images: string[] | null;
  viewCount: number | null;
  lifecycleState: string;
  moderationStatus: string;
  createdAt: Date | null;
  assignedToUserId: number | null;
  assignedAt: Date | null;
  createdByUserId: number | null;
  assigneeName: string | null;
  creatorName: string | null;
}

const assignmentColumns = {
  id: properties.id,
  title: properties.title,
  price: properties.price,
  rentPrice: properties.rentPrice,
  status: properties.status,
  type: properties.type,
  city: properties.city,
  district: properties.district,
  images: properties.images,
  viewCount: properties.viewCount,
  lifecycleState: properties.lifecycleState,
  moderationStatus: properties.moderationStatus,
  createdAt: properties.createdAt,
  assignedToUserId: properties.assignedToUserId,
  assignedAt: properties.assignedAt,
  createdByUserId: properties.createdByUserId,
};

const assigneeUser = alias(users, 'assignee_user');
const creatorUser = alias(users, 'creator_user');

/**
 * Listings for the assignment board. `unassignedOnly` powers the intake queue;
 * the full list powers the per-broker columns.
 */
export async function assignmentListings(options: {
  unassignedOnly?: boolean;
  limit?: number;
} = {}): Promise<AssignmentListingRow[]> {
  return db
    .select({
      ...assignmentColumns,
      assigneeName: assigneeUser.name,
      creatorName: creatorUser.name,
    })
    .from(properties)
    .leftJoin(assigneeUser, eq(assigneeUser.id, properties.assignedToUserId))
    .leftJoin(creatorUser, eq(creatorUser.id, properties.createdByUserId))
    .where(options.unassignedOnly ? isNull(properties.assignedToUserId) : undefined)
    .orderBy(desc(properties.createdAt))
    .limit(options.limit ?? 400);
}

/* ── Call-back desk ──────────────────────────────────────────────────────── */

export interface CallbackRow {
  id: string;
  title: string;
  price: string | null;
  rentPrice: string | null;
  status: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  images: string[] | null;
  owner: unknown;
  lifecycleState: string;
  lifecycleNote: string | null;
  rentStartedAt: string | null;
  rentExpiresAt: string | null;
  rentTermMonths: number | null;
  lastCallAt: Date | null;
  lastCallOutcome: string | null;
  nextFollowUpAt: string | null;
  assignedToUserId: number | null;
  createdByUserId: number | null;
  assigneeName: string | null;
  /** Negative when the term / follow-up is already overdue. */
  daysUntilExpiry: number | null;
  daysUntilFollowUp: number | null;
  lastCall: {
    outcome: string;
    note: string | null;
    actorName: string | null;
    createdAt: Date | null;
    followUpAt: string | null;
  } | null;
}

/**
 * Everything that needs an owner call: parked rentals, expired terms, and any
 * listing whose scheduled follow-up has come due.
 */
export async function callbackQueue(scopedToUserId: number | null): Promise<CallbackRow[]> {
  const scope = scopedToUserId === null
    ? undefined
    : or(
      eq(properties.createdByUserId, scopedToUserId),
      eq(properties.assignedToUserId, scopedToUserId),
    );

  const due = or(
    inArray(properties.lifecycleState, [...CALLBACK_STATES]),
    sql`${properties.nextFollowUpAt} is not null and ${properties.nextFollowUpAt} <= current_date`,
  );

  const rows = await db
    .select({
      id: properties.id,
      title: properties.title,
      price: properties.price,
      rentPrice: properties.rentPrice,
      status: properties.status,
      city: properties.city,
      district: properties.district,
      address: properties.address,
      images: properties.images,
      owner: properties.owner,
      lifecycleState: properties.lifecycleState,
      lifecycleNote: properties.lifecycleNote,
      rentStartedAt: properties.rentStartedAt,
      rentExpiresAt: properties.rentExpiresAt,
      rentTermMonths: properties.rentTermMonths,
      lastCallAt: properties.lastCallAt,
      lastCallOutcome: properties.lastCallOutcome,
      nextFollowUpAt: properties.nextFollowUpAt,
      assignedToUserId: properties.assignedToUserId,
      createdByUserId: properties.createdByUserId,
      assigneeName: users.name,
      daysUntilExpiry: sql<number | null>`
        case when ${properties.rentExpiresAt} is null then null
        else (${properties.rentExpiresAt} - current_date) end`,
      daysUntilFollowUp: sql<number | null>`
        case when ${properties.nextFollowUpAt} is null then null
        else (${properties.nextFollowUpAt} - current_date) end`,
    })
    .from(properties)
    .leftJoin(users, eq(users.id, properties.assignedToUserId))
    .where(scope ? and(due, scope) : due)
    .orderBy(properties.rentExpiresAt, desc(properties.updatedAt))
    .limit(300);

  if (rows.length === 0) return [];

  const latestCalls = await db
    .select({
      propertyId: listingCallLogs.propertyId,
      outcome: listingCallLogs.outcome,
      note: listingCallLogs.note,
      actorName: listingCallLogs.actorName,
      createdAt: listingCallLogs.createdAt,
      followUpAt: listingCallLogs.followUpAt,
      rank: sql<number>`row_number() over (
        partition by ${listingCallLogs.propertyId}
        order by ${listingCallLogs.createdAt} desc
      )`,
    })
    .from(listingCallLogs)
    .where(inArray(listingCallLogs.propertyId, rows.map(row => row.id)));

  const lastByProperty = new Map<string, CallbackRow['lastCall']>();
  for (const call of latestCalls) {
    if (Number(call.rank) !== 1) continue;
    lastByProperty.set(call.propertyId, {
      outcome: call.outcome,
      note: call.note,
      actorName: call.actorName,
      createdAt: call.createdAt,
      followUpAt: call.followUpAt,
    });
  }

  return rows.map(row => ({
    ...row,
    daysUntilExpiry: row.daysUntilExpiry === null ? null : num(row.daysUntilExpiry),
    daysUntilFollowUp: row.daysUntilFollowUp === null ? null : num(row.daysUntilFollowUp),
    lastCall: lastByProperty.get(row.id) ?? null,
  }));
}

export async function callLogsFor(propertyId: string) {
  return db
    .select()
    .from(listingCallLogs)
    .where(eq(listingCallLogs.propertyId, propertyId))
    .orderBy(desc(listingCallLogs.createdAt))
    .limit(50);
}

/* ── Tasks ───────────────────────────────────────────────────────────────── */

export interface TaskRow {
  id: number;
  propertyId: string;
  title: string;
  kind: string;
  status: string;
  priority: string;
  assignedToUserId: number | null;
  mentionedUserIds: number[] | null;
  dueAt: string | null;
  note: string | null;
  createdByName: string | null;
  completedByName: string | null;
  completedAt: Date | null;
  createdAt: Date | null;
  assigneeName: string | null;
  propertyTitle: string | null;
  propertyCity: string | null;
  propertyDistrict: string | null;
  propertyImage: string | null;
  /** Negative once the due date has passed. */
  daysUntilDue: number | null;
}

export interface TaskQuery {
  status?: 'open' | 'done' | 'cancelled' | 'all';
  assigneeId?: number | null;
  propertyId?: string;
  /** Restricts to listings the actor owns or tasks pointed at them. */
  scopedToUserId?: number | null;
  overdueOnly?: boolean;
  limit?: number;
}

export async function taskFeed(query: TaskQuery = {}): Promise<TaskRow[]> {
  const conditions = [];

  if (query.status && query.status !== 'all') {
    conditions.push(eq(listingTasks.status, query.status));
  }
  if (query.assigneeId !== undefined && query.assigneeId !== null) {
    conditions.push(eq(listingTasks.assignedToUserId, query.assigneeId));
  }
  if (query.propertyId) {
    conditions.push(eq(listingTasks.propertyId, query.propertyId));
  }
  if (query.overdueOnly) {
    conditions.push(sql`${listingTasks.dueAt} is not null and ${listingTasks.dueAt} < current_date`);
    conditions.push(eq(listingTasks.status, 'open'));
  }
  if (query.scopedToUserId != null) {
    const mine = query.scopedToUserId;
    conditions.push(or(
      eq(listingTasks.assignedToUserId, mine),
      eq(listingTasks.createdByUserId, mine),
      eq(properties.createdByUserId, mine),
      eq(properties.assignedToUserId, mine),
      sql`${listingTasks.mentionedUserIds} @> ${JSON.stringify([mine])}::jsonb`,
    ));
  }

  const rows = await db
    .select({
      id: listingTasks.id,
      propertyId: listingTasks.propertyId,
      title: listingTasks.title,
      kind: listingTasks.kind,
      status: listingTasks.status,
      priority: listingTasks.priority,
      assignedToUserId: listingTasks.assignedToUserId,
      mentionedUserIds: listingTasks.mentionedUserIds,
      dueAt: listingTasks.dueAt,
      note: listingTasks.note,
      createdByName: listingTasks.createdByName,
      completedByName: listingTasks.completedByName,
      completedAt: listingTasks.completedAt,
      createdAt: listingTasks.createdAt,
      assigneeName: users.name,
      propertyTitle: properties.title,
      propertyCity: properties.city,
      propertyDistrict: properties.district,
      propertyImage: sql<string | null>`${properties.images} -> 0`,
      daysUntilDue: sql<number | null>`
        case when ${listingTasks.dueAt} is null then null
        else (${listingTasks.dueAt} - current_date) end`,
    })
    .from(listingTasks)
    .leftJoin(properties, eq(properties.id, listingTasks.propertyId))
    .leftJoin(users, eq(users.id, listingTasks.assignedToUserId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      sql`case ${listingTasks.status} when 'open' then 0 else 1 end`,
      sql`${listingTasks.dueAt} asc nulls last`,
      desc(listingTasks.createdAt),
    )
    .limit(query.limit ?? 300);

  return rows.map(row => ({
    ...row,
    propertyImage: typeof row.propertyImage === 'string'
      ? row.propertyImage.replace(/^"|"$/g, '')
      : null,
    daysUntilDue: row.daysUntilDue === null ? null : num(row.daysUntilDue),
  }));
}

/* ── Broker performance ──────────────────────────────────────────────────── */

export interface BrokerPerformanceRow {
  userId: number;
  name: string;
  email: string;
  role: string;
  scope: string;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  liveListings: number;
  totalListings: number;
  totalViews: number;
  avgViews: number;
  needsAttention: number;
  pendingModeration: number;
  newLast30: number;
  dealsLast90: number;
  openTasks: number;
  overdueTasks: number;
  doneTasksLast30: number;
  callsLast30: number;
  lastCallAt: Date | null;
  lastListingUpdateAt: Date | null;
  lastActivityAt: Date | null;
}

/**
 * One row per staff member with the numbers a manager judges them on. Listings
 * count towards whoever they are assigned to, falling back to their creator.
 */
export async function brokerPerformance(): Promise<BrokerPerformanceRow[]> {
  const [staff, listingRows, taskRows, callRows] = await Promise.all([
    db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        scope: users.scope,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        jobTitle: users.jobTitle,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(staffRoleFilter),

    db
      .select({
        userId: sql<number>`${ownerUserId}`,
        totalListings: sql<number>`count(*)::int`,
        liveListings: sql<number>`count(*) filter (where ${properties.lifecycleState} in ('new', 'current'))::int`,
        needsAttention: sql<number>`count(*) filter (where ${properties.lifecycleState} in ('old', 'new_r'))::int`,
        pendingModeration: sql<number>`count(*) filter (where ${properties.moderationStatus} = 'pending')::int`,
        totalViews: sql<number>`coalesce(sum(${properties.viewCount}), 0)::int`,
        newLast30: sql<number>`count(*) filter (where ${properties.createdAt} >= now() - interval '30 days')::int`,
        dealsLast90: sql<number>`count(*) filter (
          where ${properties.lifecycleState} = 'old'
          and ${properties.lifecycleUpdatedAt} >= now() - interval '90 days'
        )::int`,
        lastListingUpdateAt: sql<Date | null>`max(${properties.updatedAt})`,
      })
      .from(properties)
      .where(sql`coalesce(${properties.assignedToUserId}, ${properties.createdByUserId}) is not null`)
      .groupBy(ownerUserId),

    db
      .select({
        userId: listingTasks.assignedToUserId,
        openTasks: sql<number>`count(*) filter (where ${listingTasks.status} = 'open')::int`,
        overdueTasks: sql<number>`count(*) filter (
          where ${listingTasks.status} = 'open'
          and ${listingTasks.dueAt} is not null
          and ${listingTasks.dueAt} < current_date
        )::int`,
        doneTasksLast30: sql<number>`count(*) filter (
          where ${listingTasks.status} = 'done'
          and ${listingTasks.completedAt} >= now() - interval '30 days'
        )::int`,
      })
      .from(listingTasks)
      .where(sql`${listingTasks.assignedToUserId} is not null`)
      .groupBy(listingTasks.assignedToUserId),

    db
      .select({
        userId: listingCallLogs.actorUserId,
        callsLast30: sql<number>`count(*) filter (where ${listingCallLogs.createdAt} >= now() - interval '30 days')::int`,
        lastCallAt: sql<Date | null>`max(${listingCallLogs.createdAt})`,
      })
      .from(listingCallLogs)
      .where(sql`${listingCallLogs.actorUserId} is not null`)
      .groupBy(listingCallLogs.actorUserId),
  ]);

  const listingsById = new Map(listingRows.map(row => [Number(row.userId), row]));
  const tasksById = new Map(taskRows.map(row => [Number(row.userId), row]));
  const callsById = new Map(callRows.map(row => [Number(row.userId), row]));

  const rows = staff.map(member => {
    const listings = listingsById.get(member.userId);
    const tasks = tasksById.get(member.userId);
    const calls = callsById.get(member.userId);

    const totalListings = num(listings?.totalListings);
    const totalViews = num(listings?.totalViews);
    const lastListingUpdateAt = listings?.lastListingUpdateAt ?? null;
    const lastCallAt = calls?.lastCallAt ?? null;

    const stamps = [member.lastLoginAt, lastListingUpdateAt, lastCallAt]
      .filter((value): value is Date => value instanceof Date);
    const lastActivityAt = stamps.length
      ? stamps.reduce((latest, value) => (value > latest ? value : latest))
      : null;

    return {
      ...member,
      totalListings,
      liveListings: num(listings?.liveListings),
      needsAttention: num(listings?.needsAttention),
      pendingModeration: num(listings?.pendingModeration),
      totalViews,
      avgViews: totalListings > 0 ? Math.round(totalViews / totalListings) : 0,
      newLast30: num(listings?.newLast30),
      dealsLast90: num(listings?.dealsLast90),
      openTasks: num(tasks?.openTasks),
      overdueTasks: num(tasks?.overdueTasks),
      doneTasksLast30: num(tasks?.doneTasksLast30),
      callsLast30: num(calls?.callsLast30),
      lastCallAt,
      lastListingUpdateAt,
      lastActivityAt,
    };
  });

  return rows.sort((a, b) => b.liveListings - a.liveListings || a.name.localeCompare(b.name));
}
