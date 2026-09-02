import { CITY_AREAS } from '../data/districts';

/** myhome-style public listings root. */
export const LISTINGS_SEO_ROOT = '/udzravi-qoneba';

export type ListingUrlFilters = {
  status?: string;
  type?: string;
  bedrooms?: string;
  city?: string;
  district?: string;
  q?: string;
  isNew?: boolean;
  isPremium?: boolean;
  vip?: boolean;
  priceMin?: string;
  priceMax?: string;
  areaMin?: string;
  areaMax?: string;
};

const KA_LATIN: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i', კ: 'k',
  ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: 'p', ჟ: 'zh', რ: 'r', ს: 's', ტ: 't', უ: 'u',
  ფ: 'f', ქ: 'k', ღ: 'gh', ყ: 'q', შ: 'sh', ჩ: 'ch', ც: 'ts', ძ: 'dz', წ: 'ts',
  ჭ: 'ch', ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

const DEAL_SLUG: Record<string, string> = {
  sale: 'iyideba',
  rent: 'kiravdeba',
  daily_rent: 'dgiurad',
  pledge: 'giravdeba',
};

const SLUG_DEAL: Record<string, string> = Object.fromEntries(
  Object.entries(DEAL_SLUG).map(([k, v]) => [v, k]),
);

const TYPE_SLUG: Record<string, string> = {
  apartment: 'bina',
  house: 'kerdzo-saxli',
  villa: 'vila',
  commercial: 'komerciuli',
  land: 'mitsa',
  hotel: 'sasadgiro',
};

const SLUG_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(TYPE_SLUG).map(([k, v]) => [v, k]),
);

const STREETS: { slug: string; q: string }[] = [
  { slug: 'rustavelis-gamziri', q: 'რუსთაველის გამზირი' },
  { slug: 'vazha-fshavelas-gamziri', q: 'ვაჟა-ფშაველას გამზირი' },
  { slug: 'qazbegis-gamziri', q: 'ყაზბეგის გამზირი' },
  { slug: 'chavchavadzis-gamziri', q: 'ჭავჭავაძის გამზირი' },
];

const STREET_BY_SLUG = new Map(STREETS.map(s => [s.slug, s.q]));
const STREET_BY_Q = new Map(STREETS.map(s => [s.q.toLowerCase(), s.slug]));

const cityBySlug = new Map<string, string>();
const districtBySlug = new Map<string, { city: string; district: string }[]>();

export function kaToSlug(value: string): string {
  let out = '';
  for (const ch of value.trim().toLowerCase()) {
    if (KA_LATIN[ch]) out += KA_LATIN[ch];
    else if (/[a-z0-9]/.test(ch)) out += ch;
    else out += '-';
  }
  return out.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function rememberDistrict(slug: string, city: string, district: string) {
  if (!slug) return;
  const list = districtBySlug.get(slug) ?? [];
  if (!list.some(x => x.city === city && x.district === district)) list.push({ city, district });
  districtBySlug.set(slug, list);
}

for (const city of CITY_AREAS) {
  cityBySlug.set(kaToSlug(city.ka), city.ka);
  cityBySlug.set(kaToSlug(city.en), city.ka);
  for (const district of city.districts) {
    rememberDistrict(kaToSlug(district.ka), city.ka, district.ka);
    rememberDistrict(kaToSlug(district.en), city.ka, district.ka);
    for (const alias of district.aliases ?? []) {
      rememberDistrict(kaToSlug(alias), city.ka, district.ka);
    }
  }
}

function roomsSlug(n: string): string | null {
  const v = parseInt(n, 10);
  return Number.isFinite(v) && v > 0 ? `${v}-otaxiani` : null;
}

function parseRooms(token: string): string | null {
  const m = /^(\d+)-otaxiani$/.exec(token);
  return m ? m[1] : null;
}

function resolveDistrict(slug: string, city?: string) {
  const hits = districtBySlug.get(slug);
  if (!hits?.length) return null;
  if (city) return hits.find(h => h.city === city) ?? null;
  return hits[0];
}

function knownStreetSlug(q: string | undefined): string | null {
  if (!q?.trim()) return null;
  const byName = STREET_BY_Q.get(q.trim().toLowerCase());
  if (byName) return byName;
  const slug = kaToSlug(q);
  return STREET_BY_SLUG.has(slug) ? slug : null;
}

/** Single hyphenated slug ending with the listing id — not a filter path. */
export function isPropertySeoPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '');
  if (!clean.startsWith(`${LISTINGS_SEO_ROOT}/`)) return false;
  const rest = clean.slice(LISTINGS_SEO_ROOT.length + 1);
  const segments = rest.split('/').filter(Boolean);
  return segments.length === 1 && /-\d+$/.test(segments[0]);
}

export function isListingsPath(pathname: string): boolean {
  if (isPropertySeoPath(pathname)) return false;
  return pathname === LISTINGS_SEO_ROOT
    || pathname.startsWith(`${LISTINGS_SEO_ROOT}/`)
    || pathname === '/listings'
    || pathname.startsWith('/listings/');
}

export function listingsHref(input: ListingUrlFilters = {}): string {
  const parts = [LISTINGS_SEO_ROOT];
  if (input.status && DEAL_SLUG[input.status]) parts.push(DEAL_SLUG[input.status]);
  if (input.type && TYPE_SLUG[input.type]) parts.push(TYPE_SLUG[input.type]);
  if (input.bedrooms) {
    const rooms = roomsSlug(input.bedrooms);
    if (rooms) parts.push(rooms);
  }
  if (input.city) {
    const citySlug = cityBySlug.has(kaToSlug(input.city))
      ? kaToSlug(input.city)
      : kaToSlug(input.city);
    if (citySlug) parts.push(citySlug);
  }
  if (input.district) {
    const dSlug = kaToSlug(input.district);
    if (dSlug) parts.push(dSlug);
  } else {
    const street = knownStreetSlug(input.q);
    if (street) parts.push(street);
  }

  let path = `${parts.join('/')}/`;
  if (path === `${LISTINGS_SEO_ROOT}//`) path = `${LISTINGS_SEO_ROOT}/`;

  const extra = new URLSearchParams();
  if (input.priceMin) extra.set('priceMin', input.priceMin);
  if (input.priceMax) extra.set('priceMax', input.priceMax);
  if (input.areaMin) extra.set('areaMin', input.areaMin);
  if (input.areaMax) extra.set('areaMax', input.areaMax);
  if (input.isNew) extra.set('new', 'true');
  if (input.isPremium) extra.set('premium', 'true');
  if (input.vip) extra.set('vip', 'true');
  const qs = extra.toString();
  return qs ? `${path}?${qs}` : path;
}

export function parseListingsPath(pathname: string): ListingUrlFilters {
  const clean = pathname.replace(/\/+$/, '');
  if (clean === LISTINGS_SEO_ROOT || clean === '/listings') return {};
  if (!clean.startsWith(`${LISTINGS_SEO_ROOT}/`)) return {};

  const tokens = clean.slice(LISTINGS_SEO_ROOT.length + 1).split('/').filter(Boolean);
  const filters: ListingUrlFilters = {};

  for (const token of tokens) {
    if (SLUG_DEAL[token]) {
      filters.status = SLUG_DEAL[token];
      continue;
    }
    if (SLUG_TYPE[token]) {
      filters.type = SLUG_TYPE[token];
      continue;
    }
    const rooms = parseRooms(token);
    if (rooms) {
      filters.bedrooms = rooms;
      continue;
    }
    const city = cityBySlug.get(token);
    if (city) {
      filters.city = city;
      continue;
    }
    const street = STREET_BY_SLUG.get(token);
    if (street) {
      filters.q = street;
      continue;
    }
    const district = resolveDistrict(token, filters.city);
    if (district) {
      filters.district = district.district;
      if (!filters.city) filters.city = district.city;
      continue;
    }
  }

  return filters;
}

export function listingsHrefFromSearchParams(params: URLSearchParams): string {
  return listingsHref({
    status: params.get('status') || undefined,
    type: params.get('type') || undefined,
    bedrooms: params.get('bedrooms') || undefined,
    city: params.get('city') || undefined,
    district: params.get('district') || undefined,
    q: params.get('q') || undefined,
    isNew: params.get('new') === 'true',
    isPremium: params.get('premium') === 'true',
    vip: params.get('vip') === 'true',
    priceMin: params.get('priceMin') || undefined,
    priceMax: params.get('priceMax') || undefined,
    areaMin: params.get('areaMin') || undefined,
    areaMax: params.get('areaMax') || undefined,
  });
}

export function parseListingsLocation(pathname: string, search: string): ListingUrlFilters {
  const fromPath = parseListingsPath(pathname);
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fromQuery = pathname === '/listings' || pathname.startsWith('/listings/')
    ? {
        status: params.get('status') || undefined,
        type: params.get('type') || undefined,
        bedrooms: params.get('bedrooms') || undefined,
        city: params.get('city') || undefined,
        district: params.get('district') || undefined,
      }
    : {};

  return {
    ...fromQuery,
    ...fromPath,
    q: fromPath.q || params.get('q') || undefined,
    isNew: params.get('new') === 'true' || fromPath.isNew,
    isPremium: params.get('premium') === 'true' || fromPath.isPremium,
    vip: params.get('vip') === 'true',
    priceMin: params.get('priceMin') || undefined,
    priceMax: params.get('priceMax') || undefined,
    areaMin: params.get('areaMin') || undefined,
    areaMax: params.get('areaMax') || undefined,
  };
}

/** Canonical path only — no price/new/premium query. */
export function listingsCanonicalPath(filters: ListingUrlFilters): string {
  return listingsHref({
    status: filters.status,
    type: filters.type,
    bedrooms: filters.bedrooms,
    city: filters.city,
    district: filters.district,
    q: knownStreetSlug(filters.q) ? filters.q : undefined,
  });
}

export function listingSitemapPaths(): string[] {
  const paths = new Set<string>([
    listingsHref(),
    listingsHref({ status: 'sale' }),
    listingsHref({ status: 'rent' }),
    listingsHref({ status: 'daily_rent' }),
    listingsHref({ type: 'apartment' }),
    listingsHref({ status: 'sale', type: 'apartment' }),
    listingsHref({ status: 'rent', type: 'apartment' }),
    listingsHref({ status: 'daily_rent', type: 'apartment' }),
    listingsHref({ status: 'sale', type: 'house' }),
    listingsHref({ status: 'rent', type: 'commercial' }),
    listingsHref({ status: 'sale', type: 'land' }),
    listingsHref({ type: 'apartment', city: 'თბილისი', district: 'ვაკე' }),
    listingsHref({ type: 'apartment', city: 'თბილისი', district: 'საბურთალო' }),
    listingsHref({ status: 'rent', type: 'apartment', city: 'თბილისი', district: 'ვარკეთილი' }),
    listingsHref({ type: 'apartment', city: 'ქობულეთი' }),
    listingsHref({ status: 'daily_rent', type: 'apartment', city: 'ქობულეთი' }),
    listingsHref({ type: 'apartment', city: 'ბაკურიანი' }),
  ]);
  for (let n = 1; n <= 4; n += 1) {
    paths.add(listingsHref({ status: 'rent', type: 'apartment', bedrooms: String(n) }));
  }
  for (const street of STREETS) {
    paths.add(listingsHref({ status: 'rent', type: 'apartment', city: 'თბილისი', q: street.q }));
  }
  return [...paths];
}
