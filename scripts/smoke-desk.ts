/**
 * End-to-end check of the manager desk against a running server.
 *
 *   npm run dev:server          # in one terminal
 *   npm run verify:desk
 *
 * Creates a throwaway manager, broker and member, then walks every desk feature:
 * assignment, the call-back queue, moderation with checklist and templates, tasks
 * with mentions and due dates, and the performance board. Cleans up after itself.
 */

import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001';
const SUPER_EMAIL = process.env.SMOKE_SUPER_EMAIL ?? 'admin@tbilisirealtor.ge';
const SUPER_PASSWORD = process.env.SMOKE_SUPER_PASSWORD ?? 'TbilisiAdmin2024!';

const stamp = Date.now().toString(36);
const PASSWORD = 'SmokeDesk123!';

interface Result { name: string; ok: boolean; detail: string }
const results: Result[] = [];

function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(
  path: string,
  { token, method = 'GET', body }: { token?: string; method?: string; body?: unknown } = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function login(email: string, password: string) {
  const res = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.data)}`);
  return { token: res.data.token as string, user: res.data.user };
}

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const created: { staff: number[]; members: number[]; listings: string[] } =
    { staff: [], members: [], listings: [] };

  const su = await login(SUPER_EMAIL, SUPER_PASSWORD);
  check('super admin logs in', Boolean(su.token));

  try {
    /* ── Cast ─────────────────────────────────────────────────────────── */

    const managerRes = await api('/api/admin/staff', {
      token: su.token,
      method: 'POST',
      body: {
        email: `desk-manager-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Desk Manager',
        role: 'manager',
      },
    });
    check('manager created', managerRes.status === 201, JSON.stringify(managerRes.data?.error ?? ''));
    created.staff.push(managerRes.data.id);

    const brokerRes = await api('/api/admin/staff', {
      token: su.token,
      method: 'POST',
      body: {
        email: `desk-broker-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Desk Broker',
        role: 'broker',
      },
    });
    check('broker created', brokerRes.status === 201, JSON.stringify(brokerRes.data?.error ?? ''));
    created.staff.push(brokerRes.data.id);

    const manager = await login(`desk-manager-${stamp}@example.com`, PASSWORD);
    const broker = await login(`desk-broker-${stamp}@example.com`, PASSWORD);

    check(
      'manager template includes the new desk permissions',
      manager.user.permissions.includes('listings.tasks')
      && manager.user.permissions.includes('listings.tasksAll'),
      manager.user.permissions.filter((k: string) => k.startsWith('listings.task')).join(', '),
    );
    check(
      'broker gets listings.tasks but not the team-wide feed',
      broker.user.permissions.includes('listings.tasks')
      && !broker.user.permissions.includes('listings.tasksAll'),
    );

    const memberRes = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email: `desk-member-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Desk Member',
        phone: '+995599111222',
      },
    });
    check('member registers', memberRes.status === 201,
      `HTTP ${memberRes.status} ${JSON.stringify(memberRes.data?.error ?? '')}`);
    const member = { token: memberRes.data.token as string, user: memberRes.data.user };
    created.members.push(member.user.id);

    /* ── Listings to work with ────────────────────────────────────────── */

    const rentalRes = await api('/api/admin/properties', {
      token: su.token,
      method: 'POST',
      body: {
        title: `Desk rental ${stamp}`,
        price: 900,
        rentPrice: 900,
        status: 'rent',
        type: 'apartment',
        city: 'თბილისი',
        district: 'ვაკე',
        area: 60,
        owner: { name: 'Owner Otari', phone: '+995555000111' },
        lifecycleState: 'old',
        rentTermMonths: 1,
        rentStartedAt: isoDaysFromNow(-60),
      },
    });
    check('parked rental created', rentalRes.status === 201, JSON.stringify(rentalRes.data?.error ?? ''));
    created.listings.push(rentalRes.data.id);
    check(
      'an already-expired term lands in "new_r" immediately',
      rentalRes.data.lifecycleState === 'new_r',
      rentalRes.data.lifecycleState,
    );

    const plainRes = await api('/api/admin/properties', {
      token: su.token,
      method: 'POST',
      body: {
        title: `Desk listing ${stamp}`,
        price: 150000,
        status: 'sale',
        type: 'apartment',
        city: 'თბილისი',
        district: 'საბურთალო',
        area: 75,
      },
    });
    created.listings.push(plainRes.data.id);

    /* ── Assignment ───────────────────────────────────────────────────── */

    const board = await api('/api/admin/desk/assignment', { token: manager.token });
    check('manager reads the assignment board', board.status === 200);
    check(
      'the new listing shows up unassigned',
      board.data?.unassigned?.includes(plainRes.data.id),
      `${board.data?.unassigned?.length} unassigned`,
    );
    check(
      'the board lists the broker as assignable',
      board.data?.staff?.some((s: any) => s.id === brokerRes.data.id),
    );

    const brokerDenied = await api('/api/admin/desk/assignment', { token: broker.token });
    check('broker cannot open the assignment board', brokerDenied.status === 403, `HTTP ${brokerDenied.status}`);

    const assigned = await api('/api/admin/desk/assign', {
      token: manager.token,
      method: 'POST',
      body: { propertyIds: [plainRes.data.id, rentalRes.data.id], assignedToUserId: brokerRes.data.id },
    });
    check('bulk assign to a broker', assigned.status === 200 && assigned.data.updated === 2,
      `updated ${assigned.data?.updated}`);

    const reAssign = await api('/api/admin/desk/assign', {
      token: manager.token,
      method: 'POST',
      body: { propertyIds: [plainRes.data.id], assignedToUserId: brokerRes.data.id },
    });
    check('re-assigning to the same broker is a no-op', reAssign.data?.updated === 0);

    const unassign = await api('/api/admin/desk/assign', {
      token: manager.token,
      method: 'POST',
      body: { propertyIds: [plainRes.data.id], assignedToUserId: null },
    });
    check('unassign clears the broker', unassign.data?.updated === 1);

    const badAssign = await api('/api/admin/desk/assign', {
      token: manager.token,
      method: 'POST',
      body: { propertyIds: [plainRes.data.id], assignedToUserId: 999999 },
    });
    check('assigning to a non-existent user is rejected', badAssign.status === 400, `HTTP ${badAssign.status}`);

    const brokerAssign = await api('/api/admin/desk/assign', {
      token: broker.token,
      method: 'POST',
      body: { propertyIds: [plainRes.data.id], assignedToUserId: brokerRes.data.id },
    });
    check('broker cannot assign listings', brokerAssign.status === 403, `HTTP ${brokerAssign.status}`);

    /* ── Call-back desk ───────────────────────────────────────────────── */

    const queue = await api('/api/admin/desk/callbacks', { token: manager.token });
    check('manager reads the call-back queue', queue.status === 200);
    const rental = queue.data?.data?.find((row: any) => row.id === rentalRes.data.id);
    check('the expired rental is queued', Boolean(rental));
    check('manager sees the owner phone', rental?.owner?.phone === '+995555000111', rental?.owner?.phone ?? 'missing');
    check('queue counts expired terms', (queue.data?.buckets?.expired ?? 0) >= 1,
      JSON.stringify(queue.data?.buckets));

    const call = await api(`/api/admin/desk/listings/${rentalRes.data.id}/calls`, {
      token: manager.token,
      method: 'POST',
      body: {
        outcome: 'interested',
        note: 'მესაკუთრე კიდევ გააქირავებს, დაგვირეკავს',
        followUpAt: isoDaysFromNow(3),
      },
    });
    check('a call is logged', call.status === 200 && call.data?.call?.outcome === 'interested',
      JSON.stringify(call.data?.error ?? ''));
    check('the follow-up date lands on the listing', call.data?.listing?.nextFollowUpAt === isoDaysFromNow(3),
      call.data?.listing?.nextFollowUpAt ?? 'missing');

    const badOutcome = await api(`/api/admin/desk/listings/${rentalRes.data.id}/calls`, {
      token: manager.token,
      method: 'POST',
      body: { outcome: 'made-up' },
    });
    check('an unknown call outcome is rejected', badOutcome.status === 400);

    const afterCall = await api('/api/admin/desk/callbacks', { token: manager.token });
    const refreshed = afterCall.data?.data?.find((row: any) => row.id === rentalRes.data.id);
    check('the queue shows who called and what was said',
      refreshed?.lastCall?.actorName === 'Desk Manager' && Boolean(refreshed?.lastCall?.note),
      refreshed?.lastCall?.actorName ?? 'missing');

    const journal = await api(`/api/admin/desk/listings/${rentalRes.data.id}/calls`, { token: manager.token });
    check('the call journal reads back', journal.data?.data?.length === 1, `${journal.data?.data?.length} entries`);

    const brokerQueue = await api('/api/admin/desk/callbacks', { token: broker.token });
    check('broker only sees their own call-backs',
      brokerQueue.status === 200
      && brokerQueue.data.data.every((row: any) => row.id === rentalRes.data.id),
      `${brokerQueue.data?.data?.length} rows`);

    /* ── Moderation ───────────────────────────────────────────────────── */

    const submitted = await api('/api/account/my-listings', {
      token: member.token,
      method: 'POST',
      body: {
        title: `Member submission ${stamp}`,
        price: 88000,
        area: 48,
        type: 'apartment',
        status: 'sale',
        district: 'ისანი',
        images: ['https://example.com/a.jpg'],
      },
    });
    check('member submits a listing', submitted.status === 201, JSON.stringify(submitted.data?.error ?? ''));
    created.listings.push(submitted.data.id);
    check('the submission starts pending', submitted.data.moderationStatus === 'pending');

    const templates = await api('/api/admin/desk/moderation/templates', { token: manager.token });
    check('moderation templates ship with defaults', (templates.data?.data?.length ?? 0) >= 6,
      `${templates.data?.data?.length} templates`);
    check('the checklist comes with the templates', (templates.data?.checks?.length ?? 0) >= 5);

    const inbox = await api('/api/admin/desk/moderation?status=pending', { token: manager.token });
    const queued = inbox.data?.data?.find((row: any) => row.id === submitted.data.id);
    check('the submission reaches the inbox', Boolean(queued));
    check('the inbox reports the waiting time', typeof queued?.waitingHours === 'number',
      `${queued?.waitingHours} h`);
    check('a fresh submission is not SLA-breached', queued?.slaBreached === false);
    check('the inbox counts the photos', queued?.photoCount === 1, `${queued?.photoCount}`);
    check('the inbox carries the submitter with their history',
      queued?.submitter?.email === `desk-member-${stamp}@example.com`
      && typeof queued?.submitter?.approvedCount === 'number');

    const noReason = await api(`/api/admin/desk/moderation/${submitted.data.id}/decision`, {
      token: manager.token,
      method: 'POST',
      body: { decision: 'changes' },
    });
    check('sending back without a reason is rejected', noReason.status === 400);

    const sentBack = await api(`/api/admin/desk/moderation/${submitted.data.id}/decision`, {
      token: manager.token,
      method: 'POST',
      body: {
        decision: 'changes',
        note: 'ატვირთეთ მინიმუმ 5 ფოტო',
        checklist: { photos: false, price: true, address: true },
      },
    });
    check('send back to member with a reason',
      sentBack.status === 200 && sentBack.data.moderationStatus === 'changes_requested',
      sentBack.data?.moderationStatus ?? JSON.stringify(sentBack.data?.error));
    check('the checklist verdicts are stored',
      sentBack.data?.moderationChecklist?.photos === false
      && sentBack.data?.moderationChecklist?.price === true,
      JSON.stringify(sentBack.data?.moderationChecklist));

    const memberView = await api('/api/account/my-listings', { token: member.token });
    const mine = memberView.data?.data?.find((row: any) => row.id === submitted.data.id);
    check('the member is told why it came back',
      mine?.moderationStatus === 'changes_requested' && mine?.moderationNote === 'ატვირთეთ მინიმუმ 5 ფოტო',
      mine?.moderationNote ?? 'missing');
    check('call-desk internals never reach the member',
      !('lastCallAt' in (mine ?? {})) && !('nextFollowUpAt' in (mine ?? {})));

    const resubmitted = await api(`/api/account/my-listings/${submitted.data.id}`, {
      token: member.token,
      method: 'PUT',
      body: { ...mine, images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'] },
    });
    check('editing puts it back in the queue', resubmitted.data?.moderationStatus === 'pending');
    check('the SLA clock restarts on resubmission', Boolean(resubmitted.data?.moderationRequestedAt));

    const approved = await api(`/api/admin/desk/moderation/${submitted.data.id}/decision`, {
      token: manager.token,
      method: 'POST',
      body: { decision: 'approve', checklist: { photos: true, price: true } },
    });
    check('approve publishes it', approved.data?.moderationStatus === 'approved');

    const publicView = await api(`/api/properties/${submitted.data.id}`);
    check('the approved listing is public', publicView.status === 200);
    check('moderation internals are stripped from the public payload',
      publicView.status === 200
      && !('moderationStatus' in publicView.data)
      && !('moderationChecklist' in publicView.data)
      && !('nextFollowUpAt' in publicView.data));

    const brokerModerate = await api('/api/admin/desk/moderation', { token: broker.token });
    check('broker cannot open the moderation inbox', brokerModerate.status === 403, `HTTP ${brokerModerate.status}`);

    /* ── Tasks ────────────────────────────────────────────────────────── */

    const task = await api('/api/admin/desk/tasks', {
      token: manager.token,
      method: 'POST',
      body: {
        propertyId: rentalRes.data.id,
        title: 'დაურეკე მესაკუთრეს პარასკევს',
        kind: 'call',
        priority: 'high',
        assignedToUserId: brokerRes.data.id,
        dueAt: isoDaysFromNow(-2),
        note: 'გადაამოწმე ფასი @Desk Manager',
        mentionedUserIds: [managerRes.data.id],
      },
    });
    check('manager creates a task for the broker', task.status === 201,
      JSON.stringify(task.data?.error ?? ''));
    check('the task keeps the assignee, due date and mention',
      task.data?.assignedToUserId === brokerRes.data.id
      && task.data?.dueAt === isoDaysFromNow(-2)
      && task.data?.mentionedUserIds?.includes(managerRes.data.id),
      JSON.stringify({ due: task.data?.dueAt, mentions: task.data?.mentionedUserIds }));
    check('an overdue task reports negative days', task.data?.daysUntilDue < 0, `${task.data?.daysUntilDue}`);

    const overdue = await api('/api/admin/desk/tasks?status=open&overdue=1', { token: manager.token });
    check('the overdue feed spans the team',
      overdue.data?.seesTeam === true
      && overdue.data.data.some((row: any) => row.id === task.data.id),
      `${overdue.data?.data?.length} overdue`);

    const brokerTasks = await api('/api/admin/desk/tasks', { token: broker.token });
    check('broker sees the task assigned to them',
      brokerTasks.data?.seesTeam === false
      && brokerTasks.data.data.some((row: any) => row.id === task.data.id));

    const brokerSteal = await api(`/api/admin/desk/tasks/${task.data.id}`, {
      token: broker.token,
      method: 'PATCH',
      body: { assignedToUserId: managerRes.data.id },
    });
    check('broker cannot hand their task to someone else', brokerSteal.status === 403,
      `HTTP ${brokerSteal.status}`);

    const done = await api(`/api/admin/desk/tasks/${task.data.id}`, {
      token: broker.token,
      method: 'PATCH',
      body: { status: 'done' },
    });
    check('broker completes their own task',
      done.status === 200 && done.data.status === 'done' && done.data.completedByName === 'Desk Broker',
      done.data?.completedByName ?? JSON.stringify(done.data?.error));

    const reopened = await api(`/api/admin/desk/tasks/${task.data.id}`, {
      token: manager.token,
      method: 'PATCH',
      body: { status: 'open', dueAt: isoDaysFromNow(5) },
    });
    check('reopening clears the completion stamp',
      reopened.data?.status === 'open' && reopened.data?.completedAt === null);
    check('the due date can be pushed out', reopened.data?.dueAt === isoDaysFromNow(5));

    const search = await api(`/api/admin/desk/listing-search?q=${encodeURIComponent(`Desk rental ${stamp}`)}`, {
      token: manager.token,
    });
    check('the listing picker finds the rental',
      search.data?.data?.some((row: any) => row.id === rentalRes.data.id),
      `${search.data?.data?.length} hits`);

    /* ── Summary and performance ──────────────────────────────────────── */

    const summary = await api('/api/admin/desk/summary', { token: manager.token });
    check('the summary counts every queue',
      summary.status === 200
      && typeof summary.data.unassigned === 'number'
      && typeof summary.data.callbacksDue === 'number'
      && typeof summary.data.overdueTasks === 'number',
      JSON.stringify(summary.data));

    const brokerSummary = await api('/api/admin/desk/summary', { token: broker.token });
    check('a broker summary hides the queues they cannot act on',
      brokerSummary.data?.unassigned === 0 && brokerSummary.data?.pendingModeration === 0,
      JSON.stringify(brokerSummary.data));

    const perf = await api('/api/admin/desk/performance', { token: manager.token });
    check('manager reads the performance board', perf.status === 200);
    const brokerRow = perf.data?.data?.find((row: any) => row.userId === brokerRes.data.id);
    check('the broker appears on the board', Boolean(brokerRow));
    check('the rental counts towards the broker it is assigned to',
      brokerRow?.needsAttention >= 1,
      `needsAttention ${brokerRow?.needsAttention}`);
    check('last activity is derived from real events', Boolean(brokerRow?.lastActivityAt));
    check('the board totals up', typeof perf.data?.totals?.liveListings === 'number',
      JSON.stringify(perf.data?.totals));

    const brokerPerf = await api('/api/admin/desk/performance', { token: broker.token });
    check('broker cannot read the performance board', brokerPerf.status === 403, `HTTP ${brokerPerf.status}`);

    const deleted = await api(`/api/admin/desk/tasks/${task.data.id}`, {
      token: manager.token,
      method: 'DELETE',
    });
    check('the task can be deleted', deleted.status === 200);
  } finally {
    /* ── Cleanup ──────────────────────────────────────────────────────── */
    for (const id of created.listings) {
      await api(`/api/admin/properties/${id}`, { token: su.token, method: 'DELETE' });
    }
    for (const id of created.staff) {
      await api(`/api/admin/staff/${id}`, { token: su.token, method: 'DELETE' });
    }
    for (const id of created.members) {
      await api(`/api/admin/members/${id}`, { token: su.token, method: 'DELETE' });
    }
    console.log('\ncleanup done');
  }

  const failed = results.filter(result => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const result of failed) console.log(`  · ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
