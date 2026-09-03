import {
  mapCadastralApplication,
  normalizeCadastralCode,
  type CadastralRegistry,
} from '../lib/cadastralCode.js';

const NAPR_SEARCH = 'https://naprweb.reestri.gov.ge/api/search';
const MAX_PAGES = 10;

export class CadastralLookupError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = 'CadastralLookupError';
  }
}

interface NaprSearchResponse {
  applist?: Record<string, unknown>[];
  page?: number;
  lastpage?: number;
  total?: number;
}

async function searchPage(cadcode: string, page: number): Promise<NaprSearchResponse> {
  const res = await fetch(NAPR_SEARCH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: 'https://naprweb.reestri.gov.ge',
      Referer: 'https://naprweb.reestri.gov.ge/',
    },
    body: JSON.stringify({
      page,
      search: '',
      regno: '',
      datefrom: null,
      dateto: null,
      person: '',
      address: '',
      cadcode,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new CadastralLookupError(`საჯარო რეესტრი არ პასუხობს (${res.status})`);
  }

  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    throw new CadastralLookupError('საჯარო რეესტრის პასუხი ვერ წაიკითხა');
  }
  return data as NaprSearchResponse;
}

/** Public NAPR search used by my.gov.ge service 176. */
export async function lookupCadastral(rawCode: string): Promise<CadastralRegistry> {
  const code = normalizeCadastralCode(rawCode);
  if (!code) {
    throw new CadastralLookupError('ჩაწერეთ საკადასტრო კოდი', 400);
  }

  const first = await searchPage(code, 1);
  const lastPage = Math.min(Math.max(Number(first.lastpage) || 1, 1), MAX_PAGES);
  const pages = [first];

  for (let page = 2; page <= lastPage; page += 1) {
    pages.push(await searchPage(code, page));
  }

  const applications = pages.flatMap(page =>
    (Array.isArray(page.applist) ? page.applist : []).map(mapCadastralApplication),
  );

  return {
    code,
    total: Number(first.total) || applications.length,
    lastPage: Number(first.lastpage) || 1,
    syncedAt: new Date().toISOString(),
    applications,
  };
}
