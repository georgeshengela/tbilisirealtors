import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Building2, Home, TreePine, Store, Hotel } from 'lucide-react';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type PropertyTypeOption = { v: string; l: string; icon: LucideIcon };

const PROPERTY_TYPE_ICONS: Record<string, LucideIcon> = {
  '': LayoutGrid,
  apartment: Building2,
  house: Home,
  villa: TreePine,
  land: TreePine,
  commercial: Store,
  hotel: Hotel,
};

export function cityFilterOptions(t: TFn) {
  return [
    { v: '', l: t('common.all') },
    { v: 'თბილისი', l: t('listings.cities.tbilisi') },
    { v: 'ბათუმი', l: t('listings.cities.batumi') },
    { v: 'ქუთაისი', l: t('listings.cities.kutaisi') },
    { v: 'მცხეთა', l: t('listings.cities.mtskheta') },
    { v: 'გორი', l: t('listings.cities.gori') },
    { v: 'სიღნაღი', l: t('listings.cities.sighnaghi') },
  ] as const;
}

export function propertyTypeFilterOptions(t: TFn, short = false): PropertyTypeOption[] {
  if (short) {
    return [
      { v: '', l: t('common.all'), icon: PROPERTY_TYPE_ICONS[''] },
      { v: 'apartment', l: t('propertyTypes.apartment'), icon: PROPERTY_TYPE_ICONS.apartment },
      { v: 'house', l: t('propertyTypes.house'), icon: PROPERTY_TYPE_ICONS.house },
      { v: 'villa', l: t('home.propertyTypes.cottage'), icon: PROPERTY_TYPE_ICONS.villa },
      { v: 'commercial', l: t('home.propertyTypes.commercialShort'), icon: PROPERTY_TYPE_ICONS.commercial },
    ];
  }
  return [
    { v: '', l: t('common.all'), icon: PROPERTY_TYPE_ICONS[''] },
    { v: 'apartment', l: t('propertyTypes.apartment'), icon: PROPERTY_TYPE_ICONS.apartment },
    { v: 'house', l: t('home.propertyTypes.privateHouse'), icon: PROPERTY_TYPE_ICONS.house },
    { v: 'villa', l: t('home.propertyTypes.cottage'), icon: PROPERTY_TYPE_ICONS.villa },
    { v: 'land', l: t('home.propertyTypes.landPlot'), icon: PROPERTY_TYPE_ICONS.land },
    { v: 'commercial', l: t('home.propertyTypes.commercialSpace'), icon: PROPERTY_TYPE_ICONS.commercial },
    { v: 'hotel', l: t('home.propertyTypes.hotel'), icon: PROPERTY_TYPE_ICONS.hotel },
  ];
}

export function dealTypeOptions(t: TFn) {
  return [
    { v: 'sale', l: t('propertyStatus.sale') },
    { v: 'rent', l: t('propertyStatus.rent') },
    { v: 'mortgage', l: t('home.dealTypes.mortgage') },
    { v: 'daily', l: t('home.dealTypes.daily') },
  ] as const;
}

export function bedroomOptions(t: TFn) {
  return [
    { v: '', l: t('common.any') },
    { v: '1', l: '1' },
    { v: '2', l: '2' },
    { v: '3', l: '3' },
    { v: '4', l: '4' },
    { v: '5', l: '5+' },
  ] as const;
}

export function projectStatusLabels(t: TFn): Record<string, string> {
  return {
    building: t('home.projectStatus.building'),
    presale: t('home.projectStatus.presale'),
    completed: t('home.projectStatus.completed'),
  };
}
