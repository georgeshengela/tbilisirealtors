/** Option lists and closed-state summaries shared by the search UIs. */

import { useMemo } from 'react';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useLocale, useTranslation } from '../../i18n/LocaleContext';
import { propertyTypeFilterOptions } from '../../i18n/labels';
import { areaSelectionLabel, findCityArea } from '../../data/districts';
import { ROOMS_OR_MORE, orderedRange } from '../../lib/listingSearch';

type TFn = ReturnType<typeof useTranslation>['t'];

export function useDealOptions() {
  const { t } = useTranslation();
  return useMemo(() => [
    { v: 'sale', l: t('propertyStatus.sale') },
    { v: 'rent', l: t('propertyStatus.rent') },
    { v: 'daily_rent', l: t('propertyStatus.daily_rent') },
    { v: 'pledge', l: t('home.dealTypes.mortgage') },
  ], [t]);
}

export function useTypeOptions() {
  const { t } = useTranslation();
  return useMemo(() => propertyTypeFilterOptions(t), [t]);
}

/* ── Closed-state summaries ──────────────────────────────────────────────── */

export function roomsSummary(rooms: readonly string[]): string {
  return [...rooms].sort().map(r => (r === ROOMS_OR_MORE ? `${r}+` : r)).join(', ');
}

export function locationSummary(city: string, districts: readonly string[], t: TFn, locale: string): string {
  if (!city) return '';
  const area = findCityArea(city);
  const cityLabel = area ? t(area.labelKey) : city;
  if (!districts.length) return cityLabel;
  const names = districts.map(d => areaSelectionLabel(area, d, locale));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

export function usePriceSummary(min: string, max: string): string {
  const { t } = useTranslation();
  const { formatMoney, currency } = useCurrency();
  return useMemo(() => {
    const [lo, hi] = orderedRange(min, max);
    const f = (v: string) => formatMoney(Number(v), { compact: true, from: currency });
    if (lo && hi) return `${f(lo)} – ${f(hi)}`;
    if (hi) return t('home.upToPrice', { amount: f(hi) });
    if (lo) return t('home.fromPricePlus', { amount: f(lo) });
    return '';
  }, [min, max, formatMoney, currency, t]);
}

export function areaSummary(min: string, max: string, unit: string): string {
  const [lo, hi] = orderedRange(min, max);
  if (lo && hi) return `${lo}–${hi} ${unit}`;
  if (hi) return `≤ ${hi} ${unit}`;
  if (lo) return `${lo}+ ${unit}`;
  return '';
}

/** Locale-aware thousands for counts. */
export function useCountFormat() {
  const { locale } = useLocale();
  return (n: number) => n.toLocaleString(locale === 'ka' ? 'ka-GE' : 'en-US');
}
