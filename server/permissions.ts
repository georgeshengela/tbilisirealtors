/**
 * The permission catalog and the rules that turn a role into a concrete set of
 * capabilities. Every key here maps to a real action somewhere in the admin panel.
 *
 * Effective set = role template (editable, stored in `role_permissions`)
 *                 + per-user overrides (`users.permissions`, can grant or revoke).
 * Super admin bypasses the whole calculation and always holds everything.
 */

export const ROLES = ['super_admin', 'admin', 'manager', 'broker', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'manager', 'broker'];

/** Higher rank may manage lower rank. Never equal, never above. */
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  broker: 40,
  user: 10,
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function rankOf(role: string): number {
  return isRole(role) ? ROLE_RANK[role] : 0;
}

export function isStaffRole(role: string): boolean {
  return isRole(role) && role !== 'user';
}

export interface PermissionDef {
  key: string;
  group: string;
  /** Georgian label shown in the permission editor. */
  label: string;
  /** Extra warning for permissions that expose private data. */
  sensitive?: boolean;
  /**
   * Holding the key is not enough — the account also has to be an admin or super
   * admin. Granting one of these to a manager has no effect, and the editor says so.
   */
  adminOnly?: boolean;
}

export const PERMISSIONS: PermissionDef[] = [
  // Listings
  { key: 'listings.view', group: 'listings', label: 'განცხადებების ნახვა' },
  { key: 'listings.create', group: 'listings', label: 'განცხადების დამატება' },
  { key: 'listings.edit', group: 'listings', label: 'განცხადების რედაქტირება' },
  { key: 'listings.delete', group: 'listings', label: 'განცხადების წაშლა' },
  { key: 'listings.price', group: 'listings', label: 'ფასის შეცვლა და ისტორია' },
  { key: 'listings.flags', group: 'listings', label: 'VIP / რჩეული / ახალი ნიშნები' },
  { key: 'listings.lifecycle', group: 'listings', label: 'სტატუსი და ქირის ვადები' },
  { key: 'listings.owner', group: 'listings', label: 'მესაკუთრის მონაცემები', sensitive: true },
  { key: 'listings.contracts', group: 'listings', label: 'ხელშეკრულებები', sensitive: true },
  { key: 'listings.notes', group: 'listings', label: 'შიდა კომენტარები', sensitive: true },
  { key: 'listings.billing', group: 'listings', label: 'ს/კ და ინვოისი', sensitive: true },
  { key: 'listings.import', group: 'listings', label: 'იმპორტი myhome / ss.ge-დან' },
  { key: 'listings.translate', group: 'listings', label: 'ავტომატური თარგმანი' },
  { key: 'listings.moderate', group: 'listings', label: 'მომხმარებლის განცხადებების მოდერაცია' },
  { key: 'listings.assign', group: 'listings', label: 'განცხადების გადაბმა სხვა თანამშრომელზე' },
  { key: 'listings.tasks', group: 'listings', label: 'დავალებები და ზარების ჟურნალი' },
  { key: 'listings.tasksAll', group: 'listings', label: 'გუნდის ყველა დავალების ნახვა' },

  // Leads (public enquiries)
  { key: 'leads.view', group: 'leads', label: 'ლიდების ნახვა' },
  { key: 'leads.manage', group: 'leads', label: 'ლიდის დამუშავება — სტატუსი, კომენტარი, ზარი' },
  { key: 'leads.assign', group: 'leads', label: 'ლიდის განაწილება ბროკერებზე' },
  { key: 'leads.viewAll', group: 'leads', label: 'გუნდის ყველა ლიდის ნახვა' },
  { key: 'leads.contact', group: 'leads', label: 'ლიდის საკონტაქტო მონაცემები', sensitive: true },

  // Agents
  { key: 'agents.view', group: 'agents', label: 'ბროკერების ნახვა' },
  { key: 'agents.create', group: 'agents', label: 'ბროკერის დამატება' },
  { key: 'agents.edit', group: 'agents', label: 'ბროკერის რედაქტირება' },
  { key: 'agents.delete', group: 'agents', label: 'ბროკერის წაშლა' },

  // Blog
  { key: 'blog.view', group: 'blog', label: 'ბლოგის ნახვა' },
  { key: 'blog.create', group: 'blog', label: 'პოსტის დამატება' },
  { key: 'blog.edit', group: 'blog', label: 'პოსტის რედაქტირება' },
  { key: 'blog.delete', group: 'blog', label: 'პოსტის წაშლა' },
  { key: 'blog.publish', group: 'blog', label: 'პოსტის გამოქვეყნება' },

  // Staff
  { key: 'staff.view', group: 'staff', label: 'თანამშრომლების ნახვა' },
  { key: 'staff.create', group: 'staff', label: 'თანამშრომლის შექმნა' },
  { key: 'staff.edit', group: 'staff', label: 'თანამშრომლის რედაქტირება' },
  { key: 'staff.delete', group: 'staff', label: 'თანამშრომლის წაშლა' },
  {
    key: 'staff.permissions',
    group: 'staff',
    label: 'უფლებებისა და როლის შაბლონების მართვა',
    sensitive: true,
    adminOnly: true,
  },

  // Members (public users)
  { key: 'members.view', group: 'members', label: 'მომხმარებლების ნახვა' },
  { key: 'members.block', group: 'members', label: 'მომხმარებლის დაბლოკვა' },
  {
    key: 'members.delete',
    group: 'members',
    label: 'მომხმარებლის სამუდამო წაშლა',
    sensitive: true,
    adminOnly: true,
  },

  // Everything else
  { key: 'settings.view', group: 'system', label: 'პარამეტრების ნახვა' },
  { key: 'settings.edit', group: 'system', label: 'პარამეტრების შეცვლა', adminOnly: true },
  { key: 'dashboard.view', group: 'system', label: 'დაფის ნახვა' },
  { key: 'analytics.full', group: 'system', label: 'სრული სტატისტიკა' },
  { key: 'analytics.imports', group: 'system', label: 'იმპორტის ხარისხის ანგარიში' },
  { key: 'uploads.images', group: 'system', label: 'ფოტოს ატვირთვა' },
  { key: 'uploads.documents', group: 'system', label: 'დოკუმენტის ატვირთვა' },
];

export const PERMISSION_KEYS: string[] = PERMISSIONS.map(p => p.key);
const PERMISSION_KEY_SET = new Set(PERMISSION_KEYS);

export function isPermissionKey(value: unknown): value is string {
  return typeof value === 'string' && PERMISSION_KEY_SET.has(value);
}

const MANAGER_PERMISSIONS = [
  'listings.view', 'listings.create', 'listings.edit', 'listings.delete',
  'listings.price', 'listings.flags', 'listings.lifecycle', 'listings.owner',
  'listings.contracts', 'listings.notes', 'listings.billing', 'listings.import',
  'listings.translate', 'listings.moderate', 'listings.assign',
  'listings.tasks', 'listings.tasksAll',
  'leads.view', 'leads.manage', 'leads.assign', 'leads.viewAll', 'leads.contact',
  'agents.view', 'agents.create', 'agents.edit', 'agents.delete',
  'blog.view', 'blog.create', 'blog.edit', 'blog.delete', 'blog.publish',
  'members.view',
  'settings.view', 'dashboard.view', 'analytics.full', 'analytics.imports',
  'uploads.images', 'uploads.documents',
];

const BROKER_PERMISSIONS = [
  'listings.view', 'listings.create', 'listings.edit', 'listings.price',
  'listings.lifecycle', 'listings.owner', 'listings.contracts', 'listings.notes',
  'listings.translate', 'listings.tasks',
  // Brokers work the leads handed to them, and need the phone number to do it.
  'leads.view', 'leads.manage', 'leads.contact',
  'dashboard.view',
  'uploads.images', 'uploads.documents',
];

/** Shipped defaults — seeded into `role_permissions`, editable afterwards. */
export const ROLE_DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  super_admin: [...PERMISSION_KEYS],
  admin: PERMISSION_KEYS.filter(key => key !== 'staff.permissions'),
  manager: MANAGER_PERMISSIONS,
  broker: BROKER_PERMISSIONS,
  // Members get no admin access at all — only the right to attach listing photos.
  user: ['uploads.images'],
};

/** Brokers see the whole listing base; owner contacts stay on their own book. */
export const ROLE_DEFAULT_SCOPE: Record<Role, 'own' | 'all'> = {
  super_admin: 'all',
  admin: 'all',
  manager: 'all',
  broker: 'own',
  user: 'own',
};

export interface PermissionActor {
  id: number;
  email: string;
  name: string;
  firstName: string;
  phone: string;
  role: string;
  scope: 'own' | 'all';
  permissions: string[];
  isActive: boolean;
  tokenVersion: number;
}

/**
 * Role template first, then per-user overrides on top. An override set to false
 * revokes a permission the role would otherwise grant.
 */
export function effectivePermissions(
  role: string,
  template: string[] | null | undefined,
  overrides: Record<string, boolean> | null | undefined,
): string[] {
  if (role === 'super_admin') return [...PERMISSION_KEYS];

  const base = template && template.length
    ? template
    : (isRole(role) ? ROLE_DEFAULT_PERMISSIONS[role] : []);

  const set = new Set(base.filter(isPermissionKey));

  for (const [key, granted] of Object.entries(overrides ?? {})) {
    if (!isPermissionKey(key)) continue;
    if (granted) set.add(key);
    else set.delete(key);
  }

  return PERMISSION_KEYS.filter(key => set.has(key));
}

export function can(actor: Pick<PermissionActor, 'role' | 'permissions'> | undefined, key: string): boolean {
  if (!actor) return false;
  if (actor.role === 'super_admin') return true;
  return actor.permissions.includes(key);
}

export function canAny(actor: PermissionActor | undefined, keys: string[]): boolean {
  return keys.some(key => can(actor, key));
}

/* ── Admin-only floor ────────────────────────────────────────────────────── */

/**
 * Some actions stay with admins and super admins whatever the role template says:
 * handing out permissions, editing role templates, changing site settings and
 * permanently destroying member accounts or financial records. A super admin can
 * still tick these boxes for a manager, but the server refuses to act on them.
 */
export const ADMIN_ONLY_PERMISSIONS: string[] = PERMISSIONS
  .filter(permission => permission.adminOnly)
  .map(permission => permission.key);

const ADMIN_ONLY_SET = new Set(ADMIN_ONLY_PERMISSIONS);

export function isAdminOnlyPermission(key: string): boolean {
  return ADMIN_ONLY_SET.has(key);
}

/** True when the role sits at or above the given rank. */
export function isAtLeastRole(role: string, minimum: Role): boolean {
  return rankOf(role) >= ROLE_RANK[minimum];
}

/** Admin-and-above check used by the irreversible endpoints. */
export function isAdminOrAbove(actor: Pick<PermissionActor, 'role'> | undefined): boolean {
  return Boolean(actor && isAtLeastRole(actor.role, 'admin'));
}

/** Cadastral code on the public listing page — managers and admins only. */
export function canViewCadastral(role?: string): boolean {
  return isAtLeastRole(role ?? '', 'manager');
}

/**
 * Permission check plus the admin floor. Use this instead of `can()` for the keys
 * in ADMIN_ONLY_PERMISSIONS so a stray grant cannot widen a manager's reach.
 */
export function canWithRoleFloor(actor: PermissionActor | undefined, key: string): boolean {
  if (!can(actor, key)) return false;
  if (isAdminOnlyPermission(key) && !isAdminOrAbove(actor)) return false;
  return true;
}

/** True when the actor is allowed to create / edit / delete the target user. */
export function canManageUser(actor: PermissionActor, targetRole: string): boolean {
  if (actor.role === 'super_admin') return true;
  return rankOf(actor.role) > rankOf(targetRole);
}

/** Nobody may hand out a permission they do not hold themselves. */
export function filterGrantablePermissions(actor: PermissionActor, requested: string[]): string[] {
  if (actor.role === 'super_admin') return requested.filter(isPermissionKey);
  return requested.filter(key => isPermissionKey(key) && actor.permissions.includes(key));
}

/* ── Private field stripping ─────────────────────────────────────────────── */

/** Listing fields that must disappear when the actor lacks the permission. */
const PRIVATE_FIELD_PERMISSION: Record<string, string> = {
  owner: 'listings.owner',
  contracts: 'listings.contracts',
  internalNotes: 'listings.notes',
  agentTaxId: 'listings.billing',
  invoiceRef: 'listings.billing',
};

const OWNER_CONTACT_KEYS = ['phone', 'email', 'idNumber', 'address', 'note'] as const;

/** Listings this staff member created or was handed — their working portfolio. */
export function inOwnPortfolio(
  actor: PermissionActor | undefined,
  listing: { createdByUserId?: number | null; assignedToUserId?: number | null },
): boolean {
  if (!actor) return false;
  return listing.createdByUserId === actor.id || listing.assignedToUserId === actor.id;
}

/**
 * Removes owner PII, contracts, internal notes and billing refs from a listing
 * before it leaves the server. The keys are deleted rather than blanked, so the
 * response carries no trace that the data exists. Hiding these in the UI alone
 * is not enough.
 *
 * `own` scope still sees every listing, but owner phone / email / ID stay on
 * their own portfolio only. Name and surname remain visible on the shared base.
 */
export function sanitizeListingFor<T extends Record<string, unknown>>(
  actor: PermissionActor | undefined,
  listing: T,
): T {
  if (!listing) return listing;
  if (actor?.role === 'super_admin') return listing;

  const out = { ...listing } as Record<string, unknown>;
  for (const [field, permission] of Object.entries(PRIVATE_FIELD_PERMISSION)) {
    if (!(field in out)) continue;
    if (!can(actor, permission)) delete out[field];
  }

  if (
    out.owner
    && actor?.scope === 'own'
    && !inOwnPortfolio(actor, listing as { createdByUserId?: number | null; assignedToUserId?: number | null })
  ) {
    const owner = out.owner as Record<string, unknown>;
    const name = typeof owner.name === 'string' ? owner.name.trim() : '';
    const publicOwner: Record<string, string> = {};
    if (name) publicOwner.name = name;
    for (const key of OWNER_CONTACT_KEYS) delete publicOwner[key];
    out.owner = publicOwner;
  }

  return out as T;
}

/** The private keys an actor is not allowed to write. */
export function forbiddenListingFields(actor: PermissionActor | undefined): string[] {
  return Object.entries(PRIVATE_FIELD_PERMISSION)
    .filter(([, permission]) => !can(actor, permission))
    .map(([field]) => field);
}
