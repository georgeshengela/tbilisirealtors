export type ProjectUnitStatus = 'available' | 'reserved' | 'sold';
export type ProjectPaymentOption = 'installment' | 'mortgage' | 'cash';
export type ProjectStatus = 'building' | 'completed' | 'presale';
export type ProjectCurrency = 'GEL' | 'USD';

/** One building (კორპუსი / ბლოკი) of a complex; its units are generated from these counts. */
export interface ProjectBlock {
  id: string;
  name: string;
  floors: number;
  unitsPerFloor: number;
}

export interface ProjectUnit {
  id: string;
  floor: number;
  number: string;
  bedrooms: number;
  area: number;
  price: number;
  pricePerSqm: number;
  status: ProjectUnitStatus;
  /** Block name (A, B…). Missing on legacy units: they belong to the first block. */
  block?: string;
  /** 1-based slot on the floor; the same position on every floor is a "column" / stack. */
  position?: number;
}

export interface ConstructionProject {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  district: string;
  developer: string;
  managementCompany?: string;
  phone: string;
  units: number;
  priceFrom: number;
  priceTo: number;
  /** Currency every price of the project (ranges, per m², units) is stored in. */
  priceCurrency: ProjectCurrency;
  pricePerSqmFrom: number;
  pricePerSqmTo: number;
  areaFrom: number;
  areaTo: number;
  completion: string;
  deliveryDate: string;
  status: ProjectStatus;
  image: string;
  images: string[];
  floors: number;
  buildings: number;
  parking: number;
  bedroomOptions: number[];
  greenArea: number;
  deliveryCondition: string;
  constructionProgress: number;
  constructionNote: string;
  description: string;
  paymentOptions: ProjectPaymentOption[];
  territoryAmenities: string[];
  postDeliveryServices: string[];
  securityFeatures: string[];
  coordinates: { lat: number; lng: number };
  blocks: ProjectBlock[];
  projectUnits: ProjectUnit[];
  published?: boolean;
  sortOrder?: number;
}
