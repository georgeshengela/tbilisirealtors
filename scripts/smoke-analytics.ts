/**
 * End-to-end check of the analytics reports and the admin-only floor.
 *
 *   npm run dev:server          # in one terminal
 *   npm run verify:analytics
 *
 * Creates a throwaway manager, broker and member, then walks the three reports
 * (district funnel, broker leaderboard, import quality) and proves the four
 * irreversible actions stay with admins even when the permission is handed over
 * explicitly. Cleans up after itself.
 */

import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001';
const SUPER_EMAIL = process.env.SMOKE_SUPER_EMAIL ?? 'admin@tbilisirealtor.ge';
const SUPER_PASSWORD = process.env.SMOKE_SUPER_PASSWORD ?? 'TbilisiAdmin2024!';

const stamp = Date.now().toString(36);
const PASSWORD = 'SmokeStats123!';

interface Result { name: string; ok: boolean; detail: string }
const results: Result[] = [];

function check(name: string, ok: boolean, detail = '') {
  results.push({ name, ok: Boolean(ok), detail });
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
        email: `stats-manager-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Stats Manager',
        role: 'manager',
      },
    });
    check('manager created', managerRes.status === 201, JSON.stringify(managerRes.data?.error ?? ''));
    created.staff.push(managerRes.data.id);

    const brokerRes = await api('/api/admin/staff', {
      token: su.token,
      method: 'POST',
      body: {
        email: `stats-broker-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Stats Broker',
        role: 'broker',
      },
    });
    check('broker created', brokerRes.status === 201, JSON.stringify(brokerRes.data?.error ?? ''));
    created.staff.push(brokerRes.data.id);

    const manager = await login(`stats-manager-${stamp}@example.com`, PASSWORD);
    const broker = await login(`stats-broker-${stamp}@example.com`, PASSWORD);

    check(
      'manager template picked up the import report permission',
      manager.user.permissions.includes('analytics.imports'),
      manager.user.permissions.filter((k: string) => k.startsWith('analytics')).join(', '),
    );
    check(
      'broker gets no analytics permissions',
      !broker.user.permissions.includes('analytics.full')
      && !broker.user.permissions.includes('analytics.imports'),
    );

    const memberRes = await api('/api/auth/register', {
      method: 'POST',
      body: {
        email: `stats-member-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Stats Member',
        phone: '+995599333444',
      },
    });
    check('member registers', memberRes.status === 201,
      `HTTP ${memberRes.status} ${JSON.stringify(memberRes.data?.error ?? '')}`);
    created.members.push(memberRes.data.user.id);

    /* ── Inventory that the funnel can count ──────────────────────────── */

    const saleRes = await api('/api/admin/properties', {
      token: su.token,
      method: 'POST',
      body: {
        title: `Stats sale ${stamp}`,
        price: 180000,
        status: 'sale',
        type: 'apartment',
        city: 'თბილისი',
        district: 'ვაკე',
        area: 82,
      },
    });
    check('sale listing created', saleRes.status === 201, JSON.stringify(saleRes.data?.error ?? ''));
    created.listings.push(saleRes.data.id);

    // Ownership on the leaderboard follows the desk assignment, so use that path.
    const assigned = await api('/api/admin/desk/assign', {
      token: su.token,
      method: 'POST',
      body: { propertyIds: [saleRes.data.id], assignedToUserId: brokerRes.data.id },
    });
    check('the sale listing is assigned to the broker', assigned.status === 200 && assigned.data?.updated === 1,
      JSON.stringify(assigned.data?.error ?? assigned.data?.updated));

    const rentRes = await api('/api/admin/properties', {
      token: su.token,
      method: 'POST',
      body: {
        title: `Stats rent ${stamp}`,
        price: 1400,
        rentPrice: 1400,
        status: 'rent',
        type: 'apartment',
        city: 'თბილისი',
        district: 'ვაკე',
        area: 55,
      },
    });
    created.listings.push(rentRes.data.id);

    /* ── District / status funnel ─────────────────────────────────────── */

    const inventory = await api('/api/admin/analytics/inventory', { token: manager.token });
    check('manager reads the inventory report', inventory.status === 200,
      JSON.stringify(inventory.data?.error ?? ''));

    const vake = inventory.data?.districts?.find((row: any) => row.key === 'ვაკე');
    check('the district rows group by normalised name', Boolean(vake),
      `${inventory.data?.districts?.length} districts`);
    check('both new listings land in the district row',
      vake?.forSale >= 1 && vake?.forRent >= 1,
      `forSale ${vake?.forSale}, forRent ${vake?.forRent}`);
    check('age is measured, not guessed', typeof vake?.avgAgeDays === 'number' && vake.fresh >= 1,
      `avgAge ${vake?.avgAgeDays}, fresh ${vake?.fresh}`);

    const stages = (inventory.data?.funnel ?? []).map((stage: any) => stage.id);
    check('the funnel runs submitted → converted',
      stages.join(',') === 'submitted,approved,live,engaged,converted', stages.join(','));
    const submitted = inventory.data.funnel[0].count;
    const approved = inventory.data.funnel[1].count;
    check('every funnel stage is a subset of the one above it',
      approved <= submitted && inventory.data.funnel[2].count <= approved,
      `${stages.map((s: string, i: number) => `${s}=${inventory.data.funnel[i].count}`).join(' ')}`);

    const buckets = (inventory.data?.ageBuckets ?? []).map((bucket: any) => bucket.id);
    check('all five age buckets come back, even the empty ones',
      buckets.join(',') === '0-7,8-30,31-90,91-180,180+', buckets.join(','));

    const rentOnly = await api('/api/admin/analytics/inventory?deal=rent', { token: manager.token });
    check('the sale / rent filter narrows the set',
      rentOnly.data?.totals?.forSale === 0 && rentOnly.data?.totals?.forRent >= 1,
      `forSale ${rentOnly.data?.totals?.forSale}, forRent ${rentOnly.data?.totals?.forRent}`);

    const cityFiltered = await api('/api/admin/analytics/inventory?city=თბილისი', { token: manager.token });
    check('the city filter works', cityFiltered.status === 200
      && cityFiltered.data.districts.every((row: any) => row.city === 'თბილისი'));

    const brokerInventory = await api('/api/admin/analytics/inventory', { token: broker.token });
    check('broker cannot open the inventory report', brokerInventory.status === 403,
      `HTTP ${brokerInventory.status}`);

    /* ── Broker leaderboard ───────────────────────────────────────────── */

    const board = await api('/api/admin/analytics/leaderboard?period=week', { token: manager.token });
    check('manager reads the leaderboard', board.status === 200, JSON.stringify(board.data?.error ?? ''));
    check('the score weights ship with the report',
      typeof board.data?.weights?.newListings === 'number',
      JSON.stringify(board.data?.weights));

    const brokerRow = board.data?.rows?.find((row: any) => row.userId === brokerRes.data.id);
    check('the broker appears on the leaderboard', Boolean(brokerRow));
    check('this week\'s new listing is counted for its broker',
      brokerRow?.newListings >= 1, `newListings ${brokerRow?.newListings}`);
    check('the ranking is dense and starts at 1',
      board.data.rows.every((row: any, index: number) => row.rank === index + 1)
      || board.data.rows[0]?.rank === 1,
      `first rank ${board.data.rows[0]?.rank}`);
    check('each row carries the previous period to compare against',
      brokerRow && typeof brokerRow.previous?.score === 'number',
      JSON.stringify(brokerRow?.previous));
    check('a listing added today does not count as a revival',
      brokerRow?.revived === 0, `revived ${brokerRow?.revived}`);

    const quarter = await api('/api/admin/analytics/leaderboard?period=quarter', { token: manager.token });
    check('the period switch widens the window', quarter.data?.days === 90, `days ${quarter.data?.days}`);

    const brokerBoard = await api('/api/admin/analytics/leaderboard', { token: broker.token });
    check('broker cannot open the leaderboard', brokerBoard.status === 403, `HTTP ${brokerBoard.status}`);

    /* ── Import quality ──────────────────────────────────────────────── */

    const rejected = await api('/api/admin/import-listing', {
      token: manager.token,
      method: 'POST',
      body: { url: 'https://example.com/listing/123' },
    });
    check('an unsupported host is refused', rejected.status === 400, `HTTP ${rejected.status}`);
    check('the failure carries a stable code', rejected.data?.code === 'unsupported_host',
      String(rejected.data?.code));
    check('the failed attempt is recorded', Number.isInteger(rejected.data?.attemptId),
      String(rejected.data?.attemptId));

    const brokenId = await api('/api/admin/import-listing', {
      token: manager.token,
      method: 'POST',
      body: { url: 'https://www.myhome.ge/ka/pr/no-numeric-id/' },
    });
    check('a myhome link without an id is refused', brokenId.data?.code === 'id_not_found',
      String(brokenId.data?.code));

    const report = await api('/api/admin/analytics/imports?days=1', { token: manager.token });
    check('manager reads the import report', report.status === 200, JSON.stringify(report.data?.error ?? ''));
    check('the report counts the attempts just made',
      report.data?.totals?.attempts >= 2 && report.data?.totals?.failed >= 2,
      JSON.stringify(report.data?.totals));

    const unsupported = report.data?.failures?.find((group: any) => group.code === 'unsupported_host');
    check('failures are grouped by cause', Boolean(unsupported),
      (report.data?.failures ?? []).map((f: any) => `${f.code}:${f.count}`).join(', '));
    check('a grouped failure keeps a sample to click through',
      Boolean(unsupported?.sampleUrl), String(unsupported?.sampleUrl));

    const logged = report.data?.recent?.find((row: any) => row.id === rejected.data.attemptId);
    check('the attempt log names who tried', logged?.actorName === 'Stats Manager',
      String(logged?.actorName));
    check('a failed attempt is never counted as saved', logged?.propertyId === null,
      String(logged?.propertyId));
    check('the report says whether a retry is offered', report.data?.canRetry === true,
      String(report.data?.canRetry));

    const retried = await api(`/api/admin/analytics/imports/${rejected.data.attemptId}/retry`, {
      token: manager.token,
      method: 'POST',
    });
    check('a retry re-runs the same URL and fails the same way',
      retried.status === 400 && retried.data?.code === 'unsupported_host',
      `HTTP ${retried.status} ${retried.data?.code}`);
    check('the retry is its own attempt', retried.data?.attemptId !== rejected.data.attemptId,
      `${rejected.data.attemptId} → ${retried.data?.attemptId}`);

    const brokerReport = await api('/api/admin/analytics/imports', { token: broker.token });
    check('broker cannot open the import report', brokerReport.status === 403,
      `HTTP ${brokerReport.status}`);

    /* ── Admin-only floor ────────────────────────────────────────────── */

    const settingsRead = await api('/api/admin/settings', { token: manager.token });
    check('manager may still read settings', settingsRead.status === 200, `HTTP ${settingsRead.status}`);

    const settingsWrite = await api('/api/admin/settings', {
      token: manager.token,
      method: 'PUT',
      body: { settings: [{ key: 'smoke_probe', value: stamp }] },
    });
    check('manager cannot edit settings', settingsWrite.status === 403, `HTTP ${settingsWrite.status}`);

    const memberDelete = await api(`/api/admin/members/${memberRes.data.user.id}`, {
      token: manager.token,
      method: 'DELETE',
    });
    check('manager cannot delete a member', memberDelete.status === 403, `HTTP ${memberDelete.status}`);

    const roleEdit = await api('/api/admin/roles/broker', {
      token: manager.token,
      method: 'PUT',
      body: { permissions: ['listings.view'] },
    });
    check('manager cannot edit a role template', roleEdit.status === 403, `HTTP ${roleEdit.status}`);

    const permEdit = await api(`/api/admin/staff/${brokerRes.data.id}/permissions`, {
      token: manager.token,
      method: 'PUT',
      body: { permissions: { 'listings.delete': true } },
    });
    check('manager cannot change another account\'s permissions', permEdit.status === 403,
      `HTTP ${permEdit.status}`);

    const managerPromote = await api('/api/admin/staff', {
      token: manager.token,
      method: 'POST',
      body: {
        email: `stats-shadow-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Shadow Manager',
        role: 'manager',
      },
    });
    check('manager cannot create another manager', managerPromote.status === 403,
      `HTTP ${managerPromote.status}`);

    /*
     * The interesting case: a super admin hands the manager the keys anyway. The
     * floor has to hold, otherwise the permission editor becomes a way around it.
     */
    const granted = await api(`/api/admin/staff/${managerRes.data.id}/permissions`, {
      token: su.token,
      method: 'PUT',
      body: {
        permissions: {
          'settings.edit': true,
          'members.delete': true,
          'staff.permissions': true,
        },
      },
    });
    check('super admin can grant the admin-only keys to a manager', granted.status === 200,
      JSON.stringify(granted.data?.error ?? ''));

    const elevated = await login(`stats-manager-${stamp}@example.com`, PASSWORD);
    check('the grant really is on the account',
      elevated.user.permissions.includes('settings.edit')
      && elevated.user.permissions.includes('members.delete')
      && elevated.user.permissions.includes('staff.permissions'));

    const stillBlockedSettings = await api('/api/admin/settings', {
      token: elevated.token,
      method: 'PUT',
      body: { settings: [{ key: 'smoke_probe', value: stamp }] },
    });
    check('the admin floor beats an explicit settings.edit grant',
      stillBlockedSettings.status === 403, `HTTP ${stillBlockedSettings.status}`);
    check('and it says the role is the reason',
      Array.isArray(stillBlockedSettings.data?.adminOnly)
      && stillBlockedSettings.data.adminOnly.includes('settings.edit'),
      JSON.stringify(stillBlockedSettings.data));

    const stillBlockedMember = await api(`/api/admin/members/${memberRes.data.user.id}`, {
      token: elevated.token,
      method: 'DELETE',
    });
    check('the admin floor beats an explicit members.delete grant',
      stillBlockedMember.status === 403, `HTTP ${stillBlockedMember.status}`);

    const stillBlockedRole = await api('/api/admin/roles/broker', {
      token: elevated.token,
      method: 'PUT',
      body: { permissions: ['listings.view'] },
    });
    check('the admin floor beats an explicit staff.permissions grant',
      stillBlockedRole.status === 403, `HTTP ${stillBlockedRole.status}`);

    const catalog = await api('/api/admin/permissions/catalog', { token: su.token });
    const settingsDef = catalog.data?.catalog?.find((item: any) => item.key === 'settings.edit');
    check('the catalog marks the admin-only keys so the editor can warn',
      settingsDef?.adminOnly === true, JSON.stringify(settingsDef));

    /* ── Financial hard delete ───────────────────────────────────────── */

    const paperwork = await api('/api/admin/properties', {
      token: su.token,
      method: 'POST',
      body: {
        title: `Stats contract ${stamp}`,
        price: 250000,
        status: 'sale',
        type: 'apartment',
        city: 'თბილისი',
        district: 'საბურთალო',
        area: 90,
        invoiceRef: `INV-${stamp}`,
        contracts: [{ name: 'contract.pdf', url: 'https://example.com/contract.pdf' }],
      },
    });
    check('listing with paperwork created', paperwork.status === 201,
      JSON.stringify(paperwork.data?.error ?? ''));
    created.listings.push(paperwork.data.id);

    const managerDelete = await api(`/api/admin/properties/${paperwork.data.id}`, {
      token: elevated.token,
      method: 'DELETE',
    });
    check('manager cannot hard-delete a listing carrying an invoice or contract',
      managerDelete.status === 403, `HTTP ${managerDelete.status}`);

    const plainDelete = await api(`/api/admin/properties/${rentRes.data.id}`, {
      token: elevated.token,
      method: 'DELETE',
    });
    check('manager can still delete an ordinary listing', plainDelete.status === 200,
      `HTTP ${plainDelete.status}`);
    if (plainDelete.status === 200) {
      created.listings = created.listings.filter(id => id !== rentRes.data.id);
    }

    const adminDelete = await api(`/api/admin/properties/${paperwork.data.id}`, {
      token: su.token,
      method: 'DELETE',
    });
    check('an admin can delete it', adminDelete.status === 200, `HTTP ${adminDelete.status}`);
    if (adminDelete.status === 200) {
      created.listings = created.listings.filter(id => id !== paperwork.data.id);
    }
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
