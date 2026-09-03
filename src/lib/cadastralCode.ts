/** One NAPR / my.gov.ge application row for a cadastral plot. */
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

/** Last successful registry lookup, stored on the listing for the edit form. */
export interface CadastralRegistry {
  code: string;
  total: number;
  lastPage: number;
  syncedAt: string;
  applications: CadastralApplication[];
}

/**
 * Official search wants digits and dots only:
 * `N 01.10.15.006.048.03.107` → `01.10.15.006.048.03.107`
 */
export function normalizeCadastralCode(raw: string): string {
  return String(raw || '')
    .replace(/[^\d.]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

export function isCadastralRegistry(value: unknown): value is CadastralRegistry {
  if (!value || typeof value !== 'object') return false;
  const row = value as CadastralRegistry;
  return typeof row.code === 'string'
    && typeof row.total === 'number'
    && Array.isArray(row.applications);
}
