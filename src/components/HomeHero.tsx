import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bed, ChevronDown, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import {
  bedroomOptions,
  cityFilterOptions,
  dealTypeOptions,
  propertyTypeFilterOptions,
} from '../i18n/labels';
import { districtLabel, findCityArea, findDistrictArea } from '../data/districts';
import { listingsHref } from '../lib/seoListingsUrl';

const POPULAR_AREAS = [
  { city: 'თბილისი', district: 'ვაკე', count: 842 },
  { city: 'თბილისი', district: 'საბურთალო', count: 614 },
  { city: 'თბილისი', district: 'ისანი', count: 398 },
  { city: 'თბილისი', district: 'ნაძალადევი', count: 271 },
  { city: 'ბათუმი', district: 'რუსთაველი', count: 503 },
  { city: 'ბათუმი', district: 'ძველი ბათუმი', count: 389 },
] as const;

const PRICE_PRESETS_GEL = [50000, 100000, 200000, 350000, 500000, 1000000];

const EMPTY_FORM = {
  city: '',
  district: '',
  type: '',
  bedrooms: '',
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  propType: '',
};

type OpenField = 'location' | 'beds' | 'price' | null;
type Sheet = 'location' | 'beds' | 'price' | null;

export default function HomeHero() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { formatMoney, currencySymbol, displayToGel, gelToDisplay } = useCurrency();

  const propertyTypeShortOpts = useMemo(() => propertyTypeFilterOptions(t, true), [t]);
  const propertyTypeOpts = useMemo(() => propertyTypeFilterOptions(t), [t]);
  const dealTypeOpts = useMemo(() => dealTypeOptions(t).filter(d => d.v === 'sale' || d.v === 'rent'), [t]);
  const bedroomOpts = useMemo(() => bedroomOptions(t), [t]);
  const cityOpts = useMemo(() => cityFilterOptions(t), [t]);

  const [tab, setTab] = useState<'sale' | 'rent'>('sale');
  const [form, setForm] = useState(EMPTY_FORM);
  const [openField, setOpenField] = useState<OpenField>(null);
  const [mobileSheet, setMobileSheet] = useState<Sheet>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pricePresets = useMemo(
    () => PRICE_PRESETS_GEL.map(maxGel => ({
      maxGel,
      label: formatMoney(maxGel, { compact: true }),
      displayMax: String(gelToDisplay(maxGel)),
    })),
    [formatMoney, gelToDisplay],
  );

  const popularAreas = useMemo(
    () => POPULAR_AREAS.map(area => {
      const city = findCityArea(area.city);
      const district = findDistrictArea(city, area.district);
      return {
        ...area,
        label: district ? districtLabel(district, locale) : area.district,
        cityLabel: city ? t(city.labelKey) : area.city,
      };
    }),
    [locale, t],
  );

  const locationLabel = useMemo(() => {
    const city = findCityArea(form.city);
    const district = findDistrictArea(city, form.district);
    return [
      district ? districtLabel(district, locale) : form.district,
      city ? t(city.labelKey) : form.city,
    ].filter(Boolean).join(', ');
  }, [form.city, form.district, locale, t]);

  const priceSummary = useMemo(() => {
    const minGel = form.priceMin ? displayToGel(Number(form.priceMin)) : 0;
    const maxGel = form.priceMax ? displayToGel(Number(form.priceMax)) : 0;
    if (form.priceMin && form.priceMax) return `${formatMoney(minGel)} – ${formatMoney(maxGel)}`;
    if (form.priceMax) return t('home.upToPrice', { amount: formatMoney(maxGel) });
    if (form.priceMin) return t('home.fromPricePlus', { amount: formatMoney(minGel) });
    return t('common.any');
  }, [form.priceMin, form.priceMax, formatMoney, displayToGel, t]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenField(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!mobileSheet && !filterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileSheet, filterOpen]);

  function toggleField(field: Exclude<OpenField, null>) {
    setOpenField(current => (current === field ? null : field));
  }

  function handleSearch() {
    navigate(listingsHref({
      status: tab || undefined,
      city: form.city || undefined,
      district: form.district || undefined,
      type: form.propType || form.type || undefined,
      bedrooms: form.bedrooms || undefined,
      priceMin: form.priceMin ? String(displayToGel(Number(form.priceMin))) : undefined,
      priceMax: form.priceMax ? String(displayToGel(Number(form.priceMax))) : undefined,
      areaMin: form.areaMin || undefined,
      areaMax: form.areaMax || undefined,
    }));
    setFilterOpen(false);
    setMobileSheet(null);
    setOpenField(null);
  }

  const locationPop = (
    <>
      <p className="home-search__pop-label">{t('home.city')}</p>
      <div className="home-search__chips" style={{ marginBottom: 12 }}>
        {cityOpts.slice(0, 6).map(c => (
          <button
            key={c.v || 'all'}
            type="button"
            className={`home-search__chip ${form.city === c.v ? 'is-on' : ''}`}
            onClick={() => { setForm(f => ({ ...f, city: c.v, district: '' })); setOpenField(null); setMobileSheet(null); }}
          >
            {c.l}
          </button>
        ))}
      </div>
      <p className="home-search__pop-label">{t('home.popularDistricts')}</p>
      {popularAreas.map(opt => (
        <button
          key={`${opt.city}-${opt.district}`}
          type="button"
          className="home-search__area"
          onClick={() => { setForm(f => ({ ...f, city: opt.city, district: opt.district })); setOpenField(null); setMobileSheet(null); }}
        >
          <span className="home-search__area-mark"><MapPin size={13} /></span>
          <span className="home-search__area-text">
            <strong>{opt.label}</strong>
            <span>{opt.cityLabel}</span>
          </span>
          <em>{opt.count.toLocaleString()}</em>
        </button>
      ))}
    </>
  );

  const bedsPop = (
    <div className="home-search__grid">
      {bedroomOpts.map(opt => (
        <button
          key={opt.v || 'any'}
          type="button"
          className={form.bedrooms === opt.v ? 'is-on' : ''}
          onClick={() => { setForm(f => ({ ...f, bedrooms: opt.v })); setOpenField(null); setMobileSheet(null); }}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );

  const pricePop = (
    <>
      <div className="home-search__range">
        <label className="home-search__money">
          {currencySymbol}
          <input className="bare-input" type="number" placeholder={t('home.from')} value={form.priceMin}
            onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))} />
        </label>
        <span style={{ color: '#cbd5e1' }}>—</span>
        <label className="home-search__money">
          {currencySymbol}
          <input className="bare-input" type="number" placeholder={t('home.to')} value={form.priceMax}
            onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))} />
        </label>
      </div>
      <p className="home-search__pop-label">{t('home.quickSelect')}</p>
      <div className="home-search__grid">
        {pricePresets.map(opt => (
          <button
            key={opt.maxGel}
            type="button"
            className={form.priceMax === opt.displayMax && !form.priceMin ? 'is-on' : ''}
            onClick={() => { setForm(f => ({ ...f, priceMin: '', priceMax: opt.displayMax })); setOpenField(null); setMobileSheet(null); }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <section className="home-hero page-under-header">
      <div className="container-xl">
        <div className="home-hero__stage">
          <div className="home-hero__media">
            <div className="home-hero__photo-clip">
              <img className="home-hero__photo" src="/5e6a55c3201bd.jpg" alt="" />
              <div className="home-hero__veil" />
              <div className="home-hero__copy">
                <p className="home-hero__kicker">{t('home.liveCount')}</p>
                <h1 className="home-hero__title">
                  {t('home.heroTitle')}{' '}
                  <em>{t('home.heroTitleAccent')}</em>
                </h1>
                <p className="home-hero__sub">{t('home.heroSubtitle')}</p>
              </div>
            </div>

            <div className="home-hero__search-wrap">
              <div
                ref={panelRef}
                className={`home-search ${openField ? 'is-open' : ''}`}
              >
              <div className="home-search__toolbar">
                <div className="home-search__deals" role="radiogroup" aria-label={t('home.dealType')}>
                  {dealTypeOpts.map(deal => (
                    <button
                      key={deal.v}
                      type="button"
                      role="radio"
                      aria-checked={tab === deal.v}
                      className={`home-search__deal ${tab === deal.v ? 'is-on' : ''}`}
                      onClick={() => setTab(deal.v as 'sale' | 'rent')}
                    >
                      {deal.l}
                    </button>
                  ))}
                </div>
                <div className="home-search__types">
                  {propertyTypeShortOpts.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.v || 'all'}
                        type="button"
                        className={`home-search__type ${form.propType === opt.v ? 'is-on' : ''}`}
                        onClick={() => setForm(f => ({ ...f, propType: opt.v }))}
                      >
                        <Icon size={13} strokeWidth={2.2} />
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="home-search__fields">
                <div className={`home-search__field ${openField === 'location' ? 'is-open' : ''}`}>
                  <button type="button" className="home-search__trigger" onClick={() => toggleField('location')}>
                    <span className="home-search__trigger-icon"><MapPin size={15} strokeWidth={2.2} /></span>
                    <span className="home-search__trigger-copy">
                      <span className="home-search__label">{t('home.location')}</span>
                      <span className={`home-search__value ${locationLabel ? '' : 'is-empty'}`}>
                        {locationLabel || t('home.locationHint')}
                      </span>
                    </span>
                    <ChevronDown size={14} strokeWidth={2.4} className="home-search__chevron" />
                  </button>
                  <AnimatePresence>
                    {openField === 'location' && (
                      <motion.div className="home-search__pop home-search__pop--wide" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}>
                        {locationPop}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={`home-search__field ${openField === 'beds' ? 'is-open' : ''}`}>
                  <button type="button" className="home-search__trigger" onClick={() => toggleField('beds')}>
                    <span className="home-search__trigger-icon"><Bed size={15} strokeWidth={2.2} /></span>
                    <span className="home-search__trigger-copy">
                      <span className="home-search__label">{t('home.bedroomLabel')}</span>
                      <span className={`home-search__value ${form.bedrooms ? '' : 'is-empty'}`}>
                        {form.bedrooms ? t('home.roomsCount', { n: form.bedrooms }) : t('common.any')}
                      </span>
                    </span>
                    <ChevronDown size={14} strokeWidth={2.4} className="home-search__chevron" />
                  </button>
                  <AnimatePresence>
                    {openField === 'beds' && (
                      <motion.div className="home-search__pop" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                        <p className="home-search__pop-label">{t('home.rooms')}</p>
                        {bedsPop}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className={`home-search__field ${openField === 'price' ? 'is-open' : ''}`}>
                  <button type="button" className="home-search__trigger" onClick={() => toggleField('price')}>
                    <span className="home-search__trigger-icon">{currencySymbol}</span>
                    <span className="home-search__trigger-copy">
                      <span className="home-search__label">{t('home.price')}</span>
                      <span className={`home-search__value ${form.priceMin || form.priceMax ? '' : 'is-empty'}`}>
                        {priceSummary}
                      </span>
                    </span>
                    <ChevronDown size={14} strokeWidth={2.4} className="home-search__chevron" />
                  </button>
                  <AnimatePresence>
                    {openField === 'price' && (
                      <motion.div className="home-search__pop home-search__pop--price" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                        <p className="home-search__pop-label">{t('home.priceRange')}</p>
                        {pricePop}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="home-search__go">
                  <button type="button" className="home-search__filter" title={t('listings.filter')} onClick={() => { setOpenField(null); setFilterOpen(true); }}>
                    <SlidersHorizontal size={16} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="home-search__submit" onClick={handleSearch}>
                    <Search size={16} strokeWidth={2.4} />
                    {t('home.searchBtn')}
                  </button>
                </div>
              </div>

              <div className="home-search__mobile">
                <button type="button" className="home-search__tile" onClick={() => setMobileSheet('location')}>
                  <span className="home-search__tile-icon"><MapPin size={15} /></span>
                  <span className="home-search__trigger-copy">
                    <span className="home-search__label">{t('home.location')}</span>
                    <span className={`home-search__value ${locationLabel ? '' : 'is-empty'}`}>
                      {locationLabel || t('home.locationHint')}
                    </span>
                  </span>
                </button>
                <div className="home-search__row">
                  <button type="button" className="home-search__tile" onClick={() => setMobileSheet('beds')}>
                    <span className="home-search__tile-icon"><Bed size={15} /></span>
                    <span className="home-search__trigger-copy">
                      <span className="home-search__label">{t('home.bedroomLabel')}</span>
                      <span className={`home-search__value ${form.bedrooms ? '' : 'is-empty'}`}>
                        {form.bedrooms ? t('home.roomsCount', { n: form.bedrooms }) : t('common.any')}
                      </span>
                    </span>
                  </button>
                  <button type="button" className="home-search__tile" onClick={() => setMobileSheet('price')}>
                    <span className="home-search__tile-icon">{currencySymbol}</span>
                    <span className="home-search__trigger-copy">
                      <span className="home-search__label">{t('home.price')}</span>
                      <span className={`home-search__value ${form.priceMin || form.priceMax ? '' : 'is-empty'}`}>{priceSummary}</span>
                    </span>
                  </button>
                </div>
                <div className="home-search__go home-search__go--mobile">
                  <button type="button" className="home-search__filter" title={t('listings.filter')} onClick={() => setFilterOpen(true)}>
                    <SlidersHorizontal size={16} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="home-search__submit" onClick={handleSearch}>
                    <Search size={16} strokeWidth={2.4} />
                    {t('home.searchBtn')}
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileSheet && (
          <>
            <motion.div className="home-sheet-backdrop lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSheet(null)} />
            <motion.div
              className="home-sheet lg:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div className="home-sheet__handle" />
              <div className="home-sheet__head">
                <p>
                  {mobileSheet === 'location' && t('home.location')}
                  {mobileSheet === 'beds' && t('home.bedroomLabel')}
                  {mobileSheet === 'price' && t('home.priceRange')}
                </p>
                <button type="button" className="home-sheet__x" onClick={() => setMobileSheet(null)}><X size={15} /></button>
              </div>
              {mobileSheet === 'location' && locationPop}
              {mobileSheet === 'beds' && bedsPop}
              {mobileSheet === 'price' && (
                <>
                  {pricePop}
                  <button type="button" className="home-search__submit" style={{ width: '100%', marginTop: 16 }} onClick={() => setMobileSheet(null)}>
                    {t('common.search')}
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {filterOpen && (
          <motion.div className="home-filter-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={e => { if (e.target === e.currentTarget) setFilterOpen(false); }}>
            <motion.div
              className="home-filter"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22 }}
            >
              <div className="home-filter__head">
                <div>
                  <h2>{t('home.filterTitle')}</h2>
                  <p>{t('home.filterSubtitle')}</p>
                </div>
                <button type="button" className="home-sheet__x" onClick={() => setFilterOpen(false)}><X size={16} /></button>
              </div>
              <div className="home-filter__body">
                <div className="home-filter__block">
                  <h3>{t('home.propertyType')}</h3>
                  <div className="home-search__chips">
                    {propertyTypeOpts.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.v || 'all'} type="button" className={`home-search__chip ${form.propType === opt.v ? 'is-on' : ''}`} onClick={() => setForm(f => ({ ...f, propType: opt.v }))}>
                          <Icon size={13} strokeWidth={2.2} /> {opt.l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="home-filter__block">
                  <h3>{t('home.dealType')}</h3>
                  <div className="home-search__chips">
                    {dealTypeOpts.map(opt => (
                      <button key={opt.v} type="button" className={`home-search__chip ${tab === opt.v ? 'is-on' : ''}`} onClick={() => setTab(opt.v as 'sale' | 'rent')}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="home-filter__block">
                  <h3>{t('home.bedroomCount')}</h3>
                  {bedsPop}
                </div>
                <div className="home-filter__block">
                  <h3>{t('home.totalPrice')}</h3>
                  <div className="home-search__range" style={{ marginBottom: 0 }}>
                    <label className="home-search__money">
                      {currencySymbol}
                      <input className="bare-input" type="number" placeholder={t('home.from')} value={form.priceMin} onChange={e => setForm(f => ({ ...f, priceMin: e.target.value }))} />
                    </label>
                    <span style={{ color: '#cbd5e1' }}>—</span>
                    <label className="home-search__money">
                      {currencySymbol}
                      <input className="bare-input" type="number" placeholder={t('home.to')} value={form.priceMax} onChange={e => setForm(f => ({ ...f, priceMax: e.target.value }))} />
                    </label>
                  </div>
                </div>
                <div className="home-filter__block">
                  <h3>{t('home.area')}</h3>
                  <div className="home-search__range" style={{ marginBottom: 0 }}>
                    <label className="home-search__money">
                      <input className="bare-input" type="number" placeholder={t('home.from')} value={form.areaMin} onChange={e => setForm(f => ({ ...f, areaMin: e.target.value }))} />
                      m²
                    </label>
                    <span style={{ color: '#cbd5e1' }}>—</span>
                    <label className="home-search__money">
                      <input className="bare-input" type="number" placeholder={t('home.to')} value={form.areaMax} onChange={e => setForm(f => ({ ...f, areaMax: e.target.value }))} />
                      m²
                    </label>
                  </div>
                </div>
                <div className="home-filter__block">
                  <h3>{t('home.city')}</h3>
                  <div className="home-search__chips">
                    {cityOpts.map(opt => (
                      <button key={opt.v || 'all'} type="button" className={`home-search__chip ${form.city === opt.v ? 'is-on' : ''}`} onClick={() => setForm(f => ({ ...f, city: opt.v, district: '' }))}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="home-filter__foot">
                <button type="button" className="home-filter__reset" onClick={() => setForm(EMPTY_FORM)}>{t('common.clear')}</button>
                <button type="button" className="home-filter__apply" onClick={handleSearch}>
                  <Search size={15} /> {t('home.searchBtn')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
