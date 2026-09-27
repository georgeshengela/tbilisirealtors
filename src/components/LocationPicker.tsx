import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, MapPin, Minus, Search, X } from 'lucide-react';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import {
  CITY_AREAS,
  areaSelectionLabel,
  districtLabel,
  districtSections,
  findCityArea,
  type CityArea,
  type DistrictArea,
  type DistrictGroup,
} from '../data/districts';
import type { LocationCounts } from '../lib/locationCounts';

type Hit = {
  city: CityArea;
  kind: 'city' | 'group' | 'district';
  district?: DistrictArea;
  group?: DistrictGroup;
  label: string;
  context: string;
  count: number;
  score: number;
};

const norm = (s: string) => s.toLocaleLowerCase().trim();

function Highlight({ text, query }: { text: string; query: string }) {
  const i = query ? norm(text).indexOf(norm(query)) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

function Tick({ state }: { state: 'on' | 'some' | 'off' }) {
  return (
    <span className={`loc-tick is-${state}`} aria-hidden>
      {state === 'on' && <Check size={12} strokeWidth={3.2} />}
      {state === 'some' && <Minus size={12} strokeWidth={3.2} />}
    </span>
  );
}

/**
 * City + any number of neighbourhoods. Ticking a parent area selects every
 * neighbourhood under it; unticking one child of a selected parent keeps the rest.
 */
export default function LocationPicker({
  city,
  districts,
  counts,
  onChange,
  onDone,
  doneLabel,
  layout = 'pop',
}: {
  city: string;
  districts: string[];
  counts?: LocationCounts;
  onChange: (city: string, districts: string[]) => void;
  onDone: () => void;
  doneLabel?: string;
  layout?: 'pop' | 'sheet';
}) {
  const { t } = useTranslation();
  const { locale } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const count = useCallback((key: string) => counts?.get(key) ?? 0, [counts]);
  const hasCounts = Boolean(counts && counts.size);
  const cityName = useCallback((c: CityArea) => t(c.labelKey), [t]);

  const [browse, setBrowse] = useState<CityArea>(() => findCityArea(city) ?? CITY_AREAS[0]);

  useEffect(() => {
    // Phones would pop the keyboard over the sheet; only focus where there is room.
    if (layout === 'pop') inputRef.current?.focus({ preventScroll: true });
  }, [layout]);

  /* ── Selection model ─────────────────────────────────────────────────── */
  const picked = useMemo(() => new Set(city === browse.ka ? districts : []), [city, districts, browse]);

  const districtState = (d: DistrictArea): 'on' | 'off' =>
    picked.has(d.ka) || (d.group && picked.has(d.group)) ? 'on' : 'off';

  const groupState = (c: CityArea, g: DistrictGroup): 'on' | 'some' | 'off' => {
    if (picked.has(g.ka)) return 'on';
    return c.districts.some(d => d.group === g.ka && picked.has(d.ka)) ? 'some' : 'off';
  };

  /** Starts a fresh selection when the visitor switches to another city. */
  const base = (c: CityArea) => (city === c.ka ? districts : []);

  function toggleDistrict(c: CityArea, d: DistrictArea) {
    const cur = base(c);
    const siblings = d.group ? c.districts.filter(x => x.group === d.group) : [];
    if (d.group && cur.includes(d.group)) {
      // Break the parent back into its neighbourhoods, minus this one.
      onChange(c.ka, [...cur.filter(x => x !== d.group), ...siblings.filter(x => x.ka !== d.ka).map(x => x.ka)]);
      return;
    }
    if (cur.includes(d.ka)) {
      onChange(c.ka, cur.filter(x => x !== d.ka));
      return;
    }
    const next = [...cur, d.ka];
    // Every neighbourhood of a parent ticked → collapse into the parent.
    if (d.group && siblings.length > 1 && siblings.every(x => next.includes(x.ka))) {
      onChange(c.ka, [...next.filter(x => !siblings.some(s => s.ka === x)), d.group]);
      return;
    }
    onChange(c.ka, next);
  }

  function toggleGroup(c: CityArea, g: DistrictGroup) {
    const cur = base(c).filter(x => c.districts.find(d => d.ka === x)?.group !== g.ka);
    onChange(c.ka, cur.includes(g.ka) ? cur.filter(x => x !== g.ka) : [...cur, g.ka]);
  }

  function remove(name: string) {
    onChange(city, districts.filter(x => x !== name));
  }

  /* ── Search ──────────────────────────────────────────────────────────── */
  const hits = useMemo<Hit[]>(() => {
    const q = norm(query);
    if (!q) return [];
    const score = (names: string[]) => {
      let best = -1;
      for (const n of names) {
        const i = norm(n).indexOf(q);
        if (i === 0) return 2;
        if (i > 0) best = 1;
      }
      return best;
    };
    const out: Hit[] = [];
    for (const c of CITY_AREAS) {
      const cs = score([c.ka, c.en]);
      if (cs > 0) out.push({ city: c, kind: 'city', label: cityName(c), context: '', count: count(c.ka), score: cs });
      for (const g of c.groups ?? []) {
        const gs = score([g.ka, g.en]);
        if (gs > 0) out.push({ city: c, kind: 'group', group: g, label: districtLabel(g, locale), context: cityName(c), count: count(`${c.ka}|${g.ka}`), score: gs });
      }
      for (const d of c.districts) {
        const ds = score([d.ka, d.en, ...(d.aliases ?? [])]);
        if (ds < 0) continue;
        const g = d.group ? c.groups?.find(x => x.ka === d.group) : undefined;
        out.push({
          city: c,
          kind: 'district',
          district: d,
          label: districtLabel(d, locale),
          context: [g ? districtLabel(g, locale) : '', cityName(c)].filter(Boolean).join(' / '),
          count: count(`${c.ka}|${d.ka}`),
          score: ds,
        });
      }
    }
    const kindRank = { district: 0, group: 1, city: 2 } as const;
    return out
      .sort((a, b) => b.score - a.score || kindRank[a.kind] - kindRank[b.kind] || b.count - a.count)
      .slice(0, 40);
  }, [query, locale, count, cityName]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function hitState(h: Hit): 'on' | 'some' | 'off' {
    if (h.kind === 'city') return city === h.city.ka && !districts.length ? 'on' : 'off';
    if (city !== h.city.ka) return 'off';
    const sel = new Set(districts);
    if (h.kind === 'group') {
      if (sel.has(h.group!.ka)) return 'on';
      return h.city.districts.some(d => d.group === h.group!.ka && sel.has(d.ka)) ? 'some' : 'off';
    }
    return sel.has(h.district!.ka) || (h.district!.group && sel.has(h.district!.group)) ? 'on' : 'off';
  }

  function pickHit(h: Hit) {
    setBrowse(h.city);
    if (h.kind === 'city') onChange(h.city.ka, []);
    else if (h.kind === 'group') toggleGroup(h.city, h.group!);
    else toggleDistrict(h.city, h.district!);
    // Ready for the next name straight away, like a tag input.
    setQuery('');
    inputRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (query) setQuery('');
      else onDone();
      return;
    }
    if (e.key === 'Backspace' && !query && districts.length && e.target === inputRef.current) {
      remove(districts[districts.length - 1]);
      return;
    }
    if (!hits.length) {
      if (e.key === 'Enter' && e.target === inputRef.current) { e.preventDefault(); if (!query) onDone(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const h = hits[active]; if (h) pickHit(h); }
  }

  const popular = useMemo(() => {
    if (!hasCounts) return [];
    return browse.districts
      .map(d => ({ d, n: count(`${browse.ka}|${d.ka}`) }))
      .filter(x => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }, [browse, count, hasCounts]);

  const selectedCity = findCityArea(city);
  const Count = ({ n }: { n: number }) => (hasCounts && n > 0 ? <span className="loc-count">{n}</span> : null);

  return (
    <div className={`loc loc--${layout}`} onKeyDown={onKeyDown}>
      <div className="loc__search">
        <Search size={16} strokeWidth={2.3} aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('home.loc.searchPlaceholder')}
          aria-label={t('home.loc.searchPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="loc__search-x" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label={t('common.clear')}>
            <X size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {selectedCity && (
        <div className="loc__picked" aria-live="polite">
          <button type="button" className="loc__crumb" onClick={() => { setBrowse(selectedCity); setQuery(''); }}>
            <MapPin size={12} strokeWidth={2.4} /> {cityName(selectedCity)}
          </button>
          {districts.length > 0 && <ChevronRight size={13} strokeWidth={2.4} className="loc__crumb-sep" aria-hidden />}
          {districts.map(d => (
            <span key={d} className="loc__tag">
              {areaSelectionLabel(selectedCity, d, locale)}
              <button type="button" onClick={() => remove(d)} aria-label={`${t('common.clear')}: ${areaSelectionLabel(selectedCity, d, locale)}`}>
                <X size={11} strokeWidth={2.8} />
              </button>
            </span>
          ))}
        </div>
      )}

      {query ? (
        <div className="loc__results" ref={listRef} role="listbox" aria-multiselectable aria-label={t('home.loc.results')}>
          {hits.length === 0 && <p className="loc__empty">{t('home.noDistricts')}</p>}
          {hits.map((h, i) => {
            const state = hitState(h);
            return (
              <button
                key={`${h.kind}-${h.city.ka}-${h.group?.ka ?? h.district?.ka ?? ''}`}
                type="button"
                role="option"
                aria-selected={state === 'on'}
                data-active={i === active || undefined}
                className={`loc__hit ${state === 'on' ? 'is-on' : ''} ${hasCounts && h.count === 0 ? 'is-empty' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pickHit(h)}
              >
                {h.kind === 'city'
                  ? <span className="loc__hit-icon"><MapPin size={14} strokeWidth={2.2} /></span>
                  : <Tick state={state} />}
                <span className="loc__hit-copy">
                  <strong><Highlight text={h.label} query={query} /></strong>
                  <small>
                    {[
                      h.context,
                      h.kind === 'city' ? t('home.loc.kindCity') : h.kind === 'group' ? t('home.loc.kindArea') : t('home.loc.kindDistrict'),
                    ].filter(Boolean).join(' · ')}
                  </small>
                </span>
                <Count n={h.count} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="loc__body">
          <nav className="loc__cities" aria-label={t('home.loc.cities')}>
            <button type="button" className={`loc__city ${!city ? 'is-picked' : ''}`} onClick={() => onChange('', [])}>
              <span>{t('home.loc.allCities')}</span>
              {!city && <Check size={14} strokeWidth={2.6} />}
            </button>
            {CITY_AREAS.map(c => (
              <button
                key={c.ka}
                type="button"
                className={`loc__city ${browse.ka === c.ka ? 'is-browsing' : ''} ${city === c.ka ? 'is-picked' : ''} ${hasCounts && count(c.ka) === 0 ? 'is-empty' : ''}`}
                onClick={() => setBrowse(c)}
                aria-current={browse.ka === c.ka || undefined}
              >
                <span>{cityName(c)}</span>
                <Count n={count(c.ka)} />
                <ChevronRight size={14} strokeWidth={2.4} className="loc__city-arrow" aria-hidden />
              </button>
            ))}
          </nav>

          <div className="loc__districts">
            <button
              type="button"
              className={`loc__whole ${city === browse.ka && !districts.length ? 'is-on' : ''}`}
              onClick={() => onChange(browse.ka, [])}
            >
              <span className="loc__whole-icon"><MapPin size={15} strokeWidth={2.3} /></span>
              <span className="loc__whole-copy">
                <strong>{t('home.wholeCity', { city: cityName(browse) })}</strong>
                {hasCounts && <small>{t('home.districtCount', { n: count(browse.ka) })}</small>}
              </span>
              {city === browse.ka && !districts.length && <Check size={16} strokeWidth={2.6} />}
            </button>

            {popular.length > 0 && (
              <div className="loc__popular">
                <p className="loc__label">{t('home.loc.popular')}</p>
                <div className="loc__chips">
                  {popular.map(({ d, n }) => (
                    <button
                      key={d.ka}
                      type="button"
                      aria-pressed={districtState(d) === 'on'}
                      className={`loc__chip ${districtState(d) === 'on' ? 'is-on' : ''}`}
                      onClick={() => toggleDistrict(browse, d)}
                    >
                      {districtState(d) === 'on' && <Check size={12} strokeWidth={3} />}
                      {districtLabel(d, locale)}
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {districtSections(browse).map(section => {
              const gState = section.group ? groupState(browse, section.group) : 'off';
              return (
                <Fragment key={section.group?.ka ?? `${browse.ka}-rest`}>
                  {section.group ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={gState === 'on' ? true : gState === 'some' ? 'mixed' : false}
                      className={`loc__group is-${gState}`}
                      onClick={() => toggleGroup(browse, section.group!)}
                    >
                      <Tick state={gState} />
                      <span>{districtLabel(section.group, locale)}</span>
                      <em>{t('home.loc.wholeArea')}</em>
                      <Count n={count(`${browse.ka}|${section.group.ka}`)} />
                    </button>
                  ) : (
                    <p className="loc__label loc__label--group">
                      {browse.groups?.length ? t('home.loc.other') : t('home.districts')}
                    </p>
                  )}
                  <div className="loc__grid">
                    {section.districts.map(d => {
                      const n = count(`${browse.ka}|${d.ka}`);
                      const state = districtState(d);
                      return (
                        <button
                          key={d.ka}
                          type="button"
                          role="checkbox"
                          aria-checked={state === 'on'}
                          className={`loc__district ${state === 'on' ? 'is-on' : ''} ${hasCounts && n === 0 ? 'is-empty' : ''}`}
                          onClick={() => toggleDistrict(browse, d)}
                        >
                          <Tick state={state} />
                          <span>{districtLabel(d, locale)}</span>
                          <Count n={n} />
                        </button>
                      );
                    })}
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="loc__foot">
        <button type="button" className="loc__reset" onClick={() => onChange('', [])} disabled={!city}>
          {t('common.clear')}
        </button>
        <button type="button" className="loc__done" onClick={onDone}>
          {doneLabel ?? t('home.search.done')}
        </button>
      </div>
    </div>
  );
}
