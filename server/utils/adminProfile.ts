/**
 * Admin profile helpers — display name for the panel, public sanitization for the site.
 */

export function buildDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = '',
): string {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');
  return full || fallback.trim() || 'ადმინი';
}

export function splitLegacyName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export type AdminProfileRow = {
  id: number;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  showOnFrontend: boolean;
  role: string;
  scope?: string | null;
  isActive?: boolean;
  createdAt?: Date | string | null;
};

/**
 * Full profile for the logged-in user (never sent to the public site).
 * `permissions` is the already-computed effective set, so the client never
 * has to recombine role templates with overrides.
 */
export function toAdminSession(
  user: AdminProfileRow,
  extra?: { permissions?: string[]; scope?: string },
) {
  const name = buildDisplayName(user.firstName, user.lastName, user.name);
  return {
    id: user.id,
    email: user.email,
    name,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    dateOfBirth: user.dateOfBirth ?? null,
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? null,
    jobTitle: user.jobTitle ?? '',
    bio: user.bio ?? '',
    showOnFrontend: Boolean(user.showOnFrontend),
    role: user.role,
    scope: (extra?.scope ?? user.scope ?? 'all') === 'own' ? 'own' : 'all',
    permissions: extra?.permissions ?? [],
  };
}

/**
 * Public team card — only when showOnFrontend is on.
 * Date of birth and email stay private.
 */
export function toPublicTeamMember(user: AdminProfileRow) {
  if (!user.showOnFrontend) return null;
  const name = buildDisplayName(user.firstName, user.lastName, user.name);
  return {
    id: `admin-${user.id}`,
    name,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    photo: user.avatarUrl,
    phone: user.phone,
    jobTitle: user.jobTitle || 'რეალტორი',
    bio: user.bio,
    source: 'admin' as const,
  };
}

/** Map request body → column updates for create / self-edit / admin-edit. */
export function profileFieldsFromBody(body: Record<string, unknown>, currentName = '') {
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : undefined;
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : undefined;
  const nameFromParts = firstName !== undefined || lastName !== undefined
    ? buildDisplayName(firstName ?? '', lastName ?? '', currentName)
    : (typeof body.name === 'string' ? body.name.trim() : undefined);

  return {
    ...(firstName !== undefined ? { firstName: firstName || null } : {}),
    ...(lastName !== undefined ? { lastName: lastName || null } : {}),
    ...(nameFromParts !== undefined ? { name: nameFromParts || currentName || 'ადმინი' } : {}),
    ...(typeof body.dateOfBirth === 'string'
      ? { dateOfBirth: body.dateOfBirth.trim() || null }
      : body.dateOfBirth === null ? { dateOfBirth: null } : {}),
    ...(typeof body.phone === 'string' ? { phone: body.phone.trim() || null } : {}),
    ...(typeof body.avatarUrl === 'string' ? { avatarUrl: body.avatarUrl.trim() || null } : {}),
    ...(typeof body.jobTitle === 'string' ? { jobTitle: body.jobTitle.trim() || null } : {}),
    ...(typeof body.bio === 'string' ? { bio: body.bio.trim() || null } : {}),
    ...('showOnFrontend' in body ? { showOnFrontend: Boolean(body.showOnFrontend) } : {}),
  };
}
