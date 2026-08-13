import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import type L from 'leaflet';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, X, ArrowUpDown, Map, List, Building2, MapPin, ChevronDown,
} from 'lucide-react';
import ListingMapRow from '../components/ListingMapRow';
import ListingsMap from '../components/ListingsMap';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useProperties } from '../hooks/usePublicData';
import { fetchAreaBoundary, type AreaBoundary, type Ring } from '../lib/geoApi';
import { pointInRing, pointInRings, ringsBbox } from '../lib/geoMath';
import {
  CITY_AREAS,
  districtLabel,
  districtNameMatches,
  districtOptions,
  findCityArea,
  findDistrictArea,
} from '../data/districts';
import type { Property } from '../types/listing';

const PAGE_SIZE = 24;

export default function ListingsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { currencySymbol, formatMoney } = useCurrency();
  const [searchParams] = useSearchParams();

  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'list' | 'map'>('list');
  const [page, setPage] = useState(1);
  const [areaSearch, setAreaSearch] = useState(true);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [boundary, setBoundary] = useState<AreaBoundary | null>(null);
  const [boundaryOsm, setBoundaryOsm] = useState<string | null>(null);
  const [drawnArea, setDrawnArea] = useState<Ring | null>(null);
  /** Bumped on every draw/clear so the map re-frames even when nothing else changed. */
  const [drawSeq, setDrawSeq] = useState(0);

  const listScrollRef = useRef<HTMLDivElement>(null);

  const { data: properties, loading } = useProperties();

  const [filters, setFilters] = useState(() => {
    // Links may carry either language, so resolve them to the canonical names
    // the selects use.
    const cityParam = searchParams.get('city') || '';
    const districtParam = searchParams.get('district') || '';
    const city = findCityArea(cityParam);
    const district = findDistrictArea(city, districtParam);

    return {
      status: searchParams.get('status') || '',
      city: city?.ka ?? cityParam,
      district: district?.ka ?? districtParam,
      type: searchParams.get('type') || '',
      bedrooms: searchParams.get('bedrooms') || '',
      priceMin: searchParams.get('priceMin') || '',
      priceMax: searchParams.get('priceMax') || '',
      areaMin: searchParams.get('areaMin') || '',
      isPremium: searchParams.get('premium') === 'true',
      isNew: searchParams.get('new') === 'true',
    };
  });

  const cityArea = useMemo(() => findCityArea(filters.city), [filters.city]);
  const districtArea = useMemo(() => findDistrictArea(cityArea, filters.district), [cityArea, filters.district]);

  /** Curated districts for the city, plus anything extra the listings mention. */
  const districtList = useMemo(
    () =>
      districtOptions(
        cityArea,
        properties.filter(p => p.city === filters.city).map(p => p.district).filter(Boolean),
        locale,
      ),
    [cityArea, properties, filters.city, locale],
  );

  const SORT_OPTIONS = useMemo(() => [
    { label: t('listings.sort.newest'), value: 'newest' },
    { label: t('listings.sort.priceDesc'), value: 'price-desc' },
    { label: t('listings.sort.priceAsc'), value: 'price-asc' },
    { label: t('listings.sort.areaDesc'), value: 'area-desc' },
    { label: t('listings.sort.popular'), value: 'popular' },
  ], [t]);

  /** The district outline, but only once it is the one currently loaded. */
  const districtPolygon = districtArea?.osm && boundaryOsm === districtArea.osm ? boundary : null;

  /** A hand-drawn area behaves exactly like a selected district outline. */
  const customBoundary = useMemo<AreaBoundary | null>(
    () =>
      drawnArea
        ? { name: t('listings.drawnArea'), rings: [drawnArea], bbox: ringsBbox([drawnArea]) }
        : null,
    [drawnArea, t],
  );

  const activeBoundary = customBoundary ?? boundary;

  const matches = useCallback(
    (p: Property, includeGeo: boolean) => {
      if (search) {
        const q = search.trim().toLowerCase();
        if (![p.title, p.city, p.district, p.address].some(v => v?.toLowerCase().includes(q))) return false;
      }
      if (includeGeo && drawnArea) {
        // The drawn shape replaces the city/district geo filter entirely.
        if (!pointInRing(drawnArea, p.coordinates.lat, p.coordinates.lng)) return false;
      }
      if (includeGeo && !drawnArea && filters.city && p.city !== filters.city) return false;
      if (includeGeo && !drawnArea && filters.district) {
        // Where the real outline is known, geography decides — listing district
        // labels are free text and often disagree with the coordinates.
        if (districtPolygon) {
          if (!pointInRings(districtPolygon.rings, p.coordinates.lat, p.coordinates.lng)) return false;
        } else if (districtArea) {
          if (!districtNameMatches(p.district, districtArea)) return false;
        } else if (p.district !== filters.district) {
          return false;
        }
      }
      if (filters.status && p.status !== filters.status) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (filters.bedrooms && p.bedrooms < parseInt(filters.bedrooms)) return false;
      if (filters.priceMin && p.price < parseInt(filters.priceMin)) return false;
      if (filters.priceMax && p.price > parseInt(filters.priceMax)) return false;
      if (filters.areaMin && p.area < parseInt(filters.areaMin)) return false;
      if (filters.isPremium && !p.isPremium) return false;
      if (filters.isNew && !p.isNew) return false;
      return true;
    },
    [filters, search, districtArea, districtPolygon, drawnArea],
  );

  /** Everything matching the filter form — this is what the map draws. */
  const filtered = useMemo(() => {
    const r = properties.filter(p => matches(p, true));
    switch (sort) {
      case 'price-desc': r.sort((a, b) => b.price - a.price); break;
      case 'price-asc': r.sort((a, b) => a.price - b.price); break;
      case 'area-desc': r.sort((a, b) => b.area - a.area); break;
      case 'popular': r.sort((a, b) => b.viewCount - a.viewCount); break;
      default: r.sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    }
    return r;
  }, [properties, matches, sort]);

  /** Listings just outside the selected area, drawn faded for context. */
  const contextProperties = useMemo(() => {
    if (!activeBoundary) return [];
    const inside = new Set(filtered.map(p => p.id));
    return properties.filter(p => !inside.has(p.id) && matches(p, false));
  }, [activeBoundary, filtered, properties, matches]);

  /** Narrowed to the current viewport when "search by moving the map" is on. */
  const visible = useMemo(() => {
    if (!areaSearch || !mapBounds) return filtered;
    return filtered.filter(p => mapBounds.contains([p.coordinates.lat, p.coordinates.lng]));
  }, [filtered, areaSearch, mapBounds]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = useMemo(
    () => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [visible, page],
  );

  const [refitNonce, setRefitNonce] = useState(0);

  const fitKey = useMemo(
    () => JSON.stringify({ ...filters, search, refitNonce, drawSeq }),
    [filters, search, refitNonce, drawSeq],
  );

  /** Drops the viewport restriction and re-frames the map around every match. */
  const showAllResults = useCallback(() => {
    setAreaSearch(false);
    setRefitNonce(n => n + 1);
  }, []);

  useEffect(() => {
    setPage(1);
    listScrollRef.current?.scrollTo({ top: 0 });
  }, [fitKey, sort, visible.length]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  /** Outline of the selected district, or of the city when the district has none. */
  useEffect(() => {
    if (!filters.city) {
      setBoundary(null);
      setBoundaryOsm(null);
      return;
    }

    const osm = districtArea?.osm ?? cityArea?.osm;
    let cancelled = false;

    fetchAreaBoundary(
      osm ? { osm } : { city: filters.city, district: filters.district || undefined },
    ).then(result => {
      if (cancelled) return;
      setBoundary(result);
      setBoundaryOsm(result ? osm ?? null : null);
    });

    return () => { cancelled = true; };
  }, [filters.city, filters.district, cityArea, districtArea]);

  const activeCount =
    Object.values(filters).filter(v => v !== '' && v !== false).length + (drawnArea ? 1 : 0);

  const clearDrawnArea = useCallback(() => {
    setDrawnArea(null);
    setDrawSeq(n => n + 1);
  }, []);

  const setF = (key: string, val: string | boolean) => {
    // Picking a city or district takes over from a drawn area, and vice versa.
    if ((key === 'city' || key === 'district') && val) clearDrawnArea();
    setFilters(f => ({ ...f, [key]: val, ...(key === 'city' ? { district: '' } : null) }));
  };

  const handleDrawnAreaChange = useCallback((ring: Ring | null) => {
    setDrawnArea(ring);
    setDrawSeq(n => n + 1);
    if (!ring) return;
    setFilters(f => (f.city || f.district ? { ...f, city: '', district: '' } : f));
    // The drawn shape is the area now, so the viewport should not narrow it further.
    setAreaSearch(false);
  }, []);

  const clear = () => {
    clearDrawnArea();
    setFilters({
      status: '', city: '', district: '', type: '', bedrooms: '',
      priceMin: '', priceMax: '', areaMin: '', isPremium: false, isNew: false,
    });
  };

  const formatPrice = useCallback(
    (property: Property) =>
      formatMoney(property.price, {
        perMonth: property.status === 'rent',
        compact: property.price >= 1_000_000,
      }),
    [formatMoney],
  );

  const formatPricePerSqm = useCallback(
    (property: Property) =>
      formatMoney(Math.round(property.price / Math.max(property.area, 1)), { perSqm: true }),
    [formatMoney],
  );

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => {
    setMapBounds(bounds);
  }, []);

  const handleRowHover = useCallback((id: string | null) => setActiveId(id), []);

  /* Prefer our own localised names over whatever Nominatim returns. */
  const areaLabel = drawnArea
    ? t('listings.drawnArea')
    : [
        districtArea ? districtLabel(districtArea, locale) : filters.district,
        cityArea ? t(cityArea.labelKey) : filters.city,
      ]
        .filter(Boolean)
        .join(', ')
      || boundary?.name
      || t('listings.allGeorgia');

  return (
    <div className="listings-split-page">
      {/* Toolbar */}
      <div className="listings-split-toolbar">
        <div className="listings-split-toolbar__inner">
          <div className="listings-split-search">
            <Search size={16} strokeWidth={2} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('listings.searchPlaceholder')}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label={t('listings.clearFilters')}>
                <X size={14} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            className={`listings-split-btn ${showFilters || activeCount > 0 ? 'is-primary' : ''}`}
          >
            <SlidersHorizontal size={15} strokeWidth={2} />
            {t('listings.filter')}
            {activeCount > 0 && <span className="listings-split-badge">{activeCount}</span>}
          </button>

          <label className="listings-split-select">
            <ArrowUpDown size={14} strokeWidth={2} />
            <select value={sort} onChange={e => setSort(e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={2.5} />
          </label>
        </div>

        {/* Selected-area chips */}
        {(activeCount > 0 || search) && (
          <div className="listings-split-chips">
            {search && <Chip label={`“${search}”`} onRemove={() => setSearch('')} />}
            {drawnArea && <Chip label={t('listings.drawnArea')} icon onRemove={clearDrawnArea} />}
            {filters.city && (
              <Chip label={cityArea ? t(cityArea.labelKey) : filters.city} icon onRemove={() => setF('city', '')} />
            )}
            {filters.district && (
              <Chip
                label={districtArea ? districtLabel(districtArea, locale) : filters.district}
                icon
                onRemove={() => setF('district', '')}
              />
            )}
            {filters.status && <Chip label={filters.status === 'sale' ? t('listings.chipSale') : t('listings.chipRent')} onRemove={() => setF('status', '')} />}
            {filters.type && <Chip label={t(`propertyTypes.${filters.type}` as 'propertyTypes.apartment')} onRemove={() => setF('type', '')} />}
            {filters.bedrooms && <Chip label={`${filters.bedrooms}+ ${t('listings.bedrooms')}`} onRemove={() => setF('bedrooms', '')} />}
            {filters.priceMin && <Chip label={`${t('listings.priceMin')} ${filters.priceMin}`} onRemove={() => setF('priceMin', '')} />}
            {filters.priceMax && <Chip label={`${t('listings.priceMax')} ${filters.priceMax}`} onRemove={() => setF('priceMax', '')} />}
            {filters.areaMin && <Chip label={`${filters.areaMin} მ²+`} onRemove={() => setF('areaMin', '')} />}
            {filters.isPremium && <Chip label={t('listings.chipPremium')} onRemove={() => setF('isPremium', false)} />}
            {filters.isNew && <Chip label={t('listings.chipNew')} onRemove={() => setF('isNew', false)} />}
            <button type="button" className="listings-split-chips__clear" onClick={() => { clear(); setSearch(''); }}>
              {t('listings.clearFilters')}
            </button>
          </div>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="listings-split-filters"
          >
            <div className="listings-split-filters__inner">
              <Field label={t('listings.status')}>
                <select value={filters.status} onChange={e => setF('status', e.target.value)} className="listings-filter-input">
                  <option value="">{t('common.all')}</option>
                  <option value="sale">{t('propertyStatus.sale')}</option>
                  <option value="rent">{t('propertyStatus.rent')}</option>
                </select>
              </Field>

              <Field label={t('listings.city')}>
                <select value={filters.city} onChange={e => setF('city', e.target.value)} className="listings-filter-input">
                  <option value="">{t('common.all')}</option>
                  {CITY_AREAS.map(city => (
                    <option key={city.ka} value={city.ka}>{t(city.labelKey)}</option>
                  ))}
                </select>
              </Field>

              <Field label={t('listings.district')}>
                <select
                  value={filters.district}
                  onChange={e => setF('district', e.target.value)}
                  disabled={!filters.city}
                  className="listings-filter-input"
                >
                  <option value="">{t('common.all')}</option>
                  {districtList.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </Field>

              <Field label={t('listings.type')}>
                <select value={filters.type} onChange={e => setF('type', e.target.value)} className="listings-filter-input">
                  <option value="">{t('common.all')}</option>
                  <option value="apartment">{t('propertyTypes.apartment')}</option>
                  <option value="house">{t('propertyTypes.house')}</option>
                  <option value="villa">{t('propertyTypes.villa')}</option>
                  <option value="commercial">{t('propertyTypes.commercial')}</option>
                </select>
              </Field>

              <Field label={t('listings.bedrooms')}>
                <select value={filters.bedrooms} onChange={e => setF('bedrooms', e.target.value)} className="listings-filter-input">
                  <option value="">{t('common.any')}</option>
                  {['1', '2', '3', '4'].map(n => <option key={n} value={n}>{n}+</option>)}
                </select>
              </Field>

              <Field label={`${t('listings.priceMin')} (${currencySymbol})`}>
                <input type="number" min="0" placeholder="0" value={filters.priceMin} onChange={e => setF('priceMin', e.target.value)} className="listings-filter-input" />
              </Field>

              <Field label={`${t('listings.priceMax')} (${currencySymbol})`}>
                <input type="number" min="0" placeholder="∞" value={filters.priceMax} onChange={e => setF('priceMax', e.target.value)} className="listings-filter-input" />
              </Field>

              <Field label={t('listings.areaMin')}>
                <input type="number" min="0" placeholder="0" value={filters.areaMin} onChange={e => setF('areaMin', e.target.value)} className="listings-filter-input" />
              </Field>

              <div className="listings-filter-checks">
                {([['isPremium', t('listings.premiumOnly')], ['isNew', t('listings.newOnly')]] as const).map(([k, l]) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={filters[k as 'isPremium' | 'isNew']}
                      onChange={e => setF(k, e.target.checked)}
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Split: list + map */}
      <div className="listings-split-body">
        <aside className={`listings-split-list ${mobilePanel === 'map' ? 'is-hidden-mobile' : ''}`}>
          <header className="listings-split-list__header">
            <h1 className="listings-split-list__title">{areaLabel}</h1>
            <p className="listings-split-list__count">
              <MapPin size={12} strokeWidth={2.2} />
              {t('listings.results', { count: visible.length })}
              {areaSearch && mapBounds && visible.length !== filtered.length && (
                <span className="listings-split-list__hint">{t('listings.inThisArea')}</span>
              )}
            </p>
          </header>

          <div className="listings-split-list__scroll" ref={listScrollRef}>
            {loading ? (
              <div className="listings-split-grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="listing-row-skeleton">
                    <div className="listing-row-skeleton__img" />
                    <div className="listing-row-skeleton__lines">
                      <span style={{ width: '52%' }} />
                      <span style={{ width: '74%' }} />
                      <span style={{ width: '62%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visible.length === 0 && filtered.length > 0 ? (
              <div className="listings-split-empty">
                <MapPin size={40} strokeWidth={1.2} />
                <h3>{t('listings.emptyAreaTitle')}</h3>
                <p>{t('listings.emptyAreaHint', { count: filtered.length })}</p>
                <button type="button" onClick={showAllResults}>
                  {t('listings.showAllResults')}
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="listings-split-empty">
                <Building2 size={44} strokeWidth={1} />
                <h3>{t('listings.emptyTitle')}</h3>
                <p>{t('listings.emptyHint')}</p>
                <button type="button" onClick={() => { clear(); setSearch(''); showAllResults(); }}>
                  {t('listings.clearFilters')}
                </button>
              </div>
            ) : (
              <>
                <div className="listings-split-grid">
                  {pageItems.map(p => (
                    <ListingMapRow
                      key={p.id}
                      property={p}
                      active={activeId === p.id}
                      onHover={handleRowHover}
                      formatPrice={formatPrice}
                      formatPricePerSqm={formatPricePerSqm}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className="listings-pagination">
                    <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                    {pageNumbers(page, totalPages).map((n, i) =>
                      n === null ? (
                        <span key={`gap-${i}`}>…</span>
                      ) : (
                        <button
                          key={n}
                          type="button"
                          className={n === page ? 'is-current' : ''}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      ),
                    )}
                    <button type="button" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                  </nav>
                )}
              </>
            )}
          </div>
        </aside>

        <section className={`listings-split-map ${mobilePanel === 'list' ? 'is-hidden-mobile' : ''}`}>
          <ListingsMap
            properties={filtered}
            contextProperties={contextProperties}
            activeId={activeId}
            onActiveChange={setActiveId}
            onBoundsChange={handleBoundsChange}
            boundary={activeBoundary}
            fitKey={fitKey}
            areaSearch={areaSearch}
            onAreaSearchChange={setAreaSearch}
            drawnArea={drawnArea}
            onDrawnAreaChange={handleDrawnAreaChange}
            formatPrice={formatPrice}
            formatPricePerSqm={formatPricePerSqm}
          />
        </section>

        {/* Mobile list / map switch */}
        <button
          type="button"
          className="listings-mobile-switch"
          onClick={() => setMobilePanel(p => (p === 'list' ? 'map' : 'list'))}
        >
          {mobilePanel === 'list' ? <Map size={16} /> : <List size={16} />}
          {mobilePanel === 'list' ? t('listings.showMap') : t('listings.showList')}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="listings-filter-field">
      <span className="listings-filter-label">{label}</span>
      {children}
    </div>
  );
}

function Chip({ label, onRemove, icon }: { label: string; onRemove: () => void; icon?: boolean }) {
  return (
    <span className="listings-chip">
      {icon && <MapPin size={11} strokeWidth={2.4} />}
      {label}
      <button type="button" onClick={onRemove} aria-label={`remove ${label}`}>
        <X size={11} strokeWidth={2.6} />
      </button>
    </span>
  );
}

function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
