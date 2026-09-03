import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Home, Store, TreePine, Hotel,
  DollarSign, Ruler, Bed, Layers, MapPin,
  Image as ImageIcon, Sparkles, Star, Zap, User, Phone, Mail,
  CheckCircle, Loader2, Crown, Key, FileText, Wrench,
  Flame, Droplets, Car, Link2, BadgeCheck,
  Hash, MoveHorizontal, Download, ExternalLink, Globe2,
  Languages, MessageSquare, X, Upload,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import { useCurrency, FALLBACK_USD_RATE } from '../contexts/CurrencyContext';
import {
  convertEntryAmount,
  formCurrencyToEntry,
  listingMoneyFrom,
  parsePriceCurrency,
} from '../lib/moneyEntry';
import { useFileUpload } from '../hooks/useFileUpload';
import LocationPickerMap, { type LocationValue } from '../components/LocationPickerMap';
import AdminLayout from '../components/admin/AdminLayout';
import DistrictCombobox from '../components/admin/DistrictCombobox';
import StreetSuggestInput from '../components/admin/StreetSuggestInput';
import { CITY_AREAS, canonicalCityName, canonicalDistrictName, findCityArea } from '../data/districts';
import { formatStreetAddress, parseListingAddress } from '../lib/address';
import type { StreetSuggestion } from '../lib/geocoding';
import { importFieldLabel } from '../lib/permissions';
import type { ImportedListingData } from '../types/importListing';
import {
  LIFECYCLE_OUTCOMES,
  LIFECYCLE_OUTCOME_META,
} from '../lib/lifecycle';
import {
  adminReturnPath,
  bedroomsChipFromCount,
  packListingDetails,
  parseChipCount,
  roomsChipFromCount,
  unpackListingDetails,
  unpackListingFields,
} from '../lib/listingFormFields';
import { downloadListingPhoto, downloadListingPhotos, listingPhotoFilename } from '../lib/downloadListingPhotos';

const SECTION_NAV = [
  { id: 'section-contact',  label: 'კონტაქტი',       icon: User       },
  { id: 'section-type',     label: 'ტიპი',           icon: Building2  },
  { id: 'section-details',  label: 'დეტალები',       icon: FileText   },
  { id: 'section-location', label: 'მდებარეობა',     icon: MapPin     },
  { id: 'section-features', label: 'მახასიათებლები', icon: Wrench     },
  { id: 'section-media',    label: 'ფოტო & კომენტ.', icon: Sparkles   },
];

/* ─── Constants ──────────────────────────────────────────── */
const PROPERTY_TYPES = [
  { id: 'apartment',  label: 'ბინა',            icon: Building2, color: '#2563eb' },
  { id: 'house',      label: 'კერძო სახლი',     icon: Home,      color: '#10B981' },
  { id: 'villa',      label: 'აგარაკი',         icon: Home,      color: '#ec4899' },
  { id: 'land',       label: 'მიწის ნაკვეთი',   icon: TreePine,  color: '#2563eb' },
  { id: 'commercial', label: 'კომ. ფართი',      icon: Store,     color: '#f59e0b' },
  { id: 'hotel',      label: 'სასტუმრო',        icon: Hotel,     color: '#ef4444' },
];

const DEAL_TYPES = [
  { id: 'sale',       label: 'იყიდება' },
  { id: 'rent',       label: 'ქირავდება' },
  { id: 'pledge',     label: 'გირავდება' },
  { id: 'daily_rent', label: 'ქირ. დღიურად' },
];

const BUILDING_STATUSES = [
  { id: 'old',   label: 'ძველი აშენებული' },
  { id: 'new',   label: 'ახალი აშენებული' },
  { id: 'under', label: 'მშენებარე'        },
];

const CONDITIONS = [
  'ახალი გარემონტებული', 'ძველი გარემონტებული', 'მიმდინარე რემონტი', 'სარემონტო',
  'თეთრი კარკასი', 'შავი კარკასი', 'მწვანე კარკასი', 'თეთრი პლიუსი',
];

const PROJECT_TYPES = [
  'ხრუშოვკა', 'ქალაქური', 'მოსკოვის', 'მაღალჭერიანი',
  'თუხარელი', 'ყავლაშვილი', 'არასტანდარტული',
];

/* Where the flat sits in the building — ticked, not typed. */
const LAYOUT_OPTIONS = ['გამჭოლი', 'კუთხის', 'კუთხის-გამჭოლი', 'ცალმხრივი'];

const PARKING_OPTIONS = [
  'ავტოფარეხი', 'პარკინგის ადგილი', 'ეზოს პარკინგი',
  'მიწისქვეშა პარკინგი', 'ფასიანი ავტოსადგომი', 'პარკინგის გარეშე',
];

const HEATING_OPTIONS = [
  'გაზის გამათბობელი', 'დენის გამათბობელი', 'ცენტრალური', 'იატაკქვეშა',
];

const HOT_WATER_OPTIONS = [
  'გაზის გამათბობელი', 'დენის გამათბობელი', 'ცენტრალური',
];

const BUILDING_MATERIALS = ['ბლოკი', 'აგური', 'ხის მასალა', 'რკინა-ბეტონი', 'კომბინირებული'];

const WINDOW_MATERIALS = ['ხე', 'პლასტმასა', 'ალუმინი'];

const FURNITURE_ITEMS = [
  'ავეჯი', 'სანოლი', 'დივანი', 'მაგიდა', 'სკამები',
  'ქურა (გაზ/ელ)', 'ღუმელი', 'კონდიციონერი', 'მაცივარი',
  'სარეცხი მანქანა', 'ჭ. სარეცხი მანქანა', 'ტელევიზია',
];

/* Everything the flat itself offers — all tick boxes, no dropdowns. */
const PROPERTY_AMENITIES = [
  'სტუდიო', 'იზ. სამზარეულო', 'სათავსო', 'სარდაფი',
  'ინტერნეტი', 'ტელევიზია', 'დომოფონი', 'ჯაკუზი',
  'ბუნებრივი აირი', 'ბუხარი', 'წყალი', 'კანალიზაცია',
  'ელექტ-ენერგია', 'ტელეფონი', 'სამზარეულო + ტექნიკა',
];

const BUILDING_FEATURES = [
  'სპა', 'ლიფტი', 'სატვ. ლიფტი', 'ბარი', 'სპ. დარბაზი',
  'მაყ./გრილი', 'სახ. სისტემა', 'შლაგბაუმი', 'კონსიერჟი',
  'დახ. აუზი', 'ღია აუზი', 'საუნა', 'სიგნალიზაცია', 'ვენტილაცია', 'დაცვა',
];

const BADGE_OPTIONS = [
  { id: 'key_code',    label: 'კარი კოდით',         icon: Key         },
  { id: 'airbnb',      label: 'Airbnb/Booking ექ.', icon: Link2       },
  { id: 'investment',  label: 'საინვესტიციო',        icon: TrendingUp  },
  { id: 'accessible',  label: 'სსსმ',                icon: BadgeCheck  },
];

const CHIP_UNPACK_OPTIONS = {
  conditions: CONDITIONS,
  buildingStatusIds: BUILDING_STATUSES.map(s => s.id),
  projectTypes: PROJECT_TYPES,
  layouts: LAYOUT_OPTIONS,
  parking: PARKING_OPTIONS,
  heating: HEATING_OPTIONS,
  hotWater: HOT_WATER_OPTIONS,
  buildingMaterials: BUILDING_MATERIALS,
  windowsMaterials: WINDOW_MATERIALS,
  furniture: FURNITURE_ITEMS,
  propertyAmenities: PROPERTY_AMENITIES,
  buildingFeatures: BUILDING_FEATURES,
  badgeIds: BADGE_OPTIONS.map(b => b.id),
  materialPrefix: 'მასალა: ',
  windowsPrefix: 'კარ-ფანჯ: ',
  layoutPrefix: 'განლაგება: ',
};

/* ─── Tiny TrendingUp icon placeholder ──────────────────── */
function TrendingUp({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none transition-all bg-white';
const cardCls  = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
const labelCls = 'flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide';
const sectionTitle = 'text-sm font-bold text-slate-700 mb-3';

function FormSection({
  id, title, desc, icon: Icon, children,
}: {
  id: string;
  title: string;
  desc?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: ReactNode;
}) {
  return (
    <section id={id} className={`${cardCls} scroll-mt-28 overflow-hidden`}>
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37, 99, 235,0.1)', border: '1px solid rgba(37, 99, 235,0.15)' }}>
            <Icon size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-800 text-base sm:text-lg leading-tight">{title}</h2>
            {desc && <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{desc}</p>}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


/* ─── Form state ─────────────────────────────────────────── */
interface PhotoItem {
  url: string;
  /* Uploaded but held back from the public gallery. */
  hidden: boolean;
}

interface FormState {
  /* core */
  title: string; description: string;
  descriptionEn: string; descriptionRu: string;
  type: string;
  /* A listing can be for sale and for rent at the same time. */
  dealTypes: string[];
  buildingStatus: string; condition: string;
  /* price */
  price: string; rentPrice: string; pricePerSqm: string; currency: string;
  /* dimensions */
  area: string; rooms: string; bedrooms: string; bathrooms: string;
  floor: string; totalFloors: string;
  /* detail */
  projectType: string; ceilingHeight: string;
  wetPoint: string;
  balconyCount: string;
  verandaArea: string; loggiaArea: string; waitingArea: string;
  livingRoomArea: string; storageArea: string;
  /* location */
  city: string; district: string; address: string;
  street: string; streetNumber: string; cadastralCode: string;
  lat: number; lng: number;
  /* Paid listings may publish the exact building number; ours stay approximate. */
  showAddress: boolean;
  /* features */
  parking: string[]; heating: string[]; hotWater: string[];
  layout: string[];
  buildingMaterials: string[]; windowsMaterials: string[];
  furniture: string[]; propertyAmenities: string[];
  buildingFeatures: string[]; badges: string[];
  amenities: string[]; features: string[];
  /* media */
  photos: PhotoItem[];
  /* internal notes, admin-only */
  internalNote: string;
  /* owner of the property */
  ownerName: string; ownerPhone: string; ownerEmail: string;
  ownerIdNumber: string; ownerAddress: string; ownerNote: string;
  /* agent / billing contact */
  agentName: string; agentPhone: string; agentEmail: string;
  agentCompany: string; agentTaxId: string; invoiceRef: string;
  /* flags */
  isPremium: boolean; isFeatured: boolean; isNew: boolean;
  /* origin of the listing */
  source: string; sourceUrl: string; sourceId: string;
  placement: 'free' | 'paid';
  placementPackage: string;
  /* lifecycle: new → current → old (with a reason) → new R */
  lifecycleState: string; rentTermMonths: string;
  rentStartedAt: string; rentExpiresAt: string; lifecycleNote: string;
  lifecycleOutcome: string; lifecycleDealPrice: string;
}

const defaultForm: FormState = {
  title: '', description: '', descriptionEn: '', descriptionRu: '',
  type: 'apartment', dealTypes: ['sale'],
  buildingStatus: '', condition: '',
  price: '', rentPrice: '', pricePerSqm: '', currency: '$',
  area: '', rooms: '', bedrooms: '', bathrooms: '',
  floor: '', totalFloors: '',
  projectType: '', ceilingHeight: '', wetPoint: '',
  balconyCount: '', verandaArea: '', loggiaArea: '', waitingArea: '',
  livingRoomArea: '', storageArea: '',
  city: 'თბილისი', district: '', address: '',
  street: '', streetNumber: '', cadastralCode: '',
  lat: 41.7151, lng: 44.8271, showAddress: true,
  parking: [], heating: [], hotWater: [], layout: [],
  buildingMaterials: [], windowsMaterials: [],
  furniture: [], propertyAmenities: [], buildingFeatures: [], badges: [],
  amenities: [], features: [],
  photos: [], internalNote: '',
  ownerName: '', ownerPhone: '', ownerEmail: '',
  ownerIdNumber: '', ownerAddress: '', ownerNote: '',
  agentName: '', agentPhone: '', agentEmail: '',
  agentCompany: '', agentTaxId: '', invoiceRef: '',
  isPremium: false, isFeatured: false, isNew: false,
  source: '', sourceUrl: '', sourceId: '',
  placement: 'free', placementPackage: '',
  lifecycleState: 'current', rentTermMonths: '', rentStartedAt: '', rentExpiresAt: '', lifecycleNote: '',
  lifecycleOutcome: '', lifecycleDealPrice: '',
};

const LIFECYCLE_OPTIONS = [
  { id: 'new',     label: 'new',     note: 'ახლად დამატებული',            color: '#2563eb' },
  { id: 'current', label: 'current', note: 'აქტიური განცხადება',           color: '#10b981' },
  { id: 'old',     label: 'old',     note: 'არქივი — გაიყიდა, გაქირავდა, შეჩერდა, აღარ იყიდება',    color: '#64748b' },
  { id: 'new_r',   label: 'new R',   note: 'ჩაძველდა — განახლება და ზარი სავალდებულოა', color: '#ef4444' },
];

const RENT_TERM_OPTIONS = [6, 12, 18, 24];
const PAUSE_DAYS = [3, 7, 14];

interface SavedNote { id: string; text: string; author?: string; createdAt: string }

/** Public gallery + held-back shots merged into one orderable list. */
function toPhotoItems(images: unknown, hidden: unknown): PhotoItem[] {
  const visible = Array.isArray(images) ? images.filter((u): u is string => typeof u === 'string') : [];
  const held = Array.isArray(hidden) ? hidden.filter((u): u is string => typeof u === 'string') : [];
  return [
    ...visible.map(url => ({ url, hidden: false })),
    ...held.map(url => ({ url, hidden: true })),
  ];
}

function addMonthsISO(startedAt: string, months: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}

function addDaysISO(startedAt: string, days: number): string {
  const date = new Date(`${startedAt}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Georgian locative: ვაკე → ვაკეში, საბურთალო → საბურთალოზე. */
function locative(name: string): string {
  const n = name.trim();
  if (!n) return '';
  const exceptions: Record<string, string> = {
    საბურთალო: 'საბურთალოზე',
    ნუცუბიძე: 'ნუცუბიძეზე',
    მთაწმინდა: 'მთაწმინდაზე',
    ლისი: 'ლისზე',
    'ძველი თბილისი': 'ძველ თბილისში',
    თბილისი: 'თბილისში',
  };
  if (exceptions[n]) return exceptions[n];
  if (/ში$|ზე$/.test(n)) return n;
  if (n.endsWith('ი')) return `${n.slice(0, -1)}ში`;
  if (n.endsWith('ო') || n.endsWith('უ')) return `${n}ზე`;
  return `${n}ში`;
}

function dealVerb(dealTypes: string[]): string {
  if (dealTypes.includes('sale')) return 'იყიდება';
  if (dealTypes.includes('rent')) return 'ქირავდება';
  if (dealTypes.includes('daily_rent')) return 'ქირავდება დღიურად';
  if (dealTypes.includes('pledge')) return 'გირავდება';
  return '';
}

/** Title built from the fields the agent already filled — no extra typing. */
function buildAutoTitle(form: Pick<FormState, 'type' | 'dealTypes' | 'rooms' | 'district' | 'city' | 'area' | 'buildingStatus'>): string {
  const typeLabel = PROPERTY_TYPES.find(t => t.id === form.type)?.label ?? '';
  const rooms = form.type !== 'land' && form.rooms ? `${form.rooms}-ოთახიანი` : '';
  const built = form.buildingStatus === 'new'
    ? 'ახალი აშენებული'
    : form.buildingStatus === 'under'
      ? 'მშენებარე'
      : '';
  const place = locative(form.district || form.city);
  const area = form.area ? `${form.area} მ²` : '';
  const head = [dealVerb(form.dealTypes), rooms, built, typeLabel, place].filter(Boolean).join(' ');
  return area ? `${head}, ${area}` : head;
}

function pricePerSqmOf(price: string, area: string): string {
  const p = Number(price);
  const a = Number(area);
  if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return '';
  return String(Math.round(p / a));
}

/* ─── Main component ─────────────────────────────────────── */
export default function AdminAddListingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const { user, can, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();
  const { formatMoney, rates } = useCurrency();
  const usdRate = rates.USD ?? FALLBACK_USD_RATE;

  // Field groups the account is not cleared for never render, and never ship
  // in the payload — the server rejects private writes from anyone else.
  const canOwner = can('listings.owner');
  const canNotes = can('listings.notes');
  const canBilling = can('listings.billing');
  const canImport = can('listings.import');
  const canTranslate = can('listings.translate');
  const canLifecycle = can('listings.lifecycle');

  const [form, setForm]       = useState<FormState>(defaultForm);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError]     = useState('');
  const [listingLocked, setListingLocked] = useState(false);
  const [ownerContactsVisible, setOwnerContactsVisible] = useState(true);
  const [titleManual, setTitleManual] = useState(isEdit);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importPreview, setImportPreview] = useState<ImportedListingData | null>(null);
  const [importApplied, setImportApplied] = useState(false);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [photoDownloading, setPhotoDownloading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState('');
  const [photoDraft, setPhotoDraft] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error: uploadError } = useFileUpload();

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [user, authLoading, navigate]);

  // New listing: prefill agent contact from the logged-in staff account.
  useEffect(() => {
    if (isEdit || !user) return;
    setForm(prev => ({
      ...prev,
      agentName: prev.agentName || user.firstName || user.name || '',
      agentPhone: prev.agentPhone || user.phone || '',
      agentEmail: prev.agentEmail || user.email || '',
    }));
  }, [isEdit, user]);

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      try {
        const data = await api(`/properties/${id}`);
        const coords = data.coordinates as { lat: number; lng: number } | null;
        const unpacked = unpackListingFields(data.amenities, data.features, CHIP_UNPACK_OPTIONS);
        const extras = unpackListingDetails(unpacked.features);
        setForm(prev => ({
          ...prev,
          title:      data.title || '',
          description: data.description || '',
          descriptionEn: data.descriptionEn || '',
          descriptionRu: data.descriptionRu || '',
          price:      data.price ? String(Math.round(Number(data.price))) : '',
          rentPrice:  data.rentPrice ? String(Math.round(Number(data.rentPrice))) : '',
          pricePerSqm: data.pricePerSqm
            ? String(Math.round(Number(data.pricePerSqm)))
            : '',
          currency: parsePriceCurrency(data.priceCurrency) === 'USD' ? '$' : '₾',
          area:       String(data.area || ''),
          type:       data.type || 'apartment',
          dealTypes:  data.status === 'both' ? ['sale', 'rent'] : [data.status || 'sale'],
          rooms:      roomsChipFromCount(data.rooms ?? data.bedrooms) || prev.rooms,
          bedrooms:   bedroomsChipFromCount(data.bedrooms) || '',
          bathrooms:  extras.details.wetPoint || String(data.bathrooms || ''),
          wetPoint:   extras.details.wetPoint || (Number(data.bathrooms) >= 3 ? '3+' : (data.bathrooms ? String(data.bathrooms) : '')),
          ceilingHeight: extras.details.ceilingHeight,
          balconyCount: extras.details.balconyCount,
          verandaArea: extras.details.verandaArea,
          loggiaArea: extras.details.loggiaArea,
          waitingArea: extras.details.waitingArea,
          livingRoomArea: extras.details.livingRoomArea,
          storageArea: extras.details.storageArea,
          condition:  unpacked.condition,
          buildingStatus: unpacked.buildingStatus,
          projectType: unpacked.projectType,
          parking:    unpacked.parking,
          heating:    unpacked.heating,
          hotWater:   unpacked.hotWater,
          layout:     unpacked.layout,
          buildingMaterials: unpacked.buildingMaterials,
          windowsMaterials: unpacked.windowsMaterials,
          furniture:  unpacked.furniture,
          propertyAmenities: unpacked.propertyAmenities,
          buildingFeatures: unpacked.buildingFeatures,
          badges:     unpacked.badges,
          floor:      String(data.floor || ''),
          totalFloors: String(data.totalFloors || ''),
          city:       canonicalCityName(data.city) || data.city || 'თბილისი',
          district:   canonicalDistrictName(data.city || 'თბილისი', data.district) || data.district || '',
          address:    data.address || '',
          street:     parseListingAddress(data.address || '', data.city, data.district).street,
          streetNumber: parseListingAddress(data.address || '', data.city, data.district).streetNumber,
          cadastralCode: data.cadastralCode || '',
          lat:        coords?.lat ?? 41.7151,
          lng:        coords?.lng ?? 44.8271,
          showAddress: data.showAddress !== false,
          photos:     toPhotoItems(data.images, data.hiddenImages),
          amenities:  unpacked.amenities,
          features:   extras.rest,
          agentName:  data.agentName || '',
          agentPhone: data.agentPhone || '',
          agentEmail: data.agentEmail || '',
          agentCompany: data.agentCompany || '',
          agentTaxId: data.agentTaxId || '',
          invoiceRef: data.invoiceRef || '',
          ownerName:  data.owner?.name || '',
          ownerPhone: data.owner?.phone || '',
          ownerEmail: data.owner?.email || '',
          ownerIdNumber: data.owner?.idNumber || '',
          ownerAddress:  data.owner?.address || '',
          ownerNote:     data.owner?.note || '',
          isPremium:  Boolean(data.isPremium),
          isFeatured: Boolean(data.isFeatured),
          isNew:      Boolean(data.isNew),
          source:     data.source || '',
          sourceUrl:  data.sourceUrl || '',
          sourceId:   data.sourceId || '',
          placement:  data.placement === 'paid' ? 'paid' : 'free',
          placementPackage: data.placementPackage || '',
          lifecycleState: data.lifecycleOutcome === 'rented_owner' ? 'old' : (data.lifecycleState || 'new'),
          rentTermMonths: data.rentTermMonths ? String(data.rentTermMonths) : '',
          rentStartedAt:  data.rentStartedAt ? String(data.rentStartedAt).slice(0, 10) : '',
          rentExpiresAt:  data.rentExpiresAt ? String(data.rentExpiresAt).slice(0, 10) : '',
          lifecycleNote:  data.lifecycleNote || '',
          lifecycleOutcome: data.lifecycleOutcome || '',
          lifecycleDealPrice: data.lifecycleDealPrice != null
            ? String(Math.round(Number(data.lifecycleDealPrice)))
            : '',
        }));
        setSavedNotes(Array.isArray(data.internalNotes) ? data.internalNotes : []);
        const owner = (data.owner ?? {}) as Record<string, unknown>;
        const hasOwnerContacts = Boolean(
          owner.phone || owner.email || owner.idNumber || owner.address || owner.note,
        );
        setListingLocked(data.canEdit === false);
        setOwnerContactsVisible(hasOwnerContacts || data.canEdit !== false);
      } catch { setError('განცხადების ჩატვირთვა ვერ მოხერხდა'); }
      finally  { setLoading(false); }
    })();
  }, [isEdit, id, user, api]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function toggleSingle(key: 'condition' | 'buildingStatus' | 'wetPoint' | 'projectType' | 'rooms' | 'bedrooms', val: string) {
    setForm(f => ({ ...f, [key]: f[key] === val ? '' : val }));
  }

  function toggleArr(key: keyof FormState, item: string) {
    setForm(f => {
      const arr = f[key] as string[];
      return { ...f, [key]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item] };
    });
  }

  const locationValue: LocationValue = {
    lat: form.lat, lng: form.lng,
    address: formatStreetAddress(form.street, form.streetNumber) || form.address,
    city: form.city, district: form.district,
  };

  function applyLocation(loc: LocationValue) {
    const parsed = parseListingAddress(loc.address || '', loc.city, loc.district);
    const city = canonicalCityName(loc.city) || loc.city;
    setForm(f => ({
      ...f,
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address || formatStreetAddress(parsed.street, parsed.streetNumber),
      city,
      district: canonicalDistrictName(city, loc.district) || loc.district || f.district,
      street: loc.street || parsed.street || f.street,
      streetNumber: loc.streetNumber || parsed.streetNumber || f.streetNumber,
    }));
  }

  function handleCityChange(nextCity: string) {
    setForm(f => {
      const kept = canonicalDistrictName(nextCity, f.district);
      const known = Boolean(findCityArea(nextCity)?.districts.some(d => d.ka === kept));
      return { ...f, city: nextCity, district: known ? kept : '' };
    });
  }

  function handleStreetPick(hit: StreetSuggestion) {
    setForm(f => ({
      ...f,
      street: hit.street,
      streetNumber: hit.streetNumber || f.streetNumber,
      address: formatStreetAddress(hit.street, hit.streetNumber || f.streetNumber),
      city: hit.city || f.city,
      district: hit.district || f.district,
      lat: hit.lat || f.lat,
      lng: hit.lng || f.lng,
    }));
  }

  function applyImportedData(data: ImportedListingData) {
    const importedPrice = Number(data.price) || 0;
    const importedPerSqm = Number(data.pricePerSqm) || 0;
    const areaNum = Number(data.area) || 0;
    const currency = data.currency === '$' ? '$' : '₾';

    setForm(f => ({
      ...f,
      title: data.title || f.title,
      description: data.description || f.description,
      type: data.type || f.type,
      dealTypes: data.dealType ? [data.dealType] : f.dealTypes,
      buildingStatus: data.buildingStatus || f.buildingStatus,
      condition: data.condition || f.condition,
      price: importedPrice ? String(Math.round(importedPrice)) : f.price,
      pricePerSqm: importedPerSqm
        ? String(Math.round(importedPerSqm))
        : (importedPrice && areaNum > 0
          ? String(Math.round(importedPrice / areaNum))
          : f.pricePerSqm),
      currency,
      area: data.area || f.area,
      rooms: data.rooms || f.rooms,
      bedrooms: data.bedrooms || f.bedrooms,
      bathrooms: data.bathrooms || f.bathrooms,
      floor: data.floor || f.floor,
      totalFloors: data.totalFloors || f.totalFloors,
      projectType: data.projectType || f.projectType,
      ceilingHeight: data.ceilingHeight || f.ceilingHeight,
      wetPoint: data.wetPoint || f.wetPoint,
      balconyCount: data.balconyCount || f.balconyCount,
      verandaArea: data.verandaArea || f.verandaArea,
      loggiaArea: data.loggiaArea || f.loggiaArea,
      waitingArea: data.waitingArea || f.waitingArea,
      livingRoomArea: data.livingRoomArea || f.livingRoomArea,
      storageArea: data.storageArea || f.storageArea,
      city: canonicalCityName(data.city) || data.city || f.city,
      district: canonicalDistrictName(data.city || f.city, data.district) || data.district || f.district,
      address: data.address || f.address,
      street: data.street || parseListingAddress(data.address || '', data.city, data.district).street || f.street,
      streetNumber: data.streetNumber || parseListingAddress(data.address || '', data.city, data.district).streetNumber || f.streetNumber,
      cadastralCode: data.cadastralCode || f.cadastralCode,
      lat: data.lat || f.lat,
      lng: data.lng || f.lng,
      photos: data.images.length ? data.images.map(url => ({ url, hidden: false })) : f.photos,
      agentName: data.agentName || f.agentName,
      agentPhone: data.agentPhone || f.agentPhone,
      agentEmail: data.agentEmail || f.agentEmail,
      parking: data.parking.length ? data.parking : f.parking,
      heating: data.heating.length ? data.heating : f.heating,
      hotWater: data.hotWater.length ? data.hotWater : f.hotWater,
      buildingMaterials: data.buildingMaterials.length ? data.buildingMaterials : f.buildingMaterials,
      windowsMaterials: data.windowsMaterials.length ? data.windowsMaterials : f.windowsMaterials,
      furniture: data.furniture.length ? data.furniture : f.furniture,
      propertyAmenities: data.propertyAmenities.length ? data.propertyAmenities : f.propertyAmenities,
      buildingFeatures: data.buildingFeatures.length ? data.buildingFeatures : f.buildingFeatures,
      badges: data.badges.length ? data.badges : f.badges,
      isPremium: data.isPremium || f.isPremium,
      isFeatured: data.isFeatured || f.isFeatured,
      isNew: data.isNew,
      /* Kept so the admin table can jump back to the original ad. */
      source: data.source || f.source,
      sourceUrl: data.sourceUrl || f.sourceUrl,
      sourceId: data.sourceId || f.sourceId,
    }));
    if (data.title) setTitleManual(true);
    setImportApplied(true);
  }

  const autoTitle = useMemo(
    () => buildAutoTitle(form),
    [form.type, form.dealTypes, form.rooms, form.district, form.city, form.area, form.buildingStatus],
  );

  useEffect(() => {
    if (isEdit || titleManual) return;
    setForm(f => (f.title === autoTitle ? f : { ...f, title: autoTitle }));
  }, [autoTitle, isEdit, titleManual]);

  async function handleImportListing() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError('');
    setImportPreview(null);
    setImportApplied(false);
    try {
      const data = await api('/import-listing', {
        method: 'POST',
        body: JSON.stringify({ url: importUrl.trim() }),
      }) as ImportedListingData;
      setImportPreview(data);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'იმპორტი ვერ მოხერხდა');
    } finally {
      setImporting(false);
    }
  }

  /* Georgian is the source of truth; EN/RU are filled from it on demand. */
  async function handleTranslate() {
    if (!form.description.trim()) {
      setTranslateError('ჯერ ქართული აღწერა შეავსეთ');
      return;
    }
    setTranslating(true);
    setTranslateError('');
    try {
      const result = await api('/translate', {
        method: 'POST',
        body: JSON.stringify({ text: form.description, targets: ['en', 'ru'] }),
      }) as { en?: string; ru?: string };
      setForm(f => ({
        ...f,
        descriptionEn: result.en || f.descriptionEn,
        descriptionRu: result.ru || f.descriptionRu,
      }));
    } catch (err) {
      setTranslateError(err instanceof Error ? err.message : 'თარგმნა ვერ მოხერხდა');
    } finally {
      setTranslating(false);
    }
  }

  function appendPhotos(urls: string[]) {
    if (!urls.length) return;
    setForm(f => {
      const known = new Set(f.photos.map(p => p.url));
      return { ...f, photos: [...f.photos, ...urls.filter(u => !known.has(u)).map(url => ({ url, hidden: false }))] };
    });
  }

  function addPhotos(raw: string) {
    const urls = raw
      .split(/[\n,\s]+/)
      .map(s => s.trim())
      .filter(s => /^https?:\/\//.test(s));
    if (!urls.length) return;
    appendPhotos(urls);
    setPhotoDraft('');
  }

  async function uploadPhotos(files: FileList | File[] | null) {
    if (!files || !files.length) return;
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    const uploaded = await upload(images);
    appendPhotos(uploaded.map(file => file.url));
  }

  async function persistNotes(next: SavedNote[]) {
    if (!isEdit || !id) {
      setSavedNotes(next);
      return;
    }
    await api(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ internalNotes: next }),
    });
    setSavedNotes(next);
  }

  async function saveInternalComment() {
    const text = form.internalNote.trim();
    if (!text) return;
    setNoteSaving(true);
    setNoteError('');
    const next: SavedNote[] = [
      {
        id: `n${Date.now().toString(36)}`,
        text,
        author: user?.firstName || user?.name || undefined,
        createdAt: new Date().toISOString(),
      },
      ...savedNotes,
    ];
    try {
      await persistNotes(next);
      set('internalNote', '');
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'კომენტარი ვერ შეინახა');
    } finally {
      setNoteSaving(false);
    }
  }

  async function removeInternalComment(noteId: string) {
    setNoteError('');
    try {
      await persistNotes(savedNotes.filter(note => note.id !== noteId));
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'კომენტარი ვერ წაიშალა');
    }
  }

  async function downloadAllPhotos() {
    const urls = form.photos.map(photo => photo.url).filter(Boolean);
    if (!urls.length) return;
    setPhotoDownloading(true);
    try {
      await downloadListingPhotos(urls, id);
    } finally {
      setPhotoDownloading(false);
    }
  }

  function movePhoto(from: number, to: number) {
    setForm(f => {
      if (to < 0 || to >= f.photos.length || from === to) return f;
      const next = [...f.photos];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...f, photos: next };
    });
  }

  async function handleSubmit(_publish = true) {
    if (listingLocked) {
      setError('რედაქტირება მხოლოდ საკუთარ განცხადებაზე შეგიძლიათ');
      return;
    }
    if (!form.price) {
      setError('ფასი სავალდებულოა');
      scrollToSection('section-details');
      return;
    }
    if (!form.type || form.dealTypes.length === 0) {
      setError('აირჩიეთ ქონების და გარიგების ტიპი');
      scrollToSection('section-type');
      return;
    }
    if (isEdit && form.lifecycleState === 'old' && !form.lifecycleOutcome) {
      setError('old სტატუსზე აირჩიე ქვეკატეგორია');
      scrollToSection('section-type');
      return;
    }
    setSaving(true); setError('');
    try {
      const allFeatures = [
        ...form.features,
        ...form.layout.map(l => `განლაგება: ${l}`),
        ...form.buildingFeatures,
        ...form.badges,
        form.condition, form.buildingStatus, form.projectType,
        ...packListingDetails({
          wetPoint: form.wetPoint,
          ceilingHeight: '',
          balconyCount: form.balconyCount,
          verandaArea: form.verandaArea,
          loggiaArea: '',
          waitingArea: '',
          livingRoomArea: '',
          storageArea: form.storageArea,
        }),
      ].filter(Boolean);

      const allAmenities = [
        ...form.amenities,
        ...form.parking,
        ...form.heating,
        ...form.hotWater,
        ...form.furniture,
        ...form.propertyAmenities,
      ].filter(Boolean);

      const sells = form.dealTypes.includes('sale');
      const rents = form.dealTypes.some(d => d !== 'sale');
      const newNote = form.internalNote.trim();

      const entry = formCurrencyToEntry(form.currency);
      const price = Math.round(parseFloat(form.price) || 0);
      const rentPrice = form.rentPrice ? Math.round(parseFloat(form.rentPrice)) : null;
      const areaNum = parseFloat(form.area) || 0;

      const payload = {
        title:        form.title.trim() || buildAutoTitle(form),
        description:  form.description,
        descriptionEn: form.descriptionEn,
        descriptionRu: form.descriptionRu,
        price,
        rentPrice:    sells && rents && form.rentPrice ? rentPrice : null,
        priceCurrency: entry,
        pricePerSqm:  parseFloat(form.pricePerSqm)
          ? Math.round(parseFloat(form.pricePerSqm))
          : (price > 0 && areaNum > 0 ? Math.round(price / areaNum) : null),
        area:         parseFloat(form.area) || null,
        type:         form.type,
        status:       sells && rents ? 'both' : sells ? 'sale' : 'rent',
        rooms:        parseChipCount(form.rooms),
        bedrooms:     parseChipCount(form.bedrooms),
        bathrooms:    parseChipCount(form.bathrooms || form.wetPoint),
        floor:        parseInt(form.floor) || null,
        totalFloors:  parseInt(form.totalFloors) || null,
        city:         form.city,
        district:     form.district,
        address:      formatStreetAddress(form.street, form.streetNumber) || form.address,
        showAddress:  form.showAddress,
        cadastralCode: form.cadastralCode.trim(),
        coordinates:  { lat: form.lat, lng: form.lng },
        images:       form.photos.filter(p => !p.hidden).map(p => p.url),
        hiddenImages: form.photos.filter(p => p.hidden).map(p => p.url),
        amenities:    allAmenities,
        features:     allFeatures,
        // Private groups are omitted entirely when the account cannot see them,
        // otherwise the server would reject the request for touching them.
        ...(canOwner && ownerContactsVisible ? {
          owner: {
            name: form.ownerName, phone: form.ownerPhone, email: form.ownerEmail,
            idNumber: form.ownerIdNumber, address: form.ownerAddress, note: form.ownerNote,
          },
        } : {}),
        ...(canNotes ? {
          internalNotes: newNote
            ? [{ id: `n${Date.now().toString(36)}`, text: newNote, createdAt: new Date().toISOString() }, ...savedNotes]
            : savedNotes,
        } : {}),
        ...(canBilling ? {
          agentTaxId: form.agentTaxId,
          invoiceRef: form.invoiceRef,
        } : {}),
        agentName:    form.agentName,
        agentPhone:   form.agentPhone,
        agentEmail:   form.agentEmail,
        agentCompany: form.agentCompany,
        isPremium:    form.isPremium,
        isFeatured:   form.isFeatured,
        isNew:        form.isNew,
        source:       form.source || (form.sourceUrl ? 'manual' : ''),
        sourceUrl:    form.sourceUrl,
        sourceId:     form.sourceId,
        placement:    form.placement,
        placementPackage: form.placement === 'paid' ? form.placementPackage.trim() : '',
        lifecycleState: isEdit ? (form.lifecycleState || 'current') : 'current',
        rentTermMonths: isEdit && form.rentTermMonths ? parseInt(form.rentTermMonths) : null,
        rentStartedAt:  isEdit ? (form.rentStartedAt || null) : null,
        rentExpiresAt:  isEdit ? (form.rentExpiresAt || null) : null,
        lifecycleNote:  isEdit ? form.lifecycleNote : '',
        lifecycleOutcome: isEdit && (form.lifecycleState === 'old' || form.lifecycleState === 'new_r')
          ? (form.lifecycleOutcome || null)
          : null,
        lifecycleDealPrice: isEdit && form.lifecycleOutcome === 'rented_us' && form.lifecycleDealPrice
          ? Math.round(parseFloat(form.lifecycleDealPrice))
          : null,
        priceSource:    form.sourceUrl && !isEdit ? 'import' : 'admin',
      };

      if (isEdit) {
        await api(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/properties', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate(adminReturnPath(searchParams.get('from')));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  }

  const selectedType = PROPERTY_TYPES.find(t => t.id === form.type);
  const sellsAndRents = form.dealTypes.includes('sale') && form.dealTypes.some(d => d !== 'sale');
  const coverPhoto = form.photos.find(p => !p.hidden)?.url;

  if (authLoading || !user) return null;
  if (loading) return (
    <AdminLayout subtitle="იტვირთება..." activeSection="properties" hideAddButton>
      <div className="container-xl py-24 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-600 animate-spin" />
      </div>
    </AdminLayout>
  );

  /* ── Chip button helper ── */
  const chip = (label: string, active: boolean, onClick: () => void, color = '#2563eb') => (
    <button key={label} type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
        active ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >{label}</button>
  );

  const actionButtons = (
    <>
      <button
        type="button"
        onClick={() => handleSubmit(false)}
        disabled={saving || listingLocked || !form.price}
        className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
        შენახვა
      </button>
      <button
        type="button"
        onClick={() => handleSubmit(true)}
        disabled={saving || listingLocked || !form.price}
        className="flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl text-white text-sm font-bold transition-colors disabled:opacity-40"
        style={{ background: '#2563eb' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        გამოქვეყნება
      </button>
    </>
  );

  return (
    <AdminLayout
      subtitle={isEdit ? 'განცხადების რედაქტირება' : 'ახალი განცხადება'}
      activeSection="properties"
      hideAddButton
    >
      <div className="container-xl py-6 sm:py-8 pb-28 lg:pb-10">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin?section=properties')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold mb-2 transition-colors"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowLeft size={14} />
              უკან განცხადებებში
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              {isEdit ? 'განცხადების რედაქტირება' : 'ახალი განცხადება'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">ყველა ველი ერთ გვერდზე — შეავსეთ და გამოაქვეყნეთ</p>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            {actionButtons}
          </div>
        </div>

        {listingLocked && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
            რედაქტირება მხოლოდ საკუთარ განცხადებაზე შეგიძლიათ
            {!ownerContactsVisible ? '. მესაკუთრის ტელეფონი და მეილი დაფარულია.' : '.'}
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          <div className="min-w-0 space-y-5">

            {/* ── Import from MyHome / SS.ge ── */}
            {!isEdit && canImport && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
                style={{ background: '#f0fdf4' }}>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: '#059669' }}>
                          <Download size={18} className="text-white" />
                        </div>
                        <h2 className="font-extrabold text-slate-800 text-base sm:text-lg">სწრაფი იმპორტი</h2>
                      </div>
                      <p className="text-slate-500 text-sm max-w-xl">
                        ჩასვით myhome.ge ან ss.ge ბმული — ყველა ველი, ფოტოები და კონტაქტი ავტომატურად შეივსება
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #bbf7d0' }}>
                        <Globe2 size={12} /> MyHome.ge
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                        style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
                        <Globe2 size={12} /> SS.ge
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        value={importUrl}
                        onChange={e => { setImportUrl(e.target.value); setImportError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleImportListing()}
                        placeholder="https://www.myhome.ge/... ან https://home.ss.ge/..."
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleImportListing}
                      disabled={importing || !importUrl.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                      style={{
                        background: '#059669',
                        boxShadow: 'none',
                        minWidth: 140,
                      }}
                    >
                      {importing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                      {importing ? 'იტვირთება...' : 'მოძებნა'}
                    </button>
                  </div>

                  {importError && (
                    <p className="mt-3 text-sm text-red-600 font-medium">{importError}</p>
                  )}

                  {importPreview && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-2xl border border-white bg-white/90 backdrop-blur p-4 sm:p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{
                                background: importPreview.source === 'myhome.ge' ? '#ecfdf5' : '#eff6ff',
                                color: importPreview.source === 'myhome.ge' ? '#059669' : '#2563eb',
                              }}>
                              {importPreview.source}
                            </span>
                            {importPreview.meta.vipLabel && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                {importPreview.meta.vipLabel}
                              </span>
                            )}
                            {importApplied && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                ✓ შევსებულია
                              </span>
                            )}
                            {importPreview.meta.quality === 'partial' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                ნაწილობრივი
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">{importPreview.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {importPreview.city}{importPreview.district ? ` · ${importPreview.district}` : ''}
                            {importPreview.area ? ` · ${importPreview.area} მ²` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-slate-800">
                            {importPreview.currency}{Number(importPreview.price).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            საიტზე: {formatMoney(Number(importPreview.price), listingMoneyFrom({
                              priceCurrency: importPreview.currency === '$' ? 'USD' : 'GEL',
                            }))}
                          </p>
                          {importPreview.pricePerSqm && (
                            <p className="text-xs text-slate-400">
                              {importPreview.currency}{Number(importPreview.pricePerSqm).toLocaleString()}/მ² · საიტზე {formatMoney(Number(importPreview.pricePerSqm), {
                                ...listingMoneyFrom({
                                  priceCurrency: importPreview.currency === '$' ? 'USD' : 'GEL',
                                }),
                                perSqm: true,
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {importPreview.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                          {importPreview.images.slice(0, 8).map((img, i) => (
                            <img key={i} src={img} alt="" className="w-20 h-16 rounded-xl object-cover flex-shrink-0 bg-slate-100 border border-slate-100" />
                          ))}
                          {importPreview.images.length > 8 && (
                            <div className="w-20 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                              +{importPreview.images.length - 8}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                        {[
                          { l: 'ფოტო', v: importPreview.images.length },
                          { l: 'ოთახი', v: importPreview.rooms || '—' },
                          { l: 'სართული', v: importPreview.floor ? `${importPreview.floor}/${importPreview.totalFloors || '?'}` : '—' },
                          { l: 'ველები', v: importPreview.meta.importedFields ?? 0 },
                        ].map(({ l, v }) => (
                          <div key={l} className="rounded-xl bg-slate-50 px-3 py-2 text-center border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">{l}</p>
                            <p className="text-sm font-bold text-slate-800">{v}</p>
                          </div>
                        ))}
                      </div>

                      {/*
                        A parse that "worked" can still be half empty. Saying so here
                        is what stops half-filled listings reaching the site.
                      */}
                      {(importPreview.meta.missingFields?.length || importPreview.meta.warnings?.length) ? (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                          {importPreview.meta.missingFields?.length ? (
                            <p className="text-xs font-bold text-amber-800">
                              ხელით შესავსებია: {importPreview.meta.missingFields.map(importFieldLabel).join(', ')}
                            </p>
                          ) : null}
                          {importPreview.meta.warnings?.length ? (
                            <p className="mt-1 text-[11px] font-semibold text-amber-700">
                              {importPreview.meta.warnings.map(importFieldLabel).join(' · ')}
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => applyImportedData(importPreview)}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
                          style={{ background: '#2563eb' }}
                        >
                          <CheckCircle size={16} />
                          ფორმის ავტომატური შევსება
                        </button>
                        <a href={importPreview.sourceUrl} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50">
                          <ExternalLink size={15} />
                          გარე საიტი
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ── Owner + contact, kept at the top where they are needed first ── */}
            <FormSection id="section-contact" title="მესაკუთრე & კონტაქტი" desc="შიდა ინფორმაცია — საიტზე არ ქვეყნდება" icon={User}>
              <div className="space-y-6">
                {canOwner && (
                  <div>
                    <p className={sectionTitle}>მესაკუთრე</p>
                    {listingLocked && !ownerContactsVisible && (
                      <p className="mb-3 text-[11px] font-semibold text-slate-400">
                        მესაკუთრის ტელეფონი და მეილი მხოლოდ საკუთარ პორტფოლიოში ჩანს.
                      </p>
                    )}
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className={labelCls}><User size={12} /> სახელი გვარი</label>
                        <input type="text" value={form.ownerName} onChange={e => set('ownerName', e.target.value)} className={inputCls} placeholder="ნინო ბერიძე" readOnly={listingLocked} />
                      </div>
                      {ownerContactsVisible && (
                        <>
                          <div>
                            <label className={labelCls}><Phone size={12} /> ტელეფონი</label>
                            <input type="text" value={form.ownerPhone} onChange={e => set('ownerPhone', e.target.value)} className={inputCls} placeholder="+995 5XX XXX XXX" readOnly={listingLocked} />
                          </div>
                          <div>
                            <label className={labelCls}><Mail size={12} /> Email</label>
                            <input type="email" value={form.ownerEmail} onChange={e => set('ownerEmail', e.target.value)} className={inputCls} readOnly={listingLocked} />
                          </div>
                          <div>
                            <label className={labelCls}>პირადი ნომერი</label>
                            <input type="text" value={form.ownerIdNumber} onChange={e => set('ownerIdNumber', e.target.value)} className={inputCls} placeholder="01001XXXXXX" readOnly={listingLocked} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}><MapPin size={12} /> მისამართი</label>
                            <input type="text" value={form.ownerAddress} onChange={e => set('ownerAddress', e.target.value)} className={inputCls} readOnly={listingLocked} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className={canOwner ? 'pt-2 border-t border-slate-100' : ''}>
                  <p className={sectionTitle}>საკონტაქტო{canBilling ? ' / ანგარიშფაქტურა' : ''}</p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className={labelCls}><User size={12} /> სახელი</label>
                      <input type="text" value={form.agentName} onChange={e => set('agentName', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}><Phone size={12} /> ტელეფ.</label>
                      <input type="text" value={form.agentPhone} onChange={e => set('agentPhone', e.target.value)} className={inputCls} placeholder="+995 5XX XXX XXX" />
                    </div>
                    <div>
                      <label className={labelCls}><Mail size={12} /> Email</label>
                      <input type="email" value={form.agentEmail} onChange={e => set('agentEmail', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>ორგანიზაციის დასახელება</label>
                      <input type="text" value={form.agentCompany} onChange={e => set('agentCompany', e.target.value)} className={inputCls} placeholder="შპს ..." />
                    </div>
                    {canBilling && (
                      <>
                        <div>
                          <label className={labelCls}>საიდენტ. კოდი</label>
                          <input type="text" value={form.agentTaxId} onChange={e => set('agentTaxId', e.target.value)} className={inputCls} placeholder="4042XXXXXX" />
                        </div>
                        <div>
                          <label className={labelCls}>ინვოისი</label>
                          <input type="text" value={form.invoiceRef} onChange={e => set('invoiceRef', e.target.value)} className={inputCls} placeholder="ინვოისის № ან ბმული" />
                        </div>
                      </>
                    )}
                  </div>
                  {canBilling && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      ფასიანი განთავსებისას ინვოისი ავტომატურად მიებმება ორგანიზაციის მონაცემებს.
                    </p>
                  )}

                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className={sectionTitle}>განთავსება / ღირებულება</p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { id: 'free' as const, label: 'უფასო' },
                        { id: 'paid' as const, label: 'ფასიანი' },
                      ]).map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => set('placement', opt.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            form.placement === opt.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {form.placement === 'paid' && (
                      <div className="mt-3 max-w-sm">
                        <label className={labelCls}>პაკეტი (არასავალდებულო)</label>
                        <input
                          type="text"
                          value={form.placementPackage}
                          onChange={e => set('placementPackage', e.target.value)}
                          className={inputCls}
                          placeholder="VIP, Premium…"
                        />
                      </div>
                    )}
                    {(form.sourceUrl || form.source) && (
                      <p className="mt-3 text-[11px] font-semibold text-slate-500">
                        წარმოშობა: <span className="text-slate-800">გადმოტანილი</span>
                        {form.sourceUrl ? ' · MyHome / ss.ge' : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="section-type" title="ტიპი & სტატუსი" desc="აირჩიეთ ქონების, გარიგების ტიპი და მდგომარეობა" icon={Building2}>
              <div className="space-y-6">
                      <h3 className="font-bold text-slate-800 text-sm mb-1">უძრავი ქონების ტიპი <span className="text-red-500">*</span></h3>
                      <p className="text-slate-500 text-sm mb-5">რა ტიპის ქონება განვათავსოთ?</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PROPERTY_TYPES.map(t => {
                          const on = form.type === t.id;
                          return (
                            <button key={t.id} type="button" onClick={() => set('type', t.id)}
                              className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                                on ? 'shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                              }`}
                              style={on ? { background: `${t.color}12`, borderColor: t.color } : {}}
                            >
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                style={{ background: `${t.color}18` }}>
                                <t.icon size={18} style={{ color: t.color }} />
                              </div>
                              <span className="font-bold text-slate-800 text-sm">{t.label}</span>
                              {on && <CheckCircle size={15} className="absolute top-3 right-3" style={{ color: t.color }} />}
                            </button>
                          );
                        })}
                      </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">გარიგების ტიპი <span className="text-red-500">*</span></h3>
                  <p className="text-slate-500 text-xs mb-4">ერთდროულად შეიძლება იყოს გასაყიდიც და გასაქირავებელიც — მონიშნეთ ორივე.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {DEAL_TYPES.map(d => {
                      const on = form.dealTypes.includes(d.id);
                      return (
                        <button key={d.id} type="button" onClick={() => toggleArr('dealTypes', d.id)}
                          className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                            on ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                               : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >{d.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-4">სტატუსი</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {BUILDING_STATUSES.map(s => {
                      const on = form.buildingStatus === s.id;
                      return (
                        <button key={s.id} type="button" onClick={() => toggleSingle('buildingStatus', s.id)}
                          className={`py-3 px-3 rounded-xl border-2 text-sm font-bold transition-all text-center ${
                            on ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                               : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >{s.label}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-4">მდგომარეობა</h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map(c => chip(c, form.condition === c, () => toggleSingle('condition', c), '#2563eb'))}
                  </div>
                </div>

                {/* Lifecycle + why a listing left the live table */}
                <div className={`pt-5 border-t border-slate-100 ${isEdit && canLifecycle ? '' : 'hidden'}`}>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">განცხადების სტატუსი</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    old-ზე აირჩიე მიზეზი. დროებით შეჩერებული და „გავაქირავეთ“ ვადის გასვლის შემდეგ ავტომატურად გახდება <b>new R</b>.
                    „გაქირავდა“ რჩება გაყიდვაზე შიდა ნიშნით.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LIFECYCLE_OPTIONS.map(opt => {
                      const on = form.lifecycleState === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            set('lifecycleState', opt.id);
                            if (opt.id !== 'old' && opt.id !== 'new_r') set('lifecycleOutcome', '');
                          }}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${on ? 'shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                          style={on ? { background: `${opt.color}10`, borderColor: opt.color } : {}}
                        >
                          <span className="block text-sm font-extrabold" style={{ color: on ? opt.color : '#334155' }}>
                            {opt.label}
                          </span>
                          <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.note}</span>
                        </button>
                      );
                    })}
                  </div>

                  {(form.lifecycleState === 'new' || form.lifecycleState === 'current') && (
                    <label className="block mt-4">
                      <span className="block text-xs font-bold text-slate-600 mb-1.5">კომენტარი</span>
                      <input
                        value={form.lifecycleNote}
                        onChange={e => set('lifecycleNote', e.target.value)}
                        placeholder="დამატებითი კომენტარი ხელით…"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white"
                      />
                    </label>
                  )}

                  {(form.lifecycleState === 'old' || form.lifecycleState === 'new_r') && (
                    <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-2">ქვეკატეგორია</p>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {LIFECYCLE_OUTCOMES.map(id => {
                            const item = LIFECYCLE_OUTCOME_META[id];
                            const on = form.lifecycleOutcome === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  set('lifecycleOutcome', id);
                                  if (id === 'paused' && !form.rentExpiresAt) {
                                    set('rentExpiresAt', addDaysISO(new Date().toISOString().slice(0, 10), 7));
                                  }
                                  if (id === 'rented_us' && !form.rentStartedAt) {
                                    const start = new Date().toISOString().slice(0, 10);
                                    set('rentStartedAt', start);
                                    set('rentTermMonths', '12');
                                    set('rentExpiresAt', addMonthsISO(start, 12));
                                  }
                                }}
                                className={`p-3 rounded-xl border-2 text-left transition-all ${on ? 'border-slate-700 bg-white shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                              >
                                <span className="block text-xs font-extrabold text-slate-800">{item.label}</span>
                                <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">{item.hint}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {form.lifecycleOutcome === 'paused' && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-600">როდის დაბრუნდეს New R-ში</p>
                          <div className="flex flex-wrap gap-2">
                            {PAUSE_DAYS.map(days => chip(
                              `${days} დღე`,
                              form.rentExpiresAt === addDaysISO(new Date().toISOString().slice(0, 10), days),
                              () => set('rentExpiresAt', addDaysISO(new Date().toISOString().slice(0, 10), days)),
                              '#0f172a',
                            ))}
                          </div>
                          <label className="block">
                            <span className="block text-xs font-bold text-slate-600 mb-1.5">თარიღი</span>
                            <input
                              type="date"
                              value={form.rentExpiresAt}
                              onChange={e => set('rentExpiresAt', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
                            />
                          </label>
                        </div>
                      )}

                      {form.lifecycleOutcome === 'rented_us' && (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-600">ქირავნობის ვადა და ფასი</p>
                          <div className="flex flex-wrap gap-2">
                            {RENT_TERM_OPTIONS.map(months => chip(
                              `${months} თვე`,
                              form.rentTermMonths === String(months),
                              () => {
                                const start = form.rentStartedAt || new Date().toISOString().slice(0, 10);
                                set('rentTermMonths', String(months));
                                set('rentStartedAt', start);
                                set('rentExpiresAt', addMonthsISO(start, months));
                              },
                              '#0f172a',
                            ))}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="block">
                              <span className="block text-xs font-bold text-slate-600 mb-1.5">დაწყების თარიღი</span>
                              <input
                                type="date"
                                value={form.rentStartedAt}
                                onChange={e => {
                                  set('rentStartedAt', e.target.value);
                                  if (form.rentTermMonths) {
                                    set('rentExpiresAt', addMonthsISO(e.target.value, parseInt(form.rentTermMonths)));
                                  }
                                }}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
                              />
                            </label>
                            <label className="block">
                              <span className="block text-xs font-bold text-slate-600 mb-1.5">თავისუფლდება</span>
                              <input
                                type="date"
                                value={form.rentExpiresAt}
                                onChange={e => { set('rentExpiresAt', e.target.value); set('rentTermMonths', ''); }}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 bg-white"
                              />
                            </label>
                          </div>
                          <label className="block">
                            <span className="block text-xs font-bold text-slate-600 mb-1.5">ქირის ფასი ({form.currency})</span>
                            <input
                              type="number"
                              min={0}
                              value={form.lifecycleDealPrice}
                              onChange={e => set('lifecycleDealPrice', e.target.value)}
                              placeholder="მაგ. 1200"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white"
                            />
                          </label>
                        </div>
                      )}

                      {form.lifecycleOutcome === 'rented_owner' && (
                        <p className="text-xs text-teal-800 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 leading-snug">
                          განცხადება რჩება გაყიდვაზე და აქტიურ ცხრილში. შიდა ნიშანია, რომ გაქირავებულია — ინვესტიციის ფილტრისთვის.
                        </p>
                      )}

                      <label className="block">
                        <span className="block text-xs font-bold text-slate-600 mb-1.5">კომენტარი</span>
                        <input
                          value={form.lifecycleNote}
                          onChange={e => set('lifecycleNote', e.target.value)}
                          placeholder="დამატებითი კომენტარი ხელით…"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400 bg-white"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Origin of the listing */}
                <div className="pt-5 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm mb-1">წყარო</h3>
                  <p className="text-slate-500 text-xs mb-3">
                    გარე ვებსაიტის ბმული — საჯარო გვერდზე და ადმინის სიაში Property ID-ს გვერდით გამოჩნდება გადასვლის ქმედება.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={form.sourceUrl}
                      onChange={e => set('sourceUrl', e.target.value)}
                      placeholder="https://www.myhome.ge/pr/..."
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-400"
                    />
                    {form.sourceUrl && (
                      <a
                        href={form.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <ExternalLink size={15} />
                        გახსნა
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="section-details" title="დეტალები & ფასი" desc="ფასი, ზომები, აღწერა და სხვა პარამეტრები" icon={FileText}>
              <div className="space-y-6">

                <div>
                  <label className={labelCls}>სათაური</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => {
                      const value = e.target.value;
                      setTitleManual(value.trim().length > 0);
                      set('title', value);
                    }}
                    className={inputCls}
                    placeholder="ივსება ავტომატურად — მაგ: 3-ოთახიანი ბინა ვაკეში"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    {isEdit
                      ? 'არსებული სათაური. შეგიძლია ხელით შეცვალო.'
                      : titleManual
                        ? 'ხელით შეცვლილია.'
                        : 'ივსება ტიპიდან, ოთახებიდან, რაიონიდან და გარიგების ტიპიდან.'}
                    {!isEdit && titleManual && (
                      <button
                        type="button"
                        onClick={() => {
                          setTitleManual(false);
                          set('title', autoTitle);
                        }}
                        className="ml-1 font-bold text-blue-600 hover:underline"
                      >
                        ავტომატურზე დაბრუნება
                      </button>
                    )}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-4">ფასი <span className="text-red-500">*</span></h3>
                  <div className="flex items-center gap-2 mb-4">
                    {['₾', '$'].map(c => (
                      <button key={c} type="button"
                        onClick={() => {
                          if (form.currency === c) return;
                          const from = formCurrencyToEntry(form.currency);
                          const to = formCurrencyToEntry(c);
                          const conv = (v: string) => {
                            const n = parseFloat(v);
                            if (!n) return v;
                            return String(convertEntryAmount(n, from, to, usdRate));
                          };
                          setForm(f => ({
                            ...f,
                            currency: c,
                            price: conv(f.price),
                            rentPrice: conv(f.rentPrice),
                            pricePerSqm: conv(f.pricePerSqm),
                            lifecycleDealPrice: conv(f.lifecycleDealPrice),
                          }));
                        }}
                        className={`w-10 h-10 rounded-xl border-2 font-bold text-base transition-all ${
                          form.currency === c ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >{c}</button>
                    ))}
                    <p className="text-[11px] text-slate-400 ml-1">
                      ფასი ფიქსირდება ამ ვალუტაში. მეორე ვალუტა მხოლოდ კურსით გამოჩნდება.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>
                        <DollarSign size={13} />
                        {sellsAndRents
                          ? 'გასაყიდი ფასი'
                          : form.dealTypes.includes('sale')
                            ? 'სრული ფასი'
                            : form.dealTypes.includes('daily_rent')
                              ? 'ქირა (დღიურად)'
                              : 'ქირა (თვეში)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={form.price}
                          onChange={e => {
                            const price = e.target.value;
                            setForm(f => {
                              const sqm = pricePerSqmOf(price, f.area);
                              return { ...f, price, pricePerSqm: sqm || f.pricePerSqm };
                            });
                          }}
                          className={`${inputCls} pr-8`} placeholder="250000" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{form.currency}</span>
                      </div>
                    </div>

                    {sellsAndRents && (
                      <div>
                        <label className={labelCls}><DollarSign size={13} /> ქირა (თვეში)</label>
                        <div className="relative">
                          <input type="number" value={form.rentPrice} onChange={e => set('rentPrice', e.target.value)}
                            className={`${inputCls} pr-8`} placeholder="1200" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{form.currency}</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className={labelCls}><Ruler size={13} /> კვ.მ ფასი</label>
                      <div className="relative">
                        <input type="number" value={form.pricePerSqm} onChange={e => set('pricePerSqm', e.target.value)}
                          className={`${inputCls} pr-8`} placeholder="1800" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{form.currency}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">ითვლება ავტომატურად: სრული ფასი ÷ ფართი</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <h3 className="font-bold text-slate-800 text-sm">ზომები</h3>

                      <div>
                        <label className={labelCls}><MoveHorizontal size={13} /> ფართი <span className="text-red-500">*</span></label>
                        <div className="relative max-w-[200px]">
                          <input
                            type="number"
                            value={form.area}
                            onChange={e => {
                              const area = e.target.value;
                              setForm(f => {
                                const sqm = pricePerSqmOf(f.price, area);
                                return { ...f, area, pricePerSqm: sqm || f.pricePerSqm };
                              });
                            }}
                            className={`${inputCls} pr-10`} placeholder="85" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">მ²</span>
                        </div>
                      </div>

                      {/* Rooms */}
                      {form.type !== 'land' && (
                        <div>
                          <label className={labelCls}><Bed size={13} /> ოთახები <span className="text-red-500">*</span></label>
                          <div className="flex flex-wrap gap-2">
                            {['1','2','3','4','5','6','7','8','9','10+'].map(r =>
                              chip(r, form.rooms === r, () => toggleSingle('rooms', r))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bedrooms — separate from the total room count */}
                      {form.type !== 'land' && (
                        <div>
                          <label className={labelCls}><Bed size={13} /> საძინებლების რაოდენობა</label>
                          <div className="flex flex-wrap gap-2">
                            {['1','2','3','4','5','6+'].map(b =>
                              chip(b, form.bedrooms === b, () => toggleSingle('bedrooms', b), '#8b5cf6')
                            )}
                          </div>
                        </div>
                      )}

                      {/* Floor */}
                      {form.type !== 'land' && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}><Layers size={13} /> სართული <span className="text-red-500">*</span></label>
                            <input type="number" value={form.floor} onChange={e => set('floor', e.target.value)} className={inputCls} placeholder="7" />
                          </div>
                          <div>
                            <label className={labelCls}><Building2 size={13} /> სართ. სულ</label>
                            <input type="number" value={form.totalFloors} onChange={e => set('totalFloors', e.target.value)} className={inputCls} placeholder="14" />
                          </div>
                        </div>
                      )}
                    </div>

                {(form.type === 'apartment' || form.type === 'house') && (
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-4">პროექტის ტიპი</h3>
                      <div className="flex flex-wrap gap-2">
                        {PROJECT_TYPES.map(p => chip(p, form.projectType === p, () => toggleSingle('projectType', p), '#f59e0b'))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-4">განლაგება</h3>
                      <div className="flex flex-wrap gap-2">
                        {LAYOUT_OPTIONS.map(l => chip(l, form.layout.includes(l), () => toggleArr('layout', l), '#0ea5e9'))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-5 pt-2 border-t border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">სხვა მახასიათებლები</h3>

                      {/* Wet point */}
                      <div>
                        <label className={labelCls}><Droplets size={13} /> სველი წერტილი</label>
                        <div className="flex gap-2">
                          {['1','2','3+'].map(w =>
                            chip(w, form.wetPoint === w, () => toggleSingle('wetPoint', w), '#2563eb')
                          )}
                        </div>
                      </div>

                      {/* Balcony count, veranda and loggia area — typed in by hand */}
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}>აივანი (რაოდენობა)</label>
                          <input type="number" value={form.balconyCount} onChange={e => set('balconyCount', e.target.value)} className={inputCls} placeholder="1" />
                        </div>
                        <div>
                          <label className={labelCls}>ვერანდა (მ²)</label>
                          <input type="number" value={form.verandaArea} onChange={e => set('verandaArea', e.target.value)} className={inputCls} placeholder="12" />
                        </div>
                        <div>
                          <label className={labelCls}>სათავსოს ფართი (მ²)</label>
                          <input type="number" value={form.storageArea} onChange={e => set('storageArea', e.target.value)} className={inputCls} placeholder="8" />
                        </div>
                      </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">აღწერა</h3>
                      <p className="text-slate-400 text-xs">ქართული ტექსტი ითარგმნება დანარჩენ ორ ენაზე</p>
                    </div>
                    {canTranslate && (
                      <button
                        type="button"
                        onClick={handleTranslate}
                        disabled={translating || !form.description.trim()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40"
                        style={{ background: '#7c3aed' }}
                      >
                        {translating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                        ავტომატური თარგმნა
                      </button>
                    )}
                  </div>

                  {translateError && (
                    <p className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                      {translateError}
                    </p>
                  )}

                  <div className="space-y-4">
                    {([
                      ['description',   'ქართული', 'დეტალური აღწერა ქართულ ენაზე...'],
                      ['descriptionEn', 'English', 'Detailed description in English...'],
                      ['descriptionRu', 'Русский', 'Подробное описание на русском...'],
                    ] as const).map(([key, label, placeholder]) => (
                      <div key={key}>
                        <label className={labelCls}>{label}</label>
                        <textarea
                          value={form[key]}
                          onChange={e => set(key, e.target.value)}
                          rows={key === 'description' ? 5 : 4}
                          placeholder={placeholder}
                          className={`${inputCls} resize-none`}
                          maxLength={3000}
                        />
                        <div className="text-right text-xs text-slate-400 mt-1">{form[key].length}/3000</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="section-location" title="მდებარეობა" desc="მოძებნეთ ან კარტაზე მონიშნეთ ლოკაცია" icon={MapPin}>
              <div className="space-y-5">
                <LocationPickerMap value={locationValue} onChange={applyLocation} height={360} />

                <div className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><MapPin size={12} /> ქალაქი</label>
                          <select value={form.city} onChange={e => handleCityChange(e.target.value)} className={inputCls}>
                            {CITY_AREAS.map(c =>
                              <option key={c.ka} value={c.ka}>{c.ka}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>რაიონი</label>
                          <DistrictCombobox
                            value={form.district}
                            options={[
                              ...(findCityArea(form.city)?.districts ?? []).map(d => ({ value: d.ka, label: d.ka })),
                              ...(form.district && !findCityArea(form.city)?.districts.some(d => d.ka === form.district)
                                ? [{ value: form.district, label: form.district }]
                                : []),
                            ]}
                            onChange={value => set('district', value)}
                            placeholder="აირჩიეთ ან ჩაწერეთ"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>ქუჩა</label>
                          <StreetSuggestInput
                            value={form.street}
                            city={form.city}
                            onChange={value => {
                              set('street', value);
                              set('address', formatStreetAddress(value, form.streetNumber));
                            }}
                            onPick={handleStreetPick}
                            placeholder="დაიწყეთ ქუჩის წერა — მაგ. ბერბუკის"
                          />
                        </div>
                        <div>
                          <label className={labelCls}>ქ. ნომერი</label>
                          <input
                            type="text"
                            value={form.streetNumber}
                            onChange={e => {
                              set('streetNumber', e.target.value);
                              set('address', formatStreetAddress(form.street, e.target.value));
                            }}
                            className={inputCls}
                            placeholder="12ა"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}><Hash size={12} /> საკადასტრო კოდი (არ. სავ.)</label>
                        <input type="text" value={form.cadastralCode} onChange={e => set('cadastralCode', e.target.value)}
                          className={inputCls} placeholder="01.13.15.123.456" />
                        <p className="text-xs text-slate-400 mt-1">კოდის ჩაწერა ზრდის განცხადების სანდოობას</p>
                      </div>

                      {/* Exact number goes public only for paid placements */}
                      <button
                        type="button"
                        onClick={() => set('showAddress', !form.showAddress)}
                        className="w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all"
                        style={form.showAddress
                          ? { background: '#ecfdf5', borderColor: '#10b981' }
                          : { background: '#fff', borderColor: '#e2e8f0' }}
                      >
                        <span
                          className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={form.showAddress
                            ? { background: '#10b981', borderColor: '#10b981' }
                            : { borderColor: '#cbd5e1' }}
                        >
                          {form.showAddress && <CheckCircle size={12} className="text-white" />}
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-slate-800">აჩვენე მისამართი</span>
                          <span className="block text-xs text-slate-500 mt-0.5">
                            ჩართულია — საიტზე გამოჩნდება ქუჩა და ნომერი. გამორთულია — მხოლოდ უბანი და ქუჩა.
                          </span>
                        </span>
                      </button>
                </div>
              </div>
            </FormSection>

            <FormSection id="section-features" title="მახასიათებლები" desc="პარკირება, გათბობა, ავეჯი და სხვა" icon={Wrench}>
              <div className="space-y-6">

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Car size={16} className="text-slate-600" />
                    <h3 className="font-bold text-slate-800 text-sm">პარკირება</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PARKING_OPTIONS.map(p => chip(p, form.parking.includes(p), () => toggleArr('parking', p), '#64748b'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame size={16} className="text-orange-500" />
                    <h3 className="font-bold text-slate-800 text-sm">გათბობა</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HEATING_OPTIONS.map(h => chip(h, form.heating.includes(h), () => toggleArr('heating', h), '#f97316'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplets size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">ცხელი წყალი</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HOT_WATER_OPTIONS.map(h => chip(h, form.hotWater.includes(h), () => toggleArr('hotWater', h), '#2563eb'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-yellow-500" />
                    <h3 className="font-bold text-slate-800 text-sm">ქონების მახასიათებლები</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_AMENITIES.map(a => chip(a, form.propertyAmenities.includes(a), () => toggleArr('propertyAmenities', a), '#eab308'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">ავეჯი და ტექნიკა</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FURNITURE_ITEMS.map(f => chip(f, form.furniture.includes(f), () => toggleArr('furniture', f), '#2563eb'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={16} className="text-teal-600" />
                    <h3 className="font-bold text-slate-800 text-sm">კორპ. / კომპლ. მახასიათ.</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BUILDING_FEATURES.map(b => chip(b, form.buildingFeatures.includes(b), () => toggleArr('buildingFeatures', b), '#0d9488'))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Star size={16} className="text-amber-500" />
                    <h3 className="font-bold text-slate-800 text-sm">ბეჯები</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BADGE_OPTIONS.map(b => {
                      const on = form.badges.includes(b.id);
                      return (
                        <button key={b.id} type="button" onClick={() => toggleArr('badges', b.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-bold transition-all ${
                            on ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                               : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <b.icon size={14} />
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="section-media" title="ფოტოგალერეა & კომენტარები" desc="რიგითობა, ჩამალვა და შიდა ჩანაწერები" icon={Sparkles}>
              <div className="space-y-6">

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">ფოტოგალერეა</h3>
                    {form.photos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { void downloadAllPhotos(); }}
                        disabled={photoDownloading}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {photoDownloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        ჩამოტვირთვა
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-xs mb-4">
                    გადაათრიეთ რიგითობის შესაცვლელად. მწვანე პწიჩკა — ჩანს საიტზე, წითელი — ჩამალულია.
                  </p>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={e => { void uploadPhotos(e.target.files); e.target.value = ''; }}
                  />

                  <div
                    onDragOver={e => { e.preventDefault(); setDropActive(true); }}
                    onDragLeave={() => setDropActive(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setDropActive(false);
                      void uploadPhotos(e.dataTransfer.files);
                    }}
                    onClick={() => photoInputRef.current?.click()}
                    className="mb-3 rounded-2xl border-2 border-dashed py-7 text-center cursor-pointer transition-colors"
                    style={{
                      borderColor: dropActive ? '#2563eb' : '#e2e8f0',
                      background: dropActive ? 'rgba(37,99,235,0.05)' : '#fafbfc',
                    }}
                  >
                    {uploading ? (
                      <Loader2 size={22} className="mx-auto text-blue-500 animate-spin" />
                    ) : (
                      <Upload size={22} className="mx-auto text-slate-300" />
                    )}
                    <p className="text-sm font-bold text-slate-600 mt-2">
                      {uploading ? 'იტვირთება...' : 'ჩააგდეთ ფოტოები აქ ან დააჭირეთ ასარჩევად'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP — მაქს. 12MB თითო</p>
                  </div>

                  {uploadError && (
                    <p className="text-xs font-semibold text-red-500 mb-3">{uploadError}</p>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <input
                      type="url"
                      value={photoDraft}
                      onChange={e => setPhotoDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhotos(photoDraft); } }}
                      onPaste={e => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted.includes('\n')) { e.preventDefault(); addPhotos(pasted); }
                      }}
                      placeholder="ფოტოს URL — Enter დასამატებლად (რამდენიმე ბმული ერთად ჩასვით)"
                      className={`${inputCls} flex-1 font-mono text-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => addPhotos(photoDraft)}
                      disabled={!photoDraft.trim()}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                      style={{ background: '#059669' }}
                    >
                      <ImageIcon size={15} />
                      დამატება
                    </button>
                  </div>

                  {form.photos.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center">
                      <ImageIcon size={26} className="mx-auto text-slate-200 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">ფოტო ჯერ არ არის</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                      {form.photos.map((photo, index) => (
                        <div
                          key={photo.url}
                          draggable
                          onDragStart={() => setDragIndex(index)}
                          onDragOver={e => e.preventDefault()}
                          onDrop={() => { if (dragIndex !== null) movePhoto(dragIndex, index); setDragIndex(null); }}
                          onDragEnd={() => setDragIndex(null)}
                          className={`group relative overflow-hidden rounded-2xl border-2 bg-slate-100 cursor-grab active:cursor-grabbing transition-all ${
                            dragIndex === index ? 'opacity-40 scale-[0.98]' : 'hover:-translate-y-0.5 hover:shadow-md'
                          }`}
                          style={{ borderColor: photo.hidden ? '#fca5a5' : '#bbf7d0' }}
                        >
                          <div className="relative aspect-[3/4] w-full">
                            <img
                              src={photo.url}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              style={photo.hidden ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined}
                            />
                          </div>

                          {index === 0 && !photo.hidden && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold shadow-sm">
                              მთავარი
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setForm(f => ({
                              ...f,
                              photos: f.photos.map((p, i) => (i === index ? { ...p, hidden: !p.hidden } : p)),
                            }))}
                            title={photo.hidden ? 'საიტზე გამოჩენა' : 'ჩამალვა საიტიდან'}
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
                            style={{ background: photo.hidden ? '#ef4444' : '#10b981' }}
                          >
                            <CheckCircle size={14} />
                          </button>

                          <div className="absolute bottom-0 inset-x-0 flex items-center gap-1 p-2 bg-gradient-to-t from-black/80 via-black/55 to-transparent pt-8">
                            <button
                              type="button"
                              onClick={() => movePhoto(index, index - 1)}
                              disabled={index === 0}
                              className="w-7 h-7 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center disabled:opacity-30"
                              title="წინ"
                            >
                              <ArrowLeft size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePhoto(index, index + 1)}
                              disabled={index === form.photos.length - 1}
                              className="w-7 h-7 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center disabled:opacity-30"
                              title="უკან"
                            >
                              <ArrowLeft size={13} className="rotate-180" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { void downloadListingPhoto(photo.url, listingPhotoFilename(photo.url, index, id)); }}
                              className="w-7 h-7 rounded-lg bg-white/95 text-slate-700 flex items-center justify-center"
                              title="ჩამოტვირთვა"
                            >
                              <Download size={13} />
                            </button>
                            <span className="ml-auto px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-bold tabular-nums">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== index) }))}
                              className="w-7 h-7 rounded-lg bg-white/95 text-red-500 flex items-center justify-center"
                              title="წაშლა"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 mt-3">
                    ფოტოები — Cloudinary CDN; ხელშეკრულების PDF — სერვერზე (მხოლოდ ადმინი). გარე ბმულიც მუშაობს.
                  </p>
                </div>

                {/* Internal comments — never leave the admin */}
                {canNotes && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">შიდა კომენტარები</h3>
                  </div>
                  <p className="text-slate-400 text-xs mb-4">
                    თითო კომენტარი ინახება ცალკე — ჩანს მხოლოდ ადმინში.
                  </p>
                  <textarea
                    value={form.internalNote}
                    onChange={e => set('internalNote', e.target.value)}
                    rows={3}
                    placeholder="ახალი კომენტარი..."
                    className={`${inputCls} resize-none`}
                  />
                  <div className="mt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => { void saveInternalComment(); }}
                      disabled={noteSaving || !form.internalNote.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                      {noteSaving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                      შენახვა
                    </button>
                    {noteError ? <p className="text-[11px] font-semibold text-red-500">{noteError}</p> : null}
                  </div>

                  {savedNotes.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {savedNotes.map(note => (
                        <div key={note.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-slate-400">
                              {new Date(note.createdAt).toLocaleString('ka-GE')}{note.author ? ` · ${note.author}` : ''}
                            </span>
                            <button
                              type="button"
                              onClick={() => { void removeInternalComment(note.id); }}
                              className="ml-auto text-[10px] font-bold text-slate-300 hover:text-red-500"
                            >
                              წაშლა
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </div>
            </FormSection>
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <div className={`${cardCls} p-4`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">სექციები</p>
                <nav className="space-y-1">
                  {SECTION_NAV.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => scrollToSection(s.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <s.icon size={14} className="text-blue-600 flex-shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </nav>
              </div>

              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">პრევიუ</p>
              <div className={`${cardCls} overflow-hidden`}>
                {coverPhoto ? (
                  <div className="aspect-[4/3] bg-slate-100">
                    <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-slate-100 flex flex-col items-center justify-center gap-2">
                    <ImageIcon size={28} className="text-slate-300" />
                    <p className="text-xs text-slate-400">ფოტო არ არის</p>
                  </div>
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${selectedType.color}18`, color: selectedType.color }}>
                        {selectedType.label}
                      </span>
                    )}
                    {form.dealTypes.map(deal => (
                      <span key={deal} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: deal === 'sale' ? '#f59e0b18' : '#10B98118', color: deal === 'sale' ? '#f59e0b' : '#10B981' }}>
                        {DEAL_TYPES.find(d => d.id === deal)?.label ?? deal}
                      </span>
                    ))}
                    {form.isPremium  && <Crown  size={13} className="text-amber-500" />}
                    {form.isFeatured && <Star   size={13} className="text-blue-600"  />}
                    {form.isNew      && <Zap    size={13} className="text-emerald-500" />}
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm leading-snug">
                    {form.title || (form.rooms ? `${form.rooms}-ოთახ. ${selectedType?.label ?? ''}` : selectedType?.label ?? 'სათაური...')}
                  </h3>

                  {form.price && (
                    <div>
                      <p className="text-lg font-extrabold text-slate-800">
                        {Number(form.price).toLocaleString('ka-GE')} {form.currency}
                        {!form.dealTypes.includes('sale') && (
                          <span className="text-sm font-normal text-slate-500">
                            {form.dealTypes.includes('daily_rent') ? '/დღ.' : '/თვ.'}
                          </span>
                        )}
                      </p>
                      {sellsAndRents && form.rentPrice && (
                        <p className="text-sm font-bold text-emerald-600">
                          ქირა {Number(form.rentPrice).toLocaleString('ka-GE')} {form.currency}
                          <span className="font-normal text-slate-500">/თვ.</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {form.area     && <span className="flex items-center gap-1"><Ruler size={11} />{form.area} მ²</span>}
                    {form.rooms    && <span className="flex items-center gap-1"><Bed   size={11} />{form.rooms} ოთ.</span>}
                    {form.floor    && <span className="flex items-center gap-1"><Layers size={11} />{form.floor}{form.totalFloors ? `/${form.totalFloors}` : ''}</span>}
                  </div>

                  {(form.street || form.district || form.city) && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={11} className="text-blue-600 flex-shrink-0" />
                      {[form.street, form.district, form.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {form.condition && (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold">{form.condition}</span>
                  )}

                  {(form.buildingFeatures.length + form.furniture.length + form.parking.length) > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[...form.buildingFeatures, ...form.furniture, ...form.parking].slice(0, 4).map(f => (
                        <span key={f} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { label: 'ოთახი',   value: form.rooms || '—' },
                  { label: 'ფართი',   value: form.area ? `${form.area}მ²` : '—' },
                  { label: 'სართ.',   value: form.floor || '—' },
                  { label: 'ფოტო',    value: form.photos.length || '—' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-xs text-slate-400">{s.label}</p>
                    <p className="font-bold text-slate-700 text-sm mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className={`${cardCls} p-4 space-y-3`}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">მოქმედებები</p>
                <div className="flex flex-col gap-2">
                  {actionButtons}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky actions */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 flex items-center gap-2 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.08)' }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin?section=properties')}
          className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 flex gap-2">
          {actionButtons}
        </div>
      </div>
    </AdminLayout>
  );
}
