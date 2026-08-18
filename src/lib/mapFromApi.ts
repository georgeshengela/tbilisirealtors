import type {
  Agent,
  ApiAgentRow,
  ApiBlogRow,
  ApiPropertyRow,
  BlogPost,
  Property,
} from '../types/listing';

const DEFAULT_COORDS = { lat: 41.7151, lng: 44.8271 };
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80';
const PLACEHOLDER_AGENT = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80';

function num(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapAgentFromApi(row: ApiAgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    photo: row.photo || PLACEHOLDER_AGENT,
    phone: row.phone || '',
    email: row.email || '',
    rating: num(row.rating, 5),
    reviewCount: row.reviewCount ?? 0,
    propertyCount: row.propertyCount ?? 0,
    yearsExperience: row.yearsExperience ?? 0,
    specialization: row.specialization ?? [],
    bio: row.bio || '',
    company: row.company || 'TbilisiRealtor.GE',
    verified: row.verified ?? false,
    languages: row.languages?.length ? row.languages : ['ქართული'],
  };
}

function agentFromPropertyRow(row: ApiPropertyRow): Agent {
  return {
    id: row.agentId || 'agency',
    name: row.agentName || 'TbilisiRealtor.GE',
    photo: PLACEHOLDER_AGENT,
    phone: row.agentPhone || '',
    email: row.agentEmail || '',
    rating: 5,
    reviewCount: 0,
    propertyCount: 0,
    yearsExperience: 0,
    specialization: [],
    bio: '',
    company: 'TbilisiRealtor.GE',
    verified: true,
    languages: ['ქართული'],
  };
}

export function mapPropertyFromApi(row: ApiPropertyRow): Property {
  const type = (row.type || 'apartment') as Property['type'];
  const status = (row.status || 'sale') as Property['status'];

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    price: num(row.price),
    rentPrice: row.rentPrice == null ? null : num(row.rentPrice),
    pricePerSqm: num(row.pricePerSqm),
    address: row.address || '',
    city: row.city || '',
    district: row.district || '',
    type,
    status,
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    area: num(row.area),
    floor: row.floor ?? undefined,
    totalFloors: row.totalFloors ?? undefined,
    yearBuilt: row.yearBuilt ?? undefined,
    images: row.images?.length ? row.images : [PLACEHOLDER_IMAGE],
    amenities: row.amenities ?? [],
    features: row.features ?? [],
    agent: agentFromPropertyRow(row),
    isFeatured: row.isFeatured ?? false,
    isNew: row.isNew ?? false,
    isPremium: row.isPremium ?? false,
    coordinates: row.coordinates ?? DEFAULT_COORDS,
    viewCount: row.viewCount ?? 0,
    listedDate: row.listedDate || new Date().toISOString().split('T')[0],
    cadastralCode: row.cadastralCode || undefined,
  };
}

export function mapBlogFromApi(row: ApiBlogRow, author?: Agent): BlogPost {
  const fallbackAuthor: Agent = {
    id: row.authorId || 'editor',
    name: row.authorName || 'TbilisiRealtor.GE',
    photo: PLACEHOLDER_AGENT,
    phone: '',
    email: '',
    rating: 5,
    reviewCount: 0,
    propertyCount: 0,
    yearsExperience: 0,
    specialization: [],
    bio: '',
    company: 'TbilisiRealtor.GE',
    verified: true,
    languages: ['ქართული'],
  };

  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    author: author ?? fallbackAuthor,
    category: row.category || '',
    tags: row.tags ?? [],
    image: row.image || PLACEHOLDER_IMAGE,
    publishDate: row.publishDate || new Date().toISOString().split('T')[0],
    readTime: row.readTime ?? 5,
    isFeatured: row.isFeatured ?? false,
  };
}
