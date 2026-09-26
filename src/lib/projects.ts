import { kaToSlug } from './seoListingsUrl';
import type {
  ConstructionProject,
  ProjectPaymentOption,
  ProjectStatus,
  ProjectUnit,
  ProjectUnitStatus,
} from '../types/project';

export type {
  ConstructionProject,
  ProjectPaymentOption,
  ProjectStatus,
  ProjectUnit,
  ProjectUnitStatus,
};

export const PROJECT_STATUSES: ProjectStatus[] = ['presale', 'building', 'completed'];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  presale: { label: 'პრე-გაყიდვა', color: '#2563eb', bg: '#eff6ff' },
  building: { label: 'მშენებარე', color: '#d97706', bg: '#fff7ed' },
  completed: { label: 'დასრულებული', color: '#059669', bg: '#ecfdf5' },
};

export const PAYMENT_OPTIONS: { id: ProjectPaymentOption; label: string }[] = [
  { id: 'installment', label: 'შიდა განვადება' },
  { id: 'mortgage', label: 'ბანკის იპოთეკა' },
  { id: 'cash', label: 'ერთიანი გადახდა' },
];

export const DELIVERY_CONDITIONS = [
  'მწვანე კარკასი',
  'თეთრი კარკასი',
  'შავი კარკასი',
  'თეთრი პლიუსი',
  'სრული გარემონტება',
];

export const TERRITORY_AMENITIES = [
  'pharmacy', 'kindergarten', 'busStop', 'supermarket', 'bikeLane',
  'sportsField', 'coworking', 'playground', 'stadium', 'square',
] as const;

export const POST_DELIVERY_SERVICES = [
  'lobby', 'concierge', 'videoControl', 'lighting',
  'landscaping', 'yardCleaning', 'stairCleaning',
] as const;

export const SECURITY_FEATURES = [
  'generator', 'accessControl', 'fireSystem',
] as const;

export function slugFromProjectName(name: string): string {
  return kaToSlug(name).slice(0, 160) || `project-${Date.now().toString(36)}`;
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return value === 'building' || value === 'completed' || value === 'presale';
}

export function generateProjectUnits(
  projectId: string,
  floors: number,
  unitsPerFloor: number,
  basePrice: number,
  bedroomOptions: number[] = [1, 2, 3],
): ProjectUnit[] {
  const rooms = bedroomOptions.filter(n => n > 0).length ? bedroomOptions.filter(n => n > 0) : [1, 2, 3];
  const maxFloors = Math.min(Math.max(Math.round(floors) || 1, 1), 40);
  const perFloor = Math.min(Math.max(Math.round(unitsPerFloor) || 1, 1), 12);
  const units: ProjectUnit[] = [];
  for (let floor = 1; floor <= maxFloors; floor += 1) {
    for (let index = 1; index <= perFloor; index += 1) {
      const bedrooms = rooms[(floor + index - 2) % rooms.length];
      const area = 38 + bedrooms * 22 + index * 4 + Math.floor(floor / 2);
      const price = Math.round(basePrice + area * 1850 + floor * 4200);
      const statusSeed = (floor * 7 + index * 3) % 10;
      const status: ProjectUnitStatus = statusSeed <= 1 ? 'sold' : statusSeed <= 3 ? 'reserved' : 'available';
      units.push({
        id: `${projectId}-f${floor}-u${index}`,
        floor,
        number: `${floor}${String(index).padStart(2, '0')}`,
        bedrooms,
        area,
        price,
        pricePerSqm: Math.round(price / area),
        status,
      });
    }
  }
  return units;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function strArr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numArr(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => Number(item)).filter(n => Number.isFinite(n) && n > 0);
}

function paymentsOf(value: unknown): ProjectPaymentOption[] {
  return strArr(value).filter((item): item is ProjectPaymentOption => (
    item === 'installment' || item === 'mortgage' || item === 'cash'
  ));
}

function unitsOf(value: unknown): ProjectUnit[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const row = item as Record<string, unknown>;
      const area = num(row.area);
      const price = num(row.price);
      const status = row.status === 'sold' || row.status === 'reserved' ? row.status : 'available';
      return {
        id: text(row.id) || `u${index}`,
        floor: Math.max(1, Math.round(num(row.floor))),
        number: text(row.number) || String(index + 1),
        bedrooms: Math.max(0, Math.round(num(row.bedrooms))),
        area,
        price,
        pricePerSqm: num(row.pricePerSqm) || (area > 0 ? Math.round(price / area) : 0),
        status,
      } satisfies ProjectUnit;
    });
}

export function mapProjectFromApi(row: Record<string, unknown>): ConstructionProject {
  const images = strArr(row.images);
  const image = text(row.image) || images[0] || '';
  const coords = row.coordinates && typeof row.coordinates === 'object'
    ? row.coordinates as { lat?: unknown; lng?: unknown }
    : {};
  return {
    id: text(row.id),
    slug: text(row.slug),
    name: text(row.name),
    address: text(row.address),
    city: text(row.city),
    district: text(row.district),
    developer: text(row.developer),
    managementCompany: text(row.managementCompany) || undefined,
    phone: text(row.phone),
    units: Math.round(num(row.units)),
    priceFrom: num(row.priceFrom),
    priceTo: num(row.priceTo),
    pricePerSqmFrom: num(row.pricePerSqmFrom),
    pricePerSqmTo: num(row.pricePerSqmTo),
    areaFrom: num(row.areaFrom),
    areaTo: num(row.areaTo),
    completion: text(row.completion),
    deliveryDate: text(row.deliveryDate),
    status: isProjectStatus(row.status) ? row.status : 'building',
    image,
    images: images.length ? images : (image ? [image] : []),
    floors: Math.round(num(row.floors)),
    buildings: Math.round(num(row.buildings)),
    parking: Math.round(num(row.parking)),
    bedroomOptions: numArr(row.bedroomOptions),
    greenArea: Math.round(num(row.greenArea)),
    deliveryCondition: text(row.deliveryCondition),
    constructionProgress: Math.min(100, Math.max(0, Math.round(num(row.constructionProgress)))),
    constructionNote: text(row.constructionNote),
    description: text(row.description),
    paymentOptions: paymentsOf(row.paymentOptions),
    territoryAmenities: strArr(row.territoryAmenities),
    postDeliveryServices: strArr(row.postDeliveryServices),
    securityFeatures: strArr(row.securityFeatures),
    coordinates: {
      lat: num(coords.lat) || 41.7151,
      lng: num(coords.lng) || 44.8271,
    },
    projectUnits: unitsOf(row.projectUnits),
    published: row.published !== false,
    sortOrder: Math.round(num(row.sortOrder)),
  };
}
