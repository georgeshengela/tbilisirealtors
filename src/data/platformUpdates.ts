export type UpdateCategory = 'feature' | 'fix' | 'admin' | 'platform';
export type UpdateStatus = 'done' | 'in_progress' | 'planned';

export interface PlatformUpdate {
  id: string;
  date: string;
  category: UpdateCategory;
  status: UpdateStatus;
  phase: string;
  title: { ka: string; en: string };
  description: { ka: string; en: string };
}

/** Platform changelog — synced with WhatsApp / sprint tasks. */
export const PLATFORM_UPDATES: PlatformUpdate[] = [
  // ── Aug 2026 · Critical platform sprint ──
  {
    id: 'usd-default',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'USD ($) ნაგულისხმევი ვალუტა',
      en: 'USD ($) as default display currency',
    },
    description: {
      ka: 'საიტზე ფასები ნაგულისხმევად ჩანს დოლარში (NBG კურსით). DB-ში ფასები კვლავ ₾-ში ინახება — გამოჩენა მხოლოდ კონვერტაციაა.',
      en: 'Prices default to USD on the site via NBG rates. Database still stores GEL — display-only conversion.',
    },
  },
  {
    id: 'myhome-import',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'MyHome.ge იმპორტი',
      en: 'MyHome.ge property import',
    },
    description: {
      ka: 'ბმულიდან განცხადების იმპორტი: ფასი, ფოტოები, მისამართი, ოთახები, ტიპი. slug-URL-ებიც მუშაობს (…-25675411).',
      en: 'Import listings from URL: price, photos, address, rooms, type. Slug URLs supported (…-25675411).',
    },
  },
  {
    id: 'import-currency',
    date: '2026-08-23',
    category: 'fix',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'იმპორტის ვალუტის კონვერტაცია',
      en: 'Import currency conversion fix',
    },
    description: {
      ka: '50 ₾/დღე აღარ ჩანს $50-ად — ფორმა და საიტი სწორად კონვერტირდება NBG კურსით.',
      en: '50 GEL/day no longer shows as $50 — form and site convert correctly via NBG rates.',
    },
  },
  {
    id: 'map-geocoding',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'რუკა და მისამართის ძებნა',
      en: 'Map & address geolocation',
    },
    description: {
      ka: 'მისამართის ჩაწერისას რუკა გადაინაცვლებს, მარკერი განახლდება. სერვერის geocoding proxy.',
      en: 'Map moves and marker updates when address is entered. Server-side geocoding proxy.',
    },
  },
  {
    id: 'external-link',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'გარე საიტის ბმული',
      en: 'External website link',
    },
    description: {
      ka: 'განცხადების გვერდზე ID + „გარე საიტი“ ბმული sourceUrl-დან — HTML-ის ხელით ჩაწერა აღარ სჭირდება.',
      en: 'Property page shows ID + external site link from sourceUrl — no manual HTML needed.',
    },
  },
  {
    id: 'admin-current-filter',
    date: '2026-08-22',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'ადმინი: მხოლოდ Current განცხადებები',
      en: 'Admin: Current listings by default',
    },
    description: {
      ka: 'ძირითადი ცხრილი ნაგულისხმევად „მიმდინარე“ სტატუსს აჩვენებს; New / Old / New R თავის გვერდებზე.',
      en: 'Main table defaults to Current; New / Old / New R stay on their sections.',
    },
  },
  {
    id: 'image-aspect',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'ფოტოს პროპორცია 5:4',
      en: 'Property images 5:4 ratio',
    },
    description: {
      ka: 'ბარათებზე და სიებში ფოტო აღარ იჭ stretche-დება — ბალანსირებული 5:4 aspect ratio.',
      en: 'Cards and lists use balanced 5:4 aspect ratio — no stretched photos.',
    },
  },
  {
    id: 'activity-stats',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'აქტივობის სტატისტიკა (საფუძველი)',
      en: 'Property activity stats (foundation)',
    },
    description: {
      ka: 'ადმინში: 30/60 დღის შეთავაზებები + ნახვები. property_offers ტაბლა Broker Desk-ისთვის.',
      en: 'Admin: 30/60-day offers + on-site views. property_offers table for Broker Desk.',
    },
  },
  {
    id: 'watermark',
    date: '2026-08-22',
    category: 'platform',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'Tbilisi Realtors watermark',
      en: 'Tbilisi Realtors watermark',
    },
    description: {
      ka: 'ატვირთვისას Cloudinary-ზე ავტომატური ტექსტური watermark ყველა ფოტოზე.',
      en: 'Automatic text watermark on every photo via Cloudinary on upload.',
    },
  },
  {
    id: 'saturday-hours',
    date: '2026-08-22',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'შაბათი 11:00–15:00',
      en: 'Saturday hours 11:00–15:00',
    },
    description: {
      ka: 'სამუშაო საათები განახლდა ერთ წყაროში (contactInfo) — შაბათი 11:00–15:00.',
      en: 'Business hours updated in single source (contactInfo) — Saturday 11:00–15:00.',
    },
  },
  {
    id: 'admin-server-error',
    date: '2026-08-22',
    category: 'fix',
    status: 'done',
    phase: 'aug2026-sprint',
    title: {
      ka: 'ადმინი → განცხადებები: Server error',
      en: 'Admin properties server error fix',
    },
    description: {
      ka: 'property_offers მიგრაცია + SQL ინტერვალები — Properties გვერდი კვლავ მუშაობს.',
      en: 'property_offers migration + SQL intervals — Properties page works again.',
    },
  },
  {
    id: 'header-redesign',
    date: '2026-08-23',
    category: 'feature',
    status: 'in_progress',
    phase: 'aug2026-sprint',
    title: {
      ka: 'ჰედერის რედიზაინი',
      en: 'Header redesign',
    },
    description: {
      ka: 'ორსტრიქონიანი ჰედერი, სუფთა ფერები, ძებნის ველი ამოღებული. ვიზუალური polish მიმდინარეობს.',
      en: 'Two-row header, clean palette, search removed. Visual polish still in progress.',
    },
  },
  {
    id: 'broker-desk',
    date: '2026-08-22',
    category: 'platform',
    status: 'planned',
    phase: 'aug2026-sprint',
    title: {
      ka: 'Broker Desk — სრული ფაზა',
      en: 'Broker Desk — full phase',
    },
    description: {
      ka: 'შეკვეთები, მატჩინგი, შეთავაზებები, ნახვები — საფუძველი უკვე დაწყებულია leads/offers-ით.',
      en: 'Orders, matching, offers, viewings — foundation started with leads/offers.',
    },
  },

  // ── Aug 2026 · Admin & listings ──
  {
    id: 'lifecycle-old-reasons',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'Old სტატუსის ქვეკატეგორიები',
      en: 'Old status sub-reasons',
    },
    description: {
      ka: 'დროებით შეჩერებული, გაყიდულია, გავყიდეთ, აღარ იყიდება, გაქირავდა, გავაქირავეთ + New R ავტო-გადასვლა.',
      en: 'Paused, sold, we sold, no longer selling, rented, we rented + auto New R after pause.',
    },
  },
  {
    id: 'auto-current',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'ახალი განცხადება → Current',
      en: 'New listings default to Current',
    },
    description: {
      ka: 'ახალი განცხადებისას სტატუსი ავტომატურად „მიმდინარე“ — ხელით არჩევა აღარ სჭირდება.',
      en: 'New listings automatically set to Current — no manual status pick on create.',
    },
  },
  {
    id: 'auto-title',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'ავტო სათაური',
      en: 'Auto-generated title',
    },
    description: {
      ka: 'სათაური ველი ავტომატურად ივსება ქალაქი, ტიპი, ფართი, ფასი და სტატუსიდან.',
      en: 'Title field auto-fills from city, type, area, price and status.',
    },
  },
  {
    id: 'auto-price-sqm',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'ავტო ₾/მ²',
      en: 'Auto price per m²',
    },
    description: {
      ka: 'სრული ფასი + ფართის შეყვანისას 1 მ²-ის ფასი ავტომატურად გამოითვლება.',
      en: 'Price per m² calculated automatically from total price and area.',
    },
  },
  {
    id: 'cadastral-privacy',
    date: '2026-08-18',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'საკადასტრო კოდი — მხოლოდ პერსონალი',
      en: 'Cadastral code — staff only',
    },
    description: {
      ka: 'საკადასტრო კოდი საჯარო საიტზე მხოლოდ მენეჯერი/ადმინს ჩანს.',
      en: 'Cadastral code visible on public site only for manager and admin roles.',
    },
  },
  {
    id: 'archive-listings',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'არქივი / Old განცხადებები',
      en: 'Archive / Old listings page',
    },
    description: {
      ka: 'Old განცხადებები ცალკე გვერდზე; ღილაკი Listings-ზე, „არქივი“ ამოღებულია ჰედერიდან.',
      en: 'Old listings on separate page; button on Listings; Archive removed from header.',
    },
  },
  {
    id: 'admin-thumbs',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'ადმინ ცხრილის ფოტოები',
      en: 'Admin table thumbnails',
    },
    description: {
      ka: 'განცხადებების ცხრილში და ფოტოგალერეაში უფრო დიდი, ვერტიკალური preview.',
      en: 'Larger vertical previews in listing table and photo gallery.',
    },
  },
  {
    id: 'admin-default-listings',
    date: '2026-08-18',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-admin',
    title: {
      ka: 'ადმინის ნაგულისხმევი ტაბი',
      en: 'Admin default tab',
    },
    description: {
      ka: 'ადმინ პანელის გახსნისას ნაგულისხმევად ღიაა „განცხადებები“.',
      en: 'Admin panel opens on Listings section by default.',
    },
  },

  // ── Aug 2026 · Analytics & manager ──
  {
    id: 'prices-page',
    date: '2026-08-16',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-analytics',
    title: {
      ka: 'ადმინ „ფასები“ ანალიტიკა',
      en: 'Admin Prices analytics page',
    },
    description: {
      ka: 'რუკა, ჩარტები, ₾/მ² ტრენდები, Geostat შედარება, CSV ექსპორტი.',
      en: 'Map, charts, ₾/m² trends, Geostat comparison, CSV export.',
    },
  },
  {
    id: 'prices-sale-rent-fix',
    date: '2026-08-16',
    category: 'fix',
    status: 'done',
    phase: 'aug2026-analytics',
    title: {
      ka: 'ფასების გვერდი: იყიდება vs ქირა',
      en: 'Prices page: sale vs rent separation',
    },
    description: {
      ka: 'იყიდება და ქირა აღარ იკვეთება ერთ საშუალში — ფილტრი იყიდება/ქირავდება.',
      en: 'Sale and rent no longer averaged together — dedicated deal-type filter.',
    },
  },
  {
    id: 'myge-benchmark',
    date: '2026-08-16',
    category: 'platform',
    status: 'done',
    phase: 'aug2026-analytics',
    title: {
      ka: 'MyGE.ge ბაზრის შედარება',
      en: 'MyGE.ge market benchmark',
    },
    description: {
      ka: 'გარე ბაზრის სნეპშოტები MyGE-დან — ქალაქების მედიანები და შედარება ჩვენი DB-თან.',
      en: 'External market snapshots from MyGE — city medians vs our inventory.',
    },
  },
  {
    id: 'leads-system',
    date: '2026-08-16',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-analytics',
    title: {
      ka: 'ლიდები და კონტაქტის ფორმები',
      en: 'Leads & contact forms',
    },
    description: {
      ka: 'კონტაქტი, განცხადების მოთხოვნა და newsletter რეალურად ინახება DB-ში — აღარ „ფეიკ success“.',
      en: 'Contact, enquiry and newsletter actually save to DB — no fake success screens.',
    },
  },
  {
    id: 'manager-desk-base',
    date: '2026-08-16',
    category: 'admin',
    status: 'done',
    phase: 'aug2026-analytics',
    title: {
      ka: 'მენეჯერის Desk (საფუძველი)',
      en: 'Manager Desk (foundation)',
    },
    description: {
      ka: 'ლიდების მინიჭება, სტეიჯები, broker load — Zillow-სტაილ მენეჯმენტის საფუძველი.',
      en: 'Lead assignment, stages, broker load — foundation for Zillow-style management.',
    },
  },

  // ── Aug 2026 · Contact & infra ──
  {
    id: 'contact-map',
    date: '2026-08-11',
    category: 'feature',
    status: 'done',
    phase: 'aug2026-infra',
    title: {
      ka: 'კონტაქტის გვერდი + ოფისის რუკა',
      en: 'Contact page + office map',
    },
    description: {
      ka: 'განახლებული კონტაქტის გვერდი Leaflet რუკით და ოფისის მარკერით.',
      en: 'Redesigned contact page with Leaflet map and office marker.',
    },
  },
  {
    id: 'cloudinary-deploy',
    date: '2026-08-18',
    category: 'fix',
    status: 'done',
    phase: 'aug2026-infra',
    title: {
      ka: 'Cloudinary production',
      en: 'Cloudinary on production',
    },
    description: {
      ka: 'CLOUDINARY_URL კონფიგურაცია დეპლოიზე — ფოტოს ატვირთვა production-ზე მუშაობს.',
      en: 'CLOUDINARY_URL on deploy — image upload works in production.',
    },
  },
  {
    id: 'deploy-502',
    date: '2026-08-11',
    category: 'fix',
    status: 'done',
    phase: 'aug2026-infra',
    title: {
      ka: '502 შეცდომის გამოსწორება',
      en: '502 error fix',
    },
    description: {
      ka: 'სერვერის/API კავშირის პრობლემები დეპლოიზე გამოსწორდა.',
      en: 'Server/API connection issues on deploy resolved.',
    },
  },
  {
    id: 'admin-user',
    date: '2026-08-11',
    category: 'platform',
    status: 'done',
    phase: 'aug2026-infra',
    title: {
      ka: 'ადმინ მომხმარებელი',
      en: 'Admin user account',
    },
    description: {
      ka: 'info@tbilisirealtor.ge ადმინ ანგარიში შეიქმნა.',
      en: 'info@tbilisirealtor.ge admin account created.',
    },
  },
];

export const UPDATE_PHASES: Record<string, { ka: string; en: string }> = {
  'aug2026-sprint': {
    ka: 'აგვისტო 2026 · პლატფორმის სპრინტი',
    en: 'August 2026 · Platform sprint',
  },
  'aug2026-admin': {
    ka: 'აგვისტო 2026 · ადმინი და განცხადებები',
    en: 'August 2026 · Admin & listings',
  },
  'aug2026-analytics': {
    ka: 'აგვისტო 2026 · ანალიტიკა და მენეჯმენტი',
    en: 'August 2026 · Analytics & management',
  },
  'aug2026-infra': {
    ka: 'აგვისტო 2026 · ინფრასტრუქტურა',
    en: 'August 2026 · Infrastructure',
  },
};

export const CATEGORY_META: Record<UpdateCategory, { ka: string; en: string; color: string }> = {
  feature: { ka: 'ფუნქცია', en: 'Feature', color: '#2563eb' },
  fix: { ka: 'გამოსწორება', en: 'Fix', color: '#10b981' },
  admin: { ka: 'ადმინი', en: 'Admin', color: '#6366f1' },
  platform: { ka: 'პლატფორმა', en: 'Platform', color: '#0f172a' },
};

export const STATUS_META: Record<UpdateStatus, { ka: string; en: string; color: string; bg: string }> = {
  done: { ka: 'დასრულებული', en: 'Done', color: '#059669', bg: '#ecfdf5' },
  in_progress: { ka: 'მიმდინარე', en: 'In progress', color: '#d97706', bg: '#fffbeb' },
  planned: { ka: 'დაგეგმილი', en: 'Planned', color: '#6366f1', bg: '#eef2ff' },
};
