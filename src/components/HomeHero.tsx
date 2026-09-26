import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bed, ChevronDown, Hash, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { useCurrency } from '../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import {
  bedroomOptions,
  propertyTypeFilterOptions,
} from '../i18n/labels';
import { CITY_AREAS, areaSelectionLabel, districtLabel, districtSections, findCityArea } from '../data/districts';
import { isExactListingId } from '../lib/listingId';
import { fetchProperties, fetchPropertyById } from '../lib/publicApi';
import { listingsHref } from '../lib/seoListingsUrl';
import { propertyHref } from '../lib/seoPropertyUrl';
import type { Property } from '../types/listing';

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

  const propertyTypeOpts = useMemo(() => propertyTypeFilterOptions(t), [t]);
  const dealTypeOpts = useMemo(() => [
    { v: 'sale', l: t('propertyStatus.sale') },
    { v: 'rent', l: t('propertyStatus.rent') },
    { v: 'daily_rent', l: t('propertyStatus.daily_rent') },
    { v: 'pledge', l: t('home.dealTypes.mortgage') },
  ], [t]);
  const bedroomOpts = useMemo(() => bedroomOptions(t), [t]);

  const [tab, setTab] = useState('sale');
  const [form, setForm] = useState(EMPTY_FORM);
  const [openField, setOpenField] = useState<OpenField>(null);
  const [mobileSheet, setMobileSheet] = useState<Sheet>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [listingId, setListingId] = useState('');
  const [idError, setIdError] = useState('');
  const [idBusy, setIdBusy] = useState(false);
  const [districtQuery, setDistrictQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const pricePresets = useMemo(
    () => PRICE_PRESETS_GEL.map(maxGel => ({
      maxGel,
      label: formatMoney(maxGel, { compact: true }),
      displayMax: String(gelToDisplay(maxGel)),
    })),
    [formatMoney, gelToDisplay],
  );

  const selectedCity = findCityArea(form.city);
  const districtChoices = useMemo(() => {
    const cities = selectedCity ? [selectedCity] : CITY_AREAS;
    const q = districtQuery.trim().toLowerCase();
    return cities.flatMap(city => {
      const groups = (city.groups ?? [])
        .filter(group => !q || group.ka.toLowerCase().includes(q) || group.en.toLowerCase().includes(q))
        .map(group => ({
          city: city.ka,
          district: group.ka,
          label: districtLabel(group, locale),
          cityLabel: t(city.labelKey),
          groupLabel: '',
          parent: true,
        }));
      const neighbourhoods = city.districts
        .filter(district => {
          if (!q) return true;
          return [district.ka, district.en, ...(district.aliases ?? []), district.group ?? '']
            .some(name => name.toLowerCase().includes(q));
        })
        .map(district => ({
          city: city.ka,
          district: district.ka,
          label: districtLabel(district, locale),
          cityLabel: t(city.labelKey),
          groupLabel: district.group
            ? districtLabel(city.groups!.find(group => group.ka === district.group) ?? { ka: district.group, en: district.group }, locale)
            : '',
          parent: false,
        }));
      return q ? [...groups, ...neighbourhoods] : neighbourhoods;
    });
  }, [selectedCity, districtQuery, locale, t]);

  const locationLabel = useMemo(() => {
    const city = findCityArea(form.city);
    return [
      areaSelectionLabel(city, form.district, locale),
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

  function onListingIdChange(value: string) {
    setListingId(value.replace(/\D/g, '').slice(0, 8));
    setIdError('');
  }

  async function handleSearch() {
    const id = listingId.trim();
    if (id) {
      if (idBusy) return;
      setIdError('');
      setIdBusy(true);
      try {
        let hit: Property | null = null;
        if (isExactListingId(id)) {
          hit = await fetchPropertyById(id);
          if (!hit) {
            setIdError(t('home.idNotFound'));
            return;
          }
        } else {
          const matches = (await fetchProperties()).filter(property => property.id.startsWith(id));
          if (matches.length !== 1) {
            setIdError(matches.length > 1 ? t('home.idNeedFull') : t('home.idNotFound'));
            return;
          }
          hit = matches[0];
        }
        if (!hit) return;
        navigate(propertyHref(hit));
        setFilterOpen(false);
        setMobileSheet(null);
        setOpenField(null);
      } finally {
        setIdBusy(false);
      }
      return;
    }

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

  function pickCity(city: string) {
    setForm(f => ({ ...f, city, district: '' }));
    setDistrictQuery('');
  }

  function pickDistrict(city: string, district: string) {
    setForm(f => ({ ...f, city, district }));
    setDistrictQuery('');
    setOpenField(null);
    setMobileSheet(null);
  }

  const locationPop = (
    <>
      <p className="home-search__pop-label">{t('home.city')}</p>
      <div className="home-search__chips" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`home-search__chip ${form.city ? '' : 'is-on'}`}
          onClick={() => pickCity('')}
        >
          {t('common.all')}
        </button>
        {CITY_AREAS.map(city => (
          <button
            key={city.ka}
            type="button"
            className={`home-search__chip ${form.city === city.ka ? 'is-on' : ''}`}
            onClick={() => pickCity(city.ka)}
          >
            {t(city.labelKey)}
          </button>
        ))}
      </div>
      <p className="home-search__pop-label">{t('home.districts')}</p>
      <input
        className="home-search__find"
        value={districtQuery}
        placeholder={t('home.districtSearch')}
        onChange={e => setDistrictQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
      />
      <div className="home-search__districts">
        {selectedCity && !districtQuery && (
          <button
            type="button"
            className={`home-search__district home-search__district--all ${form.district ? '' : 'is-on'}`}
            onClick={() => pickDistrict(selectedCity.ka, '')}
          >
            <strong>{t('home.wholeCity', { city: t(selectedCity.labelKey) })}</strong>
          </button>
        )}
        {districtQuery ? districtChoices.map(opt => (
          <button
            key={`${opt.city}-${opt.district}`}
            type="button"
            className={`home-search__district ${form.city === opt.city && form.district === opt.district ? 'is-on' : ''}`}
            onClick={() => pickDistrict(opt.city, opt.district)}
          >
            <strong>{opt.label}</strong>
            <small>{opt.groupLabel || (!selectedCity ? opt.cityLabel : '')}</small>
          </button>
        )) : (selectedCity ? [selectedCity] : CITY_AREAS).map(city => (
          <Fragment key={city.ka}>
            {!selectedCity && (
              <p className="home-search__district-city">{t(city.labelKey)}</p>
            )}
            {districtSections(city).map(section => (
              <Fragment key={section.group?.ka ?? `${city.ka}-flat`}>
                {section.group && (
                  <button
                    type="button"
                    className={`home-search__district-head ${form.city === city.ka && form.district === section.group.ka ? 'is-on' : ''}`}
                    onClick={() => pickDistrict(city.ka, section.group!.ka)}
                  >
                    {districtLabel(section.group, locale)}
                  </button>
                )}
                {section.districts.map(district => (
                  <button
                    key={`${city.ka}-${district.ka}`}
                    type="button"
                    className={`home-search__district ${form.city === city.ka && form.district === district.ka ? 'is-on' : ''}`}
                    onClick={() => pickDistrict(city.ka, district.ka)}
                  >
                    <strong>{districtLabel(district, locale)}</strong>
                  </button>
                ))}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </div>
      {districtChoices.length === 0 && <p className="home-search__empty">{t('home.noDistricts')}</p>}
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

  const heroTagParts = String(t('home.heroTagline'))
    .split('. ')
    .map(part => part.replace(/\.$/, '').trim())
    .filter(Boolean);

  return (
    <section className="home-hero page-under-header">
      <div className="container-xl">
        <div className="home-hero__stage">
          <div className="home-hero__media">
            <div className="home-hero__photo-clip">
              <img className="home-hero__photo" src="/5e6a55c3201bd.jpg" alt="" />
              <div className="home-hero__veil" />
              <div className="home-hero__copy">
                <div className="home-hero__mast">
                  <h1 className="home-hero__title">
                    {t('home.heroTitle')}
                    <span className="home-hero__line">{t('home.heroTitleAccent')}</span>
                  </h1>
                  <p className="home-hero__tagline">
                    {heroTagParts.map((part, i) => (
                      <Fragment key={part}>
                        {i > 0 && <span className="home-hero__tag-sep" aria-hidden="true" />}
                        <span>{part}</span>
                      </Fragment>
                    ))}
                  </p>
                </div>
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
                      onClick={() => setTab(deal.v)}
                    >
                      {deal.l}
                    </button>
                  ))}
                </div>
                <div className="home-search__types">
                  {propertyTypeOpts.map(opt => {
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

                <label className="home-search__field home-search__id">
                  <span className="home-search__trigger-icon"><Hash size={15} strokeWidth={2.2} /></span>
                  <span className="home-search__trigger-copy">
                    <span className="home-search__label">{t('home.listingId')}</span>
                    <input
                      className="bare-input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={t('home.idPlaceholder')}
                      value={listingId}
                      aria-label={t('home.listingId')}
                      onChange={e => onListingIdChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
                    />
                  </span>
                </label>

                <div className="home-search__go">
                  <button type="button" className="home-search__filter" title={t('listings.filter')} onClick={() => { setOpenField(null); setFilterOpen(true); }}>
                    <SlidersHorizontal size={16} strokeWidth={2.2} />
                  </button>
                  <button type="button" className="home-search__submit" disabled={idBusy} onClick={() => { void handleSearch(); }}>
                    <Search size={16} strokeWidth={2.4} />
                    {t('home.searchBtn')}
                  </button>
                </div>
              </div>

              <div className="home-search__mobile">
                <label className="home-search__id home-search__id--mobile">
                  <span className="home-search__tile-icon"><Hash size={15} strokeWidth={2.2} /></span>
                  <span className="home-search__trigger-copy">
                    <span className="home-search__label">{t('home.listingId')}</span>
                    <input
                      className="bare-input"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={t('home.idPlaceholder')}
                      value={listingId}
                      aria-label={t('home.listingId')}
                      onChange={e => onListingIdChange(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleSearch(); }}
                    />
                  </span>
                </label>
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
                  <button type="button" className="home-search__submit" disabled={idBusy} onClick={() => { void handleSearch(); }}>
                    <Search size={16} strokeWidth={2.4} />
                    {t('home.searchBtn')}
                  </button>
                </div>
              </div>
              {idError && <p className="home-search__id-error" role="alert">{idError}</p>}
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
                      <button key={opt.v} type="button" className={`home-search__chip ${tab === opt.v ? 'is-on' : ''}`} onClick={() => setTab(opt.v)}>
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
                    <button type="button" className={`home-search__chip ${form.city ? '' : 'is-on'}`} onClick={() => setForm(f => ({ ...f, city: '', district: '' }))}>
                      {t('common.all')}
                    </button>
                    {CITY_AREAS.map(city => (
                      <button key={city.ka} type="button" className={`home-search__chip ${form.city === city.ka ? 'is-on' : ''}`} onClick={() => setForm(f => ({ ...f, city: city.ka, district: '' }))}>
                        {t(city.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedCity && (
                  <div className="home-filter__block">
                    <h3>{t('home.districts')}</h3>
                    <div className="home-search__chips">
                      <button type="button" className={`home-search__chip ${form.district ? '' : 'is-on'}`} onClick={() => setForm(f => ({ ...f, district: '' }))}>
                        {t('home.wholeCity', { city: t(selectedCity.labelKey) })}
                      </button>
                      {districtSections(selectedCity).map(section => (
                        <div key={section.group?.ka ?? 'flat'} className="home-district-block">
                          {section.group && (
                            <button
                              type="button"
                              className={`home-district-block__title ${form.district === section.group.ka ? 'is-on' : ''}`}
                              onClick={() => setForm(f => ({ ...f, district: section.group!.ka }))}
                            >
                              {districtLabel(section.group, locale)}
                            </button>
                          )}
                          <div className="home-search__chips">
                            {section.districts.map(district => (
                              <button
                                key={district.ka}
                                type="button"
                                className={`home-search__chip ${form.district === district.ka ? 'is-on' : ''}`}
                                onClick={() => setForm(f => ({ ...f, district: district.ka }))}
                              >
                                {districtLabel(district, locale)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
