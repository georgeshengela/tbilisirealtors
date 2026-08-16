/**
 * Lead desk — everything that arrives from the public site and the pipeline it moves
 * through afterwards.
 *
 * Two rules shape this file:
 *  - A lead is worthless if nobody calls it back, so the response clock starts the
 *    moment it lands and every read model surfaces the breach.
 *  - Brokers only ever see the leads they hold, unless they carry `leads.viewAll`.
 */
import { client } from '../db.js';

export const LEAD_KINDS = ['contact', 'property', 'viewing', 'newsletter'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const LEAD_STAGES = ['new', 'contacted', 'viewing', 'offer', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_EVENT_KINDS = ['created', 'note', 'call', 'email', 'meeting', 'stage', 'assign'] as const;
export type LeadEventKind = (typeof LEAD_EVENT_KINDS)[number];

/** Stages that take a lead out of the working queue. */
const CLOSED_STAGES: LeadStage[] = ['won', 'lost'];

/** How long a brand-new lead may sit before the desk flags it as late. */
export const FIRST_RESPONSE_SLA_MINUTES = 120;

export const LEAD_KIND_LABELS: Record<LeadKind, string> = {
  contact: 'კონტაქტი',
  property: 'განცხადება',
  viewing: 'დათვალიერება',
  newsletter: 'გამოწერა',
};

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: 'ახალი',
  contacted: 'დაკავშირებული',
  viewing: 'დათვალიერება',
  offer: 'შეთავაზება',
  won: 'მოგებული',
  lost: 'დაკარგული',
};

export function isLeadKind(value: unknown): value is LeadKind {
  return typeof value === 'string' && (LEAD_KINDS as readonly string[]).includes(value);
}

export function isLeadStage(value: unknown): value is LeadStage {
  return typeof value === 'string' && (LEAD_STAGES as readonly string[]).includes(value);
}

export function isLeadEventKind(value: unknown): value is LeadEventKind {
  return typeof value === 'string' && (LEAD_EVENT_KINDS as readonly string[]).includes(value);
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface LeadRow {
  id: number;
  kind: LeadKind;
  name: string | null;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string | null;
  propertyId: string | null;
  propertyTitle: string | null;
  propertyPrice: number | null;
  preferredAt: string | null;
  sourceUrl: string | null;
  locale: string | null;
  stage: LeadStage;
  lostReason: string | null;
  assignedToUserId: number | null;
  assignedToName: string | null;
  assignedAt: string | null;
  firstResponseAt: string | null;
  nextFollowUpAt: string | null;
  closedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Minutes between arrival and first recorded contact, or until now if untouched. */
  responseMinutes: number;
  /** Unanswered past the SLA and still open. */
  slaBreached: boolean;
  eventCount: number;
}

export interface LeadEventRow {
  id: number;
  leadId: number;
  kind: LeadEventKind;
  body: string | null;
  meta: Record<string, unknown>;
  actorUserId: number | null;
  actorName: string | null;
  createdAt: string | null;
}

export interface LeadFilters {
  stage?: LeadStage | 'open' | 'all';
  kind?: LeadKind;
  assignedTo?: number | 'unassigned' | 'any';
  search?: string;
  breachedOnly?: boolean;
  /** Non-null forces the query down to one broker's leads. */
  scopedToUserId?: number | null;
  limit?: number;
}

function mapLead(row: Record<string, unknown>): LeadRow {
  return {
    id: num(row.id),
    kind: (String(row.kind) as LeadKind),
    name: (row.name as string) ?? null,
    phone: (row.phone as string) ?? null,
    email: (row.email as string) ?? null,
    subject: (row.subject as string) ?? null,
    message: (row.message as string) ?? null,
    propertyId: (row.property_id as string) ?? null,
    propertyTitle: (row.property_title as string) ?? null,
    propertyPrice: row.property_price != null ? num(row.property_price) : null,
    preferredAt: iso(row.preferred_at),
    sourceUrl: (row.source_url as string) ?? null,
    locale: (row.locale as string) ?? null,
    stage: (String(row.stage) as LeadStage),
    lostReason: (row.lost_reason as string) ?? null,
    assignedToUserId: row.assigned_to_user_id != null ? num(row.assigned_to_user_id) : null,
    assignedToName: (row.assigned_to_name as string) ?? null,
    assignedAt: iso(row.assigned_at),
    firstResponseAt: iso(row.first_response_at),
    nextFollowUpAt: row.next_follow_up_at ? String(row.next_follow_up_at).slice(0, 10) : null,
    closedAt: iso(row.closed_at),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    responseMinutes: num(row.response_minutes),
    slaBreached: Boolean(row.sla_breached),
    eventCount: num(row.event_count),
  };
}

/** Shared SELECT so the list, the detail view and the queue all agree on the shape. */
function leadSelect() {
  return client`
    l.id, l.kind, l.name, l.phone, l.email, l.subject, l.message,
    l.property_id, l.preferred_at, l.source_url, l.locale,
    l.stage, l.lost_reason,
    l.assigned_to_user_id, l.assigned_at, l.first_response_at,
    l.next_follow_up_at, l.closed_at, l.created_at, l.updated_at,
    u.name AS assigned_to_name,
    p.title AS property_title,
    p.price AS property_price,
    round(extract(epoch FROM (
      coalesce(l.first_response_at, now()) - l.created_at
    )) / 60)::int AS response_minutes,
    (
      l.first_response_at IS NULL
      AND l.stage NOT IN ('won', 'lost')
      AND l.created_at < now() - (${FIRST_RESPONSE_SLA_MINUTES} * interval '1 minute')
    ) AS sla_breached,
    (SELECT COUNT(*)::int FROM lead_events e WHERE e.lead_id = l.id) AS event_count
  `;
}

export async function listLeads(filters: LeadFilters): Promise<LeadRow[]> {
  let where = client`TRUE`;

  if (filters.scopedToUserId != null) {
    where = client`${where} AND l.assigned_to_user_id = ${filters.scopedToUserId}`;
  }

  if (filters.stage === 'open') {
    where = client`${where} AND l.stage NOT IN ('won', 'lost')`;
  } else if (filters.stage && filters.stage !== 'all') {
    where = client`${where} AND l.stage = ${filters.stage}`;
  }

  if (filters.kind) where = client`${where} AND l.kind = ${filters.kind}`;

  if (filters.assignedTo === 'unassigned') {
    where = client`${where} AND l.assigned_to_user_id IS NULL`;
  } else if (typeof filters.assignedTo === 'number') {
    where = client`${where} AND l.assigned_to_user_id = ${filters.assignedTo}`;
  }

  if (filters.breachedOnly) {
    where = client`${where}
      AND l.first_response_at IS NULL
      AND l.stage NOT IN ('won', 'lost')
      AND l.created_at < now() - (${FIRST_RESPONSE_SLA_MINUTES} * interval '1 minute')`;
  }

  if (filters.search) {
    const term = `%${filters.search.trim()}%`;
    where = client`${where} AND (
      l.name ILIKE ${term} OR l.phone ILIKE ${term} OR l.email ILIKE ${term}
      OR l.message ILIKE ${term} OR l.subject ILIKE ${term} OR l.property_id ILIKE ${term}
    )`;
  }

  const rows = await client<Record<string, unknown>[]>`
    SELECT ${leadSelect()}
    FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_to_user_id
    LEFT JOIN properties p ON p.id = l.property_id
    WHERE ${where}
    ORDER BY
      (l.stage NOT IN ('won','lost')) DESC,
      l.first_response_at IS NULL DESC,
      l.created_at DESC
    LIMIT ${Math.min(filters.limit ?? 200, 500)}
  `;

  return rows.map(mapLead);
}

export async function getLead(id: number, scopedToUserId: number | null): Promise<LeadRow | null> {
  let where = client`l.id = ${id}`;
  if (scopedToUserId != null) {
    where = client`${where} AND l.assigned_to_user_id = ${scopedToUserId}`;
  }

  const [row] = await client<Record<string, unknown>[]>`
    SELECT ${leadSelect()}
    FROM leads l
    LEFT JOIN users u ON u.id = l.assigned_to_user_id
    LEFT JOIN properties p ON p.id = l.property_id
    WHERE ${where}
    LIMIT 1
  `;

  return row ? mapLead(row) : null;
}

export async function leadEvents(leadId: number): Promise<LeadEventRow[]> {
  const rows = await client<Record<string, unknown>[]>`
    SELECT id, lead_id, kind, body, meta, actor_user_id, actor_name, created_at
    FROM lead_events
    WHERE lead_id = ${leadId}
    ORDER BY created_at DESC, id DESC
    LIMIT 200
  `;

  return rows.map(row => ({
    id: num(row.id),
    leadId: num(row.lead_id),
    kind: String(row.kind) as LeadEventKind,
    body: (row.body as string) ?? null,
    meta: (row.meta as Record<string, unknown>) ?? {},
    actorUserId: row.actor_user_id != null ? num(row.actor_user_id) : null,
    actorName: (row.actor_name as string) ?? null,
    createdAt: iso(row.created_at),
  }));
}

export async function addLeadEvent(input: {
  leadId: number;
  kind: LeadEventKind;
  body?: string | null;
  meta?: Record<string, unknown>;
  actorUserId?: number | null;
  actorName?: string | null;
}): Promise<void> {
  await client`
    INSERT INTO lead_events (lead_id, kind, body, meta, actor_user_id, actor_name)
    VALUES (
      ${input.leadId}, ${input.kind}, ${input.body ?? null},
      ${JSON.stringify(input.meta ?? {})}::jsonb,
      ${input.actorUserId ?? null}, ${input.actorName ?? null}
    )
  `;
}

export interface CreateLeadInput {
  kind: LeadKind;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  propertyId?: string | null;
  preferredAt?: Date | null;
  sourceUrl?: string | null;
  locale?: string | null;
}

/**
 * Writes the enquiry and opens its timeline. Called from the public endpoint, so it
 * assumes the caller has already validated and trimmed the payload.
 */
export async function createLead(input: CreateLeadInput): Promise<number> {
  // postgres.js cannot infer a parameter type for a bare Date here, so hand it an
  // ISO string and let the cast do the work.
  const preferred = input.preferredAt ? input.preferredAt.toISOString() : null;

  const [row] = await client<{ id: number }[]>`
    INSERT INTO leads (
      kind, name, phone, email, subject, message,
      property_id, preferred_at, source_url, locale
    ) VALUES (
      ${input.kind}, ${input.name ?? null}, ${input.phone ?? null}, ${input.email ?? null},
      ${input.subject ?? null}, ${input.message ?? null},
      ${input.propertyId ?? null}, ${preferred}::timestamp,
      ${input.sourceUrl ?? null}, ${input.locale ?? null}
    )
    RETURNING id
  `;

  await addLeadEvent({
    leadId: row.id,
    kind: 'created',
    body: `ლიდი მიღებულია — ${LEAD_KIND_LABELS[input.kind]}`,
    meta: { propertyId: input.propertyId ?? null, sourceUrl: input.sourceUrl ?? null },
  });

  return row.id;
}

/** Marks the response clock the first time anyone actually contacts the lead. */
export async function markFirstResponse(leadId: number): Promise<void> {
  await client`
    UPDATE leads
    SET first_response_at = now(), updated_at = now()
    WHERE id = ${leadId} AND first_response_at IS NULL
  `;
}

export async function assignLead(
  leadId: number,
  toUserId: number | null,
  actor: { id: number; name: string },
): Promise<void> {
  await client`
    UPDATE leads
    SET assigned_to_user_id = ${toUserId},
        assigned_by_user_id = ${actor.id},
        assigned_at = ${toUserId ? client`now()` : null},
        updated_at = now()
    WHERE id = ${leadId}
  `;

  let targetName: string | null = null;
  if (toUserId) {
    const [u] = await client<{ name: string }[]>`SELECT name FROM users WHERE id = ${toUserId}`;
    targetName = u?.name ?? null;
  }

  await addLeadEvent({
    leadId,
    kind: 'assign',
    body: toUserId ? `გადაეცა: ${targetName ?? toUserId}` : 'მინიჭება მოიხსნა',
    meta: { toUserId },
    actorUserId: actor.id,
    actorName: actor.name,
  });
}

export async function setLeadStage(
  leadId: number,
  stage: LeadStage,
  actor: { id: number; name: string },
  lostReason?: string | null,
): Promise<void> {
  const closing = CLOSED_STAGES.includes(stage);

  await client`
    UPDATE leads
    SET stage = ${stage},
        lost_reason = ${stage === 'lost' ? (lostReason ?? null) : null},
        closed_at = ${closing ? client`now()` : null},
        first_response_at = coalesce(first_response_at, ${stage === 'new' ? null : client`now()`}),
        updated_at = now()
    WHERE id = ${leadId}
  `;

  await addLeadEvent({
    leadId,
    kind: 'stage',
    body: `სტატუსი: ${LEAD_STAGE_LABELS[stage]}${lostReason ? ` — ${lostReason}` : ''}`,
    meta: { stage },
    actorUserId: actor.id,
    actorName: actor.name,
  });
}

export async function setLeadFollowUp(leadId: number, date: string | null): Promise<void> {
  await client`
    UPDATE leads
    SET next_follow_up_at = ${date}, updated_at = now()
    WHERE id = ${leadId}
  `;
}

/* ── Read models for the board ────────────────────────────────────────────── */

export interface LeadStats {
  total: number;
  open: number;
  unassigned: number;
  newToday: number;
  new7d: number;
  breached: number;
  dueFollowUp: number;
  won30d: number;
  lost30d: number;
  /** Won / (won + lost) over the last 90 days, percent. */
  conversionRate: number;
  /** Median minutes to first response over the last 30 days. */
  medianResponseMinutes: number;
  slaMinutes: number;
  byStage: { stage: LeadStage; label: string; count: number }[];
  byKind: { kind: LeadKind; label: string; count: number }[];
}

export async function leadStats(scopedToUserId: number | null): Promise<LeadStats> {
  let scope = client`TRUE`;
  if (scopedToUserId != null) scope = client`assigned_to_user_id = ${scopedToUserId}`;

  const [row] = await client<Record<string, unknown>[]>`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE stage NOT IN ('won','lost'))::int AS open,
      COUNT(*) FILTER (WHERE assigned_to_user_id IS NULL AND stage NOT IN ('won','lost'))::int AS unassigned,
      COUNT(*) FILTER (WHERE created_at >= current_date)::int AS new_today,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new_7d,
      COUNT(*) FILTER (
        WHERE first_response_at IS NULL
          AND stage NOT IN ('won','lost')
          AND created_at < now() - (${FIRST_RESPONSE_SLA_MINUTES} * interval '1 minute')
      )::int AS breached,
      COUNT(*) FILTER (
        WHERE next_follow_up_at IS NOT NULL
          AND next_follow_up_at <= current_date
          AND stage NOT IN ('won','lost')
      )::int AS due_follow_up,
      COUNT(*) FILTER (WHERE stage = 'won' AND closed_at >= now() - interval '30 days')::int AS won_30d,
      COUNT(*) FILTER (WHERE stage = 'lost' AND closed_at >= now() - interval '30 days')::int AS lost_30d,
      COUNT(*) FILTER (WHERE stage = 'won' AND closed_at >= now() - interval '90 days')::int AS won_90d,
      COUNT(*) FILTER (WHERE stage = 'lost' AND closed_at >= now() - interval '90 days')::int AS lost_90d,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM (first_response_at - created_at)) / 60
      ) FILTER (
        WHERE first_response_at IS NOT NULL AND created_at >= now() - interval '30 days'
      )), 0)::int AS median_response
    FROM leads
    WHERE ${scope}
  `;

  const stageRows = await client<Record<string, unknown>[]>`
    SELECT stage, COUNT(*)::int AS count FROM leads WHERE ${scope} GROUP BY stage
  `;
  const kindRows = await client<Record<string, unknown>[]>`
    SELECT kind, COUNT(*)::int AS count FROM leads WHERE ${scope} GROUP BY kind
  `;

  const stageMap = new Map(stageRows.map(r => [String(r.stage), num(r.count)]));
  const kindMap = new Map(kindRows.map(r => [String(r.kind), num(r.count)]));

  const won90 = num(row?.won_90d);
  const lost90 = num(row?.lost_90d);

  return {
    total: num(row?.total),
    open: num(row?.open),
    unassigned: num(row?.unassigned),
    newToday: num(row?.new_today),
    new7d: num(row?.new_7d),
    breached: num(row?.breached),
    dueFollowUp: num(row?.due_follow_up),
    won30d: num(row?.won_30d),
    lost30d: num(row?.lost_30d),
    conversionRate: won90 + lost90 > 0 ? Math.round((won90 / (won90 + lost90)) * 1000) / 10 : 0,
    medianResponseMinutes: num(row?.median_response),
    slaMinutes: FIRST_RESPONSE_SLA_MINUTES,
    byStage: LEAD_STAGES.map(stage => ({
      stage,
      label: LEAD_STAGE_LABELS[stage],
      count: stageMap.get(stage) ?? 0,
    })),
    byKind: LEAD_KINDS.map(kind => ({
      kind,
      label: LEAD_KIND_LABELS[kind],
      count: kindMap.get(kind) ?? 0,
    })),
  };
}

export interface LeadBrokerLoad {
  userId: number;
  name: string;
  email: string;
  role: string;
  openLeads: number;
  breached: number;
  won30d: number;
  lost30d: number;
  conversionRate: number;
  medianResponseMinutes: number;
}

/** Per-broker lead load, used by the assignment panel and round-robin. */
export async function leadBrokerLoad(): Promise<LeadBrokerLoad[]> {
  const rows = await client<Record<string, unknown>[]>`
    SELECT
      u.id, u.name, u.email, u.role,
      COUNT(l.id) FILTER (WHERE l.stage NOT IN ('won','lost'))::int AS open_leads,
      COUNT(l.id) FILTER (
        WHERE l.first_response_at IS NULL
          AND l.stage NOT IN ('won','lost')
          AND l.created_at < now() - (${FIRST_RESPONSE_SLA_MINUTES} * interval '1 minute')
      )::int AS breached,
      COUNT(l.id) FILTER (WHERE l.stage = 'won'  AND l.closed_at >= now() - interval '30 days')::int AS won_30d,
      COUNT(l.id) FILTER (WHERE l.stage = 'lost' AND l.closed_at >= now() - interval '30 days')::int AS lost_30d,
      coalesce(round(percentile_cont(0.5) WITHIN GROUP (
        ORDER BY extract(epoch FROM (l.first_response_at - l.created_at)) / 60
      ) FILTER (WHERE l.first_response_at IS NOT NULL)), 0)::int AS median_response
    FROM users u
    LEFT JOIN leads l ON l.assigned_to_user_id = u.id
    WHERE u.is_active = true AND u.role IN ('broker', 'manager', 'admin', 'super_admin')
    GROUP BY u.id, u.name, u.email, u.role
    ORDER BY open_leads ASC, u.name ASC
  `;

  return rows.map(r => {
    const won = num(r.won_30d);
    const lost = num(r.lost_30d);
    return {
      userId: num(r.id),
      name: String(r.name),
      email: String(r.email),
      role: String(r.role),
      openLeads: num(r.open_leads),
      breached: num(r.breached),
      won30d: won,
      lost30d: lost,
      conversionRate: won + lost > 0 ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
      medianResponseMinutes: num(r.median_response),
    };
  });
}

/**
 * Spreads every unassigned open lead across the given brokers, always handing the
 * next one to whoever currently holds the fewest.
 */
export async function autoAssignLeads(
  brokerIds: number[],
  actor: { id: number; name: string },
): Promise<number> {
  if (brokerIds.length === 0) return 0;

  const pending = await client<{ id: number }[]>`
    SELECT id FROM leads
    WHERE assigned_to_user_id IS NULL AND stage NOT IN ('won','lost')
    ORDER BY created_at ASC
  `;
  if (pending.length === 0) return 0;

  const load = await leadBrokerLoad();
  const counts = new Map<number, number>();
  for (const id of brokerIds) {
    counts.set(id, load.find(b => b.userId === id)?.openLeads ?? 0);
  }

  for (const lead of pending) {
    let target = brokerIds[0];
    for (const id of brokerIds) {
      if ((counts.get(id) ?? 0) < (counts.get(target) ?? 0)) target = id;
    }
    await assignLead(lead.id, target, actor);
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }

  return pending.length;
}

/** Hides contact details from staff who lack `leads.contact`. */
export function sanitizeLead(lead: LeadRow, canSeeContact: boolean): LeadRow {
  if (canSeeContact) return lead;
  return { ...lead, phone: null, email: null };
}
