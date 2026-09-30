import { kaToSlug } from './seoListingsUrl';
import type {
  ConstructionProject,
  ProjectBlock,
  ProjectCurrency,
  ProjectPaymentOption,
  ProjectStatus,
  ProjectUnit,
  ProjectUnitStatus,
} from '../types/project';

export type {
  ConstructionProject,
  ProjectBlock,
  ProjectCurrency,
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

export const MAX_PROJECT_FLOORS = 120;
export const MAX_UNITS_PER_FLOOR = 40;
export const MAX_PROJECT_BLOCKS = 26;

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

/** A, B, C… — the first letter not taken yet. */
export function nextBlockName(blocks: ProjectBlock[]): string {
  const taken = new Set(blocks.map(b => b.name));
  for (let i = 0; i < MAX_PROJECT_BLOCKS; i += 1) {
    const name = String.fromCharCode(65 + i);
    if (!taken.has(name)) return name;
  }
  return String(blocks.length + 1);
}

export function newBlockId(): string {
  return `blk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Legacy projects have units but no blocks — treat them as one implicit block. */
export function blocksOf(project: Pick<ConstructionProject, 'blocks' | 'projectUnits'>): ProjectBlock[] {
  if (project.blocks.length) return project.blocks;
  if (!project.projectUnits.length) return [];
  const perFloor = new Map<number, number>();
  for (const unit of project.projectUnits) perFloor.set(unit.floor, (perFloor.get(unit.floor) ?? 0) + 1);
  return [{
    id: 'b1',
    name: 'A',
    floors: Math.max(...perFloor.keys()),
    unitsPerFloor: Math.max(...perFloor.values()),
  }];
}

/** Block a unit belongs to — units without one sit in the first block. */
export function unitBlockName(unit: ProjectUnit, blocks: ProjectBlock[]): string {
  return unit.block || blocks[0]?.name || '';
}

export function unitNumber(block: string, floor: number, position: number, prefixed: boolean): string {
  const base = `${floor}${String(position).padStart(2, '0')}`;
  return prefixed && block ? `${block}-${base}` : base;
}

/**
 * Lay out units for every block. Existing units are matched by block (via its id,
 * so renames are safe) + floor + position and keep their area/price/status; new
 * slots start empty and available — nothing is invented.
 */
export function rebuildBlockUnits(
  projectId: string,
  prevBlocks: ProjectBlock[],
  nextBlocks: ProjectBlock[],
  units: ProjectUnit[],
): ProjectUnit[] {
  const slots = new Map<string, ProjectUnit>();
  const counters = new Map<string, number>();
  for (const unit of units) {
    const prev = unit.block
      ? prevBlocks.find(b => b.name === unit.block)
      : prevBlocks[0];
    if (!prev) continue;
    const floorKey = `${prev.id}|${unit.floor}`;
    const position = unit.position ?? (counters.get(floorKey) ?? 0) + 1;
    counters.set(floorKey, position);
    slots.set(`${floorKey}|${position}`, unit);
  }

  const prefixed = nextBlocks.length > 1;
  const out: ProjectUnit[] = [];
  for (const block of nextBlocks) {
    const floors = clampInt(block.floors, 1, MAX_PROJECT_FLOORS);
    const perFloor = clampInt(block.unitsPerFloor, 1, MAX_UNITS_PER_FLOOR);
    for (let floor = 1; floor <= floors; floor += 1) {
      for (let position = 1; position <= perFloor; position += 1) {
        const kept = slots.get(`${block.id}|${floor}|${position}`);
        const number = unitNumber(block.name, floor, position, prefixed);
        out.push(kept
          ? { ...kept, floor, number, block: block.name, position }
          : {
            id: `${projectId}-${block.id}-f${floor}-u${position}`,
            floor,
            number,
            bedrooms: 0,
            area: 0,
            price: 0,
            pricePerSqm: 0,
            status: 'available',
            block: block.name,
            position,
          });
      }
    }
  }
  return out;
}

/** Units that would disappear with the next layout and carry real data. */
export function droppedUnitsWithData(
  prevBlocks: ProjectBlock[],
  nextBlocks: ProjectBlock[],
  units: ProjectUnit[],
): ProjectUnit[] {
  const kept = new Set(rebuildBlockUnits('x', prevBlocks, nextBlocks, units).map(unit => unit.id));
  return units.filter(unit => !kept.has(unit.id) && !isBlankUnit(unit));
}

function isBlankUnit(unit: ProjectUnit): boolean {
  return unit.status === 'available' && !unit.area && !unit.price && !unit.bedrooms;
}

/** Empty plan for a single block (seed/demo data). No prices, every unit available. */
export function generateProjectUnits(projectId: string, floors: number, unitsPerFloor: number): ProjectUnit[] {
  return rebuildBlockUnits(projectId, [], [{ id: 'b1', name: 'A', floors, unitsPerFloor }], []);
}

export function isProjectCurrency(value: unknown): value is ProjectCurrency {
  return value === 'GEL' || value === 'USD';
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
        block: text(row.block) || undefined,
        position: num(row.position) > 0 ? Math.round(num(row.position)) : undefined,
      } satisfies ProjectUnit;
    });
}

function blocksFromApi(value: unknown): ProjectBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: text(row.id) || `b${index + 1}`,
        name: text(row.name) || String.fromCharCode(65 + index),
        floors: clampInt(row.floors, 1, MAX_PROJECT_FLOORS),
        unitsPerFloor: clampInt(row.unitsPerFloor, 1, MAX_UNITS_PER_FLOOR),
      };
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
    priceCurrency: isProjectCurrency(row.priceCurrency) ? row.priceCurrency : 'GEL',
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
    blocks: blocksFromApi(row.blocks),
    projectUnits: unitsOf(row.projectUnits),
    published: row.published !== false,
    sortOrder: Math.round(num(row.sortOrder)),
  };
}

/**
 * Fills empty headline prices (from/to, per m²) from the unit table, so a
 * project whose admin left "price from" at 0 never advertises "$0".
 */
export function withUnitPriceRanges(project: ConstructionProject): ConstructionProject {
  const units: ProjectUnit[] = project.projectUnits;
  const priced = units.filter((u: ProjectUnit) => u.price > 0);
  const perSqm = units.map((u: ProjectUnit) => u.pricePerSqm).filter((n: number) => n > 0);
  if (!priced.length && !perSqm.length) return project;
  const prices = priced.map((u: ProjectUnit) => u.price);
  return {
    ...project,
    priceFrom: project.priceFrom || (prices.length ? Math.min(...prices) : 0),
    priceTo: project.priceTo || (prices.length ? Math.max(...prices) : 0),
    pricePerSqmFrom: project.pricePerSqmFrom || (perSqm.length ? Math.min(...perSqm) : 0),
    pricePerSqmTo: project.pricePerSqmTo || (perSqm.length ? Math.max(...perSqm) : 0),
  };
}

/** Short delivery label for cards: "2027 Q2" style, else the delivery date. */
export function projectDeliveryLabel(project: Pick<ConstructionProject, 'completion' | 'deliveryDate'>): string {
  const completion = project.completion?.trim() ?? '';
  if (completion && completion.length <= 24) return completion;
  return project.deliveryDate?.trim() ?? '';
}
