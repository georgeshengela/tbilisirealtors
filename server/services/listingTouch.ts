/**
 * "Who last touched this listing": a staff edit, price or status change, call,
 * moderation decision, etc. System jobs (photo re-stamps, view counts, expiry
 * sweeps) never stamp it, so the admin date column only moves when a person acts.
 */

export const TOUCH_ACTIONS = [
  'create', 'edit', 'price', 'status', 'owner', 'notes', 'contracts', 'flags',
  'call', 'moderation', 'assign', 'cadastral', 'member_edit',
] as const;
export type TouchAction = (typeof TOUCH_ACTIONS)[number];

export interface TouchFields {
  touchedAt: Date;
  touchedByUserId: number | null;
  touchedByName: string | null;
  touchAction: TouchAction;
}

export function touchedBy(
  actor: { id?: number | null; name?: string | null; email?: string | null } | null | undefined,
  action: TouchAction,
  at: Date = new Date(),
): TouchFields {
  return {
    touchedAt: at,
    touchedByUserId: actor?.id ?? null,
    touchedByName: (actor?.name || actor?.email || '').trim().slice(0, 255) || null,
    touchAction: action,
  };
}

/** Names the inline table edit (PATCH body) by its most meaningful field. */
export function patchTouchAction(body: Record<string, unknown>): TouchAction {
  const has = (...keys: string[]) => keys.some(key => key in body);
  if (has('price', 'rentPrice')) return 'price';
  if (has('lifecycleState', 'lifecycleOutcome', 'rentExpiresAt', 'rentTermMonths', 'rentStartedAt', 'lifecycleDealPrice')) return 'status';
  if (has('owner')) return 'owner';
  if (has('contracts')) return 'contracts';
  if (has('internalNotes')) return 'notes';
  if (has('isFeatured', 'isNew', 'isPremium')) return 'flags';
  return 'edit';
}
