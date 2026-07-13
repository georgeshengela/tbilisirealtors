import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Building2, Home, Castle, Store, TreePine,
  Tag, DollarSign, Ruler, Bed, Bath, Layers, Calendar, MapPin,
  Image as ImageIcon, Sparkles, Star, Zap, User, Phone, Mail,
  CheckCircle, Loader2, Crown, Key, FileText, Wrench, Shield,
} from 'lucide-react';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import LocationPickerMap, { type LocationValue } from '../components/LocationPickerMap';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'ტიპი', icon: Building2 },
  { id: 2, label: 'დეტალები', icon: FileText },
  { id: 3, label: 'მდებარეობა', icon: MapPin },
  { id: 4, label: 'მედია', icon: ImageIcon },
  { id: 5, label: 'გამოქვეყნება', icon: Sparkles },
];

const PROPERTY_TYPES = [
  { id: 'apartment', label: 'ბინა', icon: Building2, color: '#497cff', desc: 'ბინები და აპარტამენტები' },
  { id: 'house', label: 'სახლი', icon: Home, color: '#10B981', desc: 'ცალკე სახლები და კოტეჯები' },
  { id: 'villa', label: 'ვილა', icon: Castle, color: '#ec4899', desc: 'პრემიუმ ვილები და რეზიდენციები' },
  { id: 'commercial', label: 'კომერც.', icon: Store, color: '#f59e0b', desc: 'ოფისები, მაღაზიები, საწარმო' },
  { id: 'land', label: 'მიწა', icon: TreePine, color: '#8b5cf6', desc: 'საცხოვრებელი და კომ. მიწები' },
];

const STATUS_OPTIONS = [
  { id: 'sale', label: 'იყიდება', icon: Tag, color: '#f59e0b', desc: 'გაყიდვის განცხადება' },
  { id: 'rent', label: 'ქირავდება', icon: Key, color: '#10B981', desc: 'ქირის განცხადება' },
];

const AMENITY_PRESETS = [
  'ლიფტი', 'პარკინგი', 'ბასეინი', 'სპორტდარბაზი', 'დაცვა', 'ბუნებრივი ა.გ.',
  'ცენტ. გათბ.', 'კონდიც.', 'აივანი', 'სათავსო', 'ინტერნეტი', 'WiFi',
];

const FEATURE_PRESETS = [
  'პანორამული ხედი', 'ახალი რემ.', 'სმარტ-ჰოუს', 'კამინი', 'ტერასა',
  'საკ. ბაღი', 'VIP', 'ეკო-მეგობრ.', 'ისტ. შენობა', 'მზის პანელები',
];

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white';
const cardCls = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
const labelCls = 'flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

interface FormState {
  title: string;
  description: string;
  price: string;
  pricePerSqm: string;
  area: string;
  type: string;
  status: string;
  bedrooms: string;
  bathrooms: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  city: string;
  district: string;
  address: string;
  lat: number;
  lng: number;
  images: string;
  amenities: string[];
  features: string[];
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  isPremium: boolean;
  isFeatured: boolean;
  isNew: boolean;
}

const defaultForm: FormState = {
  title: '', description: '', price: '', pricePerSqm: '', area: '',
  type: 'apartment', status: 'sale',
  bedrooms: '', bathrooms: '', floor: '', totalFloors: '', yearBuilt: '',
  city: 'თბილისი', district: '', address: '',
  lat: 41.7151, lng: 44.8271,
  images: '', amenities: [], features: [],
  agentName: '', agentPhone: '', agentEmail: '',
  isPremium: false, isFeatured: false, isNew: true,
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AdminAddListingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      try {
        const data = await api(`/properties/${id}`);
        const coords = data.coordinates as { lat: number; lng: number } | null;
        setForm({
          title: data.title || '',
          description: data.description || '',
          price: String(data.price || ''),
          pricePerSqm: String(data.pricePerSqm || ''),
          area: String(data.area || ''),
          type: data.type || 'apartment',
          status: data.status || 'sale',
          bedrooms: String(data.bedrooms || ''),
          bathrooms: String(data.bathrooms || ''),
          floor: String(data.floor || ''),
          totalFloors: String(data.totalFloors || ''),
          yearBuilt: String(data.yearBuilt || ''),
          city: data.city || 'თბილისი',
          district: data.district || '',
          address: data.address || '',
          lat: coords?.lat ?? 41.7151,
          lng: coords?.lng ?? 44.8271,
          images: Array.isArray(data.images) ? data.images.join('\n') : '',
          amenities: Array.isArray(data.amenities) ? data.amenities : [],
          features: Array.isArray(data.features) ? data.features : [],
          agentName: data.agentName || '',
          agentPhone: data.agentPhone || '',
          agentEmail: data.agentEmail || '',
          isPremium: Boolean(data.isPremium),
          isFeatured: Boolean(data.isFeatured),
          isNew: data.isNew !== undefined ? Boolean(data.isNew) : true,
        });
      } catch {
        setError('განცხადების ჩატვირთვა ვერ მოხერხდა');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, id, user, api]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const locationValue: LocationValue = {
    lat: form.lat, lng: form.lng,
    address: form.address, city: form.city, district: form.district,
  };

  function handleLocationChange(loc: LocationValue) {
    setForm(f => ({
      ...f,
      lat: loc.lat, lng: loc.lng,
      address: loc.address, city: loc.city, district: loc.district,
    }));
  }

  function toggleChip(list: 'amenities' | 'features', item: string) {
    setForm(f => {
      const arr = f[list];
      return {
        ...f,
        [list]: arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item],
      };
    });
  }

  function canProceed() {
    if (step === 1) return form.type && form.status;
    if (step === 2) return form.title.trim() && form.price;
    if (step === 3) return form.address.trim() || (form.lat && form.lng);
    if (step === 4) return true;
    return true;
  }

  async function handleSubmit() {
    if (!form.title || !form.price) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price) || 0,
        pricePerSqm: parseFloat(form.pricePerSqm) || null,
        area: parseFloat(form.area) || null,
        type: form.type,
        status: form.status,
        bedrooms: parseInt(form.bedrooms) || 0,
        bathrooms: parseInt(form.bathrooms) || 0,
        floor: parseInt(form.floor) || null,
        totalFloors: parseInt(form.totalFloors) || null,
        yearBuilt: parseInt(form.yearBuilt) || null,
        city: form.city,
        district: form.district,
        address: form.address,
        coordinates: { lat: form.lat, lng: form.lng },
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
        amenities: form.amenities,
        features: form.features,
        agentName: form.agentName,
        agentPhone: form.agentPhone,
        agentEmail: form.agentEmail,
        isPremium: form.isPremium,
        isFeatured: form.isFeatured,
        isNew: form.isNew,
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
  const firstImg = form.images.split('\n').find(l => l.trim().startsWith('http'));

  if (authLoading || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="container-xl py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
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

          {/* Step indicators */}
          <div className="hidden lg:flex items-center gap-1.5">
            {STEPS.map(s => {
              const done = s.id < step;
              const active = s.id === step;
              return (
                <button
                  key={s.id}
                  onClick={() => s.id < step && setStep(s.id)}
                  disabled={s.id > step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : done
                        ? 'bg-blue-50 text-blue-700 border-blue-100 cursor-pointer hover:bg-blue-100'
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

        {/* Mobile progress bar */}
        <div className="lg:hidden h-1 bg-slate-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="container-xl py-6 sm:py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          {/* Main form area */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
              >
                {/* STEP 1: Type & Status */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className={`${cardCls} p-6 sm:p-7`}>
                      <h2 className="text-xl font-extrabold text-slate-800 mb-1">აირჩიეთ ტიპი</h2>
                      <p className="text-slate-500 text-sm mb-5">რა ტიპის უძრავი ქონება განვათავსებთ?</p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PROPERTY_TYPES.map(t => {
                          const active = form.type === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => set('type', t.id)}
                              className={`relative p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
                                active
                                  ? 'shadow-md scale-[1.01]'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                              }`}
                              style={active ? { background: `${t.color}10`, borderColor: t.color } : {}}
                            >
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                                style={{ background: `${t.color}15` }}
                              >
                                <t.icon size={22} style={{ color: t.color }} />
                              </div>
                              <p className="font-bold text-slate-800 text-sm">{t.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{t.desc}</p>
                              {active && (
                                <div className="absolute top-3 right-3">
                                  <CheckCircle size={17} style={{ color: t.color }} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`${cardCls} p-6 sm:p-7`}>
                      <h2 className="text-xl font-extrabold text-slate-800 mb-1">სტატუსი</h2>
                      <p className="text-slate-500 text-sm mb-5">იყიდება თუ ქირავდება?</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {STATUS_OPTIONS.map(s => {
                          const active = form.status === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => set('status', s.id)}
                              className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                                active ? 'shadow-md' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                              }`}
                              style={active ? { background: `${s.color}10`, borderColor: s.color } : {}}
                            >
                              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15` }}>
                                <s.icon size={22} style={{ color: s.color }} />
                              </div>
                              <div className="text-left">
                                <p className="font-bold text-slate-800">{s.label}</p>
                                <p className="text-xs text-slate-500">{s.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Details */}
                {step === 2 && (
                  <div className={`${cardCls} p-6 sm:p-7 space-y-5`}>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800 mb-1">ძირითადი ინფორმაცია</h2>
                      <p className="text-slate-500 text-sm">შეავსეთ განცხადების დეტალები</p>
                    </div>

                    <div>
                      <label className={labelCls}>
                        <FileText size={13} /> სათაური *
                      </label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={e => set('title', e.target.value)}
                        placeholder="მაგ: 3-ოთახიანი ბინა ვაკეში, პანორამული ხედით"
                        className={inputCls}
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}><DollarSign size={13} /> ფასი (₾) *</label>
                        <input type="number" value={form.price} onChange={e => set('price', e.target.value)} className={inputCls} placeholder="250000" />
                      </div>
                      <div>
                        <label className={labelCls}><Ruler size={13} /> ფართი (მ²)</label>
                        <input type="number" value={form.area} onChange={e => set('area', e.target.value)} className={inputCls} placeholder="85" />
                      </div>
                    </div>

                    {form.type !== 'land' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { key: 'bedrooms' as const, label: 'საძინებელი', icon: Bed },
                          { key: 'bathrooms' as const, label: 'სააბაზანო', icon: Bath },
                          { key: 'floor' as const, label: 'სართული', icon: Layers },
                          { key: 'totalFloors' as const, label: 'სართ. ჯამი', icon: Building2 },
                        ].map(f => (
                          <div key={f.key}>
                            <label className={labelCls}><f.icon size={12} /> {f.label}</label>
                            <input type="number" value={form[f.key]} onChange={e => set(f.key, e.target.value)} className={inputCls} />
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className={labelCls}><Calendar size={13} /> აშენების წელი</label>
                      <input type="number" value={form.yearBuilt} onChange={e => set('yearBuilt', e.target.value)} className={inputCls} placeholder="2024" />
                    </div>

                    <div>
                      <label className={labelCls}><FileText size={13} /> აღწერა</label>
                      <textarea
                        value={form.description}
                        onChange={e => set('description', e.target.value)}
                        rows={4}
                        placeholder="დეტალური აღწერა..."
                        className={`${inputCls} resize-none`}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Location */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className={`${cardCls} p-6 sm:p-7`}>
                      <h2 className="text-xl font-extrabold text-slate-800 mb-1">მდებარეობა</h2>
                      <p className="text-slate-500 text-sm mb-5">მოძებნეთ მისამართი ან დააწკაპუნეთ რუკაზე</p>
                      <LocationPickerMap value={locationValue} onChange={handleLocationChange} height={380} />
                    </div>

                    <div className={`${cardCls} p-6 grid sm:grid-cols-3 gap-4`}>
                      <div>
                        <label className={labelCls}>მისამართი</label>
                        <input type="text" value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>რაიონი</label>
                        <input type="text" value={form.district} onChange={e => set('district', e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>ქალაქი</label>
                        <input type="text" value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Media & Features */}
                {step === 4 && (
                  <div className={`${cardCls} p-6 sm:p-7 space-y-6`}>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800 mb-1">სურათები და მახასიათებლები</h2>
                      <p className="text-slate-500 text-sm">დაამატეთ ფოტოები, კომფორტი და ფიჩერები</p>
                    </div>

                    <div>
                      <label className={labelCls}><ImageIcon size={13} /> სურათების URL (თითო ხაზზე)</label>
                      <textarea
                        value={form.images}
                        onChange={e => set('images', e.target.value)}
                        rows={4}
                        placeholder="https://images.unsplash.com/..."
                        className={`${inputCls} resize-none font-mono text-xs`}
                      />
                      {firstImg && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                          {form.images.split('\n').filter(l => l.trim().startsWith('http')).slice(0, 6).map((url, i) => (
                            <img key={i} src={url.trim()} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-slate-100 border border-slate-200" />
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}><Wrench size={13} /> კომფორტი</label>
                      <div className="flex flex-wrap gap-2">
                        {AMENITY_PRESETS.map(a => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleChip('amenities', a)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              form.amenities.includes(a)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}><Sparkles size={13} /> მახასიათებლები</label>
                      <div className="flex flex-wrap gap-2">
                        {FEATURE_PRESETS.map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleChip('features', f)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                              form.features.includes(f)
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: Agent & Publish */}
                {step === 5 && (
                  <div className="space-y-5">
                    <div className={`${cardCls} p-6 sm:p-7 space-y-5`}>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-800 mb-1">აგენტი და გამოქვეყნება</h2>
                        <p className="text-slate-500 text-sm">დაამატეთ აგენტის ინფო და აირჩიეთ სტატუსები</p>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className={labelCls}><User size={13} /> აგენტის სახელი</label>
                          <input type="text" value={form.agentName} onChange={e => set('agentName', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}><Phone size={13} /> ტელეფონი</label>
                          <input type="text" value={form.agentPhone} onChange={e => set('agentPhone', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}><Mail size={13} /> Email</label>
                          <input type="email" value={form.agentEmail} onChange={e => set('agentEmail', e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}><Shield size={13} /> სტატუსები</label>
                        <div className="grid sm:grid-cols-3 gap-3">
                          {[
                            { key: 'isPremium' as const, label: 'VIP / პრემიუმი', icon: Crown, color: '#f59e0b', desc: 'პრემიუმ ბეიჯი' },
                            { key: 'isFeatured' as const, label: 'გამორჩეული', icon: Star, color: '#497cff', desc: 'მთავარ გვერდზე' },
                            { key: 'isNew' as const, label: 'ახალი', icon: Zap, color: '#10B981', desc: 'NEW ბეიჯი' },
                          ].map(opt => {
                            const on = form[opt.key];
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => set(opt.key, !on)}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                                  on ? 'shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                                style={on ? { background: `${opt.color}10`, borderColor: opt.color } : {}}
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

            {/* Navigation buttons */}
            <div className={`${cardCls} flex items-center justify-between mt-6 px-5 py-4`}>
              <button
                type="button"
                onClick={() => step > 1 ? setStep(step - 1) : navigate('/admin')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                <ArrowLeft size={16} />
                {step === 1 ? 'გაუქმება' : 'უკან'}
              </button>

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => canProceed() && setStep(step + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  შემდეგი
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !form.title || !form.price}
                  className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {saving ? 'მიმდინარეობს...' : isEdit ? 'შენახვა' : 'გამოქვეყნება'}
                </button>
              )}
            </div>
          </div>

          {/* Live preview sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">პრევიუ</p>
              <div className={`${cardCls} overflow-hidden`}>
                {firstImg ? (
                  <div className="aspect-[4/3] bg-slate-100">
                    <img src={firstImg} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <ImageIcon size={32} className="text-slate-300" />
                  </div>
                )}

                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${selectedType.color}18`, color: selectedType.color }}>
                        {selectedType.label}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{
                      background: form.status === 'sale' ? '#f59e0b18' : '#10B98118',
                      color: form.status === 'sale' ? '#f59e0b' : '#10B981',
                    }}>
                      {form.status === 'sale' ? 'იყიდება' : 'ქირავდება'}
                    </span>
                    {form.isPremium && <Crown size={14} className="text-amber-500" />}
                    {form.isFeatured && <Star size={14} className="text-blue-500" />}
                  </div>

                  <h3 className="font-bold text-slate-800 text-base leading-snug">
                    {form.title || 'სათაური...'}
                  </h3>

                  {form.price && (
                    <p className="text-xl font-extrabold text-slate-800">
                      {Number(form.price).toLocaleString('ka-GE')} ₾
                      {form.status === 'rent' && <span className="text-sm font-normal text-slate-500">/თვ.</span>}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {form.area && <span className="flex items-center gap-1"><Ruler size={12} />{form.area} მ²</span>}
                    {form.bedrooms && <span className="flex items-center gap-1"><Bed size={12} />{form.bedrooms}</span>}
                    {form.bathrooms && <span className="flex items-center gap-1"><Bath size={12} />{form.bathrooms}</span>}
                  </div>

                  {(form.address || form.district) && (
                    <p className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin size={12} className="text-blue-500 flex-shrink-0" />
                      {[form.address, form.district, form.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {form.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {form.amenities.slice(0, 4).map(a => (
                        <span key={a} className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-600 font-medium">{a}</span>
                      ))}
                      {form.amenities.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{form.amenities.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
