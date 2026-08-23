/**
 * Listing submission for public members — a trimmed version of the admin form.
 *
 * There is deliberately no owner PII, no contracts, no internal notes, no
 * billing and no VIP/featured flags here: the server refuses those fields from
 * a member account anyway, and every submission lands in the moderation queue
 * rather than going live.
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, Building2, ImagePlus, Info, Loader2, ShieldCheck, X,
} from 'lucide-react';
import { useAccountRequest, useUserAuth } from '../contexts/UserAuthContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { CITY_AREAS, districtLabel } from '../data/districts';
import { useTranslation } from '../i18n/LocaleContext';

const PROPERTY_TYPES = ['apartment', 'house', 'commercial', 'land', 'villa'] as const;
const DEAL_STATUS = ['sale', 'rent'] as const;
const MAX_PHOTOS = 15;

interface FormState {
  title: string;
  description: string;
  price: string;
  rentPrice: string;
  type: string;
  status: string;
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

const emptyForm: FormState = {
  title: '', description: '', price: '', rentPrice: '',
  type: 'apartment', status: 'sale',
  city: 'თბილისი', district: '', address: '',
  bedrooms: '', bathrooms: '', area: '', floor: '', totalFloors: '', yearBuilt: '',
  images: [],
};

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 ' +
  'text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500';

const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5';

const CARD = 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700';

export default function SubmitListingPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('id');

  const { user, token } = useUserAuth();
  const request = useAccountRequest();
  const { upload, uploading, error: uploadError } = useFileUpload(token);
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;

    request('/my-listings')
      .then(res => {
        if (cancelled) return;
        const found = (res.data ?? []).find((row: { id: string }) => row.id === editId);
        if (!found) {
          setError(t('submit.notFound'));
          return;
        }
        setForm({
          title: found.title ?? '',
          description: found.description ?? '',
          price: found.price ? String(found.price) : '',
          rentPrice: found.rentPrice ? String(found.rentPrice) : '',
          type: found.type ?? 'apartment',
          status: found.status ?? 'sale',
          city: found.city ?? 'თბილისი',
          district: found.district ?? '',
          address: found.address ?? '',
          bedrooms: found.bedrooms != null ? String(found.bedrooms) : '',
          bathrooms: found.bathrooms != null ? String(found.bathrooms) : '',
          area: found.area ? String(found.area) : '',
          floor: found.floor != null ? String(found.floor) : '',
          totalFloors: found.totalFloors != null ? String(found.totalFloors) : '',
          yearBuilt: found.yearBuilt != null ? String(found.yearBuilt) : '',
          images: Array.isArray(found.images) ? found.images : [],
        });
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [editId, request, t]);

  const city = CITY_AREAS.find(item => item.ka === form.city) ?? CITY_AREAS[0];

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - form.images.length;
    if (room <= 0) return;

    const uploaded = await upload(Array.from(files).slice(0, room));
    if (uploaded.length) {
      setForm(f => ({ ...f, images: [...f.images, ...uploaded.map(file => file.url)] }));
    }
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    if (!form.title.trim()) {
      setError(t('submit.titleRequired'));
      return;
    }
    if (!form.price.trim()) {
      setError(t('submit.priceRequired'));
      return;
    }

    setSaving(true);
    setError('');

    const numeric = (value: string) => (value.trim() === '' ? null : Number(value));

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: form.price,
      rentPrice: form.rentPrice || null,
      type: form.type,
      status: form.status,
      city: form.city,
      district: form.district,
      address: form.address,
      bedrooms: numeric(form.bedrooms),
      bathrooms: numeric(form.bathrooms),
      area: form.area || null,
      floor: numeric(form.floor),
      totalFloors: numeric(form.totalFloors),
      yearBuilt: numeric(form.yearBuilt),
      images: form.images,
    };

    try {
      await request(editId ? `/my-listings/${editId}` : '/my-listings', {
        method: editId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/dashboard?tab=listings', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 page-under-header flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 page-under-header">
      <div className="container-xl py-8 max-w-3xl">
        <Link
          to="/dashboard?tab=listings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 mb-5"
        >
          <ArrowLeft size={16} />
          {t('dashboard.myListings')}
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
          {editId ? t('submit.editTitle') : t('submit.title')}
        </h1>
        <p className="text-sm text-slate-500 mb-6">{t('submit.subtitle')}</p>

        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-6">
          <ShieldCheck size={17} className="mt-0.5 flex-shrink-0" />
          <span>{t('submit.moderationNotice')}</span>
        </div>

        {(error || uploadError) && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold mb-6">
            <AlertCircle size={16} />
            {error || uploadError}
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          {/* Basics */}
          <div className={`${CARD} p-6 space-y-5`}>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">{t('submit.basics')}</h2>

            <label className="block">
              <span className={labelCls}>{t('submit.listingTitle')} *</span>
              <input
                value={form.title}
                onChange={e => set('title', e.target.value)}
                required
                maxLength={200}
                placeholder={t('submit.titlePlaceholder')}
                className={inputCls}
              />
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>{t('submit.type')}</span>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                  {PROPERTY_TYPES.map(value => (
                    <option key={value} value={value}>{t(`propertyTypes.${value}`)}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelCls}>{t('submit.deal')}</span>
                <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                  {DEAL_STATUS.map(value => (
                    <option key={value} value={value}>{t(`propertyStatus.${value}`)}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>{t('submit.price')} (₾) *</span>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={e => set('price', e.target.value)}
                  required
                  placeholder="150000"
                  className={inputCls}
                />
              </label>

              {form.status === 'rent' && (
                <label className="block">
                  <span className={labelCls}>{t('submit.rentPrice')} (₾)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.rentPrice}
                    onChange={e => set('rentPrice', e.target.value)}
                    placeholder="1200"
                    className={inputCls}
                  />
                </label>
              )}
            </div>

            <label className="block">
              <span className={labelCls}>{t('submit.description')}</span>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5}
                maxLength={3000}
                placeholder={t('submit.descriptionPlaceholder')}
                className={`${inputCls} resize-none`}
              />
              <span className="block text-right text-xs text-slate-400 mt-1">
                {form.description.length}/3000
              </span>
            </label>
          </div>

          {/* Location */}
          <div className={`${CARD} p-6 space-y-5`}>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">{t('submit.location')}</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>{t('submit.city')}</span>
                <select
                  value={form.city}
                  onChange={e => { set('city', e.target.value); set('district', ''); }}
                  className={inputCls}
                >
                  {CITY_AREAS.map(item => (
                    <option key={item.ka} value={item.ka}>
                      {locale === 'ka' ? item.ka : item.en}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelCls}>{t('submit.district')}</span>
                <select value={form.district} onChange={e => set('district', e.target.value)} className={inputCls}>
                  <option value="">{t('submit.pickDistrict')}</option>
                  {city.districts.map(district => (
                    <option key={district.ka} value={district.ka}>
                      {districtLabel(district, locale)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className={labelCls}>{t('submit.address')}</span>
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                maxLength={300}
                placeholder={t('submit.addressPlaceholder')}
                className={inputCls}
              />
            </label>
          </div>

          {/* Details */}
          <div className={`${CARD} p-6 space-y-5`}>
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">{t('submit.details')}</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {([
                ['area', `${t('submit.area')} (მ²)`, '75'],
                ['bedrooms', t('submit.bedrooms'), '2'],
                ['bathrooms', t('submit.bathrooms'), '1'],
                ['floor', t('submit.floor'), '5'],
                ['totalFloors', t('submit.totalFloors'), '12'],
                ['yearBuilt', t('submit.yearBuilt'), '2020'],
              ] as const).map(([key, label, placeholder]) => (
                <label key={key} className="block">
                  <span className={labelCls}>{label}</span>
                  <input
                    type="number"
                    min="0"
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                    className={inputCls}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div className={`${CARD} p-6`}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-slate-800 dark:text-white text-sm">{t('submit.photos')}</h2>
              <span className="text-xs text-slate-400">{form.images.length}/{MAX_PHOTOS}</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">{t('submit.photosHint')}</p>

            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => void addPhotos(e.target.files)}
            />

            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || form.images.length >= MAX_PHOTOS}
              className="w-full py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
            >
              {uploading
                ? <Loader2 size={22} className="animate-spin" />
                : <ImagePlus size={22} />}
              <span className="text-sm font-semibold">{t('submit.addPhotos')}</span>
            </button>

            {form.images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                {form.images.map((url, index) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold">
                        {t('submit.cover')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => set('images', form.images.filter(item => item !== url))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-white/90 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">
            <Info size={15} className="mt-0.5 flex-shrink-0" />
            <span>{t('submit.contactNotice')}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Building2 size={16} />}
              {editId ? t('submit.resubmit') : t('submit.send')}
            </button>
            <Link
              to="/dashboard?tab=listings"
              className="px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {t('common.cancel')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
