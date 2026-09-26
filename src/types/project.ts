export type ProjectUnitStatus = 'available' | 'reserved' | 'sold';
export type ProjectPaymentOption = 'installment' | 'mortgage' | 'cash';
export type ProjectStatus = 'building' | 'completed' | 'presale';

export interface ProjectUnit {
  id: string;
  floor: number;
  number: string;
  bedrooms: number;
  area: number;
  price: number;
  pricePerSqm: number;
  status: ProjectUnitStatus;
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
  projectUnits: ProjectUnit[];
  published?: boolean;
  sortOrder?: number;
}
