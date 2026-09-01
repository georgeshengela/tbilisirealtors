/**
 * Listing chips are packed into amenities/features on save.
 * Unpack them again so an edit (or a MyHome re-open) restores the ticks.
 */

export interface ListingChipOptions {
  conditions: readonly string[];
  buildingStatusIds: readonly string[];
  projectTypes: readonly string[];
  layouts: readonly string[];
  parking: readonly string[];
  heating: readonly string[];
  hotWater: readonly string[];
  buildingMaterials: readonly string[];
  windowsMaterials: readonly string[];
  furniture: readonly string[];
  propertyAmenities: readonly string[];
  buildingFeatures: readonly string[];
  badgeIds: readonly string[];
  materialPrefix: string;
  windowsPrefix: string;
  layoutPrefix: string;
}

export interface UnpackedListingFields {
  parking: string[];
  heating: string[];
  hotWater: string[];
  furniture: string[];
  propertyAmenities: string[];
  amenities: string[];
  buildingMaterials: string[];
  windowsMaterials: string[];
  layout: string[];
  buildingFeatures: string[];
  badges: string[];
  condition: string;
  buildingStatus: string;
  projectType: string;
  features: string[];
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function takePrefixed(list: string[], prefix: string, options: readonly string[]) {
  const allowed = new Set(options);
  const picked: string[] = [];
  const rest: string[] = [];
  for (const item of list) {
    if (!item.startsWith(prefix)) {
      rest.push(item);
      continue;
    }
    const raw = item.slice(prefix.length).trim();
    if (allowed.has(raw)) picked.push(raw);
    else rest.push(item);
  }
  return { picked, rest };
}

function takeExact(list: string[], options: readonly string[]) {
  const allowed = new Set(options);
  return {
    picked: list.filter(item => allowed.has(item)),
    rest: list.filter(item => !allowed.has(item)),
  };
}

export function unpackListingFields(
  amenities: unknown,
  features: unknown,
  opt: ListingChipOptions,
): UnpackedListingFields {
  let feat = asStrings(features);

  const materials = takePrefixed(feat, opt.materialPrefix, opt.buildingMaterials);
  feat = materials.rest;
  const windows = takePrefixed(feat, opt.windowsPrefix, opt.windowsMaterials);
  feat = windows.rest;
  const layout = takePrefixed(feat, opt.layoutPrefix, opt.layouts);
  feat = layout.rest;

  const buildingFeatures = takeExact(feat, opt.buildingFeatures);
  feat = buildingFeatures.rest;
  const badges = takeExact(feat, opt.badgeIds);
  feat = badges.rest;

  const condition = feat.find(item => opt.conditions.includes(item)) ?? '';
  feat = feat.filter(item => item !== condition);
  const buildingStatus = feat.find(item => opt.buildingStatusIds.includes(item)) ?? '';
  feat = feat.filter(item => item !== buildingStatus);
  const projectType = feat.find(item => opt.projectTypes.includes(item)) ?? '';
  feat = feat.filter(item => item !== projectType);

  const amen = asStrings(amenities);
  const parking = takeExact(amen, opt.parking);
  const heatingSet = new Set(opt.heating);
  const hotWaterSet = new Set(opt.hotWater);
  const leftover = parking.rest;
  const heating = leftover.filter(item => heatingSet.has(item));
  const hotWater = leftover.filter(item => hotWaterSet.has(item));
  const afterHeat = leftover.filter(item => !heatingSet.has(item) && !hotWaterSet.has(item));
  const furniture = takeExact(afterHeat, opt.furniture);
  const propertyAmenities = takeExact(furniture.rest, opt.propertyAmenities);

  return {
    parking: parking.picked,
    heating,
    hotWater,
    furniture: furniture.picked,
    propertyAmenities: propertyAmenities.picked,
    amenities: propertyAmenities.rest,
    buildingMaterials: materials.picked,
    windowsMaterials: windows.picked,
    layout: layout.picked,
    buildingFeatures: buildingFeatures.picked,
    badges: badges.picked,
    condition,
    buildingStatus,
    projectType,
    features: feat,
  };
}

export function roomsChipFromCount(n: number | null | undefined): string {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return '';
  return value >= 10 ? '10+' : String(value);
}

export function bedroomsChipFromCount(n: number | null | undefined): string {
  const value = Number(n);
  if (!Number.isFinite(value) || value <= 0) return '';
  return value >= 6 ? '6+' : String(value);
}

export function adminReturnPath(from: string | null | undefined): string {
  if (!from) return '/admin?section=properties';
  if (from.startsWith('?')) return `/admin${from}`;
  if (from.startsWith('/admin')) return from;
  return '/admin?section=properties';
}
