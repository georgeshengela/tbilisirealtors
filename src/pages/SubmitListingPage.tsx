/**
 * Listing form for public members — add a new one or fix one that was sent back.
 *
 * There is deliberately no owner PII, no contracts, no internal notes, no
 * billing and no VIP/featured flags here: the server refuses those fields from
 * a member account anyway, and every save lands in the moderation queue
 * rather than going live.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BedDouble, Building2, Castle, Check, ChevronLeft, ChevronRight, Home, ImagePlus,
  LandPlot, Loader2, MapPin, Send, ShieldCheck, Star, Store, X,
} from 'lucide-react';
import { useAccountRequest, useUserAuth } from '../contexts/UserAuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { CITY_AREAS, chunkDistrictOptions, districtOptions } from '../data/districts';
import { useTranslation } from '../i18n/LocaleContext';
import { cloudinarySized } from '../lib/imageUrl';
import { Alert, Spinner, btnBlue, btnGhost, card, inputCls, useToast } from '../components/account/ui';
import { StatusPill, isSentBack } from '../components/account/MyListingRow';
import { useAccountData } from './account/AccountLayout';

const PROPERTY_TYPES = [
  { value: 'apartment', icon: Building2 },
  { value: 'house', icon: Home },
  { value: 'villa', icon: Castle },
  { value: 'commercial', icon: Store },
  { value: 'land', icon: LandPlot },
] as const;
const MAX_PHOTOS = 15;

interface FormState {
  title: string;
  description: string;
  price: string;
  priceCurrency: 'GEL' | 'USD';
  type: string;
  status: 'sale' | 'rent';
  city: string;
  district: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  floor: string;
  totalFloors: string;
  yearBuilt: string;
  images: string[];
}

type ErrorKey = 'title' | 'price' | 'district' | 'area' | 'images';

const emptyForm: FormState = {
  title: '', description: '', price: '', priceCurrency: 'USD',
  type: 'apartment', status: 'sale',
  city: 'თბილისი', district: '', address: '',
  bedrooms: '', bathrooms: '', area: '', floor: '', totalFloors: '', yearBuilt: '',
  images: [],
};

const labelCls = 'block text-[13px] font-bold text-slate-700 mb-1.5';
const selectCls = (invalid?: boolean) => `${inputCls(invalid)} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2364748b' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_14px_center] pr-10`;

function Step({ n, title, children, id }: { n: number; title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={`${card} p-5 sm:p-6 scroll-mt-32`}>
      <div className="flex items-center gap-3 mb-5">
        <span className="w-7 h-7 rounded-full bg-slate-900 text-white text-[13px] font-bold flex items-center justify-center flex-shrink-0">{n}</span>
        <h2 className="font-bold text-slate-900 text-[17px]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ErrorText({ text }: { text?: string }) {
  return text ? <p className="mt-1.5 text-xs font-semibold text-red-600">{text}</p> : null;
}

export default function SubmitListingPage() {
  const { t, locale } = useTranslation();
  const tx = (key: string, vars?: Record<string, string | number>) => t(`account.submit.${key}`, vars);
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const toast = useToast();

  const { user, token } = useUserAuth();
  const request = useAccountRequest();
  const { reload } = useAccountData();
  const { upload, uploading, progress, error: uploadError } = useFileUpload(token);
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [original, setOriginal] = useState<{ status: string; note: string | null } | null>(null);
  const [loading, setLoading] = useState(Boolean(editId));
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [dropActive, setDropActive] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => (key in e ? { ...e, [key]: undefined } : e));
  }, []);

  useEffect(() => {
    if (!editId) {
      setForm(emptyForm);
      setOriginal(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    request(`/my-listings/${encodeURIComponent(editId)}`)
      .then(found => {
        if (cancelled) return;
        setOriginal({ status: found.moderationStatus, note: found.moderationNote ?? null });
        setForm({
          title: found.title ?? '',
          description: found.description ?? '',
          price: found.price ? String(Math.round(Number(found.price))) : '',
          priceCurrency: found.priceCurrency === 'USD' ? 'USD' : 'GEL',
          type: found.type ?? 'apartment',
          status: found.status === 'rent' ? 'rent' : 'sale',
          city: found.city ?? 'თბილისი',
          district: found.district ?? '',
          address: found.address ?? '',
          bedrooms: found.bedrooms != null ? String(found.bedrooms) : '',
          bathrooms: found.bathrooms != null ? String(found.bathrooms) : '',
          area: found.area ? String(Number(found.area)) : '',
          floor: found.floor != null ? String(found.floor) : '',
          totalFloors: found.totalFloors != null ? String(found.totalFloors) : '',
          yearBuilt: found.yearBuilt != null ? String(found.yearBuilt) : '',
          images: Array.isArray(found.images) ? found.images : [],
        });
      })
      .catch(err => { if (!cancelled) setLoadError(err instanceof Error ? err.message : t('account.common.error')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [editId, request, t]);

  const city = CITY_AREAS.find(item => item.ka === form.city) ?? CITY_AREAS[0];
  const districtChunks = useMemo(() => chunkDistrictOptions(districtOptions(city, [], locale)), [city, locale]);
  const symbol = form.priceCurrency === 'USD' ? '$' : '₾';
  const perSqm = Number(form.price) > 0 && Number(form.area) > 0 ? Math.round(Number(form.price) / Number(form.area)) : 0;

  async function addPhotos(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter(file => file.type.startsWith('image/'));
    if (fileInput.current) fileInput.current.value = '';
    const room = MAX_PHOTOS - form.images.length;
    if (!list.length || room <= 0) return;
    const uploaded = await upload(list.slice(0, room));
    if (uploaded.length) {
      setForm(f => ({ ...f, images: [...f.images, ...uploaded.map(file => file.url)].slice(0, MAX_PHOTOS) }));
      setErrors(e => ({ ...e, images: undefined }));
    }
  }

  function movePhoto(from: number, to: number) {
    if (to < 0 || to >= form.images.length || from === to) return;
    setForm(f => {
      const next = [...f.images];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...f, images: next };
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDropActive(false);
    if (event.dataTransfer.files?.length) void addPhotos(event.dataTransfer.files);
  }

  const checks: { key: ErrorKey; label: string; ok: boolean }[] = [
    { key: 'images', label: tx('checkPhotos'), ok: form.images.length > 0 },
    { key: 'title', label: tx('checkTitle'), ok: form.title.trim().length >= 5 },
    { key: 'price', label: tx('checkPrice'), ok: Number(form.price) > 0 },
    { key: 'district', label: tx('checkLocation'), ok: Boolean(form.district) },
    { key: 'area', label: tx('checkArea'), ok: Number(form.area) > 0 },
  ];
  const ready = checks.every(item => item.ok);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || uploading) return;
    setError('');

    const found: Partial<Record<ErrorKey, string>> = {};
    for (const check of checks) {
      if (!check.ok) found[check.key] = check.key === 'images' ? tx('photosRequired') : tx('required');
    }
    setErrors(found);
    if (Object.keys(found).length) {
      setError(tx('fixErrors'));
      const first = ['images', 'title', 'price', 'district', 'area'].find(key => key in found);
      document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const numeric = (value: string) => (value.trim() === '' ? null : Number(value));
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: form.price,
      priceCurrency: form.priceCurrency,
      rentPrice: form.status === 'rent' ? form.price : null,
      type: form.type,
      status: form.status,
      city: form.city,
      district: form.district,
      address: form.address.trim(),
      bedrooms: numeric(form.bedrooms),
      bathrooms: numeric(form.bathrooms),
      area: form.area || null,
      floor: numeric(form.floor),
      totalFloors: numeric(form.totalFloors),
      yearBuilt: numeric(form.yearBuilt),
      images: form.images,
    };

    setSaving(true);
    try {
      await request(editId ? `/my-listings/${encodeURIComponent(editId)}` : '/my-listings', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      await reload();
      toast(editId ? tx('sentEdit') : tx('sentNew'));
      navigate('/dashboard/listings', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.common.error'));
      setSaving(false);
    }
  }

  if (!user) return null;
  if (loading) return <Spinner />;

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{loadError}</Alert>
        <Link to="/dashboard/listings" className={btnGhost}><ArrowLeft size={16} /> {tx('back')}</Link>
      </div>
    );
  }

  const numberField = (key: 'bedrooms' | 'bathrooms' | 'floor' | 'totalFloors' | 'yearBuilt', label: string, placeholder: string) => (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className={inputCls()}
      />
    </label>
  );

  return (
    <form onSubmit={submit} noValidate>
      <Link to="/dashboard/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft size={16} /> {tx('back')}
      </Link>
      <div className="flex flex-wrap items-center gap-3 mb-1.5">
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-tight">{editId ? tx('editTitle') : tx('newTitle')}</h1>
        {original && <StatusPill status={original.status} />}
      </div>
      <p className="text-sm text-slate-500 mb-6">{tx('subtitle')}</p>

      {original && isSentBack(original.status) && original.note && (
        <div className="mb-5">
          <Alert tone="error" title={t('account.listings.rejectedNote')}>{original.note}</Alert>
        </div>
      )}
      {editId && original?.status === 'approved' && (
        <div className="mb-5"><Alert tone="info">{t('account.listings.editWarning')}</Alert></div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
        <div className="space-y-5 min-w-0">
          {/* 1. Deal and type */}
          <Step n={1} title={tx('stepDeal')}>
            <span className={labelCls}>{tx('deal')}</span>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 mb-5 max-w-sm">
              {(['sale', 'rent'] as const).map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('status', value)}
                  className={`h-10 rounded-lg text-sm font-bold transition ${form.status === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {tx(value)}
                </button>
              ))}
            </div>

            <span className={labelCls}>{tx('type')}</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PROPERTY_TYPES.map(({ value, icon: Icon }) => {
                const active = form.type === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('type', value)}
                    aria-pressed={active}
                    className={`flex flex-col items-center justify-center gap-1.5 h-[76px] rounded-xl border text-[13px] font-bold transition ${
                      active ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} />
                    {t(`propertyTypes.${value}`)}
                  </button>
                );
              })}
            </div>
          </Step>

          {/* 2. Location */}
          <Step n={2} title={tx('stepLocation')}>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>{t('submit.city')}</span>
                <select value={form.city} onChange={e => { set('city', e.target.value); set('district', ''); }} className={selectCls()}>
                  {CITY_AREAS.map(item => (
                    <option key={item.ka} value={item.ka}>{locale === 'ka' ? item.ka : item.en}</option>
                  ))}
                </select>
              </label>
              <label className="block" id="field-district">
                <span className={labelCls}>{t('submit.district')} *</span>
                <select value={form.district} onChange={e => set('district', e.target.value)} className={selectCls(Boolean(errors.district))}>
                  <option value="">{t('submit.pickDistrict')}</option>
                  {districtChunks.map(chunk => chunk.group ? (
                    <optgroup key={chunk.key} label={chunk.group}>
                      {chunk.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </optgroup>
                  ) : chunk.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>))}
                </select>
                <ErrorText text={errors.district} />
              </label>
            </div>
            <label className="block mt-4">
              <span className={labelCls}>{t('submit.address')}</span>
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                maxLength={300}
                placeholder={t('submit.addressPlaceholder')}
                className={inputCls()}
              />
            </label>
          </Step>

          {/* 3. Details */}
          <Step n={3} title={tx('stepDetails')}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <label className="block" id="field-area">
                <span className={labelCls}>{t('submit.area')} (მ²) *</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                  placeholder="85"
                  className={inputCls(Boolean(errors.area))}
                />
                <ErrorText text={errors.area} />
              </label>
              {form.type !== 'land' && (
                <>
                  {numberField('bedrooms', t('submit.bedrooms'), '2')}
                  {numberField('bathrooms', t('submit.bathrooms'), '1')}
                  {numberField('floor', t('submit.floor'), '5')}
                  {numberField('totalFloors', t('submit.totalFloors'), '12')}
                  {numberField('yearBuilt', t('submit.yearBuilt'), '2020')}
                </>
              )}
            </div>
          </Step>

          {/* 4. Price */}
          <Step n={4} title={tx('stepPrice')}>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_auto] gap-4 items-start" id="field-price">
              <label className="block">
                <span className={labelCls}>{form.status === 'rent' ? tx('priceRent') : tx('priceSale')} *</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{symbol}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder={form.status === 'rent' ? '1200' : '150000'}
                    className={`${inputCls(Boolean(errors.price))} pl-9 text-lg font-bold`}
                  />
                </div>
                {errors.price
                  ? <ErrorText text={errors.price} />
                  : perSqm > 0 && form.status === 'sale' && (
                    <p className="mt-1.5 text-xs text-slate-500">{tx('perSqm', { value: `${symbol}${perSqm.toLocaleString()}` })}</p>
                  )}
              </label>
              <div>
                <span className={labelCls}>{tx('currency')}</span>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 w-[132px]">
                  {(['USD', 'GEL'] as const).map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => set('priceCurrency', code)}
                      className={`h-10 rounded-lg text-[15px] font-bold transition ${form.priceCurrency === code ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                    >
                      {code === 'USD' ? '$' : '₾'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Step>

          {/* 5. Title and description */}
          <Step n={5} title={tx('stepAbout')}>
            <label className="block" id="field-title">
              <span className={labelCls}>{t('submit.listingTitle')} *</span>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                maxLength={200}
                placeholder={tx('titleHint')}
                className={inputCls(Boolean(errors.title))}
              />
              <ErrorText text={errors.title} />
            </label>
            <label className="block mt-4">
              <span className={labelCls}>{t('submit.description')}</span>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder={tx('descriptionHint')}
                className={`${inputCls()} h-auto py-3 resize-y min-h-[140px] leading-relaxed`}
              />
              <span className="block text-right text-xs text-slate-400 mt-1 tabular-nums">{form.description.length}/3000</span>
            </label>
          </Step>

          {/* 6. Photos */}
          <Step n={6} title={tx('stepPhotos')} id="field-images">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              multiple
              className="sr-only"
              onChange={e => void addPhotos(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              onDragOver={e => { e.preventDefault(); setDropActive(true); }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDrop}
              disabled={uploading || form.images.length >= MAX_PHOTOS}
              className={`w-full py-9 px-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition disabled:opacity-60 ${
                errors.images ? 'border-red-300 bg-red-50/40'
                  : dropActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40'
              }`}
            >
              <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                {uploading ? <Loader2 size={22} className="animate-spin" /> : <ImagePlus size={22} />}
              </span>
              <span className="text-sm font-bold text-slate-800 text-center">
                {uploading && progress ? tx('photosUploading', { done: progress.done, total: progress.total }) : tx('photosDrop')}
              </span>
              <span className="text-xs text-slate-500 text-center">{tx('photosRule', { max: MAX_PHOTOS })} · {form.images.length}/{MAX_PHOTOS}</span>
            </button>
            <ErrorText text={errors.images} />
            {uploadError && <div className="mt-3"><Alert tone="error">{uploadError}</Alert></div>}

            {form.images.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {form.images.map((url, index) => (
                  <li
                    key={url}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragIndex !== null) movePhoto(dragIndex, index);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 group cursor-grab active:cursor-grabbing ring-offset-2 ${
                      index === 0 ? 'ring-2 ring-blue-600' : ''
                    } ${dragIndex === index ? 'opacity-50' : ''}`}
                  >
                    <img src={cloudinarySized(url, 400)} alt="" className="w-full h-full object-cover pointer-events-none" />
                    {index === 0 && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold">
                        <Star size={11} fill="currentColor" /> {tx('cover')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => set('images', form.images.filter(item => item !== url))}
                      aria-label={tx('remove')}
                      className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/95 text-slate-700 hover:text-red-600 shadow flex items-center justify-center"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <button type="button" onClick={() => movePhoto(index, index - 1)} disabled={index === 0} aria-label={tx('moveLeft')} className="w-7 h-7 rounded-lg bg-white/95 shadow flex items-center justify-center text-slate-700 disabled:opacity-40">
                        <ChevronLeft size={15} />
                      </button>
                      <button type="button" onClick={() => movePhoto(index, index + 1)} disabled={index === form.images.length - 1} aria-label={tx('moveRight')} className="w-7 h-7 rounded-lg bg-white/95 shadow flex items-center justify-center text-slate-700 disabled:opacity-40">
                        <ChevronRight size={15} />
                      </button>
                      {index > 0 && (
                        <button type="button" onClick={() => movePhoto(index, 0)} className="ml-auto h-7 px-2 rounded-lg bg-white/95 shadow text-[11px] font-bold text-slate-700 hover:text-blue-700">
                          {tx('makeCover')}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Step>
        </div>

        {/* Summary column */}
        <aside className="space-y-4 xl:sticky" style={{ top: 'calc(var(--site-header-h) + 24px)' }}>
          <div className={`${card} overflow-hidden hidden xl:block`}>
            <p className="px-4 pt-3.5 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{tx('previewTitle')}</p>
            <div className="aspect-[4/3] bg-slate-100 mx-4 rounded-xl overflow-hidden flex items-center justify-center">
              {form.images[0]
                ? <img src={cloudinarySized(form.images[0], 600)} alt="" className="w-full h-full object-cover" />
                : <ImagePlus size={26} className="text-slate-300" />}
            </div>
            <div className="p-4">
              <p className="text-lg font-bold text-slate-900">
                {Number(form.price) > 0 ? `${symbol}${Number(form.price).toLocaleString()}` : `${symbol} —`}
                {form.status === 'rent' && <span className="text-sm text-slate-500 font-semibold">{t('common.perMonth')}</span>}
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-1 line-clamp-2">{form.title || <span className="text-slate-300">{tx('previewEmpty')}</span>}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                {form.district && <span className="inline-flex items-center gap-1"><MapPin size={12} />{form.district}</span>}
                {Number(form.area) > 0 && <span>{form.area} მ²</span>}
                {Number(form.bedrooms) > 0 && <span className="inline-flex items-center gap-1"><BedDouble size={12} />{form.bedrooms}</span>}
              </div>
            </div>
          </div>

          <div className={`${card} p-4`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">{tx('checklist')}</p>
            <ul className="space-y-2">
              {checks.map(item => (
                <li key={item.key} className="flex items-center gap-2.5 text-sm">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition ${item.ok ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200'}`}>
                    {item.ok && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className={item.ok ? 'text-slate-700 font-semibold' : 'text-slate-500'}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-blue-900"><ShieldCheck size={16} /> {tx('reviewTitle')}</p>
            <ol className="mt-2 space-y-1.5 text-[13px] text-blue-900/80 list-decimal pl-5 leading-relaxed">
              <li>{tx('review1')}</li>
              <li>{tx('review2')}</li>
              <li>{tx('review3')}</li>
            </ol>
          </div>

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={saving || uploading} className={`${btnBlue} h-12 w-full ${ready ? '' : 'bg-blue-600/90'}`}>
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              {editId ? tx('resend') : tx('send')}
            </button>
            <Link to="/dashboard/listings" className={`${btnGhost} w-full`}>{tx('cancel')}</Link>
          </div>
        </aside>
      </div>
    </form>
  );
}
