/**
 * Cities and districts with the OpenStreetMap relation that holds their exact
 * outline. Looking a boundary up by relation id is unambiguous, unlike a text
 * search — "გორი" alone also matches a village in Racha, for instance.
 *
 * Every id below was verified to return a polygon from Nominatim.
 */

export interface DistrictArea {
  ka: string;
  en: string;
  /** OSM relation, e.g. "R11300449". Districts without one fall back to the city outline. */
  osm?: string;
  /** Spellings that appear in listing data and should resolve to this district. */
  aliases?: string[];
}

export interface CityArea {
  ka: string;
  en: string;
  osm?: string;
  labelKey: string;
  center: { lat: number; lng: number };
  districts: DistrictArea[];
}

export const CITY_AREAS: CityArea[] = [
  {
    ka: 'თბილისი',
    en: 'Tbilisi',
    osm: 'R1996871',
    labelKey: 'listings.cities.tbilisi',
    center: { lat: 41.7151, lng: 44.8271 },
    districts: [
      // The ten official city districts
      { ka: 'ვაკე', en: 'Vake', osm: 'R11300449', aliases: ['ვაკის რაიონი', 'ვაკე-საბურთალო'] },
      { ka: 'საბურთალო', en: 'Saburtalo', osm: 'R11300446', aliases: ['საბურთალოს რაიონი'] },
      { ka: 'მთაწმინდა', en: 'Mtatsminda', osm: 'R13438811', aliases: ['მთაწმინდის რაიონი', 'ცენტრი', 'რუსთაველი'] },
      { ka: 'ისანი', en: 'Isani', osm: 'R13438808', aliases: ['ისნის რაიონი'] },
      { ka: 'სამგორი', en: 'Samgori', osm: 'R11300436', aliases: ['სამგორის რაიონი'] },
      { ka: 'ნაძალადევი', en: 'Nadzaladevi', osm: 'R11300438', aliases: ['ნაძალადევის რაიონი'] },
      { ka: 'დიდუბე', en: 'Didube', osm: 'R11300445', aliases: ['დიდუბის რაიონი'] },
      { ka: 'კრწანისი', en: 'Krtsanisi', osm: 'R13438809', aliases: ['კრწანისის რაიონი'] },
      { ka: 'ჩუღურეთი', en: 'Chughureti', osm: 'R13438810', aliases: ['ჩუღურეთის რაიონი'] },
      { ka: 'გლდანი', en: 'Gldani', osm: 'R13438812', aliases: ['გლდანის რაიონი'] },
      // Neighbourhoods buyers actually search for
      { ka: 'ძველი თბილისი', en: 'Old Tbilisi', osm: 'R16417582', aliases: ['კალა', 'ორთაჭალა, კალა'] },
      { ka: 'ავლაბარი', en: 'Avlabari', osm: 'R18467265' },
      { ka: 'სოლოლაკი', en: 'Sololaki', osm: 'R2073133' },
      { ka: 'ვერა', en: 'Vera', osm: 'R20126627' },
      { ka: 'ბაგები', en: 'Bagebi', osm: 'R20124909' },
      { ka: 'ვაშლიჯვარი', en: 'Vashlijvari', osm: 'R20111730' },
      { ka: 'ნუცუბიძე', en: 'Nutsubidze', osm: 'R16355076', aliases: ['ნუცუბიძის ფერდობი', 'ნუცუბიძის მიკრორაიონები'] },
      { ka: 'ლისი', en: 'Lisi', osm: 'R20108635' },
      { ka: 'დიდი დიღომი', en: 'Didi Dighomi', osm: 'R18183807' },
      { ka: 'დიღმის მასივი', en: 'Dighomi Massive', osm: 'R16356610', aliases: ['დიღომი'] },
      { ka: 'ვარკეთილი', en: 'Varketili', osm: 'R16749662' },
      { ka: 'ვაზისუბანი', en: 'Vazisubani', osm: 'R16568021' },
      { ka: 'თემქა', en: 'Temka', osm: 'R15924035' },
      { ka: 'მუხიანი', en: 'Mukhiani', osm: 'R14170033' },
      { ka: 'ზღვისუბანი', en: 'Zghvisubani', osm: 'R14154210' },
      { ka: 'ორთაჭალა', en: 'Ortachala', osm: 'R18467370' },
      { ka: 'ფონიჭალა', en: 'Ponichala', osm: 'R18467459' },
      { ka: 'შანხაი', en: 'Shanghai' },
      { ka: 'ავჭალა', en: 'Avchala' },
      { ka: 'კუკია', en: 'Kukia' },
      { ka: 'ნავთლუღი', en: 'Navtlughi' },
      { ka: 'წყნეთი', en: 'Tskneti' },
    ],
  },
  {
    ka: 'ბათუმი',
    en: 'Batumi',
    osm: 'R2009237',
    labelKey: 'listings.cities.batumi',
    center: { lat: 41.6168, lng: 41.6367 },
    districts: [
      { ka: 'ძველი ბათუმი', en: 'Old Batumi', osm: 'R12695439', aliases: ['ცენტრი'] },
      { ka: 'რუსთაველი', en: 'Rustaveli', osm: 'R12695438', aliases: ['ბულვარი', 'ნიუ ბულვარი'] },
      { ka: 'აღმაშენებელი', en: 'Agmashenebeli', osm: 'R12822696' },
      { ka: 'ჯავახიშვილი', en: 'Javakhishvili', osm: 'R12695435' },
      { ka: 'ხიმშიაშვილი', en: 'Khimshiashvili', osm: 'R12695437' },
      { ka: 'ბაგრატიონი I', en: 'Bagrationi I', osm: 'R15057027' },
      { ka: 'ბაგრატიონი II', en: 'Bagrationi II', osm: 'R12695436' },
      { ka: 'თამარი', en: 'Tamari', osm: 'R15061765' },
      { ka: 'ბონი-გოროდოკი', en: 'Boni-Gorodoki', osm: 'R15061766' },
      { ka: 'კახაბერი', en: 'Kakhaberi', osm: 'R12865081' },
      { ka: 'მწვანე კონცხი', en: 'Mtsvane Kontskhi', osm: 'R12865104' },
      { ka: 'გონიო-კვარიათი', en: 'Gonio-Kvariati', osm: 'R15066811', aliases: ['გონიო', 'კვარიათი'] },
      { ka: 'აეროპორტი', en: 'Airport', osm: 'R12715721' },
    ],
  },
  {
    ka: 'ქუთაისი',
    en: 'Kutaisi',
    osm: 'R2024547',
    labelKey: 'listings.cities.kutaisi',
    center: { lat: 42.2679, lng: 42.6946 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'მცხეთა',
    en: 'Mtskheta',
    osm: 'R8374155',
    labelKey: 'listings.cities.mtskheta',
    center: { lat: 41.8451, lng: 44.7188 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'სიღნაღი',
    en: 'Sighnaghi',
    osm: 'R16768135',
    labelKey: 'listings.cities.sighnaghi',
    center: { lat: 41.6103, lng: 45.9219 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'გორი',
    en: 'Gori',
    osm: 'R8374250',
    labelKey: 'listings.cities.gori',
    center: { lat: 41.9842, lng: 44.1158 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'რუსთავი',
    en: 'Rustavi',
    labelKey: 'listings.cities.rustavi',
    center: { lat: 41.5495, lng: 44.9932 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'ზუგდიდი',
    en: 'Zugdidi',
    labelKey: 'listings.cities.zugdidi',
    center: { lat: 42.5088, lng: 41.8709 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'ფოთი',
    en: 'Poti',
    labelKey: 'listings.cities.poti',
    center: { lat: 42.1462, lng: 41.6719 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'ბორჯომი',
    en: 'Borjomi',
    labelKey: 'listings.cities.borjomi',
    center: { lat: 41.8395, lng: 43.3869 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
];

const normalise = (value: string) => value.trim().toLowerCase();

export function findCityArea(name: string | undefined): CityArea | undefined {
  if (!name) return undefined;
  const key = normalise(name);
  return CITY_AREAS.find(city => normalise(city.ka) === key || normalise(city.en) === key);
}

/** Canonical Georgian city name, or the original spelling if unknown. */
export function canonicalCityName(name: string | undefined): string {
  return findCityArea(name)?.ka || (name ?? '').trim();
}

/** Canonical Georgian district for that city — aliases like „საბურთალოს რაიონი“ resolve here. */
export function canonicalDistrictName(cityName: string | undefined, districtName: string | undefined): string {
  if (!districtName?.trim()) return '';
  const match = findDistrictArea(findCityArea(cityName), districtName);
  return match?.ka || districtName.trim();
}

export function cityViewbox(city: CityArea): { left: number; top: number; right: number; bottom: number } {
  const dLat = 0.14;
  const dLng = 0.18;
  return {
    left: city.center.lng - dLng,
    top: city.center.lat + dLat,
    right: city.center.lng + dLng,
    bottom: city.center.lat - dLat,
  };
}

/** All spellings that should be treated as this district. */
function districtKeys(district: DistrictArea): string[] {
  return [district.ka, district.en, ...(district.aliases ?? [])].map(normalise);
}

export function findDistrictArea(city: CityArea | undefined, name: string | undefined): DistrictArea | undefined {
  if (!city || !name) return undefined;
  const key = normalise(name);
  return city.districts.find(district => districtKeys(district).includes(key));
}

export function districtLabel(district: DistrictArea, locale: string): string {
  return locale === 'ka' ? district.ka : district.en;
}

/** Matches a listing's free-text district against a district in the dictionary. */
export function districtNameMatches(listingDistrict: string | undefined, district: DistrictArea): boolean {
  if (!listingDistrict) return false;
  return districtKeys(district).includes(normalise(listingDistrict));
}

export interface DistrictOption {
  /** Stored in the filter state; the canonical Georgian name, or the raw listing value. */
  value: string;
  label: string;
}

/**
 * The dictionary districts for a city, plus any district found in the listings
 * that the dictionary does not cover yet, so nothing is ever unreachable.
 */
export function districtOptions(
  city: CityArea | undefined,
  listingDistricts: string[],
  locale: string,
): DistrictOption[] {
  if (!city) return [];

  const options = city.districts.map(district => ({
    value: district.ka,
    label: districtLabel(district, locale),
  }));

  const extras = listingDistricts
    .filter(name => name && !findDistrictArea(city, name))
    .filter((name, index, all) => all.indexOf(name) === index)
    .map(name => ({ value: name, label: name }));

  return [...options, ...extras.sort((a, b) => a.label.localeCompare(b.label, 'ka'))];
}
