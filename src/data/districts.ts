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
  /** Parent group `ka`, when this neighbourhood sits under a larger area. */
  group?: string;
}

/** A selectable parent area. Choosing it matches every neighbourhood in the group. */
export interface DistrictGroup {
  ka: string;
  en: string;
}

export interface CityArea {
  ka: string;
  en: string;
  osm?: string;
  labelKey: string;
  center: { lat: number; lng: number };
  /** Present when neighbourhoods are organised under parent areas. */
  groups?: DistrictGroup[];
  districts: DistrictArea[];
}

export const CITY_AREAS: CityArea[] = [
  {
    ka: 'თბილისი',
    en: 'Tbilisi',
    osm: 'R1996871',
    labelKey: 'listings.cities.tbilisi',
    center: { lat: 41.7151, lng: 44.8271 },
    groups: [
      { ka: 'ვაკე-საბურთალო', en: 'Vake-Saburtalo' },
      { ka: 'ისანი-სამგორი', en: 'Isani-Samgori' },
      { ka: 'გლდანი-ნაძალადევი', en: 'Gldani-Nadzaladevi' },
      { ka: 'დიდუბე-ჩუღურეთი', en: 'Didube-Chughureti' },
      { ka: 'თბილისის შემოგარენი', en: 'Tbilisi Surroundings' },
      { ka: 'ძველი თბილისი', en: 'Old Tbilisi' },
    ],
    districts: [
      { group: 'ვაკე-საბურთალო', ka: 'ლისის მიმდებარედ', en: 'Near Lisi' },
      { group: 'ვაკე-საბურთალო', ka: 'ბაგები', en: 'Bagebi', osm: 'R20124909' },
      { group: 'ვაკე-საბურთალო', ka: 'ვაკე', en: 'Vake', osm: 'R11300449', aliases: ['ვაკის რაიონი'] },
      { group: 'ვაკე-საბურთალო', ka: 'ვაშლიჯვარი', en: 'Vashlijvari', osm: 'R20111730' },
      { group: 'ვაკე-საბურთალო', ka: 'ვეძისი', en: 'Vedzisi' },
      { group: 'ვაკე-საბურთალო', ka: 'თხინვალი', en: 'Tkhinvali' },
      { group: 'ვაკე-საბურთალო', ka: 'კუს ტბა', en: 'Turtle Lake' },
      { group: 'ვაკე-საბურთალო', ka: 'ლისი', en: 'Lisi', osm: 'R20108635' },
      { group: 'ვაკე-საბურთალო', ka: 'მუხათგვერდი', en: 'Mukhatgverdi' },
      { group: 'ვაკე-საბურთალო', ka: 'მუხათწყარო', en: 'Mukhattskaro' },
      { group: 'ვაკე-საბურთალო', ka: 'საბურთალო', en: 'Saburtalo', osm: 'R11300446', aliases: ['საბურთალოს რაიონი', 'საბურტალო'] },
      { group: 'ვაკე-საბურთალო', ka: 'დიღომი 1-9', en: 'Dighomi 1-9' },
      { group: 'ვაკე-საბურთალო', ka: 'ნუცუბიძის ფერდობი', en: 'Nutsubidze Plateau', osm: 'R16355076', aliases: ['ნუცუბიძე', 'ნუცუბიძის მიკრორაიონები'] },
      { group: 'ვაკე-საბურთალო', ka: 'სოფ. დიღომი', en: 'Village Dighomi' },
      { group: 'ვაკე-საბურთალო', ka: 'დიღმის ჭალა', en: 'Dighmis Chala' },
      { group: 'ვაკე-საბურთალო', ka: 'ქოშიგორა', en: 'Koshigora' },
      { group: 'ვაკე-საბურთალო', ka: 'დიდგორი', en: 'Didgori' },
      { group: 'ვაკე-საბურთალო', ka: 'დიდი დიღომი', en: 'Didi Dighomi', osm: 'R18183807' },

      { group: 'ისანი-სამგორი', ka: 'ისანი', en: 'Isani', osm: 'R13438808', aliases: ['ისნის რაიონი'] },
      { group: 'ისანი-სამგორი', ka: 'მოსკოვის გამზირი', en: 'Moscow Avenue' },
      { group: 'ისანი-სამგორი', ka: 'ვარკეთილი', en: 'Varketili', osm: 'R16749662' },
      { group: 'ისანი-სამგორი', ka: 'ლილო', en: 'Lilo' },
      { group: 'ისანი-სამგორი', ka: 'მესამე მასივი', en: 'Mesame Masivi' },
      { group: 'ისანი-სამგორი', ka: 'აფრიკა', en: 'Afrika' },
      { group: 'ისანი-სამგორი', ka: 'ნავთლუღი', en: 'Navtlughi' },
      { group: 'ისანი-სამგორი', ka: 'აეროპორტის დასახლება', en: 'Airport Settlement' },
      { group: 'ისანი-სამგორი', ka: 'დამპალოს დასახლება', en: 'Dampalo Settlement' },
      { group: 'ისანი-სამგორი', ka: 'ვაზისუბანი', en: 'Vazisubani', osm: 'R16568021' },
      { group: 'ისანი-სამგორი', ka: 'ორხევი', en: 'Orkhevi' },
      { group: 'ისანი-სამგორი', ka: 'სამგორი', en: 'Samgori', osm: 'R11300436', aliases: ['სამგორის რაიონი'] },
      { group: 'ისანი-სამგორი', ka: 'ფონიჭალა', en: 'Ponichala', osm: 'R18467459' },

      { group: 'გლდანი-ნაძალადევი', ka: 'ლოტკინი', en: 'Lotkini' },
      { group: 'გლდანი-ნაძალადევი', ka: 'გლდანი', en: 'Gldani', osm: 'R13438812', aliases: ['გლდანის რაიონი'] },
      { group: 'გლდანი-ნაძალადევი', ka: 'გლდანულა', en: 'Gldanula' },
      { group: 'გლდანი-ნაძალადევი', ka: 'თბილისის ზღვა', en: 'Tbilisi Sea', aliases: ['ზღვისუბანი'] },
      { group: 'გლდანი-ნაძალადევი', ka: 'თემქა', en: 'Temka', osm: 'R15924035' },
      { group: 'გლდანი-ნაძალადევი', ka: 'კონიაკის დასახლება', en: 'Koniaki Settlement' },
      { group: 'გლდანი-ნაძალადევი', ka: 'მუხიანი', en: 'Mukhiani', osm: 'R14170033' },
      { group: 'გლდანი-ნაძალადევი', ka: 'ნაძალადევი', en: 'Nadzaladevi', osm: 'R11300438', aliases: ['ნაძალადევის რაიონი'] },
      { group: 'გლდანი-ნაძალადევი', ka: 'ავშნიანი', en: 'Avshniani' },
      { group: 'გლდანი-ნაძალადევი', ka: 'ავჭალა', en: 'Avchala' },
      { group: 'გლდანი-ნაძალადევი', ka: 'ზაჰესი', en: 'Zahesi' },
      { group: 'გლდანი-ნაძალადევი', ka: 'სოფ. გლდანი', en: 'Village Gldani' },
      { group: 'გლდანი-ნაძალადევი', ka: 'სან. ზონა', en: 'Sanitary Zone' },
      { group: 'გლდანი-ნაძალადევი', ka: 'გიორგიწმინდას დასახლება', en: 'Giorgitsminda Settlement' },

      { group: 'დიდუბე-ჩუღურეთი', ka: 'დიდუბე', en: 'Didube', osm: 'R11300445', aliases: ['დიდუბის რაიონი'] },
      { group: 'დიდუბე-ჩუღურეთი', ka: 'დიღმის მასივი', en: 'Dighomi Massive', osm: 'R16356610', aliases: ['დიღომი'] },
      { group: 'დიდუბე-ჩუღურეთი', ka: 'კუკია', en: 'Kukia' },
      { group: 'დიდუბე-ჩუღურეთი', ka: 'ჩუღურეთი', en: 'Chughureti', osm: 'R13438810', aliases: ['ჩუღურეთის რაიონი'] },
      { group: 'დიდუბე-ჩუღურეთი', ka: 'ივერთუბანი', en: 'Ivertubani' },
      { group: 'დიდუბე-ჩუღურეთი', ka: 'სვანეთის უბანი', en: 'Svaneti Quarter' },

      { group: 'თბილისის შემოგარენი', ka: 'ახალდაბა', en: 'Akhaldaba' },
      { group: 'თბილისის შემოგარენი', ka: 'ბეთანია', en: 'Betania' },
      { group: 'თბილისის შემოგარენი', ka: 'კაკლები', en: 'Kaklebi' },
      { group: 'თბილისის შემოგარენი', ka: 'კიკეთი', en: 'Kiketi' },
      { group: 'თბილისის შემოგარენი', ka: 'კოჯორი', en: 'Kojori' },
      { group: 'თბილისის შემოგარენი', ka: 'ოქროყანა', en: 'Okrokana' },
      { group: 'თბილისის შემოგარენი', ka: 'ტაბახმელა', en: 'Tabakhmela' },
      { group: 'თბილისის შემოგარენი', ka: 'შინდისი', en: 'Shindisi' },
      { group: 'თბილისის შემოგარენი', ka: 'წავკისი', en: 'Tsavkisi' },
      { group: 'თბილისის შემოგარენი', ka: 'წყნეთი', en: 'Tskneti' },
      { group: 'თბილისის შემოგარენი', ka: 'ზემო ლისი', en: 'Zemo Lisi' },
      { group: 'თბილისის შემოგარენი', ka: 'წვერი', en: 'Tsveri' },
      { group: 'თბილისის შემოგარენი', ka: 'მსხალდიდი', en: 'Mskhaldidi' },
      { group: 'თბილისის შემოგარენი', ka: 'წოდორეთი', en: 'Tsodoreti' },
      { group: 'თბილისის შემოგარენი', ka: 'კვესეთი', en: 'Kveseti' },

      { group: 'ძველი თბილისი', ka: 'ელია', en: 'Elia' },
      { group: 'ძველი თბილისი', ka: 'ვერა', en: 'Vera', osm: 'R20126627' },
      { group: 'ძველი თბილისი', ka: 'კრწანისი', en: 'Krtsanisi', osm: 'R13438809', aliases: ['კრწანისის რაიონი'] },
      { group: 'ძველი თბილისი', ka: 'მთაწმინდა', en: 'Mtatsminda', osm: 'R13438811', aliases: ['მთაწმინდის რაიონი', 'რუსთაველი', 'ცენტრი'] },
      { group: 'ძველი თბილისი', ka: 'სოლოლაკი', en: 'Sololaki', osm: 'R2073133' },
      { group: 'ძველი თბილისი', ka: 'აბანოთუბანი', en: 'Abanotubani', aliases: ['კალა'] },
      { group: 'ძველი თბილისი', ka: 'ავლაბარი', en: 'Avlabari', osm: 'R18467265' },
      { group: 'ძველი თბილისი', ka: 'წავკისის ველი', en: 'Tsavkisi Valley' },
      { group: 'ძველი თბილისი', ka: 'ორთაჭალა', en: 'Ortachala', osm: 'R18467370', aliases: ['ორთაჭალა, კალა'] },
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
  {
    ka: 'ქობულეთი',
    en: 'Kobuleti',
    labelKey: 'listings.cities.kobuleti',
    center: { lat: 41.8214, lng: 41.7753 },
    districts: [{ ka: 'ცენტრი', en: 'Centre' }],
  },
  {
    ka: 'ბაკურიანი',
    en: 'Bakuriani',
    labelKey: 'listings.cities.bakuriani',
    center: { lat: 41.7494, lng: 43.5294 },
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
  const city = findCityArea(cityName);
  return findDistrictArea(city, districtName)?.ka
    || findDistrictGroup(city, districtName)?.ka
    || districtName.trim();
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

export function findDistrictGroup(city: CityArea | undefined, name: string | undefined): DistrictGroup | undefined {
  if (!city || !name) return undefined;
  const key = normalise(name);
  return city.groups?.find(group => normalise(group.ka) === key || normalise(group.en) === key);
}

export function districtLabel(district: DistrictArea | DistrictGroup, locale: string): string {
  return locale === 'ka' ? district.ka : district.en;
}

/** Neighbourhoods under each parent, in dictionary order. Cities without groups yield one flat section. */
export function districtSections(city: CityArea): { group: DistrictGroup | null; districts: DistrictArea[] }[] {
  if (!city.groups?.length) return [{ group: null, districts: city.districts }];
  const sections: { group: DistrictGroup | null; districts: DistrictArea[] }[] = city.groups.map(group => ({
    group,
    districts: city.districts.filter(district => district.group === group.ka),
  }));
  const loose = city.districts.filter(district => !city.groups!.some(group => group.ka === district.group));
  if (loose.length) sections.push({ group: null, districts: loose });
  return sections;
}

/** Label for a selected neighbourhood or parent area. */
export function areaSelectionLabel(city: CityArea | undefined, name: string | undefined, locale: string): string {
  if (!name) return '';
  const area = findDistrictArea(city, name);
  if (area) return districtLabel(area, locale);
  const group = findDistrictGroup(city, name);
  if (group) return districtLabel(group, locale);
  return name;
}

/** Matches a listing's free-text district against a district in the dictionary. */
export function districtNameMatches(listingDistrict: string | undefined, district: DistrictArea): boolean {
  if (!listingDistrict) return false;
  return districtKeys(district).includes(normalise(listingDistrict));
}

/**
 * A neighbourhood filter matches that neighbourhood (and its old spellings).
 * A parent area matches itself and every neighbourhood underneath it.
 */
export function listingMatchesDistrict(
  city: CityArea | undefined,
  selected: string | undefined,
  listingDistrict: string | undefined,
): boolean {
  if (!selected) return true;
  const area = findDistrictArea(city, selected);
  if (area) return districtNameMatches(listingDistrict, area);
  const group = findDistrictGroup(city, selected);
  if (group && city) {
    if (normalise(listingDistrict ?? '') === normalise(group.ka)) return true;
    return findDistrictArea(city, listingDistrict)?.group === group.ka;
  }
  return (listingDistrict ?? '') === selected;
}

export interface DistrictOption {
  /** Stored in the filter state; the canonical Georgian name, or the raw listing value. */
  value: string;
  label: string;
  /** Optgroup label. Consecutive options with the same group render together. */
  group?: string;
}

export interface DistrictFormChoice {
  value: string;
  label: string;
  group?: string;
}

/**
 * The dictionary districts for a city, plus any district found in the listings
 * that the dictionary does not cover yet, so nothing is ever unreachable.
 * Parent areas come first inside each group so the whole area can be selected.
 */
export function districtOptions(
  city: CityArea | undefined,
  listingDistricts: string[],
  locale: string,
): DistrictOption[] {
  if (!city) return [];

  const options: DistrictOption[] = [];
  if (city.groups?.length) {
    for (const section of districtSections(city)) {
      const groupLabel = section.group ? districtLabel(section.group, locale) : undefined;
      if (section.group) {
        options.push({ value: section.group.ka, label: groupLabel!, group: groupLabel });
      }
      for (const district of section.districts) {
        options.push({
          value: district.ka,
          label: districtLabel(district, locale),
          group: groupLabel,
        });
      }
    }
  } else {
    for (const district of city.districts) {
      options.push({ value: district.ka, label: districtLabel(district, locale) });
    }
  }

  const extras = listingDistricts
    .filter(name => name && !findDistrictArea(city, name) && !findDistrictGroup(city, name))
    .filter((name, index, all) => all.indexOf(name) === index)
    .map(name => ({ value: name, label: name }));

  return [...options, ...extras.sort((a, b) => a.label.localeCompare(b.label, 'ka'))];
}

/** Consecutive options that share an optgroup label. */
export function chunkDistrictOptions(options: DistrictOption[]): { key: string; group?: string; options: DistrictOption[] }[] {
  const chunks: { key: string; group?: string; options: DistrictOption[] }[] = [];
  for (const option of options) {
    const last = chunks[chunks.length - 1];
    if (last && last.group === option.group) last.options.push(option);
    else chunks.push({ key: option.group || option.value, group: option.group, options: [option] });
  }
  return chunks;
}

/** Neighbourhoods for the add/edit forms, grouped under their parent. Keeps an unknown current value. */
export function districtFormChoices(cityName: string | undefined, current?: string): DistrictFormChoice[] {
  const city = findCityArea(cityName);
  const options: DistrictFormChoice[] = [];
  if (city?.groups?.length) {
    for (const section of districtSections(city)) {
      for (const district of section.districts) {
        options.push({ value: district.ka, label: district.ka, group: section.group?.ka });
      }
    }
  } else if (city) {
    for (const district of city.districts) options.push({ value: district.ka, label: district.ka });
  }
  const kept = current?.trim();
  if (kept && !options.some(option => option.value === kept)) {
    options.unshift({ value: kept, label: kept });
  }
  return options;
}
