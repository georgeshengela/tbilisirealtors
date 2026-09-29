import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, CheckCircle, DollarSign, ExternalLink, FileText,
  HardHat, Image as ImageIcon, Layers, Loader2, MapPin, Phone, Plus, Sparkles,
  Star, Trash2, Upload, Wrench, X,
} from 'lucide-react';
import AdminLayout from '../components/admin/AdminLayout';
import DistrictCombobox from '../components/admin/DistrictCombobox';
import LocationPickerMap, { type LocationValue } from '../components/LocationPickerMap';
import { useAdminAuth, useApiRequest } from '../contexts/AdminAuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { CITY_AREAS, districtFormChoices } from '../data/districts';
import { invalidatePublicCache } from '../lib/publicApi';
import {
  blocksOf,
  DELIVERY_CONDITIONS,
  droppedUnitsWithData,
  mapProjectFromApi,
  MAX_PROJECT_BLOCKS,
  MAX_PROJECT_FLOORS,
  MAX_UNITS_PER_FLOOR,
  newBlockId,
  nextBlockName,
  rebuildBlockUnits,
  unitBlockName,
  PAYMENT_OPTIONS,
  POST_DELIVERY_SERVICES,
  PROJECT_STATUS_META,
  PROJECT_STATUSES,
  SECURITY_FEATURES,
  slugFromProjectName,
  TERRITORY_AMENITIES,
  type ConstructionProject,
  type ProjectBlock,
  type ProjectCurrency,
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

const UNIT_STATUSES: ProjectUnitStatus[] = ['available', 'reserved', 'sold'];
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
  priceCurrency: ProjectCurrency;
  pricePerSqmFrom: string;
  pricePerSqmTo: string;
  areaFrom: string;
  areaTo: string;
  units: string;
  floors: string;
  buildings: string;
  parking: string;
  greenArea: string;
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
  blocks: ProjectBlock[];
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
  priceCurrency: 'GEL',
  pricePerSqmFrom: '',
  pricePerSqmTo: '',
  areaFrom: '',
  areaTo: '',
  units: '',
  floors: '12',
  buildings: '1',
  parking: '',
  greenArea: '',
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
  blocks: [],
  projectUnits: [],
};

function fromProject(data: ConstructionProject): FormState {
  const blocks = blocksOf(data);
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
    priceCurrency: data.priceCurrency,
    pricePerSqmFrom: data.pricePerSqmFrom ? String(Math.round(data.pricePerSqmFrom)) : '',
    pricePerSqmTo: data.pricePerSqmTo ? String(Math.round(data.pricePerSqmTo)) : '',
    areaFrom: data.areaFrom ? String(data.areaFrom) : '',
    areaTo: data.areaTo ? String(data.areaTo) : '',
    units: data.units ? String(data.units) : '',
    floors: String(data.floors || 1),
    buildings: String(data.buildings || 1),
    parking: data.parking ? String(data.parking) : '',
    greenArea: data.greenArea ? String(data.greenArea) : '',
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
    blocks,
    projectUnits: data.projectUnits,
    ...countsOf(blocks, data.projectUnits),
  };
}

/** Floors / buildings / units follow the blocks whenever there are any. */
function countsOf(blocks: ProjectBlock[], units: ProjectUnit[]): Partial<FormState> {
  if (!blocks.length) return {};
  return {
    floors: String(Math.max(...blocks.map(b => b.floors))),
    buildings: String(blocks.length),
    units: String(units.length),
  };
}

/** Slot on the floor; legacy units without one are counted in stored order. */
function unitPositions(units: ProjectUnit[], blocks: ProjectBlock[]): Map<string, number> {
  const out = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const unit of units) {
    const key = `${unitBlockName(unit, blocks)}|${unit.floor}`;
    const position = unit.position ?? (counters.get(key) ?? 0) + 1;
    counters.set(key, position);
    out.set(unit.id, position);
  }
  return out;
}

function withPerSqm(unit: ProjectUnit): ProjectUnit {
  return { ...unit, pricePerSqm: unit.area > 0 && unit.price > 0 ? Math.round(unit.price / unit.area) : 0 };
}

function numOrZero(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Counts are committed on blur/Enter so typing "12" never passes through "1" and drops floors. */
function BlockRow({
  block, canRemove, onCommit, onRemove,
}: {
  block: ProjectBlock;
  canRemove: boolean;
  onCommit: (next: ProjectBlock) => boolean;
  onRemove: () => void;
}) {
  const [name, setName] = useState(block.name);
  const [floors, setFloors] = useState(String(block.floors));
  const [perFloor, setPerFloor] = useState(String(block.unitsPerFloor));

  function reset() {
    setName(block.name);
    setFloors(String(block.floors));
    setPerFloor(String(block.unitsPerFloor));
  }

  useEffect(reset, [block]);

  function commit() {
    const next: ProjectBlock = {
      ...block,
      name: name.trim().toUpperCase().slice(0, 12) || block.name,
      floors: Math.min(MAX_PROJECT_FLOORS, Math.max(1, Math.round(Number(floors)) || block.floors)),
      unitsPerFloor: Math.min(MAX_UNITS_PER_FLOOR, Math.max(1, Math.round(Number(perFloor)) || block.unitsPerFloor)),
    };
    const same = next.name === block.name && next.floors === block.floors && next.unitsPerFloor === block.unitsPerFloor;
    if (same || !onCommit(next)) reset();
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
  };

  return (
    <div className="grid grid-cols-[72px_1fr_1fr_40px] gap-2 items-end">
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-1">კორპუსი</label>
        <input className={`${inputCls} text-center font-bold`} value={name} onChange={e => setName(e.target.value)} onBlur={commit} onKeyDown={onKey} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-1">სართულები</label>
        <input className={inputCls} type="number" min={1} max={MAX_PROJECT_FLOORS} value={floors} onChange={e => setFloors(e.target.value)} onBlur={commit} onKeyDown={onKey} />
      </div>
      <div>
        <label className="block text-[10px] font-semibold text-slate-400 mb-1">ბინა სართულზე</label>
        <input className={inputCls} type="number" min={1} max={MAX_UNITS_PER_FLOOR} value={perFloor} onChange={e => setPerFloor(e.target.value)} onBlur={commit} onKeyDown={onKey} />
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="h-[42px] rounded-xl border border-slate-200 text-red-500 flex items-center justify-center hover:bg-red-50 disabled:opacity-30"
        title="კორპუსის წაშლა"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [activeBlock, setActiveBlock] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [columnDraft, setColumnDraft] = useState({ area: '', bedrooms: '', pricePerSqm: '' });

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

  function movePhoto(from: number, to: number) {
    setForm(f => {
      if (to < 0 || to >= f.images.length || from === to) return f;
      const images = [...f.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...f, images };
    });
  }

  /** Re-lays the plan; existing unit data is kept by block + floor + position. */
  function applyBlocks(next: ProjectBlock[]): boolean {
    const lost = droppedUnitsWithData(form.blocks, next, form.projectUnits);
    if (lost.length && !window.confirm(
      `${lost.length} ბინა, რომელსაც უკვე აქვს ფართი, ფასი ან სტატუსი, გეგმიდან წაიშლება. გავაგრძელოთ?`,
    )) return false;
    setForm(f => {
      const projectUnits = rebuildBlockUnits(id || 'draft', f.blocks, next, f.projectUnits);
      return { ...f, blocks: next, projectUnits, ...countsOf(next, projectUnits) };
    });
    setSelectedUnitId(null);
    return true;
  }

  function addBlock() {
    const last = form.blocks[form.blocks.length - 1];
    const name = nextBlockName(form.blocks);
    const floors = last?.floors ?? Math.min(MAX_PROJECT_FLOORS, Math.max(1, Number(form.floors) || 12));
    if (applyBlocks([...form.blocks, { id: newBlockId(), name, floors, unitsPerFloor: last?.unitsPerFloor ?? 4 }])) {
      setActiveBlock(name);
    }
  }

  function commitBlock(next: ProjectBlock): boolean {
    if (form.blocks.some(b => b.id !== next.id && b.name === next.name)) {
      window.alert(`კორპუსი „${next.name}“ უკვე არსებობს`);
      return false;
    }
    const prev = form.blocks.find(b => b.id === next.id);
    const ok = applyBlocks(form.blocks.map(b => (b.id === next.id ? next : b)));
    if (ok && prev && activeBlock === prev.name) setActiveBlock(next.name);
    return ok;
  }

  function removeBlock(blockId: string) {
    const target = form.blocks.find(b => b.id === blockId);
    if (!target) return;
    const rest = form.blocks.filter(b => b.id !== blockId);
    const lost = droppedUnitsWithData(form.blocks, rest, form.projectUnits);
    if (!lost.length && !window.confirm(`წავშალოთ კორპუსი „${target.name}“?`)) return;
    applyBlocks(rest);
  }

  function updateUnit(unitId: string, patch: Partial<ProjectUnit>, byPerSqm = false) {
    setForm(f => ({
      ...f,
      projectUnits: f.projectUnits.map(unit => {
        if (unit.id !== unitId) return unit;
        const next = { ...unit, ...patch };
        if (byPerSqm) return { ...next, price: Math.round(next.area * next.pricePerSqm) };
        return 'price' in patch || 'area' in patch ? withPerSqm(next) : next;
      }),
    }));
  }

  function setFloorStatus(blockName: string, floor: number, status: ProjectUnitStatus) {
    setForm(f => ({
      ...f,
      projectUnits: f.projectUnits.map(unit => (
        unit.floor === floor && unitBlockName(unit, f.blocks) === blockName ? { ...unit, status } : unit
      )),
    }));
  }

  /** Same slot on every floor of the block — stacked flats usually share area and layout. */
  function applyToColumn(unit: ProjectUnit) {
    const area = numOrZero(columnDraft.area);
    const bedrooms = numOrZero(columnDraft.bedrooms);
    const perSqm = numOrZero(columnDraft.pricePerSqm);
    if (!area && !bedrooms && !perSqm) return;
    const blockName = unitBlockName(unit, form.blocks);
    const position = positions.get(unit.id);
    setForm(f => ({
      ...f,
      projectUnits: f.projectUnits.map(u => {
        if (unitBlockName(u, f.blocks) !== blockName || positions.get(u.id) !== position) return u;
        const next = {
          ...u,
          area: area || u.area,
          bedrooms: bedrooms ? Math.round(bedrooms) : u.bedrooms,
          pricePerSqm: perSqm || u.pricePerSqm,
        };
        if (perSqm && next.area > 0) return { ...next, price: Math.round(next.area * perSqm) };
        return area && next.price > 0 ? withPerSqm(next) : next;
      }),
    }));
  }

  const unitStats = useMemo(() => {
    const counts = { available: 0, reserved: 0, sold: 0 };
    for (const unit of form.projectUnits) counts[unit.status] += 1;
    return counts;
  }, [form.projectUnits]);

  const positions = useMemo(
    () => unitPositions(form.projectUnits, form.blocks),
    [form.projectUnits, form.blocks],
  );
  const planBlock = form.blocks.find(b => b.name === activeBlock) ?? form.blocks[0];
  const blockUnits = useMemo(
    () => (planBlock ? form.projectUnits.filter(u => unitBlockName(u, form.blocks) === planBlock.name) : []),
    [form.projectUnits, form.blocks, planBlock],
  );
  const floorsInPlan = useMemo(
    () => [...new Set(blockUnits.map(u => u.floor))].sort((a, b) => b - a),
    [blockUnits],
  );
  const selectedUnit = form.projectUnits.find(u => u.id === selectedUnitId) ?? null;
  const currencySymbol = form.priceCurrency === 'USD' ? '$' : '₾';
  const hasBlocks = form.blocks.length > 0;

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
        priceCurrency: form.priceCurrency,
        pricePerSqmFrom: Number(form.pricePerSqmFrom) || 0,
        pricePerSqmTo: Number(form.pricePerSqmTo) || 0,
        areaFrom: Number(form.areaFrom) || 0,
        areaTo: Number(form.areaTo) || 0,
        units: Number(form.units) || form.projectUnits.length,
        floors: Number(form.floors) || 1,
        buildings: Number(form.buildings) || 1,
        parking: Number(form.parking) || 0,
        greenArea: Number(form.greenArea) || 0,
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
        blocks: form.blocks,
        projectUnits: form.projectUnits,
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
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ფასის ვალუტა</span>
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                  {(['GEL', 'USD'] as const).map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => set('priceCurrency', cur)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                        form.priceCurrency === cur ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {cur === 'GEL' ? '₾ ლარი' : '$ დოლარი'}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400">ეხება ყველა ფასს: დიაპაზონს, მ²-ის ფასს და ბინების ფასებს</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>ფასი დან ({currencySymbol})</label>
                  <input className={inputCls} type="number" value={form.priceFrom} onChange={e => set('priceFrom', e.target.value)} placeholder="185000" />
                </div>
                <div>
                  <label className={labelCls}>ფასი მდე ({currencySymbol})</label>
                  <input className={inputCls} type="number" value={form.priceTo} onChange={e => set('priceTo', e.target.value)} placeholder="520000" />
                </div>
                <div>
                  <label className={labelCls}>{currencySymbol}/მ² დან</label>
                  <input className={inputCls} type="number" value={form.pricePerSqmFrom} onChange={e => set('pricePerSqmFrom', e.target.value)} placeholder="3200" />
                </div>
                <div>
                  <label className={labelCls}>{currencySymbol}/მ² მდე</label>
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
                {([
                  ['buildings', 'კორპუსები', '2', true],
                  ['floors', 'სართულიანობა', '21', true],
                  ['units', 'ბინები', '186', true],
                  ['parking', 'პარკინგი', '94', false],
                  ['greenArea', 'გამწვანება მ²', '2400', false],
                ] as const).map(([key, label, ph, fromBlocks]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      className={`${inputCls} disabled:bg-slate-50 disabled:text-slate-500`}
                      type="number"
                      value={form[key]}
                      disabled={fromBlocks && hasBlocks}
                      title={fromBlocks && hasBlocks ? 'ითვლება ბინების გეგმის კორპუსებიდან' : undefined}
                      onChange={e => set(key, e.target.value)}
                      placeholder={ph}
                    />
                  </div>
                ))}
              </div>
              {hasBlocks && (
                <p className="mt-2 text-[11px] text-slate-400">
                  კორპუსები, სართულიანობა და ბინების რაოდენობა ითვლება „ბინების გეგმიდან“ — შეცვალეთ იქ.
                </p>
              )}
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
              {form.images.length > 1 && (
                <p className="text-[11px] text-slate-400 mb-2">გადაათრიეთ ფოტო ან გამოიყენეთ ისრები რიგის შესაცვლელად.</p>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.images.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => { if (dragIndex !== null) movePhoto(dragIndex, index); setDragIndex(null); }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing transition-all ${
                      dragIndex === index ? 'opacity-40 scale-[0.98]' : ''
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-600 text-white">ყდა</span>
                    )}
                    <div className="absolute bottom-0 inset-x-0 flex items-center gap-1 p-1.5 bg-gradient-to-t from-black/75 via-black/45 to-transparent pt-6">
                      <button
                        type="button"
                        onClick={() => movePhoto(index, index - 1)}
                        disabled={index === 0}
                        className="w-6 h-6 rounded-md bg-white/95 text-slate-700 flex items-center justify-center disabled:opacity-30"
                        title="წინ"
                      >
                        <ArrowLeft size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(index, index + 1)}
                        disabled={index === form.images.length - 1}
                        className="w-6 h-6 rounded-md bg-white/95 text-slate-700 flex items-center justify-center disabled:opacity-30"
                        title="უკან"
                      >
                        <ArrowLeft size={12} className="rotate-180" />
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => movePhoto(index, 0)}
                          className="w-6 h-6 rounded-md bg-white/95 text-blue-600 flex items-center justify-center"
                          title="ყდად დაყენება"
                        >
                          <Star size={12} />
                        </button>
                      )}
                      <span className="ml-auto px-1 py-0.5 rounded bg-black/50 text-white text-[9px] font-bold tabular-nums">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))}
                        className="w-6 h-6 rounded-md bg-white/95 text-red-500 flex items-center justify-center"
                        title="წაშლა"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection id="units" title="ბინების გეგმა" desc="კორპუსები / ბლოკები, სართულები და თითოეული ბინის ფართი, ფასი, სტატუსი" icon={Layers}>
              <p className={labelCls}><Building2 size={12} /> კორპუსები / ბლოკები</p>
              <div className="space-y-2.5 mb-3">
                {form.blocks.map(block => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    canRemove
                    onCommit={commitBlock}
                    onRemove={() => removeBlock(block.id)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={addBlock}
                  disabled={form.blocks.length >= MAX_PROJECT_BLOCKS}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40"
                >
                  <Plus size={13} /> კორპუსის დამატება
                </button>
                <span className="text-[12px] text-slate-500">
                  {form.projectUnits.length} ბინა · {unitStats.available} თავისუფალი · {unitStats.reserved} დაჯავშნილი · {unitStats.sold} გაყიდული
                </span>
              </div>
              {!hasBlocks && (
                <p className="text-sm text-slate-400">
                  დაამატეთ კორპუსი და მიუთითეთ სართულები და ბინების რაოდენობა სართულზე — გეგმა ავტომატურად აეწყობა.
                  ახალი ბინები თავისუფალია, ფართისა და ფასის გარეშე.
                </p>
              )}

              {hasBlocks && planBlock && (
                <>
                  {form.blocks.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {form.blocks.map(block => chip(
                        `კორპუსი ${block.name}`,
                        block.name === planBlock.name,
                        () => { setActiveBlock(block.name); setSelectedUnitId(null); },
                        '#0f172a',
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mb-2">
                    დააჭირეთ ბინას რედაქტირებისთვის. სართულის გვერდით ღილაკები მთელ სართულს ცვლის.
                  </p>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {floorsInPlan.map(floor => (
                      <div key={floor}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="text-[11px] font-bold text-slate-400">სართული {floor}</p>
                          <div className="flex gap-1 ml-auto">
                            {UNIT_STATUSES.map(status => (
                              <button
                                key={status}
                                type="button"
                                onClick={() => setFloorStatus(planBlock.name, floor, status)}
                                className="px-1.5 py-0.5 rounded-md text-[9px] font-bold border"
                                style={{ background: UNIT_META[status].bg, color: UNIT_META[status].color, borderColor: `${UNIT_META[status].color}33` }}
                                title={`მთელი სართული: ${UNIT_META[status].label}`}
                              >
                                ყველა {UNIT_META[status].label.toLowerCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {blockUnits.filter(u => u.floor === floor).map(unit => {
                            const meta = UNIT_META[unit.status];
                            const active = unit.id === selectedUnitId;
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                onClick={() => setSelectedUnitId(active ? null : unit.id)}
                                title={`${unit.number} · ${meta.label}`}
                                className="min-w-[58px] px-2 py-1 rounded-lg text-[10px] font-bold border text-left leading-tight"
                                style={{
                                  background: meta.bg,
                                  color: meta.color,
                                  borderColor: active ? '#2563eb' : `${meta.color}33`,
                                  boxShadow: active ? '0 0 0 2px rgba(37,99,235,0.35)' : undefined,
                                }}
                              >
                                <span className="block">{unit.number}</span>
                                <span className="block text-[9px] font-semibold opacity-70">
                                  {unit.area > 0 ? `${unit.area} მ²` : '—'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedUnit && (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <p className="font-extrabold text-slate-800 text-sm">
                          ბინა №{selectedUnit.number}
                          <span className="ml-2 text-[11px] font-semibold text-slate-500">
                            {unitBlockName(selectedUnit, form.blocks) && `კორპუსი ${unitBlockName(selectedUnit, form.blocks)} · `}
                            სართული {selectedUnit.floor} · პოზიცია {positions.get(selectedUnit.id)}
                          </span>
                        </p>
                        <button type="button" onClick={() => setSelectedUnitId(null)} className="p-1 rounded-lg text-slate-400 hover:bg-white" title="დახურვა">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">ფართი მ²</label>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={selectedUnit.area || ''}
                            onChange={e => updateUnit(selectedUnit.id, { area: numOrZero(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">ოთახები</label>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={selectedUnit.bedrooms || ''}
                            onChange={e => updateUnit(selectedUnit.id, { bedrooms: Math.round(numOrZero(e.target.value)) })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">ფასი ({currencySymbol})</label>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={selectedUnit.price || ''}
                            onChange={e => updateUnit(selectedUnit.id, { price: numOrZero(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">{currencySymbol}/მ²</label>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={selectedUnit.pricePerSqm || ''}
                            disabled={!selectedUnit.area}
                            title={selectedUnit.area ? 'ფასი გადაითვლება: ფართი × მ²-ის ფასი' : 'ჯერ მიუთითეთ ფართი'}
                            onChange={e => updateUnit(selectedUnit.id, { pricePerSqm: numOrZero(e.target.value) }, true)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {UNIT_STATUSES.map(status => chip(
                          UNIT_META[status].label,
                          selectedUnit.status === status,
                          () => updateUnit(selectedUnit.id, { status }),
                          UNIT_META[status].color,
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-blue-100">
                        <p className="text-[11px] font-bold text-slate-600 mb-1">
                          მთელ სვეტზე გავრცელება (პოზიცია {positions.get(selectedUnit.id)}, ყველა სართული)
                        </p>
                        <p className="text-[11px] text-slate-400 mb-2">
                          შეავსეთ მხოლოდ ის, რაც უნდა შეიცვალოს. ფასი = ფართი × მ²-ის ფასი.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            placeholder="ფართი მ²"
                            value={columnDraft.area}
                            onChange={e => setColumnDraft(d => ({ ...d, area: e.target.value }))}
                          />
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            placeholder="ოთახები"
                            value={columnDraft.bedrooms}
                            onChange={e => setColumnDraft(d => ({ ...d, bedrooms: e.target.value }))}
                          />
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            placeholder={`${currencySymbol}/მ²`}
                            value={columnDraft.pricePerSqm}
                            onChange={e => setColumnDraft(d => ({ ...d, pricePerSqm: e.target.value }))}
                          />
                          <button
                            type="button"
                            onClick={() => applyToColumn(selectedUnit)}
                            disabled={!columnDraft.area && !columnDraft.bedrooms && !columnDraft.pricePerSqm}
                            className="h-[42px] px-3 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-40"
                          >
                            სვეტზე გავრცელება
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
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
                      {currencySymbol}{Number(form.priceFrom).toLocaleString()}+
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
