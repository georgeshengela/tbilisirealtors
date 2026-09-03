export interface CadastralApplication {
  appId: string;
  regNumber: string;
  status: string;
  statusId: string;
  statusColor: string;
  transaction: string;
  address: string;
  registeredAt: string;
  lastActAt: string;
  applicants: string[];
}

export interface CadastralRegistry {
  code: string;
  total: number;
  lastPage: number;
  syncedAt: string;
  applications: CadastralApplication[];
}

/** `N 01.10.15.006.048.03.107` → `01.10.15.006.048.03.107` */
export function normalizeCadastralCode(raw: string): string {
  return String(raw || '')
    .replace(/[^\d.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

function unixToIso(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  const date = n > 1e12 ? new Date(n) : new Date(n * 1000);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function mapCadastralApplication(row: Record<string, unknown>): CadastralApplication {
  const applicants = Array.isArray(row.applicants)
    ? row.applicants.map(asString).filter(Boolean)
    : [];
  return {
    appId: asString(row.appID ?? row.appId),
    regNumber: asString(row.regNumber),
    status: asString(row.status),
    statusId: asString(row.statusId),
    statusColor: asString(row.statcolor ?? row.statusColor) || '#64748b',
    transaction: asString(row.webTransact ?? row.transaction),
    address: asString(row.address),
    registeredAt: unixToIso(row.appRegDate ?? row.registeredAt),
    lastActAt: unixToIso(row.lastActDate ?? row.lastActAt),
    applicants,
  };
}

export function parseCadastralRegistry(value: unknown): CadastralRegistry | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const code = normalizeCadastralCode(asString(row.code));
  const applications = Array.isArray(row.applications)
    ? row.applications
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map(mapCadastralApplication)
    : [];
  const total = Number(row.total);
  const lastPage = Number(row.lastPage);
  return {
    code,
    total: Number.isFinite(total) ? total : applications.length,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
    syncedAt: asString(row.syncedAt) || new Date().toISOString(),
    applications,
  };
}
