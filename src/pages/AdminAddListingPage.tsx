import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Building2, Home, Store, TreePine, Hotel,
  DollarSign, Ruler, Bed, Layers, Calendar, MapPin,
  Image as ImageIcon, Sparkles, Star, Zap, User, Phone, Mail,
  CheckCircle, Loader2, Crown, Key, FileText, Wrench,
  Flame, Droplets, HardHat, Car, Link2, BadgeCheck,
  Hash, Package, MoveHorizontal, PlayCircle,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import LocationPickerMap, { type LocationValue } from '../components/LocationPickerMap';

/* ─── Step definitions ───────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'ტიპი',        icon: Building2  },
  { id: 2, label: 'დეტალები',    icon: FileText   },
  { id: 3, label: 'მდებარეობა',  icon: MapPin     },
  { id: 4, label: 'მახასიათ.',   icon: Wrench     },
  { id: 5, label: 'გამოქვ.',     icon: Sparkles   },
];

/* ─── Constants ──────────────────────────────────────────── */
const PROPERTY_TYPES = [
  { id: 'apartment',  label: 'ბინა',            icon: Building2, color: '#497cff' },
  { id: 'house',      label: 'კერძო სახლი',     icon: Home,      color: '#10B981' },
  { id: 'villa',      label: 'აგარაკი',         icon: Home,      color: '#ec4899' },
  { id: 'land',       label: 'მიწის ნაკვეთი',   icon: TreePine,  color: '#8b5cf6' },
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
  'ლენინური', 'ხრუშოვკა', 'სტალინური', 'ქართული', 'მოზაიკური',
  'ულტრა ახალი', 'ხის სახლი', 'ბლოკური', 'პანელური', 'სხვა',
];

const PARKING_OPTIONS = [
  'ავტოფარეხი', 'პარკინგის ადგილი', 'ეზოს პარკინგი',
  'მიწისქვეშა პარკინგი', 'ფასიანი ავტოსადგომი', 'პარკინგის გარეშე',
];

const HEATING_OPTIONS = [
  'ცენტრალური გათბობა', 'გაზის გამათბობელი', 'დენის გამათბობელი',
  'ცენტ.+იატაკის გათბობა', 'გათბობის გარეშე', 'ინდივიდუალური', 'იატაკის გათბობა',
];

const HOT_WATER_OPTIONS = [
  'გაზის გამაცხელებელი', 'ავზი', 'დენის გამაცხელებელი', 'მზის გამათბობელი',
  'ცხელი წყლის გარეშე', 'ცენტ. ცხელი წყალი', 'ბუნებ. ცხელი წყალი', 'ინდივიდუალური',
];

const BUILDING_MATERIALS = ['ბლოკი', 'აგური', 'ხის მასალა', 'რკინა-ბეტონი', 'კომბინირებული'];

const WINDOW_MATERIALS = ['ხე', 'პლასტმასა', 'ალუმინი'];

const FURNITURE_ITEMS = [
  'ავეჯი', 'სანოლი', 'დივანი', 'მაგიდა', 'სკამები',
  'ქურა (გაზ/ელ)', 'ღუმელი', 'კონდიციონერი', 'მაცივარი',
  'სარეცხი მანქანა', 'ჭ. სარეცხი მანქანა', 'ტელევიზია',
];

const PROPERTY_AMENITIES = [
  'ინტერნეტი', 'ტელევიზია', 'ბუნებრივი აირი', 'ბუხარი', 'მისაბმელი ადგ.',
  'წყალი', 'კანალიზაცია', 'ელექტ-ენერგია', 'ტელეფონი',
  'სამზარეულო + ტექნიკა', 'სასტავლოს ტიპი',
];

const BUILDING_FEATURES = [
  'სპა', 'ლიფტი', 'სატვ. ლიფტი', 'ბარი', 'სპ. დარბაზი',
  'მაყ./გრილი', 'ჭაკუში', 'სახ. სისტემა', 'შლაგბაუმი', 'კონსიერჟი',
  'დახ. აუზი', 'ღია აუზი', 'საუნა', 'სიგნალიზაცია', 'ვენტილაცია', 'დაცვა',
];

const BADGE_OPTIONS = [
  { id: 'key_code',    label: 'კარი კოდით',         icon: Key         },
  { id: 'airbnb',      label: 'Airbnb/Booking ექ.', icon: Link2       },
  { id: 'investment',  label: 'საინვესტიციო',        icon: TrendingUp  },
  { id: 'accessible',  label: 'სსსმ',                icon: BadgeCheck  },
];

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
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white';
const cardCls  = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
const labelCls = 'flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide';
const sectionTitle = 'text-sm font-bold text-slate-700 mb-3';


/* ─── Form state ─────────────────────────────────────────── */
interface FormState {
  /* core */
  title: string; description: string;
  type: string; dealType: string;
  buildingStatus: string; condition: string;
  /* price */
  price: string; pricePerSqm: string; currency: string;
  /* dimensions */
  area: string; rooms: string; bedrooms: string; bathrooms: string;
  floor: string; totalFloors: string;
  /* detail */
  projectType: string; yearBuilt: string; yearBuiltCategory: string;
  ceilingHeight: string;
  wetPoint: string;
  balconyCount: string; balconyArea: string;
  verandaArea: string; loggiaArea: string; waitingArea: string;
  livingRoomType: string; livingRoomArea: string;
  storageType: string; storageArea: string;
  /* location */
  city: string; district: string; address: string;
  street: string; streetNumber: string; cadastralCode: string;
  lat: number; lng: number;
  /* features */
  parking: string[]; heating: string[]; hotWater: string[];
  buildingMaterials: string[]; windowsMaterials: string[];
  furniture: string[]; propertyAmenities: string[];
  buildingFeatures: string[]; badges: string[];
  amenities: string[]; features: string[];
  /* media */
  images: string; youtubeUrl: string; matterportUrl: string;
  /* agent */
  agentName: string; agentPhone: string; agentEmail: string;
  /* flags */
  isPremium: boolean; isFeatured: boolean; isNew: boolean;
}

const defaultForm: FormState = {
  title: '', description: '', type: 'apartment', dealType: 'sale',
  buildingStatus: '', condition: '',
  price: '', pricePerSqm: '', currency: '₾',
  area: '', rooms: '', bedrooms: '', bathrooms: '',
  floor: '', totalFloors: '',
  projectType: '', yearBuilt: '', yearBuiltCategory: '',
  ceilingHeight: '', wetPoint: '',
  balconyCount: '', balconyArea: '', verandaArea: '', loggiaArea: '', waitingArea: '',
  livingRoomType: '', livingRoomArea: '', storageType: '', storageArea: '',
  city: 'თბილისი', district: '', address: '',
  street: '', streetNumber: '', cadastralCode: '',
  lat: 41.7151, lng: 44.8271,
  parking: [], heating: [], hotWater: [],
  buildingMaterials: [], windowsMaterials: [],
  furniture: [], propertyAmenities: [], buildingFeatures: [], badges: [],
  amenities: [], features: [],
  images: '', youtubeUrl: '', matterportUrl: '',
  agentName: '', agentPhone: '', agentEmail: '',
  isPremium: false, isFeatured: false, isNew: true,
};

/* ─── Main component ─────────────────────────────────────── */
export default function AdminAddListingPage() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const { user, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState<FormState>(defaultForm);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      try {
        const data = await api(`/properties/${id}`);
        const coords = data.coordinates as { lat: number; lng: number } | null;
        setForm(prev => ({
          ...prev,
          title:      data.title || '',
          description: data.description || '',
          price:      String(data.price || ''),
          pricePerSqm: String(data.pricePerSqm || ''),
          area:       String(data.area || ''),
          type:       data.type || 'apartment',
          dealType:   data.status || 'sale',
          bedrooms:   String(data.bedrooms || ''),
          bathrooms:  String(data.bathrooms || ''),
          floor:      String(data.floor || ''),
          totalFloors: String(data.totalFloors || ''),
          yearBuilt:  String(data.yearBuilt || ''),
          city:       data.city || 'თბილისი',
          district:   data.district || '',
          address:    data.address || '',
          lat:        coords?.lat ?? 41.7151,
          lng:        coords?.lng ?? 44.8271,
          images:     Array.isArray(data.images) ? data.images.join('\n') : '',
          amenities:  Array.isArray(data.amenities) ? data.amenities : [],
          features:   Array.isArray(data.features) ? data.features : [],
          agentName:  data.agentName || '',
          agentPhone: data.agentPhone || '',
          agentEmail: data.agentEmail || '',
          isPremium:  Boolean(data.isPremium),
          isFeatured: Boolean(data.isFeatured),
          isNew:      data.isNew !== undefined ? Boolean(data.isNew) : true,
        }));
      } catch { setError('განცხადების ჩატვირთვა ვერ მოხერხდა'); }
      finally  { setLoading(false); }
    })();
  }, [isEdit, id, user, api]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function toggleSingle(key: 'condition' | 'buildingStatus' | 'dealType' | 'wetPoint' | 'yearBuiltCategory' | 'projectType' | 'rooms', val: string) {
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
    address: form.address, city: form.city, district: form.district,
  };
  function handleLocationChange(loc: LocationValue) {
    setForm(f => ({ ...f, lat: loc.lat, lng: loc.lng, address: loc.address, city: loc.city, district: loc.district }));
  }

  function canProceed() {
    if (step === 1) return form.type && form.dealType;
    if (step === 2) return form.price.trim() !== '';
    if (step === 3) return true;
    if (step === 4) return true;
    return true;
  }

  async function handleSubmit() {
    if (!form.price) return;
    setSaving(true); setError('');
    try {
      const allFeatures = [
        ...form.features,
        ...form.buildingMaterials.map(m => `მასალა: ${m}`),
        ...form.windowsMaterials.map(w => `კარ-ფანჯ: ${w}`),
        ...form.buildingFeatures,
        ...form.badges,
        form.condition, form.buildingStatus, form.projectType,
        form.yearBuiltCategory ? `წელი: ${form.yearBuiltCategory}` : '',
      ].filter(Boolean);

      const allAmenities = [
        ...form.amenities,
        ...form.parking,
        ...form.heating,
        ...form.hotWater,
        ...form.furniture,
        ...form.propertyAmenities,
      ].filter(Boolean);

      const payload = {
        title:        form.title || `${form.type === 'apartment' ? 'ბინა' : 'ქონება'} ${form.rooms ? `${form.rooms}-ოთახ.` : ''} ${form.district}`.trim(),
        description:  form.description,
        price:        parseFloat(form.price) || 0,
        pricePerSqm:  parseFloat(form.pricePerSqm) || null,
        area:         parseFloat(form.area) || null,
        type:         form.type,
        status:       form.dealType === 'sale' ? 'sale' : 'rent',
        bedrooms:     parseInt(form.rooms || form.bedrooms) || 0,
        bathrooms:    parseInt(form.bathrooms || form.wetPoint) || 0,
        floor:        parseInt(form.floor) || null,
        totalFloors:  parseInt(form.totalFloors) || null,
        yearBuilt:    parseInt(form.yearBuilt) || null,
        city:         form.city,
        district:     form.district,
        address:      [form.street, form.streetNumber, form.address].filter(Boolean).join(', ') || form.address,
        coordinates:  { lat: form.lat, lng: form.lng },
        images:       form.images.split('\n').map(s => s.trim()).filter(Boolean),
        amenities:    allAmenities,
        features:     allFeatures,
        agentName:    form.agentName,
        agentPhone:   form.agentPhone,
        agentEmail:   form.agentEmail,
        isPremium:    form.isPremium,
        isFeatured:   form.isFeatured,
        isNew:        form.isNew,
      };

      if (isEdit) {
        await api(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/properties', { method: 'POST', body: JSON.stringify(payload) });
      }
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'შეცდომა');
    } finally {
      setSaving(false);
    }
  }

  const selectedType = PROPERTY_TYPES.find(t => t.id === form.type);
  const firstImg     = form.images.split('\n').find(l => l.trim().startsWith('http'));

  if (authLoading || !user) return null;
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 size={32} className="text-blue-600 animate-spin" />
    </div>
  );

  /* ── Chip button helper ── */
  const chip = (label: string, active: boolean, onClick: () => void, color = '#497cff') => (
    <button key={label} type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
        active ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >{label}</button>
  );

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="container-xl py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-sm font-semibold transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">უკან</span>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-slate-800 font-extrabold text-base sm:text-lg truncate">
              {isEdit ? 'განცხადების რედაქტირება' : 'ახალი განცხადება'}
            </h1>
            <p className="text-slate-400 text-xs">ნაბიჯი {step} / {STEPS.length}</p>
          </div>

          {/* Step pills */}
          <div className="hidden lg:flex items-center gap-1.5">
            {STEPS.map(s => {
              const done   = s.id < step;
              const active = s.id === step;
              return (
                <button key={s.id}
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    active ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : done  ? 'bg-blue-50 text-blue-700 border-blue-100 cursor-pointer hover:bg-blue-100'
                            : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {done ? <CheckCircle size={13} /> : <s.icon size={13} />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile progress */}
        <div className="lg:hidden h-1 bg-slate-100">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / STEPS.length) * 100}%` }} />
        </div>
      </header>

      <div className="container-xl py-6 sm:py-8">
        <div className="grid lg:grid-cols-[1fr_290px] gap-6 lg:gap-8">

          {/* ─── Main form ─── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              >

                {/* ══════════════ STEP 1: Type ══════════════ */}
                {step === 1 && (
                  <div className="space-y-5">

                    {/* Property type */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-1">უძრავი ქონების ტიპი <span className="text-red-500">*</span></h2>
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
                    </div>

                    {/* Deal type */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-4">გარიგების ტიპი <span className="text-red-500">*</span></h2>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {DEAL_TYPES.map(d => {
                          const on = form.dealType === d.id;
                          return (
                            <button key={d.id} type="button" onClick={() => set('dealType', d.id)}
                              className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                                on ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                   : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                              }`}
                            >{d.label}</button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Building status */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-4">სტატუსი <span className="text-red-500">*</span></h2>
                      <div className="grid grid-cols-3 gap-3">
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

                    {/* Condition */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-4">მდგომარეობა <span className="text-red-500">*</span></h2>
                      <div className="flex flex-wrap gap-2">
                        {CONDITIONS.map(c => chip(c, form.condition === c, () => toggleSingle('condition', c), '#8b5cf6'))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════ STEP 2: Details ══════════════ */}
                {step === 2 && (
                  <div className="space-y-5">

                    {/* Price */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-5">ფასი <span className="text-red-500">*</span></h2>

                      {/* Currency toggle */}
                      <div className="flex items-center gap-2 mb-4">
                        {['₾', '$'].map(c => (
                          <button key={c} type="button" onClick={() => set('currency', c)}
                            className={`w-10 h-10 rounded-xl border-2 font-bold text-base transition-all ${
                              form.currency === c ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 bg-white text-slate-600'
                            }`}
                          >{c}</button>
                        ))}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><DollarSign size={13} /> სრული ფასი</label>
                          <div className="relative">
                            <input type="number" value={form.price} onChange={e => set('price', e.target.value)}
                              className={`${inputCls} pr-8`} placeholder="250000" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{form.currency}</span>
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}><Ruler size={13} /> კვ.მ ფასი</label>
                          <div className="relative">
                            <input type="number" value={form.pricePerSqm} onChange={e => set('pricePerSqm', e.target.value)}
                              className={`${inputCls} pr-8`} placeholder="1800" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">{form.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Area & Dimensions */}
                    <div className={`${cardCls} p-6 space-y-5`}>
                      <h2 className="font-extrabold text-slate-800 text-lg">ზომები</h2>

                      <div>
                        <label className={labelCls}><MoveHorizontal size={13} /> ფართი <span className="text-red-500">*</span></label>
                        <div className="relative max-w-[200px]">
                          <input type="number" value={form.area} onChange={e => set('area', e.target.value)}
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

                    {/* Project type */}
                    {(form.type === 'apartment' || form.type === 'house') && (
                      <div className={`${cardCls} p-6`}>
                        <h2 className="font-extrabold text-slate-800 text-lg mb-4">პროექტის ტიპი <span className="text-red-500">*</span></h2>
                        <div className="flex flex-wrap gap-2">
                          {PROJECT_TYPES.map(p => chip(p, form.projectType === p, () => toggleSingle('projectType', p), '#f59e0b'))}
                        </div>
                      </div>
                    )}

                    {/* Extra dimensions */}
                    <div className={`${cardCls} p-6 space-y-5`}>
                      <h2 className="font-extrabold text-slate-800 text-lg">სხვა მახასიათებლები</h2>

                      {/* Wet point */}
                      <div>
                        <label className={labelCls}><Droplets size={13} /> სველი წერტილი</label>
                        <div className="flex gap-2">
                          {['1','2','3+','საერთო'].map(w =>
                            chip(w, form.wetPoint === w, () => toggleSingle('wetPoint', w), '#0ea5e9')
                          )}
                        </div>
                      </div>

                      {/* Balcony */}
                      <div>
                        <p className={sectionTitle}>აივანი</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>რ-ნობა</label>
                            <input type="number" value={form.balconyCount} onChange={e => set('balconyCount', e.target.value)} className={inputCls} placeholder="1" />
                          </div>
                          <div>
                            <label className={labelCls}>ფართი (მ²)</label>
                            <input type="number" value={form.balconyArea} onChange={e => set('balconyArea', e.target.value)} className={inputCls} placeholder="8" />
                          </div>
                        </div>
                      </div>

                      {/* Veranda / Loggia */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>ვერანდა (მ²)</label>
                          <input type="number" value={form.verandaArea} onChange={e => set('verandaArea', e.target.value)} className={inputCls} placeholder="12" />
                        </div>
                        <div>
                          <label className={labelCls}>ლოჯია (მ²)</label>
                          <input type="number" value={form.loggiaArea} onChange={e => set('loggiaArea', e.target.value)} className={inputCls} placeholder="6" />
                        </div>
                      </div>

                      {/* Waiting + ceiling */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>მოსაცდელი სივ. (მ²)</label>
                          <input type="number" value={form.waitingArea} onChange={e => set('waitingArea', e.target.value)} className={inputCls} placeholder="4" />
                        </div>
                        <div>
                          <label className={labelCls}><Hash size={12} /> ჭერის სიმაღლე (მ)</label>
                          <input type="number" step="0.1" value={form.ceilingHeight} onChange={e => set('ceilingHeight', e.target.value)} className={inputCls} placeholder="2.80" />
                        </div>
                      </div>

                      {/* Year built */}
                      <div>
                        <label className={labelCls}><Calendar size={13} /> აშენების წელი</label>
                        <div className="flex gap-2 mb-2">
                          {['<1955','1955-2000','>2000'].map(y =>
                            chip(y, form.yearBuiltCategory === y, () => {
                              toggleSingle('yearBuiltCategory', y);
                              if (form.yearBuiltCategory !== y) {
                                const year = y === '<1955' ? '1950' : y === '>2000' ? '2010' : '1975';
                                set('yearBuilt', year);
                              }
                            }, '#10B981')
                          )}
                        </div>
                        <input type="number" value={form.yearBuilt} onChange={e => set('yearBuilt', e.target.value)}
                          className={`${inputCls} max-w-[180px]`} placeholder="2018" />
                      </div>

                      {/* Living room */}
                      <div>
                        <p className={sectionTitle}>მისაღები</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>ტიპი</label>
                            <select value={form.livingRoomType} onChange={e => set('livingRoomType', e.target.value)} className={inputCls}>
                              <option value="">— აირჩიეთ —</option>
                              {['სტუდიო','ოთახი','ოთახი + სამზარ.','ღია სივრცე'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>ფართი (მ²)</label>
                            <input type="number" value={form.livingRoomArea} onChange={e => set('livingRoomArea', e.target.value)} className={inputCls} placeholder="25" />
                          </div>
                        </div>
                      </div>

                      {/* Storage */}
                      <div>
                        <p className={sectionTitle}>სათავსო</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>ტიპი</label>
                            <select value={form.storageType} onChange={e => set('storageType', e.target.value)} className={inputCls}>
                              <option value="">— აირჩიეთ —</option>
                              {['სარდაფი','სახ. სათავსო','ეზოს სათ.','სხვა'].map(v => <option key={v}>{v}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>ფართი (მ²)</label>
                            <input type="number" value={form.storageArea} onChange={e => set('storageArea', e.target.value)} className={inputCls} placeholder="8" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-1">აღწერა <span className="text-red-500">*</span></h2>
                      <p className="text-slate-400 text-xs mb-4">მაქსიმუმ 3000 სიმბოლო</p>
                      <textarea value={form.description} onChange={e => set('description', e.target.value)}
                        rows={5} placeholder="დეტალური აღწერა ქართულ ენაზე..."
                        className={`${inputCls} resize-none`}
                        maxLength={3000}
                      />
                      <div className="text-right text-xs text-slate-400 mt-1">{form.description.length}/3000</div>
                    </div>
                  </div>
                )}

                {/* ══════════════ STEP 3: Location ══════════════ */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-1">მდებარეობა <span className="text-red-500">*</span></h2>
                      <p className="text-slate-500 text-sm mb-5">მოძებნეთ ან კარტაზე მონიშნეთ</p>
                      <LocationPickerMap value={locationValue} onChange={handleLocationChange} height={360} />
                    </div>

                    <div className={`${cardCls} p-6 space-y-4`}>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}><MapPin size={12} /> ქალაქი</label>
                          <select value={form.city} onChange={e => set('city', e.target.value)} className={inputCls}>
                            {['თბილისი','ბათუმი','ქუთაისი','რუსთავი','გორი','ზუგდიდი','ფოთი','მცხეთა','სიღნაღი','ბორჯომი'].map(c =>
                              <option key={c}>{c}</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>რაიონი</label>
                          <input type="text" value={form.district} onChange={e => set('district', e.target.value)} className={inputCls} placeholder="ვაკე" />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>ქუჩა</label>
                          <input type="text" value={form.street} onChange={e => set('street', e.target.value)} className={inputCls} placeholder="ჩიქოვანის ქ." />
                        </div>
                        <div>
                          <label className={labelCls}>ქ. ნომერი</label>
                          <input type="text" value={form.streetNumber} onChange={e => set('streetNumber', e.target.value)} className={inputCls} placeholder="12ა" />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}><Hash size={12} /> საკადასტრო კოდი (არ. სავ.)</label>
                        <input type="text" value={form.cadastralCode} onChange={e => set('cadastralCode', e.target.value)}
                          className={inputCls} placeholder="01.13.15.123.456" />
                        <p className="text-xs text-slate-400 mt-1">კოდის ჩაწერა ზრდის განცხადების სანდოობას</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════ STEP 4: Features ══════════════ */}
                {step === 4 && (
                  <div className="space-y-5">

                    {/* Parking */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Car size={18} className="text-slate-600" />
                        <h2 className="font-extrabold text-slate-800 text-lg">პარკირება</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PARKING_OPTIONS.map(p => chip(p, form.parking.includes(p), () => toggleArr('parking', p), '#64748b'))}
                      </div>
                    </div>

                    {/* Heating */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Flame size={18} className="text-orange-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">გათბობა</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {HEATING_OPTIONS.map(h => chip(h, form.heating.includes(h), () => toggleArr('heating', h), '#f97316'))}
                      </div>
                    </div>

                    {/* Hot water */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Droplets size={18} className="text-blue-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">ცხელი წყალი</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {HOT_WATER_OPTIONS.map(h => chip(h, form.hotWater.includes(h), () => toggleArr('hotWater', h), '#0ea5e9'))}
                      </div>
                    </div>

                    {/* Building materials */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <HardHat size={18} className="text-amber-600" />
                        <h2 className="font-extrabold text-slate-800 text-lg">სამშენებლო მასალა</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BUILDING_MATERIALS.map(m => chip(m, form.buildingMaterials.includes(m), () => toggleArr('buildingMaterials', m), '#d97706'))}
                      </div>
                    </div>

                    {/* Windows */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Package size={18} className="text-slate-600" />
                        <h2 className="font-extrabold text-slate-800 text-lg">კარ-ფანჯარა</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {WINDOW_MATERIALS.map(w => chip(w, form.windowsMaterials.includes(w), () => toggleArr('windowsMaterials', w), '#475569'))}
                      </div>
                    </div>

                    {/* Property amenities */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Zap size={18} className="text-yellow-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">ქონების მახასიათებლები</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {PROPERTY_AMENITIES.map(a => chip(a, form.propertyAmenities.includes(a), () => toggleArr('propertyAmenities', a), '#eab308'))}
                      </div>
                    </div>

                    {/* Furniture & appliances */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Wrench size={18} className="text-indigo-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">ავეჯი და ტექნიკა</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {FURNITURE_ITEMS.map(f => chip(f, form.furniture.includes(f), () => toggleArr('furniture', f), '#6366f1'))}
                      </div>
                    </div>

                    {/* Building features */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 size={18} className="text-teal-600" />
                        <h2 className="font-extrabold text-slate-800 text-lg">კორპ. / კომპლ. მახასიათ.</h2>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BUILDING_FEATURES.map(b => chip(b, form.buildingFeatures.includes(b), () => toggleArr('buildingFeatures', b), '#0d9488'))}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-4">
                        <Star size={18} className="text-amber-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">ბეჯები</h2>
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
                )}

                {/* ══════════════ STEP 5: Media & Publish ══════════════ */}
                {step === 5 && (
                  <div className="space-y-5">

                    {/* Photos */}
                    <div className={`${cardCls} p-6`}>
                      <div className="flex items-center gap-2 mb-2">
                        <ImageIcon size={18} className="text-blue-500" />
                        <h2 className="font-extrabold text-slate-800 text-lg">ფოტოგალერეა <span className="text-red-500">*</span></h2>
                      </div>
                      <p className="text-slate-400 text-xs mb-4">სურათების URL — თითო ხაზზე (მაქს. 16)</p>
                      <textarea value={form.images} onChange={e => set('images', e.target.value)}
                        rows={5} placeholder="https://images.unsplash.com/..."
                        className={`${inputCls} resize-none font-mono text-xs`}
                      />
                      {firstImg && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {form.images.split('\n').filter(l => l.trim().startsWith('http')).slice(0, 8).map((url, i) => (
                            <img key={i} src={url.trim()} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 border border-slate-200" />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Links */}
                    <div className={`${cardCls} p-6 space-y-4`}>
                      <h2 className="font-extrabold text-slate-800 text-lg">ბმულები</h2>
                      <div>
                        <label className={labelCls}><PlayCircle size={13} className="text-red-500" /> YouTube-ის ბმული</label>
                        <input type="url" value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)}
                          className={inputCls} placeholder="https://youtube.com/watch?v=..." />
                      </div>
                      <div>
                        <label className={labelCls}><Link2 size={13} /> Matterport-ის ბმული</label>
                        <input type="url" value={form.matterportUrl} onChange={e => set('matterportUrl', e.target.value)}
                          className={inputCls} placeholder="https://my.matterport.com/show/..." />
                      </div>
                    </div>

                    {/* Contact */}
                    <div className={`${cardCls} p-6 space-y-4`}>
                      <h2 className="font-extrabold text-slate-800 text-lg">საკონტაქტო ინფ. <span className="text-red-500">*</span></h2>
                      <div className="grid sm:grid-cols-3 gap-4">
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
                      </div>
                    </div>

                    {/* Publication flags */}
                    <div className={`${cardCls} p-6`}>
                      <h2 className="font-extrabold text-slate-800 text-lg mb-4">სტიკერები & გამოქვ.</h2>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {([
                          { key: 'isPremium'  as const, label: 'VIP / პრემიუმი', icon: Crown,  color: '#f59e0b', desc: 'ოქროს ბეიჯი'     },
                          { key: 'isFeatured' as const, label: 'გამორჩეული',     icon: Star,   color: '#497cff', desc: 'მთ. გვ. ბანერი'  },
                          { key: 'isNew'      as const, label: 'ახალი',           icon: Zap,    color: '#10B981', desc: 'NEW ბეიჯი'       },
                        ]).map(opt => {
                          const on = form[opt.key];
                          return (
                            <button key={opt.key} type="button" onClick={() => set(opt.key, !on)}
                              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                                on ? 'shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                              style={on ? { background: `${opt.color}12`, borderColor: opt.color } : {}}
                            >
                              <opt.icon size={20} style={{ color: on ? opt.color : '#94a3b8' }} />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{opt.label}</p>
                                <p className="text-xs text-slate-500">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {error && (
                      <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Nav buttons */}
            <div className={`${cardCls} flex items-center justify-between mt-6 px-5 py-4`}>
              <button type="button"
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                <ArrowLeft size={16} />
                {step === 1 ? 'გაუქმება' : 'უკან'}
              </button>

              {step < STEPS.length ? (
                <button type="button"
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  შემდეგი <ArrowRight size={16} />
                </button>
              ) : (
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => handleSubmit()}
                    disabled={saving || !form.price}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                    შენახვა
                  </button>
                  <button type="button"
                    onClick={() => { set('isNew', true); handleSubmit(); }}
                    disabled={saving || !form.price}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    გამოქვეყნება
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ─── Live preview sidebar ─── */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">პრევიუ</p>
              <div className={`${cardCls} overflow-hidden`}>
                {firstImg ? (
                  <div className="aspect-[4/3] bg-slate-100">
                    <img src={firstImg} alt="" className="w-full h-full object-cover" />
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: form.dealType === 'sale' ? '#f59e0b18' : '#10B98118', color: form.dealType === 'sale' ? '#f59e0b' : '#10B981' }}>
                      {DEAL_TYPES.find(d => d.id === form.dealType)?.label ?? ''}
                    </span>
                    {form.isPremium  && <Crown  size={13} className="text-amber-500" />}
                    {form.isFeatured && <Star   size={13} className="text-blue-500"  />}
                    {form.isNew      && <Zap    size={13} className="text-emerald-500" />}
                  </div>

                  <h3 className="font-bold text-slate-800 text-sm leading-snug">
                    {form.title || (form.rooms ? `${form.rooms}-ოთახ. ${selectedType?.label ?? ''}` : selectedType?.label ?? 'სათაური...')}
                  </h3>

                  {form.price && (
                    <p className="text-lg font-extrabold text-slate-800">
                      {Number(form.price).toLocaleString('ka-GE')} {form.currency}
                      {(form.dealType === 'rent' || form.dealType === 'daily_rent') && (
                        <span className="text-sm font-normal text-slate-500">
                          {form.dealType === 'daily_rent' ? '/დღ.' : '/თვ.'}
                        </span>
                      )}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    {form.area     && <span className="flex items-center gap-1"><Ruler size={11} />{form.area} მ²</span>}
                    {form.rooms    && <span className="flex items-center gap-1"><Bed   size={11} />{form.rooms} ოთ.</span>}
                    {form.floor    && <span className="flex items-center gap-1"><Layers size={11} />{form.floor}{form.totalFloors ? `/${form.totalFloors}` : ''}</span>}
                  </div>

                  {(form.street || form.district || form.city) && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={11} className="text-blue-500 flex-shrink-0" />
                      {[form.street, form.district, form.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {form.condition && (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-semibold">{form.condition}</span>
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
                  { label: 'წ.ნ.',    value: form.yearBuilt || form.yearBuiltCategory || '—' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-xs text-slate-400">{s.label}</p>
                    <p className="font-bold text-slate-700 text-sm mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
