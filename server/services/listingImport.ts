import { usdToGel } from './currency.js';

export interface ImportedListingData {
  source: 'ss.ge' | 'myhome.ge';
  sourceUrl: string;
  sourceId: string;
  title: string;
  description: string;
  type: string;
  dealType: string;
  buildingStatus: string;
  condition: string;
  price: string;
  pricePerSqm: string;
  currency: string;
  area: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  city: string;
  district: string;
  address: string;
  street: string;
  streetNumber: string;
  cadastralCode: string;
  lat: number;
  lng: number;
  images: string[];
  youtubeUrl: string;
  matterportUrl: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  projectType: string;
  wetPoint: string;
  balconyCount: string;
  balconyArea: string;
  verandaArea: string;
  loggiaArea: string;
  waitingArea: string;
  yearBuilt: string;
  ceilingHeight: string;
  livingRoomArea: string;
  storageArea: string;
  parking: string[];
  heating: string[];
  hotWater: string[];
  buildingMaterials: string[];
  windowsMaterials: string[];
  furniture: string[];
  propertyAmenities: string[];
  buildingFeatures: string[];
  badges: string[];
  isPremium: boolean;
  isFeatured: boolean;
  isNew: boolean;
  meta: {
    viewCount?: number;
    vipLabel?: string;
    importedFields?: number;
    /** True when the source carried no usable coordinates and Tbilisi centre was used. */
    coordsFallback?: boolean;
    /** 'ok' when everything important came through, 'partial' otherwise. */
    quality?: ImportQuality;
    /** Important fields the parser could not fill. */
    missingFields?: ImportMissingField[];
    /** Softer quality flags worth a second look before saving. */
    warnings?: ImportWarning[];
  };
}

export type ImportQuality = 'ok' | 'partial';

/** Fields whose absence means a human has to finish the job by hand. */
export const IMPORT_TRACKED_FIELDS = [
  'title', 'description', 'price', 'area', 'rooms',
  'city', 'district', 'address', 'floor', 'images', 'coordinates', 'agentPhone',
] as const;
export type ImportMissingField = (typeof IMPORT_TRACKED_FIELDS)[number];

export const IMPORT_WARNINGS = [
  'coords_defaulted',
  'few_photos',
  'short_description',
  'enum_room_ids',
  'no_cadastral_code',
  'no_agent_name',
  'price_without_area',
] as const;
export type ImportWarning = (typeof IMPORT_WARNINGS)[number];

/** Stable failure codes so the quality report can group without matching Georgian text. */
export const IMPORT_ERROR_CODES = [
  'bad_url',
  'bad_protocol',
  'unsupported_host',
  'id_not_found',
  'upstream_status',
  'upstream_empty',
  'page_fetch_failed',
  'payload_not_found',
  'parse_failed',
  'unknown',
] as const;
export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number];

/** An import failure that already knows how it should be counted in the report. */
export class ImportError extends Error {
  constructor(
    readonly code: ImportErrorCode,
    message: string,
    /** Which source we had identified before failing, if any. */
    readonly source: 'ss.ge' | 'myhome.ge' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'ImportError';
  }
}

/** Anything can be thrown from fetch/JSON.parse — normalise it for the report. */
export function classifyImportError(err: unknown): { code: ImportErrorCode; message: string } {
  if (err instanceof ImportError) return { code: err.code, message: err.message };
  const message = err instanceof Error ? err.message : 'იმპორტი ვერ მოხერხდა';
  return { code: 'unknown', message };
}

/** Used when the source has no coordinates, so the flag can say the pin is a guess. */
const TBILISI_CENTER = { lat: 41.7151, lng: 44.8271 } as const;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CURL_BIN = process.platform === 'win32' ? 'curl.exe' : 'curl';

async function fetchWithCurl(url: string, referer: string): Promise<string> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  const { stdout } = await execFileAsync(
    CURL_BIN,
    [
      '-sL',
      '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml',
      '-H', 'Accept-Language: ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7',
      '-H', `Referer: ${referer}`,
      url,
    ],
    { maxBuffer: 12 * 1024 * 1024, encoding: 'utf8' },
  );
  if (!stdout || stdout.length < 500) throw new Error('ცარიელი პასუხი სერვერიდან');
  return stdout;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickText(val: unknown): string {
  if (typeof val === 'string') return val.trim();
  if (val && typeof val === 'object') {
    const o = val as Record<string, unknown>;
    return String(o.ka ?? o.text ?? o.en ?? '').trim();
  }
  return '';
}

async function fetchPageHtml(url: string, source: 'ss.ge' | 'myhome.ge'): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'ka-GE,ka;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
  };
  if (source === 'myhome.ge') {
    headers.Referer = 'https://www.myhome.ge/';
    headers['Sec-Fetch-Dest'] = 'document';
    headers['Sec-Fetch-Mode'] = 'navigate';
    headers['Sec-Fetch-Site'] = 'same-origin';
    headers['Sec-Fetch-User'] = '?1';
  } else {
    headers.Referer = 'https://home.ss.ge/';
    headers['Sec-Fetch-Dest'] = 'document';
    headers['Sec-Fetch-Mode'] = 'navigate';
    headers['Sec-Fetch-Site'] = 'none';
  }

  try {
    const res = await fetch(url, { headers, redirect: 'follow' });
    if (res.ok) return res.text();
    if (res.status !== 403) {
      throw new ImportError('upstream_status', `გვერდის ჩატვირთვა ვერ მოხერხდა (${res.status})`, source);
    }
  } catch (err) {
    if (source !== 'myhome.ge') {
      throw err instanceof ImportError
        ? err
        : new ImportError('page_fetch_failed', 'გვერდის ჩატვირთვა ვერ მოხერხდა', source);
    }
  }

  return fetchWithCurl(url, source === 'myhome.ge' ? 'https://www.myhome.ge/' : 'https://home.ss.ge/');
}

function extractNextData(html: string): Record<string, unknown> {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new ImportError('payload_not_found', 'გვერდზე მონაცემები ვერ მოიძებნა', 'ss.ge');
  try {
    return JSON.parse(m[1]) as Record<string, unknown>;
  } catch {
    throw new ImportError('parse_failed', 'გვერდის მონაცემები ვერ წაიკითხა', 'ss.ge');
  }
}

function detectSource(url: string): 'ss.ge' | 'myhome.ge' {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('ss.ge')) return 'ss.ge';
  if (host.includes('myhome.ge')) return 'myhome.ge';
  throw new ImportError('unsupported_host', 'მხოლოდ myhome.ge ან ss.ge ბმულებია დაშვებული');
}

function extractMyHomeId(url: string): string {
  const path = new URL(url).pathname;

  // Numeric path segment: .../25675411/
  const segmentMatch = path.match(/\/(\d{5,})(?:\/|$)/);
  if (segmentMatch) return segmentMatch[1];

  // ID embedded in slug: ...-25675411/
  const slugMatch = path.match(/-(\d{5,})(?:\/|$)/);
  if (slugMatch) return slugMatch[1];

  throw new ImportError('id_not_found', 'myhome.ge ბმულიდან ID ვერ მოიძებნა', 'myhome.ge');
}

async function fetchMyHomeStatement(id: string): Promise<Record<string, unknown>> {
  const apiUrl = `https://api-statements.tnet.ge/v1/statements/${id}?locale=ka`;
  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      Referer: 'https://www.myhome.ge/',
      'X-Website-Key': 'myhome',
    },
  });
  if (!res.ok) {
    throw new ImportError('upstream_status', `myhome.ge API ვერ მოიძებნა (${res.status})`, 'myhome.ge');
  }
  const payload = (await res.json()) as {
    result?: boolean;
    data?: { statement?: Record<string, unknown> };
    errors?: { message?: string[] };
  };
  const statement = payload.data?.statement;
  if (!payload.result || !statement) {
    const msg = payload.errors?.message?.[0];
    throw new ImportError(
      'upstream_empty',
      msg || 'myhome.ge განცხადების მონაცემები ვერ მოიძებნა',
      'myhome.ge',
    );
  }
  return statement;
}

function mapSsType(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('ბინ')) return 'apartment';
  if (l.includes('სახლ') || l.includes('კოტეჯ')) return 'house';
  if (l.includes('აგარ')) return 'villa';
  if (l.includes('კომ')) return 'commercial';
  if (l.includes('მიწ')) return 'land';
  if (l.includes('სასტ')) return 'hotel';
  return 'apartment';
}

function mapSsDeal(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('დღიურ')) return 'daily_rent';
  if (l.includes('ქირ')) return 'rent';
  if (l.includes('გირავ')) return 'pledge';
  return 'sale';
}

function mapBuildingStatus(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('მშენებ')) return 'under';
  if (l.includes('ახალი')) return 'new';
  if (l.includes('ძველი')) return 'old';
  return '';
}

function mapMyhomeType(id: number, title: string): string {
  const t = title.toLowerCase();
  if (t.includes('სახლ') || t.includes('კოტეჯ')) return 'house';
  if (t.includes('აგარ')) return 'villa';
  if (t.includes('კომ')) return 'commercial';
  if (t.includes('მიწ')) return 'land';
  if (t.includes('სასტ')) return 'hotel';
  if (id === 1) return 'apartment';
  return 'apartment';
}

function mapMyhomeDeal(id: number, title: string): string {
  const t = title.toLowerCase();
  if (t.includes('დღიურ')) return 'daily_rent';
  if (t.includes('ქირ')) return 'rent';
  if (t.includes('გირავ')) return 'pledge';
  if (id === 7) return 'daily_rent';
  if (id === 2 || id === 3) return 'rent';
  return 'sale';
}

function mapMyhomeStatus(id: number): string {
  if (id === 3) return 'under';
  if (id === 2) return 'new';
  if (id === 1) return 'old';
  return '';
}

/** MyHome TNET enum IDs → admin chip values (rooms / bedrooms / wet point). */
const MYHOME_ROOM_TYPE: Record<number, string> = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10+',
  11: '10+', 12: '10+',
};

const MYHOME_BEDROOM_TYPE: Record<number, string> = {
  1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6+',
};

const MYHOME_BATHROOM_TYPE: Record<number, string> = {
  1: '1', 2: '2', 3: '3+', 4: 'საერთო', 5: 'საერთო',
};

function mapMyhomeChip(
  enumId: unknown,
  map: Record<number, string>,
  rawCount?: unknown,
  maxChip = 10,
): string {
  const count = Number(rawCount);
  if (Number.isFinite(count) && count > 0) {
    if (count > maxChip) return maxChip === 6 ? '6+' : '10+';
    return String(count);
  }
  const id = Number(enumId);
  return map[id] || '';
}

function splitStreetAddress(full: string): { street: string; streetNumber: string } {
  const trimmed = full.trim();
  if (!trimmed) return { street: '', streetNumber: '' };
  const m = trimmed.match(/^(.+?)\s+(\d[\w/-]*)$/u);
  if (m) return { street: m[1].trim(), streetNumber: m[2].trim() };
  return { street: trimmed, streetNumber: '' };
}

async function normalizeImportedPrices(data: ImportedListingData): Promise<ImportedListingData> {
  const rate = await usdToGel();
  const toGel = (value: string, fromUsd: boolean) => {
    const n = Number(value);
    if (!n) return value;
    return fromUsd ? String(Math.round(n * rate)) : String(Math.round(n));
  };
  const fromUsd = data.currency === '$';
  return {
    ...data,
    price: toGel(data.price, fromUsd),
    pricePerSqm: toGel(data.pricePerSqm, fromUsd),
    currency: '₾',
  };
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('995')) return `+${digits}`;
  if (digits.length === 9) return `+995${digits}`;
  return digits.startsWith('+') ? raw : `+${digits}`;
}

function parseSsGe(html: string, sourceUrl: string): ImportedListingData {
  const next = extractNextData(html);
  const pageProps = (next.props as { pageProps?: Record<string, unknown> })?.pageProps ?? {};
  const app = pageProps.applicationData as Record<string, unknown> | undefined;
  if (!app) throw new Error('ss.ge განცხადების მონაცემები ვერ მოიძებნა');

  const address = (app.address ?? {}) as Record<string, unknown>;
  const price = (app.price ?? {}) as Record<string, unknown>;
  const currencyType = Number(price.currencyType ?? 1);
  const useUsd = currencyType === 2;
  const currency = useUsd ? '$' : '₾';
  const totalPrice = useUsd ? price.priceUsd : price.priceGeo;
  const sqmPrice = useUsd ? price.unitPriceUsd : price.unitPriceGeo;

  const images = Array.isArray(app.appImages)
    ? (app.appImages as Array<{ fileName?: string }>)
        .map(img => img.fileName?.replace(/_Thumb\.jpg$/i, '.jpg') ?? '')
        .filter(Boolean)
    : [];

  const phones = Array.isArray(app.applicationPhones)
    ? (app.applicationPhones as Array<{ phoneNumber?: string }>).map(p => p.phoneNumber).filter(Boolean)
    : [];

  const parking: string[] = [];
  const heating: string[] = [];
  const hotWater: string[] = [];
  const furniture: string[] = [];
  const propertyAmenities: string[] = [];
  const buildingFeatures: string[] = [];

  if (app.garage) parking.push('ავტოფარეხი');
  if (app.heating === true || typeof app.heating === 'string') heating.push('ცენტრალური გათბობა');
  if (app.hotWater === true || typeof app.hotWater === 'string') hotWater.push('ცენტრალური ცხელი წყალი');
  if (app.furniture) furniture.push('ავეჯი');
  if (app.airConditioning) propertyAmenities.push('კონდიციონერი');
  if (app.internet || app.wiFi) propertyAmenities.push('ინტერნეტი');
  if (app.tv || app.cableTelevision) propertyAmenities.push('ტელევიზია');
  if (app.naturalGas) propertyAmenities.push('ბუნებრივი აირი');
  if (app.water) propertyAmenities.push('წყალი');
  if (app.elevator) buildingFeatures.push('ლიფტი');
  if (app.withPool) buildingFeatures.push('დახ. აუზი');
  if (app.securityAlarm) buildingFeatures.push('სიგნალიზაცია');
  if (app.basement) buildingFeatures.push('სარდაფი');
  if (app.storage) buildingFeatures.push('სათავსო');

  const vip = String(app.vipStatus ?? '');
  const isPremium = /vip/i.test(vip);
  const isFeatured = Boolean(app.isHighlighted);

  const city = String(address.cityTitle ?? '');
  const district = String(address.districtTitle ?? address.subdistrictTitle ?? '');
  const street = String(address.streetTitle ?? '');
  const streetNumber = String(address.streetNumber ?? '');

  return {
    source: 'ss.ge',
    sourceUrl,
    sourceId: String(app.applicationId ?? ''),
    title: String(app.title ?? ''),
    description: pickText(app.description),
    type: mapSsType(String(app.realEstateType ?? '')),
    dealType: mapSsDeal(String(app.realEstateDealType ?? '')),
    buildingStatus: mapBuildingStatus(String(app.realEstateStatus ?? '')),
    condition: String(app.state ?? ''),
    price: totalPrice != null ? String(totalPrice) : '',
    pricePerSqm: sqmPrice != null ? String(sqmPrice) : '',
    currency,
    area: String(app.totalArea ?? app.areaOfHouse ?? ''),
    rooms: String(app.rooms ?? app.houseRooms ?? ''),
    bedrooms: app.bedrooms != null ? String(app.bedrooms) : '',
    bathrooms: String(app.toilet ?? ''),
    floor: String(app.floor ?? ''),
    totalFloors: String(app.floors ?? ''),
    city,
    district,
    address: [city, district, street, streetNumber].filter(Boolean).join(', '),
    street,
    streetNumber,
    cadastralCode: String(app.cadastralCode ?? ''),
    lat: Number(app.locationLatitude) || TBILISI_CENTER.lat,
    lng: Number(app.locationLongitude) || TBILISI_CENTER.lng,
    images,
    youtubeUrl: String(app.applicationVideoLink ?? app.uploadVideoLink ?? ''),
    matterportUrl: '',
    agentName: String(app.contactPerson ?? app.agencyName ?? app.companyName ?? ''),
    agentPhone: normalizePhone(String(phones[0] ?? '')),
    agentEmail: '',
    projectType: String(app.project ?? ''),
    wetPoint: String(app.toilet ?? ''),
    balconyCount: app.balcony ? '1' : '',
    balconyArea: '',
    verandaArea: '',
    loggiaArea: '',
    waitingArea: '',
    yearBuilt: '',
    ceilingHeight: '',
    livingRoomArea: '',
    storageArea: '',
    parking,
    heating,
    hotWater,
    buildingMaterials: [],
    windowsMaterials: app.glazedWindows ? ['პლასტმასა'] : [],
    furniture,
    propertyAmenities,
    buildingFeatures,
    badges: app.isUrgent ? ['urgent'] : [],
    isPremium,
    isFeatured,
    isNew: true,
    meta: {
      viewCount: Number(app.viewCount ?? 0) || undefined,
      vipLabel: vip || undefined,
      importedFields: 0,
    },
  };
}

function parseMyHomeStatement(statement: Record<string, unknown>, sourceUrl: string): ImportedListingData {
  const seo = statement.seo as { h1?: string } | undefined;
  const title = String(statement.dynamic_title ?? seo?.h1 ?? '');
  const images = Array.isArray(statement.images)
    ? (statement.images as Array<{ large?: string }>).map(i => i.large).filter(Boolean) as string[]
    : [];

  const dealType = mapMyhomeDeal(Number(statement.deal_type_id ?? 0), title);
  const currency = Number(statement.currency_id ?? 1) === 2 ? '$' : '₾';
  const priceBlocks = statement.price as Record<string, { price_total?: number; price_square?: number }> | undefined;
  const gelBlock = priceBlocks?.['1'];
  const usdBlock = priceBlocks?.['2'];
  const priceBlock = currency === '$' ? usdBlock ?? gelBlock : gelBlock ?? usdBlock;
  const totalPrice = statement.total_price ?? priceBlock?.price_total;
  const sqmPrice = priceBlock?.price_square;

  const fullAddress = String(statement.address ?? '').trim();
  const { street, streetNumber } = splitStreetAddress(fullAddress);
  const rooms = mapMyhomeChip(statement.room_type_id, MYHOME_ROOM_TYPE, statement.rooms);
  const bedrooms = mapMyhomeChip(statement.bedroom_type_id, MYHOME_BEDROOM_TYPE, statement.bedrooms, 6);
  const wetPoint = mapMyhomeChip(statement.bathroom_type_id, MYHOME_BATHROOM_TYPE, statement.bathrooms);

  const parking: string[] = [];
  const heating: string[] = [];
  const hotWater: string[] = [];
  const furniture: string[] = [];
  const propertyAmenities: string[] = [];
  const buildingFeatures: string[] = [];

  if (statement.parking_type) parking.push('პარკინგის ადგილი');
  if (statement.heating_type) heating.push(String(statement.heating_type));
  if (statement.hot_water_type) hotWater.push(String(statement.hot_water_type));

  const isPremium = Boolean(statement.is_super_vip || statement.is_vip_plus || statement.is_vip);
  const isFeatured = Boolean(statement.is_promoted || statement.has_color);

  return {
    source: 'myhome.ge',
    sourceUrl,
    sourceId: String(statement.id ?? ''),
    title,
    description: stripHtml(String(statement.comment ?? '')),
    type: mapMyhomeType(Number(statement.real_estate_type_id ?? 1), title),
    dealType,
    buildingStatus: mapMyhomeStatus(Number(statement.status_id ?? 0)),
    condition: String(statement.condition ?? ''),
    price: totalPrice != null ? String(totalPrice) : '',
    pricePerSqm: sqmPrice != null ? String(sqmPrice) : '',
    currency,
    area: statement.area != null ? String(statement.area) : '',
    rooms,
    bedrooms,
    bathrooms: wetPoint === 'საერთო' ? '0' : wetPoint.replace('+', '') || '',
    floor: statement.floor != null ? String(statement.floor) : '',
    totalFloors: statement.total_floors != null ? String(statement.total_floors) : '',
    city: String(statement.city_name ?? ''),
    district: String(statement.district_name ?? statement.urban_name ?? ''),
    address: fullAddress,
    street,
    streetNumber,
    cadastralCode: String(statement.rs_code ?? ''),
    lat: Number(statement.lat) || TBILISI_CENTER.lat,
    lng: Number(statement.lng) || TBILISI_CENTER.lng,
    images,
    youtubeUrl: String(statement.youtube_link ?? ''),
    matterportUrl: String(statement['3d_url'] ?? ''),
    agentName: String(statement.owner_name ?? ''),
    agentPhone: normalizePhone(String(statement.user_phone_number ?? statement.additional_phone_number ?? '')),
    agentEmail: '',
    projectType: '',
    wetPoint,
    balconyCount: statement.balconies != null ? String(statement.balconies) : '',
    balconyArea: statement.balcony_area != null ? String(statement.balcony_area) : '',
    verandaArea: statement.porch_area != null ? String(statement.porch_area) : '',
    loggiaArea: statement.loggia_area != null ? String(statement.loggia_area) : '',
    waitingArea: statement.waiting_space_area != null ? String(statement.waiting_space_area) : '',
    yearBuilt: statement.build_year != null ? String(statement.build_year) : '',
    ceilingHeight: statement.height != null && Number(statement.height) > 0 ? String(statement.height) : '',
    livingRoomArea: statement.living_room_area != null ? String(statement.living_room_area) : '',
    storageArea: statement.storeroom_area != null ? String(statement.storeroom_area) : '',
    parking,
    heating,
    hotWater,
    buildingMaterials: statement.material_type ? [String(statement.material_type)] : [],
    windowsMaterials: statement.door_window_type ? [String(statement.door_window_type)] : [],
    furniture,
    propertyAmenities,
    buildingFeatures,
    badges: [],
    isPremium,
    isFeatured,
    isNew: true,
    meta: {
      viewCount: Number(statement.views ?? 0) || undefined,
      vipLabel: isPremium ? 'VIP' : undefined,
      importedFields: 0,
    },
  };
}

/**
 * Grades a parse so the admin sees what still needs typing in, and so the quality
 * report can tell a clean import from one that only looked like it worked. The
 * old field count is kept as a rough completeness score.
 */
export function auditImport(data: ImportedListingData): {
  quality: ImportQuality;
  missingFields: ImportMissingField[];
  warnings: ImportWarning[];
  importedFields: number;
} {
  const missing: ImportMissingField[] = [];
  const warnings: ImportWarning[] = [];

  if (!data.title.trim()) missing.push('title');
  if (!data.description.trim()) missing.push('description');
  if (!Number(data.price)) missing.push('price');
  if (!Number(data.area)) missing.push('area');
  if (!data.rooms.trim()) missing.push('rooms');
  if (!data.city.trim()) missing.push('city');
  if (!data.district.trim()) missing.push('district');
  if (!data.address.trim()) missing.push('address');
  if (!data.floor.trim()) missing.push('floor');
  if (!data.images.length) missing.push('images');
  if (!data.agentPhone.trim()) missing.push('agentPhone');

  const coordsFallback =
    Math.abs(data.lat - TBILISI_CENTER.lat) < 1e-6 && Math.abs(data.lng - TBILISI_CENTER.lng) < 1e-6;
  if (coordsFallback) {
    missing.push('coordinates');
    warnings.push('coords_defaulted');
  }

  if (data.images.length > 0 && data.images.length < 5) warnings.push('few_photos');
  if (data.description.trim().length > 0 && data.description.trim().length < 120) {
    warnings.push('short_description');
  }
  // myhome hands back room *type* ids rather than counts, so anything above a
  // plausible room count is an unmapped enum the admin has to correct.
  if (data.source === 'myhome.ge' && Number(data.rooms) > 20) warnings.push('enum_room_ids');
  if (!data.cadastralCode.trim()) warnings.push('no_cadastral_code');
  if (!data.agentName.trim()) warnings.push('no_agent_name');
  if (Number(data.price) > 0 && !Number(data.area)) warnings.push('price_without_area');

  let importedFields = 0;
  const scalarKeys: (keyof ImportedListingData)[] = [
    'title', 'description', 'price', 'pricePerSqm', 'area', 'rooms', 'city', 'district', 'address',
    'floor', 'totalFloors', 'cadastralCode', 'agentName', 'agentPhone',
  ];
  for (const key of scalarKeys) if (data[key]) importedFields++;
  if (data.images.length) importedFields += 2;
  if (!coordsFallback) importedFields++;

  return {
    quality: missing.length ? 'partial' : 'ok',
    missingFields: missing,
    warnings,
    importedFields,
  };
}

export async function importListingFromUrl(rawUrl: string): Promise<ImportedListingData> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ImportError('bad_url', 'არასწორი URL');
  }
  if (!/^https?:$/i.test(url.protocol)) {
    throw new ImportError('bad_protocol', 'URL უნდა იწყებოდეს http:// ან https://');
  }

  const source = detectSource(url.href);
  let data: ImportedListingData;
  if (source === 'myhome.ge') {
    const statement = await fetchMyHomeStatement(extractMyHomeId(url.href));
    data = parseMyHomeStatement(statement, url.href);
  } else {
    const html = await fetchPageHtml(url.href, source);
    data = parseSsGe(html, url.href);
  }

  const audit = auditImport(data);
  data.meta.importedFields = audit.importedFields;
  data.meta.quality = audit.quality;
  data.meta.missingFields = audit.missingFields;
  data.meta.warnings = audit.warnings;
  data.meta.coordsFallback = audit.warnings.includes('coords_defaulted');
  return await normalizeImportedPrices(data);
}
