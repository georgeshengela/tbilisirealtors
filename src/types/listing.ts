export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  pricePerSqm: number;
  address: string;
  city: string;
  district: string;
  type: 'apartment' | 'house' | 'commercial' | 'land' | 'villa' | 'hotel';
  /** "both" means the same property is offered for sale and for rent. */
  status: 'sale' | 'rent' | 'both' | 'pledge' | 'daily_rent';
  /** Monthly rent, only set alongside a sale price when status is "both". */
  rentPrice?: number | null;
  dealType?: string;
  buildingStatus?: 'old' | 'new' | 'under';
  condition?: string;
  bedrooms: number;
  bathrooms: number;
  rooms?: number;
  area: number;
  floor?: number;
  totalFloors?: number;
  yearBuilt?: number;
  projectType?: string;
  ceilingHeight?: number;
  balconyCount?: number;
  balconyArea?: number;
  verandaArea?: number;
  loggiaArea?: number;
  parking?: string[];
  heating?: string[];
  hotWater?: string[];
  buildingMaterials?: string[];
  windowsMaterials?: string[];
  furniture?: string[];
  buildingFeatures?: string[];
  badges?: string[];
  youtubeUrl?: string;
  images: string[];
  amenities: string[];
  features: string[];
  agent: Agent;
  isFeatured: boolean;
  isNew: boolean;
  isPremium: boolean;
  coordinates: { lat: number; lng: number };
  viewCount: number;
  listedDate: string;
  cadastralCode?: string | null;
  sourceUrl?: string | null;
}

export interface Agent {
  id: string;
  name: string;
  photo: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  propertyCount: number;
  yearsExperience: number;
  specialization: string[];
  bio: string;
  company: string;
  verified: boolean;
  languages: string[];
}

/** Admin who opted into public "Our Team" visibility. */
export interface TeamMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  photo: string | null;
  phone: string | null;
  jobTitle: string;
  bio: string | null;
  source: 'admin';
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: Agent;
  category: string;
  tags: string[];
  image: string;
  publishDate: string;
  readTime: number;
  isFeatured: boolean;
}

export type ApiPropertyRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | number;
  rentPrice?: string | number | null;
  pricePerSqm: string | number | null;
  address: string | null;
  city: string | null;
  district: string | null;
  type: string | null;
  status: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: string | number | null;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number | null;
  images: string[] | null;
  amenities: string[] | null;
  features: string[] | null;
  isFeatured: boolean | null;
  isNew: boolean | null;
  isPremium: boolean | null;
  coordinates: { lat: number; lng: number } | null;
  viewCount: number | null;
  listedDate: string | null;
  agentId: string | null;
  agentName: string | null;
  agentPhone: string | null;
  agentEmail: string | null;
  cadastralCode?: string | null;
  sourceUrl?: string | null;
};

export type ApiAgentRow = {
  id: string;
  name: string;
  photo: string | null;
  phone: string | null;
  email: string | null;
  rating: string | number | null;
  reviewCount: number | null;
  propertyCount: number | null;
  yearsExperience: number | null;
  specialization: string[] | null;
  bio: string | null;
  company: string | null;
  verified: boolean | null;
  languages: string[] | null;
};

export type ApiBlogRow = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  authorId: string | null;
  authorName: string | null;
  category: string | null;
  tags: string[] | null;
  image: string | null;
  publishDate: string | null;
  readTime: number | null;
  isFeatured: boolean | null;
};
