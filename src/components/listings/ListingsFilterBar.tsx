import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown, BadgeCheck, Check, ChevronDown, Hash, Map as MapIcon, Search, SlidersHorizontal, Sparkles, Star, X,
} from 'lucide-react';
import { useTranslation, useLocale } from '../../i18n/LocaleContext';
import { classifyQuery } from '../../lib/listingSearch';
import type { ListingFilters } from '../../lib/listingFilters';
import { moreFilterCount } from '../../lib/listingFilters';
import type { LocationCounts } from '../../lib/locationCounts';
import LocationPicker from '../LocationPicker';
import { AreaPanel, PanelFoot, PricePanel, RoomsPicker, Sheet, TypeGrid } from '../search/SearchPanels';
import {
  locationSummary, roomsSummary, useDealOptions, usePriceSummary, useTypeOptions,
} from '../search/searchHelpers';

type Pill = 'deal' | 'location' | 'type' | 'rooms' | 'price' | 'more' | 'sort';

export type SortOption = { value: string; label: string };

/** Wide screens get anchored popovers; narrower ones get bottom sheets. */
function useWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function ListingsFilterBar({
  filters,
  onPatch,
  search,
  onSearch,
  onSearchEnter,
  locationCounts,
  typeCounts,
  resultCount,
  sort,
  sortOptions,
  onSort,
  mapVisible,
  onToggleMap,
}: {
  filters: ListingFilters;
  onPatch: (patch: Partial<ListingFilters>) => void;
  search: string;
  onSearch: (value: string) => void;
  onSearchEnter: () => void;
  locationCounts?: LocationCounts;
  typeCounts?: Map<string, number>;
  resultCount: number | null;
  sort: string;
  sortOptions: SortOption[];
  onSort: (value: string) => void;
  mapVisible: boolean;
  onToggleMap: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const wide = useWide();
  const deals = useDealOptions();
  const types = useTypeOptions();
  const [open, setOpen] = useState<Pill | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const priceText = usePriceSummary(filters.priceMin, filters.priceMax);
  const more = moreFilterCount(filters);
  const qKind = classifyQuery(search);

  useEffect(() => {
    if (!open || !wide) return;
    const onDoc = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, wide]);

  // Keep an opened popover inside the viewport's right edge.
  useLayoutEffect(() => {
    if (!open || !wide) return;
    const pop = barRef.current?.querySelector<HTMLElement>('.lp-pop');
    if (!pop) return;
    pop.style.removeProperty('--lp-shift');
    const overflow = pop.getBoundingClientRect().right - (window.innerWidth - 16);
    if (overflow > 0) pop.style.setProperty('--lp-shift', `${-overflow}px`);
  }, [open, wide]);

  const close = () => setOpen(null);
  const toggle = (p: Pill) => setOpen(cur => (cur === p ? null : p));

  /* ── Panel bodies ────────────────────────────────────────────────────── */
  const body = (p: Pill): ReactNode => {
    switch (p) {
      case 'deal':
        return (
          <div className="lp-menu" role="listbox" aria-label={t('home.dealType')}>
            {[{ v: '', l: t('listings.bar.anyDeal') }, ...deals].map(d => (
              <button
                key={d.v || 'any'}
                type="button"
                role="option"
                aria-selected={filters.status === d.v}
                className={filters.status === d.v ? 'is-on' : ''}
                onClick={() => { onPatch({ status: d.v }); close(); }}
              >
                {d.l}
                {filters.status === d.v && <Check size={15} strokeWidth={2.8} />}
              </button>
            ))}
          </div>
        );
      case 'location':
        return (
          <LocationPicker
            layout={wide ? 'pop' : 'sheet'}
            city={filters.city}
            districts={filters.districts}
            counts={locationCounts}
            onChange={(city, districts) => onPatch({ city, districts })}
            onDone={close}
            doneLabel={resultCount === null ? t('home.search.done') : `${t('home.search.done')} · ${resultCount}`}
          />
        );
      case 'type':
        return <TypeGrid value={filters.type} counts={typeCounts} onPick={type => { onPatch({ type }); close(); }} />;
      case 'rooms':
        return (
          <>
            <RoomsPicker value={filters.rooms} onChange={update => onPatch({ rooms: update(filters.rooms) })} />
            {wide && <PanelFoot onClear={() => onPatch({ rooms: [] })} clearDisabled={!filters.rooms.length} onDone={close} count={resultCount} />}
          </>
        );
      case 'price':
        return (
          <>
            <PricePanel status={filters.status} min={filters.priceMin} max={filters.priceMax} onChange={(priceMin, priceMax) => onPatch({ priceMin, priceMax })} />
            {wide && <PanelFoot onClear={() => onPatch({ priceMin: '', priceMax: '' })} clearDisabled={!filters.priceMin && !filters.priceMax} onDone={close} count={resultCount} />}
          </>
        );
      case 'more':
        return (
          <div className="lp-more">
            <section>
              <h3>{t('home.area')}</h3>
              <AreaPanel min={filters.areaMin} max={filters.areaMax} onChange={(areaMin, areaMax) => onPatch({ areaMin, areaMax })} />
            </section>
            <section>
              <h3>{t('listings.bar.highlights')}</h3>
              <div className="lp-toggles">
                {([
                  ['vip', t('listings.bar.vipOnly'), <Star key="i" size={15} strokeWidth={2.2} />],
                  ['isPremium', t('listings.premiumOnly'), <BadgeCheck key="i" size={15} strokeWidth={2.2} />],
                  ['isNew', t('listings.newOnly'), <Sparkles key="i" size={15} strokeWidth={2.2} />],
                ] as const).map(([key, label, icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={filters[key]}
                    className={`lp-toggle ${filters[key] ? 'is-on' : ''}`}
                    onClick={() => onPatch({ [key]: !filters[key] })}
                  >
                    <span className="lp-toggle__icon">{icon}</span>
                    <span className="lp-toggle__label">{label}</span>
                    <span className="lp-switch" aria-hidden><span /></span>
                  </button>
                ))}
              </div>
            </section>
            {wide && (
              <PanelFoot
                onClear={() => onPatch({ areaMin: '', areaMax: '', vip: false, isPremium: false, isNew: false })}
                clearDisabled={!more}
                onDone={close}
                count={resultCount}
              />
            )}
          </div>
        );
      case 'sort':
        return (
          <div className="lp-menu" role="listbox" aria-label={t('listings.bar.sort')}>
            {sortOptions.map(o => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={sort === o.value}
                className={sort === o.value ? 'is-on' : ''}
                onClick={() => { onSort(o.value); close(); }}
              >
                {o.label}
                {sort === o.value && <Check size={15} strokeWidth={2.8} />}
              </button>
            ))}
          </div>
        );
    }
  };

  const titles: Record<Pill, string> = {
    deal: t('home.dealType'),
    location: t('home.location'),
    type: t('home.propertyType'),
    rooms: t('home.search.rooms'),
    price: t('home.priceRange'),
    more: t('listings.bar.more'),
    sort: t('listings.bar.sort'),
  };

  /* ── Pills ───────────────────────────────────────────────────────────── */
  const pill = (p: Pill, label: string, value: string, opts: { icon?: ReactNode; badge?: number; onClear?: () => void; className?: string } = {}) => {
    const active = Boolean(value) || Boolean(opts.badge);
    return (
      <div className={`lp-pill-wrap ${opts.className ?? ''}`}>
        <button
          type="button"
          className={`lp-pill ${active ? 'is-active' : ''} ${open === p ? 'is-open' : ''}`}
          onClick={() => toggle(p)}
          aria-expanded={open === p}
          aria-haspopup="dialog"
        >
          {opts.icon}
          <span className="lp-pill__text">{value || label}</span>
          {opts.badge ? <span className="lp-pill__badge">{opts.badge}</span> : null}
          {active && opts.onClear
            ? <span className="lp-pill__spacer" aria-hidden />
            : <ChevronDown size={14} strokeWidth={2.4} className="lp-pill__chev" />}
        </button>
        {active && opts.onClear && (
          <button type="button" className="lp-pill__x" onClick={opts.onClear} aria-label={`${t('common.clear')}: ${label}`}>
            <X size={12} strokeWidth={2.8} />
          </button>
        )}
        <AnimatePresence>
          {wide && open === p && (
            <motion.div
              className={`lp-pop lp-pop--${p} ${p === 'sort' ? 'lp-pop--end' : ''}`}
              role="dialog"
              aria-label={titles[p]}
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              {body(p)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const dealText = deals.find(d => d.v === filters.status)?.l ?? '';
  const typeText = types.find(o => o.v === filters.type && o.v)?.l ?? '';
  const locText = locationSummary(filters.city, filters.districts, t, locale);
  const roomsText = filters.rooms.length ? `${roomsSummary(filters.rooms)} ${t('listings.bar.roomsShort')}` : '';
  const sortText = sortOptions.find(o => o.value === sort)?.label ?? '';

  const sheetFoot = (onClear: () => void, disabled: boolean) => (
    <PanelFoot onClear={onClear} clearDisabled={disabled} onDone={close} count={resultCount} />
  );
  const sheetFooters: Partial<Record<Pill, ReactNode>> = {
    rooms: sheetFoot(() => onPatch({ rooms: [] }), !filters.rooms.length),
    price: sheetFoot(() => onPatch({ priceMin: '', priceMax: '' }), !filters.priceMin && !filters.priceMax),
    more: sheetFoot(() => onPatch({ areaMin: '', areaMax: '', vip: false, isPremium: false, isNew: false }), !more),
  };

  return (
    <div className="lp-bar" ref={barRef}>
      <label className={`lp-search ${search ? 'has-value' : ''}`}>
        <Search size={17} strokeWidth={2.2} aria-hidden />
        <input
          value={search}
          onChange={e => onSearch(e.target.value.slice(0, 80))}
          onKeyDown={e => { if (e.key === 'Enter') onSearchEnter(); }}
          placeholder={t('listings.searchPlaceholder')}
          aria-label={t('listings.searchPlaceholder')}
          inputMode="search"
          enterKeyHint="search"
        />
        {(qKind === 'id' || qKind === 'cadastral') && (
          <span className="lp-search__kind"><Hash size={11} strokeWidth={2.6} />{qKind === 'id' ? 'ID' : t('home.search.kindCadastral')}</span>
        )}
        {search && (
          <button type="button" className="lp-search__x" onClick={() => onSearch('')} aria-label={t('common.clear')}>
            <X size={13} strokeWidth={2.6} />
          </button>
        )}
      </label>

      <div className="lp-pills">
        {pill('deal', t('listings.bar.deal'), dealText)}
        {pill('location', t('home.location'), locText, { className: 'lp-pill-wrap--loc', onClear: () => onPatch({ city: '', districts: [] }) })}
        {pill('type', t('home.propertyType'), typeText, { onClear: () => onPatch({ type: '' }) })}
        {pill('rooms', t('home.search.rooms'), roomsText, { onClear: () => onPatch({ rooms: [] }) })}
        {pill('price', t('home.price'), priceText, { onClear: () => onPatch({ priceMin: '', priceMax: '' }) })}
        {pill('more', t('listings.bar.more'), '', {
          icon: <SlidersHorizontal size={15} strokeWidth={2.2} />,
          badge: more,
        })}
      </div>

      <div className="lp-bar__end">
        {/* Wide screens sort from the results header instead. */}
        {!wide && pill('sort', t('listings.bar.sort'), sortText, { icon: <ArrowUpDown size={15} strokeWidth={2.2} />, className: 'lp-pill-wrap--sort' })}
        <button
          type="button"
          role="switch"
          aria-checked={mapVisible}
          className={`lp-maptoggle ${mapVisible ? 'is-on' : ''}`}
          onClick={onToggleMap}
        >
          <MapIcon size={15} strokeWidth={2.2} />
          {t('listings.bar.map')}
          <span className="lp-switch" aria-hidden><span /></span>
        </button>
      </div>

      <AnimatePresence>
        {!wide && open && (
          <Sheet
            key={open}
            title={titles[open]}
            onClose={close}
            tall={open === 'location' || open === 'more'}
            footer={sheetFooters[open]}
          >
            {body(open)}
          </Sheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Sort dropdown for the results header on wide screens. */
export function SortMenu({ sort, options, onSort }: {
  sort: string; options: SortOption[]; onSort: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find(o => o.value === sort)?.label ?? '';
  return (
    <div className="lp-sort" ref={ref}>
      <button type="button" className={`lp-sort__btn ${open ? 'is-open' : ''}`} onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="listbox">
        <ArrowUpDown size={14} strokeWidth={2.2} />
        <span className="lp-sort__label">{t('listings.bar.sort')}:</span>
        <strong>{current}</strong>
        <ChevronDown size={14} strokeWidth={2.4} className="lp-pill__chev" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="lp-pop lp-pop--sort lp-pop--end"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="lp-menu" role="listbox" aria-label={t('listings.bar.sort')}>
              {options.map(o => (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={sort === o.value}
                  className={sort === o.value ? 'is-on' : ''}
                  onClick={() => { onSort(o.value); setOpen(false); }}
                >
                  {o.label}
                  {sort === o.value && <Check size={15} strokeWidth={2.8} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
