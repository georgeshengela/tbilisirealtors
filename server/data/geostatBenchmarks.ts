/**
 * Geostat RPPI reference medians — new-build flat offer prices (₾/m²), Tbilisi districts.
 * Source: საქართველოს სტატისტიკის ეროვნული სამსახური, Residential Property Price Index.
 * https://www.geostat.ge/en/modules/categories/698/residential-property-price-index
 *
 * Updated manually when Geostat publishes a new quarterly CSV.
 */
export const GEOSTAT_BENCHMARK = {
  quarter: '2026 Q1',
  label: 'Geostat RPPI — ახალი ბინა, შეთავაზების ფასი',
  sourceUrl: 'https://www.geostat.ge/en/modules/categories/698/residential-property-price-index',
  /** National index change vs previous quarter (percent). */
  indexChangeQoQ: 1.8,
  /** National index change vs same quarter prior year (percent). */
  indexChangeYoY: 3.0,
  districts: [
    { key: 'ვაკე', geostatEn: 'Vake', pricePerSqm: 5200 },
    { key: 'მთაწმინდა', geostatEn: 'Mtatsminda', pricePerSqm: 4900 },
    { key: 'საბურთალო', geostatEn: 'Saburtalo', pricePerSqm: 3950 },
    { key: 'ჩუღურეთი', geostatEn: 'Chughureti', pricePerSqm: 3600 },
    { key: 'დიდუბე', geostatEn: 'Didube', pricePerSqm: 3100 },
    { key: 'ნაძალადევი', geostatEn: 'Nadzaladevi', pricePerSqm: 2850 },
    { key: 'ისანი', geostatEn: 'Isani', pricePerSqm: 2650 },
    { key: 'გლდანი', geostatEn: 'Gldani', pricePerSqm: 2450 },
    { key: 'სამგორი', geostatEn: 'Samgori', pricePerSqm: 2350 },
    { key: 'კრწანისი', geostatEn: 'Krtsanisi', pricePerSqm: 2250 },
  ],
} as const;

export const MARKET_DATA_SOURCES = [
  {
    id: 'geostat',
    label: 'Geostat RPPI',
    url: 'https://www.geostat.ge/en/modules/categories/698/residential-property-price-index',
    note: 'ოფიციალური ინდექსი — თბილისი, ახალი საცხოვრებელი, რაიონების მიხედვით',
  },
  {
    id: 'nbg',
    label: 'საქართველოს ეროვნული ბანკი',
    url: 'https://nbg.gov.ge/en/statistics/residential-real-estate-price-and-rent-indices',
    note: 'თვიური ფასის და ქირის ინდექსები + დღიური სავალუტო კურსი (ავტომატურად მიერთებული)',
  },
  {
    id: 'myge',
    label: 'MyGE.ge',
    url: 'https://myge.ge/market?lang=ka',
    note: 'ავტომატურად მიერთებული — ss.ge, myhome.ge და korter.ge-ის გაერთიანებული დღიური სტატისტიკა 19 ქალაქზე',
  },
  {
    id: 'myhome',
    label: 'MyHome.ge',
    url: 'https://www.myhome.ge/en/apartment-price/',
    note: 'პირდაპირი მიერთება დაბლოკილია (403) — მისი მონაცემები MyGE-ის აგრეგატში შედის',
  },
  {
    id: 'ssge',
    label: 'SS.ge',
    url: 'https://home.ss.ge/',
    note: 'განცხადებების ბაზა — Geostat-ის RPPI-ის წყაროებიდან ერთ-ერთი',
  },
  {
    id: 'internal',
    label: 'TbilisiRealtors DB',
    url: '',
    note: 'თქვენი განცხადებები, იმპორტები და ფასის ისტორია — რეალურ დროში',
  },
] as const;
