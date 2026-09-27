import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type L from 'leaflet';
import { ChevronLeft, ChevronRight, List, Map as MapIcon, MapPin, SearchX, X } from 'lucide-react';
import ListingMapRow from '../components/ListingMapRow';
import ListingsMap from '../components/ListingsMap';
import ListingsFilterBar, { SortMenu } from '../components/listings/ListingsFilterBar';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useProperties } from '../hooks/usePublicData';
import { fetchAreaBoundary, type AreaBoundary, type Ring } from '../lib/geoApi';
import { pointInRing, pointInRings, ringsBbox } from '../lib/geoMath';
import { isExactListingId } from '../lib/listingId';
import {
  districtsMatch, hasKnownLocation, orderedRange, roomsMatch, searchPrice, statusMatches, textQueryMatches,
} from '../lib/listingSearch';
import {
  EMPTY_FILTERS, activeFilterCount, filtersFromLocation, filtersToHref, type ListingFilters,
} from '../lib/listingFilters';
import { buildLocationCounts } from '../lib/locationCounts';
import { areaSelectionLabel, findCityArea, findDistrictArea } from '../data/districts';
import type { Property } from '../types/listing';
import { listingMoneyFrom } from '../lib/moneyEntry';
import { propertyHref } from '../lib/seoPropertyUrl';
import { roomsSummary, useDealOptions, usePriceSummary, useTypeOptions } from '../components/search/searchHelpers';

const PAGE_SIZE = 24;
const MAP_PREF_KEY = 'listings_map_visible';

function readMapPref(): boolean {
  try {
    return localStorage.getItem(MAP_PREF_KEY) !== '0';
  } catch {
    return true;
  }
}

function useIsWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function ListingsPage() {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { currency, formatMoney, displayToGel, listingToGel } = useCurrency();
  const wide = useIsWide();
  const deals = useDealOptions();
  const types = useTypeOptions();

  const [filters, setFilters] = useState<ListingFilters>(() => filtersFromLocation(location.pathname, location.search).filters);
  const [search, setSearch] = useState(() => filtersFromLocation(location.pathname, location.search).q);
  const [sort, setSort] = useState('newest');
  const [mapVisible, setMapVisible] = useState(readMapPref);
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

  /* ── URL ⇄ state ─────────────────────────────────────────────────────── */

  /**
   * Set while filters are being reloaded from a new URL. The URL-writing effect
   * below runs in the same pass with the previous filters and would otherwise
   * put the old address straight back.
   */
  const loadingFromUrl = useRef(false);

  useEffect(() => {
    const next = filtersFromLocation(location.pathname, location.search);
    loadingFromUrl.current = true;
    setFilters(next.filters);
    setSearch(next.q);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (loadingFromUrl.current) {
      loadingFromUrl.current = false;
      return;
    }
    const next = filtersToHref(filters, search, currency);
    if (`${location.pathname}${location.search}` === next) return;
    navigate(`${next}${location.hash}`, { replace: true });
  }, [filters, search, currency, navigate, location.hash, location.pathname, location.search]);

  useEffect(() => {
    try {
      localStorage.setItem(MAP_PREF_KEY, mapVisible ? '1' : '0');
    } catch {
      // Remembering the preference is a convenience only.
    }
  }, [mapVisible]);

  /* ── Matching ────────────────────────────────────────────────────────── */

  const cityArea = useMemo(() => findCityArea(filters.city), [filters.city]);
  const singleDistrict = filters.districts.length === 1 ? filters.districts[0] : '';
  const districtArea = useMemo(() => findDistrictArea(cityArea, singleDistrict), [cityArea, singleDistrict]);

  /** The district outline, but only once it is the one currently loaded. */
  const districtPolygon = districtArea?.osm && boundaryOsm === districtArea.osm ? boundary : null;

  /** A hand-drawn area behaves exactly like a selected district outline. */
  const customBoundary = useMemo<AreaBoundary | null>(
    () => (drawnArea ? { name: t('listings.drawnArea'), rings: [drawnArea], bbox: ringsBbox([drawnArea]) } : null),
    [drawnArea, t],
  );
  const activeBoundary = customBoundary ?? boundary;

  const matches = useCallback(
    (p: Property, includeGeo: boolean) => {
      if (search && !textQueryMatches(p, search)) return false;
      if (includeGeo && drawnArea) {
        // The drawn shape replaces the city/district geo filter entirely.
        if (!hasKnownLocation(p) || !pointInRing(drawnArea, p.coordinates.lat, p.coordinates.lng)) return false;
      }
      if (includeGeo && !drawnArea && filters.city && p.city !== filters.city) return false;
      if (includeGeo && !drawnArea && filters.districts.length) {
        // The district label decides — OSM outlines are administrative districts,
        // much wider than the neighbourhood people mean (admin "Vake" swallows
        // half of Saburtalo). The outline only places listings whose label is
        // missing or unrecognised, and only when their coordinates are real.
        if (!districtsMatch(p, filters.city, filters.districts)) {
          const unlabelled = !p.district || !findDistrictArea(cityArea, p.district);
          const inside = unlabelled && Boolean(districtPolygon) && hasKnownLocation(p)
            && pointInRings(districtPolygon!.rings, p.coordinates.lat, p.coordinates.lng);
          if (!inside) return false;
        }
      }
      if (!statusMatches(p, filters.status)) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (!roomsMatch(p, filters.rooms)) return false;
      const [priceMin, priceMax] = orderedRange(filters.priceMin, filters.priceMax);
      const gelPrice = listingToGel(searchPrice(p, filters.status), p.priceCurrency);
      if (priceMin && gelPrice < displayToGel(Number(priceMin))) return false;
      if (priceMax && gelPrice > displayToGel(Number(priceMax))) return false;
      const [areaMin, areaMax] = orderedRange(filters.areaMin, filters.areaMax);
      if (areaMin && p.area < Number(areaMin)) return false;
      if (areaMax && p.area > Number(areaMax)) return false;
      if (filters.vip && !p.isFeatured) return false;
      if (filters.isPremium && !p.isPremium) return false;
      if (filters.isNew && !p.isNew) return false;
      return true;
    },
    [filters, search, cityArea, districtPolygon, drawnArea, displayToGel, listingToGel],
  );

  /** Everything matching the filter form — this is what the map draws. */
  const filtered = useMemo(() => {
    const r = properties.filter(p => matches(p, true));
    const q = search.trim();
    const price = (p: Property) => listingToGel(searchPrice(p, filters.status), p.priceCurrency);
    switch (sort) {
      case 'price-desc': r.sort((a, b) => price(b) - price(a)); break;
      case 'price-asc': r.sort((a, b) => price(a) - price(b)); break;
      case 'area-desc': r.sort((a, b) => b.area - a.area); break;
      case 'popular': r.sort((a, b) => b.viewCount - a.viewCount); break;
      default: r.sort((a, b) => new Date(b.listedDate).getTime() - new Date(a.listedDate).getTime());
    }
    // Exact / prefix ID hits float to the top so a code search feels instant.
    if (q && /^\d+$/.test(q)) {
      const score = (p: Property) => (p.id === q ? 0 : p.id.startsWith(q) ? 1 : p.id.includes(q) ? 2 : 3);
      r.sort((a, b) => score(a) - score(b));
    }
    return r;
  }, [properties, matches, sort, search, listingToGel, filters.status]);

  /** Listings just outside the selected area, drawn faded for context. */
  const contextProperties = useMemo(() => {
    if (!activeBoundary) return [];
    const inside = new Set(filtered.map(p => p.id));
    return properties.filter(p => !inside.has(p.id) && matches(p, false));
  }, [activeBoundary, filtered, properties, matches]);

  const mapShown = wide ? mapVisible : mobilePanel === 'map';

  /** Narrowed to the map viewport when "search by moving the map" is on and the map is on screen. */
  const boundsActive = areaSearch && Boolean(mapBounds) && mapShown;
  const placeFiltered = Boolean(filters.city || filters.districts.length);
  const visible = useMemo(() => {
    if (!boundsActive || !mapBounds) return filtered;
    return filtered.filter(p =>
      // Without a real location a listing cannot be placed in the viewport; when the
      // visitor already chose a city or district, its label is the better guide.
      (!hasKnownLocation(p) && placeFiltered) || mapBounds.contains([p.coordinates.lat, p.coordinates.lng]));
  }, [filtered, boundsActive, mapBounds, placeFiltered]);

  /** The map only draws listings it can place honestly. */
  const mapProperties = useMemo(() => filtered.filter(hasKnownLocation), [filtered]);
  const mapContextProperties = useMemo(() => contextProperties.filter(hasKnownLocation), [contextProperties]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = useMemo(() => visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [visible, page]);

  /* Counts for the filter popovers, scoped to the chosen deal. */
  const dealScoped = useMemo(() => properties.filter(p => statusMatches(p, filters.status)), [properties, filters.status]);
  const locationCounts = useMemo(() => buildLocationCounts(dealScoped), [dealScoped]);
  const typeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of dealScoped) m.set(p.type, (m.get(p.type) ?? 0) + 1);
    return m;
  }, [dealScoped]);

  /* ── Map framing and paging ──────────────────────────────────────────── */

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

  const goToPage = (n: number) => {
    setPage(n);
    listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Outline of the selected district, or of the city when the district has none. */
  useEffect(() => {
    if (!filters.city || filters.districts.length > 1) {
      setBoundary(null);
      setBoundaryOsm(null);
      return;
    }
    const osm = districtArea?.osm ?? cityArea?.osm;
    let cancelled = false;
    fetchAreaBoundary(osm ? { osm } : { city: filters.city, district: singleDistrict || undefined }).then(result => {
      if (cancelled) return;
      setBoundary(result);
      setBoundaryOsm(result ? osm ?? null : null);
    });
    return () => { cancelled = true; };
  }, [filters.city, filters.districts.length, singleDistrict, cityArea, districtArea]);

  /* ── Mutations ───────────────────────────────────────────────────────── */

  const clearDrawnArea = useCallback(() => {
    setDrawnArea(null);
    setDrawSeq(n => n + 1);
  }, []);

  const patch = useCallback((p: Partial<ListingFilters>) => {
    // Picking a city or district takes over from a drawn area, and vice versa.
    if (p.city || p.districts?.length) clearDrawnArea();
    setFilters(f => ({ ...f, ...p }));
  }, [clearDrawnArea]);

  const handleDrawnAreaChange = useCallback((ring: Ring | null) => {
    setDrawnArea(ring);
    setDrawSeq(n => n + 1);
    if (!ring) return;
    setFilters(f => (f.city || f.districts.length ? { ...f, city: '', districts: [] } : f));
    // The drawn shape is the area now, so the viewport should not narrow it further.
    setAreaSearch(false);
  }, []);

  const clearAll = () => {
    clearDrawnArea();
    setSearch('');
    setFilters(f => ({ ...EMPTY_FILTERS, status: f.status }));
  };

  function tryOpenById() {
    const q = search.trim();
    if (!isExactListingId(q)) return;
    const hit = properties.find(p => p.id === q);
    if (hit) navigate(propertyHref(hit));
  }

  /* ── Formatting ──────────────────────────────────────────────────────── */

  const formatPrice = useCallback(
    (property: Property) => {
      const from = listingMoneyFrom(property);
      const perMonth = property.status === 'rent';
      const sale = formatMoney(property.price, {
        ...from,
        perMonth,
        compact: listingToGel(property.price, property.priceCurrency) >= 1_000_000,
      });
      /* Sale + rent listings show both figures side by side. */
      if (property.status === 'both' && property.rentPrice) {
        return `${sale} · ${formatMoney(property.rentPrice, { ...from, perMonth: true })}`;
      }
      return sale;
    },
    [formatMoney, listingToGel],
  );

  const formatPricePerSqm = useCallback(
    (property: Property) =>
      formatMoney(Math.round(property.price / Math.max(property.area, 1)), { ...listingMoneyFrom(property), perSqm: true }),
    [formatMoney],
  );

  const formatPinPrice = useCallback(
    (property: Property) =>
      formatMoney(searchPrice(property, filters.status), { ...listingMoneyFrom(property), compact: true }),
    [formatMoney, filters.status],
  );

  const handleBoundsChange = useCallback((bounds: L.LatLngBounds) => setMapBounds(bounds), []);
  const handleRowHover = useCallback((id: string | null) => setActiveId(id), []);

  /* ── Header copy and chips ───────────────────────────────────────────── */

  const dealLabel = deals.find(d => d.v === filters.status)?.l ?? '';
  const typeLabel = types.find(o => o.v && o.v === filters.type)?.l ?? '';
  const roomsLabel = filters.rooms.length ? t('listings.roomsChip', { n: roomsSummary(filters.rooms) }) : '';
  const title = [dealLabel, typeLabel, roomsLabel].filter(Boolean).join(' · ') || t('listings.bar.allListings');

  const placeLabel = drawnArea
    ? t('listings.drawnArea')
    : [
        filters.districts.map(d => areaSelectionLabel(cityArea, d, locale)).join(', '),
        cityArea ? t(cityArea.labelKey) : filters.city,
      ].filter(Boolean).join(' · ') || t('listings.allGeorgia');

  const priceText = usePriceSummary(filters.priceMin, filters.priceMax);
  const unit = t('home.areaUnit');
  const [aMin, aMax] = orderedRange(filters.areaMin, filters.areaMax);

  type ChipItem = { key: string; label: string; onRemove: () => void; place?: boolean };
  const chips: ChipItem[] = [
    search && { key: 'q', label: `“${search}”`, onRemove: () => setSearch('') },
    drawnArea && { key: 'drawn', label: t('listings.drawnArea'), place: true, onRemove: clearDrawnArea },
    filters.city && { key: 'city', label: cityArea ? t(cityArea.labelKey) : filters.city, place: true, onRemove: () => patch({ city: '', districts: [] }) },
    ...filters.districts.map(d => ({
      key: `d-${d}`, label: areaSelectionLabel(cityArea, d, locale), place: true,
      onRemove: () => patch({ districts: filters.districts.filter(x => x !== d) }),
    })),
    typeLabel && { key: 'type', label: typeLabel, onRemove: () => patch({ type: '' }) },
    ...filters.rooms.map(r => ({
      key: `r-${r}`, label: t('listings.roomsChip', { n: r === '5' ? '5+' : r }),
      onRemove: () => patch({ rooms: filters.rooms.filter(x => x !== r) }),
    })),
    priceText && { key: 'price', label: priceText, onRemove: () => patch({ priceMin: '', priceMax: '' }) },
    (aMin || aMax) && {
      key: 'area',
      label: aMin && aMax ? `${aMin}–${aMax} ${unit}` : aMin ? `${aMin}+ ${unit}` : `≤ ${aMax} ${unit}`,
      onRemove: () => patch({ areaMin: '', areaMax: '' }),
    },
    filters.vip && { key: 'vip', label: 'SUPER VIP', onRemove: () => patch({ vip: false }) },
    filters.isPremium && { key: 'premium', label: t('listings.chipPremium'), onRemove: () => patch({ isPremium: false }) },
    filters.isNew && { key: 'new', label: t('listings.chipNew'), onRemove: () => patch({ isNew: false }) },
  ].filter(Boolean) as ChipItem[];

  const hasFilters = activeFilterCount(filters) > 0 || Boolean(search) || Boolean(drawnArea);
  const narrowedByMap = boundsActive && visible.length !== filtered.length;
  const countFmt = (n: number) => n.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US');

  const sortOptions = useMemo(() => [
    { label: t('listings.sort.newest'), value: 'newest' },
    { label: t('listings.sort.priceAsc'), value: 'price-asc' },
    { label: t('listings.sort.priceDesc'), value: 'price-desc' },
    { label: t('listings.sort.areaDesc'), value: 'area-desc' },
    { label: t('listings.sort.popular'), value: 'popular' },
  ], [t]);

  return (
    <div className={`lp ${wide && !mapVisible ? 'is-map-hidden' : ''}`}>
      <div className="lp-top">
        <ListingsFilterBar
          filters={filters}
          onPatch={patch}
          search={search}
          onSearch={setSearch}
          onSearchEnter={tryOpenById}
          locationCounts={locationCounts}
          typeCounts={typeCounts}
          resultCount={loading ? null : filtered.length}
          sort={sort}
          sortOptions={sortOptions}
          onSort={setSort}
          mapVisible={mapVisible}
          onToggleMap={() => setMapVisible(v => !v)}
        />
      </div>

      <div className="lp-body">
        <section className={`lp-list ${!wide && mobilePanel === 'map' ? 'is-hidden' : ''}`} aria-label={title}>
          <div className="lp-list__scroll" ref={listScrollRef}>
            <header className="lp-head">
              <div className="lp-head__row">
                <div className="lp-head__main">
                  <p className="lp-head__place"><MapPin size={13} strokeWidth={2.4} /> {placeLabel}</p>
                  <h1 className="lp-head__title">{title}</h1>
                </div>
                {wide && <SortMenu sort={sort} options={sortOptions} onSort={setSort} />}
              </div>
              <div className="lp-head__meta">
                <span className="lp-head__count">
                  {loading ? <span className="lp-head__count-skel" /> : (
                    <><strong>{countFmt(visible.length)}</strong> {t('listings.bar.listingsWord')}</>
                  )}
                </span>
                {narrowedByMap && (
                  <>
                    <span className="lp-head__area">{t('listings.inThisArea')}</span>
                    <button type="button" className="lp-head__all" onClick={showAllResults}>
                      {t('listings.showAllResults')} · {countFmt(filtered.length)}
                    </button>
                  </>
                )}
              </div>
            </header>

            {chips.length > 0 && (
              <div className="lp-chips">
                {chips.map(c => (
                  <span key={c.key} className={`lp-chip ${c.place ? 'is-place' : ''}`}>
                    {c.place && <MapPin size={11} strokeWidth={2.6} />}
                    {c.label}
                    <button type="button" onClick={c.onRemove} aria-label={`${t('common.clear')}: ${c.label}`}>
                      <X size={11} strokeWidth={2.8} />
                    </button>
                  </span>
                ))}
                <button type="button" className="lp-chips__clear" onClick={clearAll}>{t('listings.clearFilters')}</button>
              </div>
            )}

            {loading ? (
              <div className="lp-grid" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="lc-skel">
                    <div className="lc-skel__img skeleton" />
                    <div className="lc-skel__body">
                      <span className="skeleton" style={{ width: '46%', height: 18 }} />
                      <span className="skeleton" style={{ width: '82%' }} />
                      <span className="skeleton" style={{ width: '64%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="lp-empty">
                <span className="lp-empty__icon">
                  {filtered.length > 0 ? <MapIcon size={26} strokeWidth={1.8} /> : <SearchX size={26} strokeWidth={1.8} />}
                </span>
                <h3>{filtered.length > 0 ? t('listings.emptyAreaTitle') : t('listings.emptyTitle')}</h3>
                <p>{filtered.length > 0 ? t('listings.emptyAreaHint', { count: filtered.length }) : t('listings.emptyHint')}</p>
                <div className="lp-empty__actions">
                  {filtered.length > 0 && (
                    <button type="button" className="lp-btn lp-btn--primary" onClick={showAllResults}>{t('listings.showAllResults')}</button>
                  )}
                  {hasFilters && (
                    <button type="button" className="lp-btn" onClick={() => { clearAll(); showAllResults(); }}>{t('listings.clearFilters')}</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="lp-grid">
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
                  <nav className="lp-pages" aria-label={t('listings.bar.page', { n: page })}>
                    <button type="button" className="lp-pages__step" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                      <ChevronLeft size={16} strokeWidth={2.4} /> <span>{t('listings.bar.prev')}</span>
                    </button>
                    <div className="lp-pages__nums">
                      {pageNumbers(page, totalPages).map((n, i) =>
                        n === null ? (
                          <span key={`gap-${i}`} className="lp-pages__gap">…</span>
                        ) : (
                          <button
                            key={n}
                            type="button"
                            aria-current={n === page ? 'page' : undefined}
                            className={n === page ? 'is-current' : ''}
                            onClick={() => goToPage(n)}
                          >
                            {n}
                          </button>
                        ),
                      )}
                    </div>
                    <button type="button" className="lp-pages__step" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                      <span>{t('listings.bar.next')}</span> <ChevronRight size={16} strokeWidth={2.4} />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>

        {(mapShown || !wide) && (
          <section className={`lp-map ${!wide && mobilePanel === 'list' ? 'is-hidden' : ''}`}>
            <ListingsMap
              properties={mapProperties}
              contextProperties={mapContextProperties}
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
              formatPinPrice={formatPinPrice}
            />
          </section>
        )}

        {/* Phone/tablet list ⇄ map switch */}
        <button
          type="button"
          className="lp-float"
          onClick={() => setMobilePanel(p => (p === 'list' ? 'map' : 'list'))}
        >
          {mobilePanel === 'list' ? <MapIcon size={16} strokeWidth={2.2} /> : <List size={16} strokeWidth={2.2} />}
          {mobilePanel === 'list' ? t('listings.showMap') : t('listings.showList')}
          {mobilePanel === 'map' && !loading && <span>{countFmt(visible.length)}</span>}
        </button>
      </div>

    </div>
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
