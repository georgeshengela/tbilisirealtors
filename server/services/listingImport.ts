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
  };
}

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
    if (res.status !== 403) throw new Error(`გვერდის ჩატვირთვა ვერ მოხერხდა (${res.status})`);
  } catch (err) {
    if (source !== 'myhome.ge') throw err instanceof Error ? err : new Error('გვერდის ჩატვირთვა ვერ მოხერხდა');
  }

  return fetchWithCurl(url, source === 'myhome.ge' ? 'https://www.myhome.ge/' : 'https://home.ss.ge/');
}

function extractNextData(html: string): Record<string, unknown> {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('გვერდზე მონაცემები ვერ მოიძებნა');
  return JSON.parse(m[1]) as Record<string, unknown>;
}

function detectSource(url: string): 'ss.ge' | 'myhome.ge' {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('ss.ge')) return 'ss.ge';
  if (host.includes('myhome.ge')) return 'myhome.ge';
  throw new Error('მხოლოდ myhome.ge ან ss.ge ბმულებია დაშვებული');
}

function extractMyHomeId(url: string): string {
  const match = url.match(/myhome\.ge\/(?:[^/?#]+\/)*(\d{5,})(?:\/|$|\?)/i);
  if (!match) throw new Error('myhome.ge ბმულიდან ID ვერ მოიძებნა');
  return match[1];
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
    throw new Error(`myhome.ge API ვერ მოიძებნა (${res.status})`);
  }
  const payload = (await res.json()) as {
    result?: boolean;
    data?: { statement?: Record<string, unknown> };
    errors?: { message?: string[] };
  };
  const statement = payload.data?.statement;
  if (!payload.result || !statement) {
    const msg = payload.errors?.message?.[0];
    throw new Error(msg || 'myhome.ge განცხადების მონაცემები ვერ მოიძებნა');
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
    lat: Number(app.locationLatitude) || 41.7151,
    lng: Number(app.locationLongitude) || 44.8271,
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
  const gelPrice = statement.price as Record<string, { price_total?: number; price_square?: number }> | undefined;
  const priceBlock = gelPrice?.['1'];
  const totalPrice = statement.total_price ?? priceBlock?.price_total;
  const sqmPrice = priceBlock?.price_square;

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
    rooms: statement.room_type_id != null ? String(statement.room_type_id) : '',
    bedrooms: statement.bedroom_type_id != null ? String(statement.bedroom_type_id) : '',
    bathrooms: statement.bathroom_type_id != null ? String(statement.bathroom_type_id) : '',
    floor: statement.floor != null ? String(statement.floor) : '',
    totalFloors: statement.total_floors != null ? String(statement.total_floors) : '',
    city: String(statement.city_name ?? ''),
    district: String(statement.district_name ?? statement.urban_name ?? ''),
    address: String(statement.address ?? ''),
    street: String(statement.address ?? ''),
    streetNumber: '',
    cadastralCode: String(statement.rs_code ?? ''),
    lat: Number(statement.lat) || 41.7151,
    lng: Number(statement.lng) || 44.8271,
    images,
    youtubeUrl: String(statement.youtube_link ?? ''),
    matterportUrl: String(statement['3d_url'] ?? ''),
    agentName: String(statement.owner_name ?? ''),
    agentPhone: normalizePhone(String(statement.user_phone_number ?? statement.additional_phone_number ?? '')),
    agentEmail: '',
    projectType: '',
    wetPoint: statement.bathroom_type_id != null ? String(statement.bathroom_type_id) : '',
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

function countImportedFields(data: ImportedListingData): number {
  let n = 0;
  const scalarKeys: (keyof ImportedListingData)[] = [
    'title', 'description', 'price', 'pricePerSqm', 'area', 'rooms', 'city', 'district', 'address',
    'floor', 'totalFloors', 'cadastralCode', 'agentName', 'agentPhone',
  ];
  for (const k of scalarKeys) if (data[k]) n++;
  if (data.images.length) n += 2;
  if (data.lat && data.lng) n++;
  return n;
}

export async function importListingFromUrl(rawUrl: string): Promise<ImportedListingData> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('არასწორი URL');
  }
  if (!/^https?:$/i.test(url.protocol)) throw new Error('URL უნდა იწყებოდეს http:// ან https://');

  const source = detectSource(url.href);
  let data: ImportedListingData;
  if (source === 'myhome.ge') {
    const statement = await fetchMyHomeStatement(extractMyHomeId(url.href));
    data = parseMyHomeStatement(statement, url.href);
  } else {
    const html = await fetchPageHtml(url.href, source);
    data = parseSsGe(html, url.href);
  }
  data.meta.importedFields = countImportedFields(data);
  return data;
}
