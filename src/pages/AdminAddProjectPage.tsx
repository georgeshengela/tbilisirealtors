import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, CheckCircle, DollarSign, ExternalLink, FileText,
  HardHat, Image as ImageIcon, Layers, Loader2, MapPin, Phone, Sparkles,
  Star, Upload, Wrench, X,
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import DistrictCombobox from '../components/admin/DistrictCombobox';
import LocationPickerMap, { type LocationValue } from '../components/LocationPickerMap';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { CITY_AREAS, districtFormChoices } from '../data/districts';
import { invalidatePublicCache } from '../lib/publicApi';
import {
  DELIVERY_CONDITIONS,
  generateProjectUnits,
  mapProjectFromApi,
  PAYMENT_OPTIONS,
  POST_DELIVERY_SERVICES,
  PROJECT_STATUS_META,
  PROJECT_STATUSES,
  SECURITY_FEATURES,
  slugFromProjectName,
  TERRITORY_AMENITIES,
  type ConstructionProject,
  type ProjectPaymentOption,
  type ProjectStatus,
  type ProjectUnit,
  type ProjectUnitStatus,
} from '../lib/projects';

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm placeholder-slate-400 focus:outline-none transition-all bg-white';
const cardCls = 'bg-white rounded-2xl border border-slate-100 shadow-sm';
const labelCls = 'flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide';

const TERRITORY_LABEL: Record<string, string> = {
  pharmacy: 'აფთიაქი',
  kindergarten: 'საბავშვო ბაღი',
  busStop: 'ავტობუსის გაჩერება',
  supermarket: 'სურსათის მაღაზია',
  bikeLane: 'ველობილიკი',
  sportsField: 'სპორტული მოედანი',
  coworking: 'საერთო სამუშაო სივრცე',
  playground: 'ბავშვთა სივრცე',
  stadium: 'სტადიონი',
  square: 'სკვერი',
};

const SERVICE_LABEL: Record<string, string> = {
  lobby: 'ლობი',
  concierge: 'კონსიერჟი',
  videoControl: 'ვიდეოკონტროლი',
  lighting: 'განათება',
  landscaping: 'გამწვანების მოვლა',
  yardCleaning: 'ეზოების დასუფთავება',
  stairCleaning: 'სადარბაზოების დასუფთავება',
};

const SECURITY_LABEL: Record<string, string> = {
  generator: 'გენერატორი',
  accessControl: 'ჩაკეტვის სისტემა',
  fireSystem: 'სახანძრო სისტემა',
};

const UNIT_CYCLE: ProjectUnitStatus[] = ['available', 'reserved', 'sold'];
const UNIT_META: Record<ProjectUnitStatus, { label: string; color: string; bg: string }> = {
  available: { label: 'თავისუფალი', color: '#059669', bg: '#ecfdf5' },
  reserved: { label: 'დაჯავშნილი', color: '#d97706', bg: '#fff7ed' },
  sold: { label: 'გაყიდული', color: '#64748b', bg: '#f1f5f9' },
};

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
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37, 99, 235,0.1)', border: '1px solid rgba(37, 99, 235,0.15)' }}
          >
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

function chip(label: string, active: boolean, onClick: () => void, color = '#2563eb') {
  return (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
        active ? 'text-white shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >
      {label}
    </button>
  );
}

interface FormState {
  name: string;
  slug: string;
  developer: string;
  managementCompany: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  status: ProjectStatus;
  completion: string;
  deliveryDate: string;
  deliveryCondition: string;
  constructionProgress: string;
  constructionNote: string;
  description: string;
  priceFrom: string;
  priceTo: string;
  pricePerSqmFrom: string;
  pricePerSqmTo: string;
  areaFrom: string;
  areaTo: string;
  units: string;
  floors: string;
  buildings: string;
  parking: string;
  greenArea: string;
  unitsPerFloor: string;
  sortOrder: string;
  published: boolean;
  bedroomOptions: number[];
  paymentOptions: ProjectPaymentOption[];
  territoryAmenities: string[];
  postDeliveryServices: string[];
  securityFeatures: string[];
  images: string[];
  lat: number;
  lng: number;
  projectUnits: ProjectUnit[];
}

const emptyForm: FormState = {
  name: '',
  slug: '',
  developer: '',
  managementCompany: '',
  phone: '',
  address: '',
  city: 'თბილისი',
  district: '',
  status: 'building',
  completion: '',
  deliveryDate: '',
  deliveryCondition: 'მწვანე კარკასი',
  constructionProgress: '40',
  constructionNote: '',
  description: '',
  priceFrom: '',
  priceTo: '',
  pricePerSqmFrom: '',
  pricePerSqmTo: '',
  areaFrom: '',
  areaTo: '',
  units: '',
  floors: '12',
  buildings: '1',
  parking: '',
  greenArea: '',
  unitsPerFloor: '4',
  sortOrder: '0',
  published: true,
  bedroomOptions: [1, 2, 3],
  paymentOptions: ['installment', 'mortgage', 'cash'],
  territoryAmenities: [],
  postDeliveryServices: ['lobby', 'lighting'],
  securityFeatures: ['accessControl'],
  images: [],
  lat: 41.7151,
  lng: 44.8271,
  projectUnits: [],
};

function fromProject(data: ConstructionProject): FormState {
  const floors = data.floors || 1;
  const perFloor = data.projectUnits.length && floors
    ? String(Math.max(1, Math.round(data.projectUnits.filter(u => u.floor === 1).length || data.projectUnits.length / floors)))
    : '4';
  return {
    name: data.name,
    slug: data.slug,
    developer: data.developer,
    managementCompany: data.managementCompany || '',
    phone: data.phone || '',
    address: data.address || '',
    city: data.city || 'თბილისი',
    district: data.district || '',
    status: data.status,
    completion: data.completion || '',
    deliveryDate: data.deliveryDate || '',
    deliveryCondition: data.deliveryCondition || 'მწვანე კარკასი',
    constructionProgress: String(data.constructionProgress ?? 0),
    constructionNote: data.constructionNote || '',
    description: data.description || '',
    priceFrom: data.priceFrom ? String(Math.round(data.priceFrom)) : '',
    priceTo: data.priceTo ? String(Math.round(data.priceTo)) : '',
    pricePerSqmFrom: data.pricePerSqmFrom ? String(Math.round(data.pricePerSqmFrom)) : '',
    pricePerSqmTo: data.pricePerSqmTo ? String(Math.round(data.pricePerSqmTo)) : '',
    areaFrom: data.areaFrom ? String(data.areaFrom) : '',
    areaTo: data.areaTo ? String(data.areaTo) : '',
    units: data.units ? String(data.units) : '',
    floors: String(data.floors || 1),
    buildings: String(data.buildings || 1),
    parking: data.parking ? String(data.parking) : '',
    greenArea: data.greenArea ? String(data.greenArea) : '',
    unitsPerFloor: perFloor,
    sortOrder: String(data.sortOrder ?? 0),
    published: data.published !== false,
    bedroomOptions: data.bedroomOptions.length ? data.bedroomOptions : [1, 2, 3],
    paymentOptions: data.paymentOptions.length ? data.paymentOptions : ['cash'],
    territoryAmenities: data.territoryAmenities,
    postDeliveryServices: data.postDeliveryServices,
    securityFeatures: data.securityFeatures,
    images: data.images.length ? data.images : (data.image ? [data.image] : []),
    lat: data.coordinates?.lat || 41.7151,
    lng: data.coordinates?.lng || 44.8271,
    projectUnits: data.projectUnits,
  };
}

export default function AdminAddProjectPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user, can, loading: authLoading } = useAdminAuth();
  const api = useApiRequest();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress, error: uploadError } = useFileUpload();

  const [form, setForm] = useState<FormState>(() => {
    if (isEdit) return emptyForm;
    try {
      const raw = sessionStorage.getItem('tr_admin_project_draft_v1');
      if (!raw) return emptyForm;
      const parsed = JSON.parse(raw) as Partial<FormState>;
      if (!parsed.name && !parsed.developer) return emptyForm;
      return { ...emptyForm, ...parsed };
    } catch {
      return emptyForm;
    }
  });
  const [slugManual, setSlugManual] = useState(isEdit);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dropActive, setDropActive] = useState(false);

  const canCreate = can('projects.create');
  const canEdit = can('projects.edit');
  const locked = isEdit ? !canEdit : !canCreate;

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (isEdit) return;
    try {
      if (!form.name.trim() && !form.developer.trim()) {
        sessionStorage.removeItem('tr_admin_project_draft_v1');
        return;
      }
      sessionStorage.setItem('tr_admin_project_draft_v1', JSON.stringify(form));
    } catch {
      /* private mode / quota */
    }
  }, [form, isEdit]);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    api(`/projects/${id}`)
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setForm(fromProject(mapProjectFromApi(data)));
        setSlugManual(true);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'პროექტი ვერ ჩაიტვირთა'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, id, isEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  function toggleArr<K extends 'territoryAmenities' | 'postDeliveryServices' | 'securityFeatures' | 'paymentOptions'>(
    key: K,
    item: FormState[K][number],
  ) {
    setForm(f => {
      const arr = f[key] as Array<typeof item>;
      const next = arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
      return { ...f, [key]: next };
    });
  }

  function applyLocation(value: LocationValue) {
    setForm(f => ({
      ...f,
      lat: value.lat,
      lng: value.lng,
      address: value.address || f.address,
      city: value.city || f.city,
      district: value.district || f.district,
    }));
  }

  function setName(name: string) {
    setForm(f => ({
      ...f,
      name,
      slug: slugManual ? f.slug : slugFromProjectName(name),
    }));
  }

  async function uploadPhotos(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    const uploaded = await upload(files);
    const urls = uploaded.map(file => file.url).filter(Boolean);
    if (!urls.length) return;
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
  }

  function generateUnits() {
    if (form.projectUnits.length && !window.confirm('არსებული ბინების გეგმა შეიცვლება. გაგრძელდეს?')) return;
    const tempId = id || 'draft';
    const units = generateProjectUnits(
      tempId,
      Number(form.floors) || 12,
      Number(form.unitsPerFloor) || 4,
      Number(form.priceFrom) || 100000,
      form.bedroomOptions,
    );
    setForm(f => ({
      ...f,
      projectUnits: units,
      units: String(units.length),
    }));
  }

  function cycleUnit(unitId: string) {
    setForm(f => ({
      ...f,
      projectUnits: f.projectUnits.map(unit => {
        if (unit.id !== unitId) return unit;
        const next = UNIT_CYCLE[(UNIT_CYCLE.indexOf(unit.status) + 1) % UNIT_CYCLE.length];
        return { ...unit, status: next };
      }),
    }));
  }

  const unitStats = useMemo(() => {
    const counts = { available: 0, reserved: 0, sold: 0 };
    for (const unit of form.projectUnits) counts[unit.status] += 1;
    return counts;
  }, [form.projectUnits]);

  const floorsInPlan = useMemo(
    () => [...new Set(form.projectUnits.map(u => u.floor))].sort((a, b) => b - a),
    [form.projectUnits],
  );

  const ready = Boolean(form.name.trim() && form.developer.trim());

  async function save() {
    if (locked || !ready) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugFromProjectName(form.name),
        developer: form.developer.trim(),
        managementCompany: form.managementCompany.trim() || undefined,
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city,
        district: form.district,
        status: form.status,
        completion: form.completion.trim(),
        deliveryDate: form.deliveryDate.trim(),
        deliveryCondition: form.deliveryCondition,
        constructionProgress: Number(form.constructionProgress) || 0,
        constructionNote: form.constructionNote.trim(),
        description: form.description.trim(),
        priceFrom: Number(form.priceFrom) || 0,
        priceTo: Number(form.priceTo) || 0,
        pricePerSqmFrom: Number(form.pricePerSqmFrom) || 0,
        pricePerSqmTo: Number(form.pricePerSqmTo) || 0,
        areaFrom: Number(form.areaFrom) || 0,
        areaTo: Number(form.areaTo) || 0,
        units: Number(form.units) || form.projectUnits.length,
        floors: Number(form.floors) || 1,
        buildings: Number(form.buildings) || 1,
        parking: Number(form.parking) || 0,
        greenArea: Number(form.greenArea) || 0,
        unitsPerFloor: Number(form.unitsPerFloor) || 4,
        sortOrder: Number(form.sortOrder) || 0,
        published: form.published,
        bedroomOptions: form.bedroomOptions,
        paymentOptions: form.paymentOptions,
        territoryAmenities: form.territoryAmenities,
        postDeliveryServices: form.postDeliveryServices,
        securityFeatures: form.securityFeatures,
        images: form.images,
        image: form.images[0] || '',
        coordinates: { lat: form.lat, lng: form.lng },
        projectUnits: form.projectUnits.length ? form.projectUnits : undefined,
      };
      if (isEdit) {
        await api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await api('/projects', { method: 'POST', body: JSON.stringify(payload) });
        try { sessionStorage.removeItem('tr_admin_project_draft_v1'); } catch { /* ignore */ }
      }
      invalidatePublicCache();
      navigate('/admin?section=projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'პროექტი ვერ შეინახა');
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;
  if (loading) {
    return (
      <AdminLayout subtitle="იტვირთება..." activeSection="projects">
        <div className="container-xl py-24 flex items-center justify-center">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  const actionButtons = (
    <>
      {form.slug && (
        <a
          href={`/project/${form.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50"
        >
          <ExternalLink size={14} /> საიტზე
        </a>
      )}
      <button
        type="button"
        onClick={() => { void save(); }}
        disabled={saving || locked || !ready}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40"
        style={{ background: '#2563eb' }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
        {form.published ? 'შენახვა და გამოქვეყნება' : 'დრაფტის შენახვა'}
      </button>
    </>
  );

  return (
    <AdminLayout subtitle={isEdit ? 'პროექტის რედაქტირება' : 'ახალი პროექტი'} activeSection="projects">
      <div className="container-xl py-6 sm:py-8 pb-28 lg:pb-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={() => navigate('/admin?section=projects')}
              className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold mb-2"
            >
              <ArrowLeft size={14} /> უკან პროექტებში
            </button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
              {isEdit ? form.name || 'პროექტის რედაქტირება' : 'ახალი პროექტი'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              რაც აქ შეინახება, იმ წამს ჩანს საჯარო ჰედერში, მთავარზე და /projects გვერდზე.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3">{actionButtons}</div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_300px] gap-6 lg:gap-8">
          <div className="min-w-0 space-y-5">
            <FormSection id="basics" title="პროექტი და დეველოპერი" desc="სახელი, სლაგი და საკონტაქტო" icon={HardHat}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>პროექტის სახელი <span className="text-red-500">*</span></label>
                  <input className={inputCls} value={form.name} onChange={e => setName(e.target.value)} placeholder="Panorama Residence" />
                </div>
                <div>
                  <label className={labelCls}>დეველოპერი <span className="text-red-500">*</span></label>
                  <input className={inputCls} value={form.developer} onChange={e => set('developer', e.target.value)} placeholder="Archi Group" />
                </div>
                <div>
                  <label className={labelCls}>მენეჯმენტ კომპანია</label>
                  <input className={inputCls} value={form.managementCompany} onChange={e => set('managementCompany', e.target.value)} placeholder="Archi Management" />
                </div>
                <div>
                  <label className={labelCls}><Phone size={12} /> ტელეფონი</label>
                  <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+995 32 205 05 05" />
                </div>
                <div>
                  <label className={labelCls}>სლაგი / URL</label>
                  <input
                    className={`${inputCls} font-mono text-xs`}
                    value={form.slug}
                    onChange={e => {
                      setSlugManual(true);
                      set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                    }}
                    placeholder="panorama-residence"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">საიტზე: /project/{form.slug || '…'}</p>
                </div>
                <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => set('published', !form.published)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${form.published ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                  >
                    {form.published ? 'საიტზე ჩანს' : 'დრაფტი — საიტზე არ ჩანს'}
                  </button>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-500">რიგი</label>
                    <input className={`${inputCls} w-20`} type="number" value={form.sortOrder} onChange={e => set('sortOrder', e.target.value)} />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="status" title="სტატუსი და ჩაბარება" icon={Layers}>
              <div className="flex flex-wrap gap-2 mb-5">
                {PROJECT_STATUSES.map(status => chip(
                  PROJECT_STATUS_META[status].label,
                  form.status === status,
                  () => {
                    set('status', status);
                    if (status === 'completed') set('constructionProgress', '100');
                  },
                  PROJECT_STATUS_META[status].color,
                ))}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls}>მშენებლობის პროგრესი — {form.constructionProgress}%</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.constructionProgress}
                    onChange={e => set('constructionProgress', e.target.value)}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className={labelCls}>ჩაბარება (ტექსტი)</label>
                  <input className={inputCls} value={form.completion} onChange={e => set('completion', e.target.value)} placeholder="2027 Q2" />
                </div>
                <div>
                  <label className={labelCls}>თარიღი (YYYY-MM)</label>
                  <input className={inputCls} value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} placeholder="2027-06" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>ჩაბარების პირობა</label>
                  <div className="flex flex-wrap gap-2">
                    {DELIVERY_CONDITIONS.map(item => chip(item, form.deliveryCondition === item, () => set('deliveryCondition', item), '#0f172a'))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>შენიშვნა</label>
                  <input className={inputCls} value={form.constructionNote} onChange={e => set('constructionNote', e.target.value)} placeholder="მშენებლობა დასრულდება 18 თვეში" />
                </div>
              </div>
            </FormSection>

            <FormSection id="price" title="ფასი და ფართი" icon={DollarSign}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ფასი დან</label>
                  <input className={inputCls} type="number" value={form.priceFrom} onChange={e => set('priceFrom', e.target.value)} placeholder="185000" />
                </div>
                <div>
                  <label className={labelCls}>ფასი მდე</label>
                  <input className={inputCls} type="number" value={form.priceTo} onChange={e => set('priceTo', e.target.value)} placeholder="520000" />
                </div>
                <div>
                  <label className={labelCls}>₾/მ² დან</label>
                  <input className={inputCls} type="number" value={form.pricePerSqmFrom} onChange={e => set('pricePerSqmFrom', e.target.value)} placeholder="3200" />
                </div>
                <div>
                  <label className={labelCls}>₾/მ² მდე</label>
                  <input className={inputCls} type="number" value={form.pricePerSqmTo} onChange={e => set('pricePerSqmTo', e.target.value)} placeholder="4500" />
                </div>
                <div>
                  <label className={labelCls}>ფართი დან</label>
                  <input className={inputCls} type="number" value={form.areaFrom} onChange={e => set('areaFrom', e.target.value)} placeholder="55" />
                </div>
                <div>
                  <label className={labelCls}>ფართი მდე</label>
                  <input className={inputCls} type="number" value={form.areaTo} onChange={e => set('areaTo', e.target.value)} placeholder="128" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>გადახდის ფორმა</label>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map(opt => chip(opt.label, form.paymentOptions.includes(opt.id), () => toggleArr('paymentOptions', opt.id), '#059669'))}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection id="complex" title="კომპლექსი" desc="კორპუსები, სართულები, ბინები" icon={Building2}>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  ['buildings', 'კორპუსები', '2'],
                  ['floors', 'სართულიანობა', '21'],
                  ['units', 'ბინები', '186'],
                  ['parking', 'პარკინგი', '94'],
                  ['greenArea', 'გამწვანება მ²', '2400'],
                  ['unitsPerFloor', 'ბინა სართულზე', '4'],
                ].map(([key, label, ph]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      className={inputCls}
                      type="number"
                      value={form[key as keyof FormState] as string}
                      onChange={e => set(key as keyof FormState, e.target.value as never)}
                      placeholder={ph}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className={labelCls}>ოთახები</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(n => chip(
                    `${n}`,
                    form.bedroomOptions.includes(n),
                    () => setForm(f => ({
                      ...f,
                      bedroomOptions: f.bedroomOptions.includes(n)
                        ? f.bedroomOptions.filter(x => x !== n)
                        : [...f.bedroomOptions, n].sort((a, b) => a - b),
                    })),
                    '#7c3aed',
                  ))}
                </div>
              </div>
            </FormSection>

            <FormSection id="location" title="მდებარეობა" icon={MapPin}>
              <LocationPickerMap
                value={{ lat: form.lat, lng: form.lng, address: form.address, city: form.city, district: form.district }}
                onChange={applyLocation}
                height={320}
              />
              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelCls}>ქალაქი</label>
                  <select className={inputCls} value={form.city} onChange={e => set('city', e.target.value)}>
                    {CITY_AREAS.map(city => <option key={city.ka} value={city.ka}>{city.ka}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>რაიონი</label>
                  <DistrictCombobox
                    value={form.district}
                    options={districtFormChoices(form.city, form.district)}
                    onChange={value => set('district', value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>მისამართი</label>
                  <input className={inputCls} value={form.address} onChange={e => set('address', e.target.value)} placeholder="ჭავჭავაძის გამზ. 82" />
                </div>
              </div>
            </FormSection>

            <FormSection id="description" title="აღწერა" icon={FileText}>
              <textarea
                className={`${inputCls} min-h-[140px]`}
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="პროექტის აღწერა ქართულად..."
              />
            </FormSection>

            <FormSection id="features" title="ტერიტორია, სერვისები, უსაფრთხოება" icon={Wrench}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">ტერიტორიაზე</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {TERRITORY_AMENITIES.map(key => chip(TERRITORY_LABEL[key] || key, form.territoryAmenities.includes(key), () => toggleArr('territoryAmenities', key)))}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">ჩაბარების შემდეგ</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {POST_DELIVERY_SERVICES.map(key => chip(SERVICE_LABEL[key] || key, form.postDeliveryServices.includes(key), () => toggleArr('postDeliveryServices', key), '#0f766e'))}
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">უსაფრთხოება</p>
              <div className="flex flex-wrap gap-2">
                {SECURITY_FEATURES.map(key => chip(SECURITY_LABEL[key] || key, form.securityFeatures.includes(key), () => toggleArr('securityFeatures', key), '#b45309'))}
              </div>
            </FormSection>

            <FormSection id="media" title="ფოტოები და რენდერები" desc="პირველი ფოტო არის ყდა ბარათზე და დეტალურ გვერდზე" icon={Sparkles}>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
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
                className="mb-4 rounded-2xl border-2 border-dashed py-8 text-center cursor-pointer"
                style={{
                  borderColor: dropActive ? '#2563eb' : '#e2e8f0',
                  background: dropActive ? 'rgba(37,99,235,0.05)' : '#fafbfc',
                }}
              >
                {uploading ? <Loader2 size={22} className="mx-auto text-blue-500 animate-spin" /> : <Upload size={22} className="mx-auto text-slate-300" />}
                <p className="text-sm font-bold text-slate-600 mt-2">
                  {uploading && progress ? `იტვირთება ${progress.done} / ${progress.total}` : 'ჩააგდეთ ფოტოები ან დააჭირეთ'}
                </p>
              </div>
              {uploadError && <p className="text-xs font-semibold text-red-500 mb-3">{uploadError}</p>}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-600 text-white">ყდა</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm(f => {
                            const images = [...f.images];
                            const [picked] = images.splice(index, 1);
                            images.unshift(picked);
                            return { ...f, images };
                          })}
                          className="p-1.5 rounded-lg bg-white text-blue-600"
                          title="ყდა"
                        >
                          <Star size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))}
                        className="p-1.5 rounded-lg bg-white text-red-500"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection id="units" title="ბინების გეგმა" desc="დააჭირეთ ბინას: თავისუფალი → დაჯავშნილი → გაყიდული" icon={Layers}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={generateUnits}
                  className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
                >
                  გეგმის გენერაცია
                </button>
                <span className="text-[12px] text-slate-500">
                  {form.projectUnits.length} ბინა · {unitStats.available} თავისუფალი · {unitStats.reserved} დაჯავშნილი · {unitStats.sold} გაყიდული
                </span>
              </div>
              {floorsInPlan.length === 0 ? (
                <p className="text-sm text-slate-400">ჯერ დააჭირეთ გენერაციას — სართულები და ბინა/სართული ზემოთ ივსება.</p>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {floorsInPlan.map(floor => (
                    <div key={floor}>
                      <p className="text-[11px] font-bold text-slate-400 mb-1.5">სართული {floor}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.projectUnits.filter(u => u.floor === floor).map(unit => {
                          const meta = UNIT_META[unit.status];
                          return (
                            <button
                              key={unit.id}
                              type="button"
                              onClick={() => cycleUnit(unit.id)}
                              title={`${unit.number} · ${meta.label}`}
                              className="min-w-[52px] px-2 py-1.5 rounded-lg text-[10px] font-bold border"
                              style={{ background: meta.bg, color: meta.color, borderColor: `${meta.color}33` }}
                            >
                              {unit.number}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <div className={`${cardCls} p-4 flex flex-col gap-2`}>
                <p className="text-[11px] font-semibold text-slate-500">
                  {ready ? 'მზადაა შესანახად' : 'სახელი და დეველოპერი სავალდებულოა'}
                </p>
                {actionButtons}
              </div>
              <div className={`${cardCls} overflow-hidden`}>
                {form.images[0] ? (
                  <img src={form.images[0]} alt="" className="w-full aspect-[4/3] object-cover" />
                ) : (
                  <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                    <ImageIcon size={28} className="text-slate-300" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{form.developer || 'დეველოპერი'}</p>
                  <h3 className="font-extrabold text-slate-800 mt-1">{form.name || 'პროექტის სახელი'}</h3>
                  <p className="text-xs text-slate-500 mt-1">{[form.district, form.city].filter(Boolean).join(', ')}</p>
                  {form.priceFrom && (
                    <p className="text-lg font-extrabold text-blue-600 mt-3 tabular-nums">
                      ${Number(form.priceFrom).toLocaleString()}+
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-3 flex gap-2">
        {actionButtons}
      </div>
    </AdminLayout>
  );
}
