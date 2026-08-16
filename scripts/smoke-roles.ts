/**
 * End-to-end check of the role and permission rules against a running server.
 *
 *   npm run dev:server        # in one terminal
 *   npx tsx scripts/smoke-roles.ts
 *
 * Creates a throwaway manager, broker and member, walks through the guarantees
 * the permission system is supposed to make, then deletes everything it made.
 */

import 'dotenv/config';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3001';
const SUPER_EMAIL = process.env.SMOKE_SUPER_EMAIL ?? 'admin@tbilisirealtor.ge';
const SUPER_PASSWORD = process.env.SMOKE_SUPER_PASSWORD ?? 'TbilisiAdmin2024!';

const stamp = Date.now().toString(36);
const PASSWORD = 'SmokeTest123!';

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

async function main() {
  const created: { staff: number[]; members: number[]; listings: string[] } =
    { staff: [], members: [], listings: [] };

  const superAdmin = await login(SUPER_EMAIL, SUPER_PASSWORD);
  check('super admin logs in', Boolean(superAdmin.token));
  check(
    'super admin session carries permissions',
    Array.isArray(superAdmin.user.permissions) && superAdmin.user.permissions.length > 10,
    `${superAdmin.user.permissions?.length} permissions`,
  );

  try {
    /* ── Create staff ────────────────────────────────────────────────── */

    const managerRes = await api('/api/admin/staff', {
      token: superAdmin.token,
      method: 'POST',
      body: {
        email: `smoke-manager-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Smoke Manager',
        role: 'manager',
      },
    });
    check('super admin creates a manager', managerRes.status === 201, `HTTP ${managerRes.status}`);
    if (managerRes.data?.id) created.staff.push(managerRes.data.id);

    const brokerRes = await api('/api/admin/staff', {
      token: superAdmin.token,
      method: 'POST',
      body: {
        email: `smoke-broker-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Smoke Broker',
        role: 'broker',
      },
    });
    check('super admin creates a broker', brokerRes.status === 201, `HTTP ${brokerRes.status}`);
    if (brokerRes.data?.id) created.staff.push(brokerRes.data.id);

    check('broker defaults to own scope', brokerRes.data?.scope === 'own', `scope=${brokerRes.data?.scope}`);

    const adminRes = await api('/api/admin/staff', {
      token: superAdmin.token,
      method: 'POST',
      body: {
        email: `smoke-admin-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Smoke Admin',
        role: 'admin',
      },
    });
    check('super admin creates an admin', adminRes.status === 201, `HTTP ${adminRes.status}`);
    if (adminRes.data?.id) created.staff.push(adminRes.data.id);

    const manager = await login(`smoke-manager-${stamp}@example.com`, PASSWORD);
    const broker = await login(`smoke-broker-${stamp}@example.com`, PASSWORD);
    const admin = await login(`smoke-admin-${stamp}@example.com`, PASSWORD);

    /* ── Rank rule ───────────────────────────────────────────────────── */

    const adminMakesAdmin = await api('/api/admin/staff', {
      token: admin.token,
      method: 'POST',
      body: {
        email: `smoke-admin2-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Second Admin',
        role: 'admin',
      },
    });
    check('admin cannot create another admin', adminMakesAdmin.status === 403, `HTTP ${adminMakesAdmin.status}`);
    if (adminMakesAdmin.data?.id) created.staff.push(adminMakesAdmin.data.id);

    const adminMakesSuper = await api('/api/admin/staff', {
      token: admin.token,
      method: 'POST',
      body: {
        email: `smoke-super2-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Second Super',
        role: 'super_admin',
      },
    });
    check('admin cannot create a super admin', adminMakesSuper.status === 403, `HTTP ${adminMakesSuper.status}`);
    if (adminMakesSuper.data?.id) created.staff.push(adminMakesSuper.data.id);

    const adminMakesManager = await api('/api/admin/staff', {
      token: admin.token,
      method: 'POST',
      body: {
        email: `smoke-manager2-${stamp}@example.com`,
        password: PASSWORD,
        name: 'Second Manager',
        role: 'manager',
      },
    });
    check('admin can create a manager', adminMakesManager.status === 201, `HTTP ${adminMakesManager.status}`);
    if (adminMakesManager.data?.id) created.staff.push(adminMakesManager.data.id);

    /* ── Manager is locked out of staff management ───────────────────── */

    const managerListsStaff = await api('/api/admin/staff', { token: manager.token });
    check('manager cannot list staff', managerListsStaff.status === 403, `HTTP ${managerListsStaff.status}`);

    const managerEditsPerms = await api(`/api/admin/staff/${brokerRes.data?.id}/permissions`, {
      token: manager.token,
      method: 'PUT',
      body: { permissions: {} },
    });
    check('manager cannot edit permissions', managerEditsPerms.status === 403, `HTTP ${managerEditsPerms.status}`);

    const managerEditsRoleTemplate = await api('/api/admin/roles/broker', {
      token: manager.token,
      method: 'PUT',
      body: { permissions: [] },
    });
    check('manager cannot edit role templates', managerEditsRoleTemplate.status === 403, `HTTP ${managerEditsRoleTemplate.status}`);

    const managerSeesMembers = await api('/api/admin/members', { token: manager.token });
    check('manager can list members', managerSeesMembers.status === 200, `HTTP ${managerSeesMembers.status}`);

    const managerEditsSettings = await api('/api/admin/settings', {
      token: manager.token,
      method: 'PUT',
      body: { settings: [] },
    });
    check('manager cannot edit settings', managerEditsSettings.status === 403, `HTTP ${managerEditsSettings.status}`);

    /* ── Admin cannot touch role templates ───────────────────────────── */

    const adminEditsRoleTemplate = await api('/api/admin/roles/manager', {
      token: admin.token,
      method: 'PUT',
      body: { permissions: [] },
    });
    check('admin cannot edit role templates', adminEditsRoleTemplate.status === 403, `HTTP ${adminEditsRoleTemplate.status}`);

    /* ── Broker own-scope isolation ──────────────────────────────────── */

    const brokerListing = await api('/api/admin/properties', {
      token: broker.token,
      method: 'POST',
      body: {
        title: `Smoke broker listing ${stamp}`,
        price: '120000',
        area: '60',
        address: 'Smoke St 1',
        district: 'ვაკე',
        type: 'apartment',
        status: 'sale',
        images: [],
      },
    });
    check('broker creates a listing', brokerListing.status === 201, `HTTP ${brokerListing.status}`);
    if (brokerListing.data?.id) created.listings.push(brokerListing.data.id);

    const managerListing = await api('/api/admin/properties', {
      token: manager.token,
      method: 'POST',
      body: {
        title: `Smoke manager listing ${stamp}`,
        price: '250000',
        area: '90',
        address: 'Smoke St 2',
        district: 'საბურთალო',
        type: 'apartment',
        status: 'sale',
        images: [],
        owner: { name: 'Owner Name', phone: '+995500000000' },
      },
    });
    check('manager creates a listing', managerListing.status === 201, `HTTP ${managerListing.status}`);
    if (managerListing.data?.id) created.listings.push(managerListing.data.id);

    const brokerSees = await api('/api/admin/properties?limit=200', { token: broker.token });
    const brokerIds: string[] = (brokerSees.data?.data ?? []).map((row: any) => row.id);
    check(
      'broker only sees own listings',
      brokerIds.includes(brokerListing.data?.id) && !brokerIds.includes(managerListing.data?.id),
      `${brokerIds.length} listing(s) visible`,
    );

    const brokerPeeks = await api(`/api/admin/properties/${managerListing.data?.id}`, { token: broker.token });
    check("broker gets 404 on another's listing", brokerPeeks.status === 404, `HTTP ${brokerPeeks.status}`);

    const brokerEdits = await api(`/api/admin/properties/${managerListing.data?.id}`, {
      token: broker.token,
      method: 'PATCH',
      body: { isFeatured: true },
    });
    check("broker cannot edit another's listing", brokerEdits.status === 404, `HTTP ${brokerEdits.status}`);

    const brokerDeletes = await api(`/api/admin/properties/${brokerListing.data?.id}`, {
      token: broker.token,
      method: 'DELETE',
    });
    check('broker cannot delete listings at all', brokerDeletes.status === 403, `HTTP ${brokerDeletes.status}`);

    const brokerFlags = await api(`/api/admin/properties/${brokerListing.data?.id}`, {
      token: broker.token,
      method: 'PATCH',
      body: { isPremium: true },
    });
    check('broker cannot set VIP flags', brokerFlags.status === 403, `HTTP ${brokerFlags.status}`);

    /* ── Private field stripping ─────────────────────────────────────── */

    const brokerReadsOwn = await api(`/api/admin/properties/${brokerListing.data?.id}`, { token: broker.token });
    check(
      'broker keeps owner access on own listing',
      'owner' in (brokerReadsOwn.data ?? {}),
      `keys: ${Object.keys(brokerReadsOwn.data ?? {}).length}`,
    );
    check(
      'broker never receives billing fields',
      !('agentTaxId' in (brokerReadsOwn.data ?? {})) && !('invoiceRef' in (brokerReadsOwn.data ?? {})),
    );

    const brokerWritesBilling = await api(`/api/admin/properties/${brokerListing.data?.id}`, {
      token: broker.token,
      method: 'PATCH',
      body: { agentTaxId: '123456789' },
    });
    check('broker cannot write billing fields', brokerWritesBilling.status === 403, `HTTP ${brokerWritesBilling.status}`);

    /* ── Member registration and moderated submission ────────────────── */

    const memberEmail = `smoke-member-${stamp}@example.com`;
    const registered = await api('/api/auth/register', {
      method: 'POST',
      body: { email: memberEmail, password: PASSWORD, name: 'Smoke Member', phone: '+995599000000' },
    });
    check('visitor can register', registered.status === 201, `HTTP ${registered.status}`);
    check('registration always yields role user', registered.data?.user?.role === 'user', `role=${registered.data?.user?.role}`);
    if (registered.data?.user?.id) created.members.push(registered.data.user.id);

    const memberToken = registered.data?.token as string;

    const memberHitsAdmin = await api('/api/admin/properties', { token: memberToken });
    check('member is blocked from the admin API', memberHitsAdmin.status === 403, `HTTP ${memberHitsAdmin.status}`);

    const memberSubmits = await api('/api/account/my-listings', {
      token: memberToken,
      method: 'POST',
      body: {
        title: `Smoke member listing ${stamp}`,
        price: '95000',
        area: '48',
        address: 'Member St 3',
        district: 'ისანი',
        type: 'apartment',
        status: 'sale',
        // Deliberately smuggled private fields — these must not stick.
        owner: { name: 'Should not save' },
        isPremium: true,
        moderationStatus: 'approved',
      },
    });
    check('member submits a listing', memberSubmits.status === 201, `HTTP ${memberSubmits.status}`);
    const memberListingId = memberSubmits.data?.id;
    if (memberListingId) created.listings.push(memberListingId);

    check(
      'member submission is forced to pending',
      memberSubmits.data?.moderationStatus === 'pending',
      `status=${memberSubmits.data?.moderationStatus}`,
    );
    check('member submission cannot self-promote to VIP', memberSubmits.data?.isPremium === false);
    check('member response never carries owner PII', !('owner' in (memberSubmits.data ?? {})));

    const publicBefore = await api(`/api/properties/${memberListingId}`);
    check('pending listing is invisible publicly', publicBefore.status === 404, `HTTP ${publicBefore.status}`);

    const publicList = await api('/api/properties?limit=200');
    const publicIds: string[] = (publicList.data?.data ?? publicList.data ?? []).map?.((row: any) => row.id) ?? [];
    check('pending listing is absent from the public list', !publicIds.includes(memberListingId));

    /* ── Moderation ──────────────────────────────────────────────────── */

    const brokerQueue = await api('/api/admin/moderation', { token: broker.token });
    check('broker cannot open the moderation queue', brokerQueue.status === 403, `HTTP ${brokerQueue.status}`);

    const managerQueue = await api('/api/admin/moderation', { token: manager.token });
    const queueIds: string[] = (managerQueue.data?.data ?? []).map((row: any) => row.id);
    check('manager sees the pending submission', queueIds.includes(memberListingId), `${queueIds.length} pending`);

    const approve = await api(`/api/admin/properties/${memberListingId}/moderate`, {
      token: manager.token,
      method: 'POST',
      body: { decision: 'approve' },
    });
    check('manager approves the submission', approve.status === 200, `HTTP ${approve.status}`);

    const publicAfter = await api(`/api/properties/${memberListingId}`);
    check('approved listing becomes public', publicAfter.status === 200, `HTTP ${publicAfter.status}`);
    check(
      'public payload hides moderation internals',
      !('moderationStatus' in (publicAfter.data ?? {})) && !('owner' in (publicAfter.data ?? {})),
    );

    const memberEdits = await api(`/api/account/my-listings/${memberListingId}`, {
      token: memberToken,
      method: 'PUT',
      body: { title: `Smoke member listing ${stamp} edited` },
    });
    check(
      'editing sends the listing back for review',
      memberEdits.data?.moderationStatus === 'pending',
      `status=${memberEdits.data?.moderationStatus}`,
    );

    /* ── Favourites ──────────────────────────────────────────────────── */

    const favAdd = await api(`/api/account/favorites/${brokerListing.data?.id}`, {
      token: memberToken,
      method: 'POST',
    });
    check('member saves a favourite', favAdd.status === 200, `HTTP ${favAdd.status}`);

    const favList = await api('/api/account/favorites', { token: memberToken });
    check('favourite persists to the account', (favList.data?.ids ?? []).includes(brokerListing.data?.id));

    const favMerge = await api('/api/account/favorites/merge', {
      token: memberToken,
      method: 'POST',
      body: { ids: [managerListing.data?.id, 'does-not-exist'] },
    });
    check(
      'guest favourites merge and unknown ids are dropped',
      (favMerge.data?.ids ?? []).includes(managerListing.data?.id)
        && !(favMerge.data?.ids ?? []).includes('does-not-exist'),
    );

    /* ── Uploads by permission ───────────────────────────────────────── */

    const memberUploadsPdf = await fetch(`${BASE}/api/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${memberToken}` },
      body: (() => {
        const form = new FormData();
        form.append('files', new Blob([new Uint8Array([37, 80, 68, 70])], { type: 'application/pdf' }), 'x.pdf');
        return form;
      })(),
    });
    check('member cannot upload documents', memberUploadsPdf.status === 403, `HTTP ${memberUploadsPdf.status}`);

    /* ── Instant revocation ──────────────────────────────────────────── */

    const demote = await api(`/api/admin/staff/${brokerRes.data?.id}`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { isActive: false },
    });
    check('super admin can block a broker', demote.status === 200, `HTTP ${demote.status}`);

    const revoked = await api('/api/admin/properties', { token: broker.token });
    check('blocked account loses access without re-login', revoked.status === 401, `HTTP ${revoked.status}`);

    const reactivate = await api(`/api/admin/staff/${brokerRes.data?.id}`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { isActive: true },
    });
    check('super admin can unblock', reactivate.status === 200, `HTTP ${reactivate.status}`);

    const stillDead = await api('/api/admin/properties', { token: broker.token });
    check('a blocked session stays dead after unblocking', stillDead.status === 401, `HTTP ${stillDead.status}`);

    // Everything below reuses this one session to prove changes land live.
    const brokerAgain = await login(`smoke-broker-${stamp}@example.com`, PASSWORD);
    check('unblocked broker can sign in again', Boolean(brokerAgain.token));

    /* ── Permission override takes effect immediately ────────────────── */

    const grant = await api(`/api/admin/staff/${brokerRes.data?.id}/permissions`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { permissions: { 'listings.delete': true } },
    });
    check('super admin grants a per-user override', grant.status === 200, `HTTP ${grant.status}`);

    // Deliberately reuses the token issued before the grant.
    const deleteAllowed = await api(`/api/admin/properties/${brokerListing.data?.id}`, {
      token: brokerAgain.token,
      method: 'DELETE',
    });
    check('granted permission applies without re-login', deleteAllowed.status === 200, `HTTP ${deleteAllowed.status}`);
    if (deleteAllowed.status === 200) {
      created.listings = created.listings.filter(id => id !== brokerListing.data?.id);
    }

    const revoke = await api(`/api/admin/staff/${brokerRes.data?.id}/permissions`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { permissions: { 'listings.view': false } },
    });
    check('super admin revokes a permission', revoke.status === 200, `HTTP ${revoke.status}`);

    const revokedRead = await api('/api/admin/properties', { token: brokerAgain.token });
    check('revoked permission applies without re-login', revokedRead.status === 403, `HTTP ${revokedRead.status}`);

    const promoted = await api(`/api/admin/staff/${brokerRes.data?.id}`, {
      token: superAdmin.token,
      method: 'PUT',
      // Clearing the override lets the new role template take over cleanly.
      body: { role: 'manager', permissions: {} },
    });
    check('super admin promotes the broker to manager', promoted.status === 200, `HTTP ${promoted.status}`);

    const queueAfterRole = await api('/api/admin/moderation', { token: brokerAgain.token });
    check('role change applies without re-login', queueAfterRole.status === 200, `HTTP ${queueAfterRole.status}`);

    /* ── Last super admin invariant ──────────────────────────────────── */

    const selfDemote = await api(`/api/admin/staff/${superAdmin.user.id}`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { role: 'manager' },
    });
    check('last super admin cannot be demoted', selfDemote.status === 400 || selfDemote.status === 403, `HTTP ${selfDemote.status}`);

    const selfDelete = await api(`/api/admin/staff/${superAdmin.user.id}`, {
      token: superAdmin.token,
      method: 'DELETE',
    });
    check('last super admin cannot be deleted', selfDelete.status === 400 || selfDelete.status === 403, `HTTP ${selfDelete.status}`);

    /* ── Members management ──────────────────────────────────────────── */

    const blockMember = await api(`/api/admin/members/${registered.data?.user?.id}`, {
      token: superAdmin.token,
      method: 'PUT',
      body: { isActive: false },
    });
    check('staff can block a member', blockMember.status === 200, `HTTP ${blockMember.status}`);

    const blockedMemberLogin = await api('/api/auth/login', {
      method: 'POST',
      body: { email: memberEmail, password: PASSWORD },
    });
    check('blocked member cannot log in', blockedMemberLogin.status === 401, `HTTP ${blockedMemberLogin.status}`);
  } finally {
    /* ── Cleanup ─────────────────────────────────────────────────────── */
    for (const id of created.listings) {
      await api(`/api/admin/properties/${id}`, { token: superAdmin.token, method: 'DELETE' });
    }
    for (const id of created.staff) {
      await api(`/api/admin/staff/${id}`, { token: superAdmin.token, method: 'DELETE' });
    }
    for (const id of created.members) {
      await api(`/api/admin/members/${id}`, { token: superAdmin.token, method: 'DELETE' });
    }
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFailures:');
    failed.forEach(r => console.log(`  - ${r.name}${r.detail ? ` (${r.detail})` : ''}`));
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
