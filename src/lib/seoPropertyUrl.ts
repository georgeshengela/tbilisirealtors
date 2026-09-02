import { CITY_AREAS, canonicalCityName, canonicalDistrictName } from '../data/districts';
import { SITE_NAME } from './seo';
import { isPropertySeoPath, kaToSlug, LISTINGS_SEO_ROOT } from './seoListingsUrl';

export type PropertyUrlInput = {
  id: string;
  status?: string | null;
  type?: string | null;
  rooms?: number | null;
  bedrooms?: number | null;
  district?: string | null;
  city?: string | null;
  address?: string | null;
  area?: number | string | null;
  price?: number | string | null;
  rentPrice?: number | string | null;
  description?: string | null;
  title?: string | null;
  images?: string[] | null;
};

const DEAL_SLUG: Record<string, string> = {
  sale: 'iyideba',
  rent: 'kiravdeba',
  daily_rent: 'dgiurad',
  pledge: 'giravdeba',
  both: 'iyideba',
};

const TYPE_SLUG: Record<string, string> = {
  apartment: 'bina',
  house: 'kerdzo-saxli',
  villa: 'vila',
  commercial: 'komerciuli',
  land: 'mitsa',
  hotel: 'sasadgiro',
};

const TYPE_KA: Record<string, string> = {
  apartment: 'ბინა',
  house: 'სახლი',
  villa: 'ვილა',
  commercial: 'კომერციული ფართი',
  land: 'მიწა',
  hotel: 'სასტუმრო',
};

const TYPE_EN: Record<string, string> = {
  apartment: 'apartment',
  house: 'house',
  villa: 'villa',
  commercial: 'commercial space',
  land: 'land',
  hotel: 'hotel',
};

const DEAL_KA: Record<string, string> = {
  sale: 'იყიდება',
  rent: 'ქირავდება',
  daily_rent: 'ქირავდება დღიურად',
  pledge: 'გირავდება',
  both: 'იყიდება',
};

const DEAL_EN: Record<string, string> = {
  sale: 'for sale',
  rent: 'for rent',
  daily_rent: 'for daily rent',
  pledge: 'for pledge',
  both: 'for sale',
};

const DEAL_EN_SLUG: Record<string, string> = {
  sale: 'for-sale',
  rent: 'for-rent',
  daily_rent: 'for-daily-rent',
  pledge: 'for-pledge',
  both: 'for-sale',
};

const TYPE_EN_SLUG: Record<string, string> = {
  apartment: 'apartment',
  house: 'house',
  villa: 'villa',
  commercial: 'commercial',
  land: 'land',
  hotel: 'hotel',
};

export const PROPERTY_SEO_KEYWORDS_KA =
  'უძრავი ქონება, საქართველო, თბილისი, ბინა, სახლი, აგარაკი, მიწის ნაკვეთი, სასტუმრო, კომერციული ფართი, იყიდება, გირავდება, ქირავდება, ქირავდება დღიურად';

export const PROPERTY_SEO_KEYWORDS_EN =
  'real estate, Georgia, Tbilisi, apartment, house, cottage, land, hotel, commercial, for sale, for rent, daily rent';

const placeEnByKa = new Map<string, string>();
for (const city of CITY_AREAS) {
  placeEnByKa.set(city.ka.toLowerCase(), city.en);
  for (const district of city.districts) {
    placeEnByKa.set(district.ka.toLowerCase(), district.en);
    for (const alias of district.aliases ?? []) {
      placeEnByKa.set(alias.toLowerCase(), district.en);
    }
  }
}

function locativeWord(word: string): string {
  if (/ში$|ზე$/.test(word)) return word;
  if (word.endsWith('ი')) return `${word.slice(0, -1)}ში`;
  if (word.endsWith('ო') || word.endsWith('უ')) return `${word}ზე`;
  return `${word}ში`;
}

/** ნაძალადევი → ნაძალადევში, საბურთალო → საბურთალოზე */
export function kaLocative(place: string): string {
  const trimmed = place.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/(\s+|-)/);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (/[ა-ჰ]/.test(parts[i]) && !/^(\s+|-)$/.test(parts[i])) {
      parts[i] = locativeWord(parts[i]);
      break;
    }
  }
  return parts.join('');
}

function normalizeStatus(status?: string | null): string {
  if (status === 'rent' || status === 'daily_rent' || status === 'pledge') return status;
  return 'sale';
}

function roomsFromTitle(title?: string | null): number | null {
  if (!title) return null;
  const match = /(\d+)\s*ოთახიანი/i.exec(title) || /(\d+)\s*-?\s*room/i.exec(title);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function roomCount(input: PropertyUrlInput): number | null {
  if (input.type === 'land' || input.type === 'commercial') return null;
  const n = Number(input.rooms ?? roomsFromTitle(input.title) ?? input.bedrooms ?? 0);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function placeKa(input: PropertyUrlInput): string {
  const city = canonicalCityName(input.city || undefined);
  const district = canonicalDistrictName(city || input.city || undefined, input.district || undefined);
  if (district) return district;
  if (input.district?.trim()) {
    const raw = input.district.trim().toLowerCase();
    const hit = CITY_AREAS
      .flatMap(c => c.districts)
      .find(d => [d.ka, d.en, ...(d.aliases ?? [])].some(v => v.toLowerCase() === raw));
    if (hit) return hit.ka;
    return input.district.trim();
  }
  return city;
}

function placeEn(kaName: string): string {
  if (!kaName) return '';
  return placeEnByKa.get(kaName.toLowerCase()) || kaName;
}

function money(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function areaValue(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function listingPrice(input: PropertyUrlInput): number | null {
  const status = normalizeStatus(input.status);
  if (status === 'rent' || status === 'daily_rent') {
    return money(input.rentPrice) ?? money(input.price);
  }
  return money(input.price);
}

export function propertySlugKa(input: PropertyUrlInput): string {
  const status = normalizeStatus(input.status);
  const parts = [DEAL_SLUG[status] ?? 'iyideba'];
  const rooms = roomCount(input);
  if (rooms) parts.push(`${rooms}-otaxiani`);
  parts.push(TYPE_SLUG[input.type ?? ''] ?? 'bina');
  const loc = placeKa(input);
  if (loc) parts.push(kaToSlug(kaLocative(loc)));
  parts.push(String(input.id));
  return parts.join('-');
}

export function propertySlugEn(input: PropertyUrlInput): string {
  const status = normalizeStatus(input.status);
  const rooms = roomCount(input);
  const type = TYPE_EN_SLUG[input.type ?? ''] ?? 'apartment';
  const deal = DEAL_EN_SLUG[status] ?? 'for-sale';
  const loc = kaToSlug(placeEn(placeKa(input)));
  const head = rooms ? `${rooms}-room-${type}` : type;
  const tail = loc ? `${head}-${deal}-in-${loc}` : `${head}-${deal}`;
  return `${tail}-${input.id}`;
}

export function propertyHref(input: PropertyUrlInput): string {
  return `${LISTINGS_SEO_ROOT}/${propertySlugKa(input)}/`;
}

export function propertyHrefEn(input: PropertyUrlInput): string {
  return `${LISTINGS_SEO_ROOT}/${propertySlugEn(input)}/`;
}

export function parsePropertyId(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '');
  if (clean.startsWith('/property/')) {
    const id = decodeURIComponent(clean.slice('/property/'.length).split('/')[0] ?? '');
    return id || null;
  }
  if (!isPropertySeoPath(pathname)) return null;
  const slug = clean.slice(LISTINGS_SEO_ROOT.length + 1);
  const match = /-(\d+)$/.exec(slug);
  return match?.[1] ?? null;
}

export type PropertySeoCopy = {
  h1: string;
  title: string;
  description: string;
  keywords: string;
  path: string;
  pathEn: string;
  price: number | null;
  area: number | null;
};

export function propertySeoCopy(input: PropertyUrlInput, locale: 'ka' | 'en' = 'ka'): PropertySeoCopy {
  const status = normalizeStatus(input.status);
  const rooms = roomCount(input);
  const type = input.type ?? 'apartment';
  const loc = placeKa(input);
  const area = areaValue(input.area);
  const price = listingPrice(input);
  const path = propertyHref(input);
  const pathEn = propertyHrefEn(input);
  const address = (input.address || '').trim();

  if (locale === 'en') {
    const typeLabel = TYPE_EN[type] ?? 'property';
    const deal = DEAL_EN[status] ?? 'for sale';
    const roomBit = rooms ? `${rooms}-room ` : '';
    const placeBit = loc ? ` in ${placeEn(loc)}` : '';
    const h1 = `${roomBit}${typeLabel} ${deal}${placeBit}`.replace(/\s+/g, ' ').trim();
    const bits = [
      h1,
      price != null ? `${price} GEL` : '',
      area != null ? `${area} m²` : '',
      input.id,
    ].filter(Boolean);
    const where = [address, loc ? placeEn(loc) : '', area != null ? `${area} m²` : '']
      .filter(Boolean)
      .join(', ');
    return {
      h1,
      title: `${bits.join(', ')} | ${SITE_NAME}`,
      description: `${h1}${where ? `, ${where}` : ''}. See listing photos and contact information.`,
      keywords: PROPERTY_SEO_KEYWORDS_EN,
      path,
      pathEn,
      price,
      area,
    };
  }

  const typeLabel = TYPE_KA[type] ?? 'ქონება';
  const deal = DEAL_KA[status] ?? 'იყიდება';
  const roomBit = rooms ? `${rooms} ოთახიანი ` : '';
  const placeBit = loc ? ` ${kaLocative(loc)}` : '';
  const h1 = `${deal} ${roomBit}${typeLabel}${placeBit}`.replace(/\s+/g, ' ').trim();
  const bits = [
    h1,
    price != null ? `${price} ₾` : '',
    area != null ? `${area} მ²` : '',
    input.id,
  ].filter(Boolean);
  const where = [address, area != null ? `${area} მ²` : ''].filter(Boolean).join(', ');
  return {
    h1,
    title: `${bits.join(', ')} | ${SITE_NAME}`,
    description: `${h1}${where ? `, ${where}` : ''}. ნახე განცხადებების ფოტოები და საკონტაქტო ინფორმაცია.`,
    keywords: PROPERTY_SEO_KEYWORDS_KA,
    path,
    pathEn,
    price,
    area,
  };
}
