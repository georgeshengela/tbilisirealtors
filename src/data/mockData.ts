export type { Property, Agent, BlogPost } from '../types/listing';
import type { Property, Agent, BlogPost } from '../types/listing';

// Georgian photo placeholders - use Unsplash for realistic images
const PROPERTY_IMAGES = {
  luxury1: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  luxury2: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  luxury3: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',
  luxury4: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  luxury5: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
  luxury6: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  luxury7: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
  luxury8: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
  apt1: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
  apt2: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
  apt3: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
  interior1: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&q=80',
  interior2: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?w=800&q=80',
  interior3: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
  city1: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
};


export const agents: Agent[] = [];

export const properties: Property[] = [];

export const blogPosts: BlogPost[] = [];

export const cities: { name: string; count: number; image: string }[] = [];

export type ProjectUnitStatus = 'available' | 'reserved' | 'sold';
export type ProjectPaymentOption = 'installment' | 'mortgage' | 'cash';

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
  status: 'building' | 'completed' | 'presale';
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
}

function generateProjectUnits(
  projectId: string,
  floors: number,
  unitsPerFloor: number,
  basePrice: number,
): ProjectUnit[] {
  const units: ProjectUnit[] = [];
  const maxFloors = Math.min(floors, 14);
  for (let floor = 1; floor <= maxFloors; floor += 1) {
    for (let index = 1; index <= unitsPerFloor; index += 1) {
      const bedrooms = ((floor + index) % 3) + 1;
      const area = 42 + bedrooms * 22 + (index * 4) + Math.floor(floor / 2);
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

export const constructionProjects: ConstructionProject[] = [
  {
    id: 'cp1',
    slug: 'panorama-residence',
    name: 'Panorama Residence',
    address: 'ჭავჭავაძის გამზ. 82',
    city: 'თბილისი',
    district: 'ვაკე',
    developer: 'Archi Group',
    managementCompany: 'Archi Management',
    phone: '+995 32 205 05 05',
    units: 186,
    priceFrom: 185000,
    priceTo: 520000,
    pricePerSqmFrom: 3200,
    pricePerSqmTo: 4500,
    areaFrom: 55,
    areaTo: 128,
    completion: '2027 Q2',
    deliveryDate: '2027-06',
    status: 'building',
    image: PROPERTY_IMAGES.luxury2,
    images: [PROPERTY_IMAGES.luxury2, PROPERTY_IMAGES.luxury1, PROPERTY_IMAGES.interior1, PROPERTY_IMAGES.interior2, PROPERTY_IMAGES.luxury3],
    floors: 21,
    buildings: 2,
    parking: 94,
    bedroomOptions: [1, 2, 3],
    greenArea: 2400,
    deliveryCondition: 'მწვანე კარკასი',
    constructionProgress: 62,
    constructionNote: 'მშენებლობა დასრულდება 18 თვეში',
    description: 'Panorama Residence — პრემიუმ კლასის საცხოვრებელი კომპლექსი ვაკეში, პანორამული ხედით ქალაქზე. პროექტში 2400 მ² გამწვანებული ეზო, საბავშვო სივრცეები და საზოგადოებრივი ზონები. შესაძლებელია შიდა უპროცენტო განვადება 24 თვემდე, ბანკის იპოთეკა ან ერთიანი გადახდა.',
    paymentOptions: ['installment', 'mortgage', 'cash'],
    territoryAmenities: ['pharmacy', 'kindergarten', 'busStop', 'supermarket', 'bikeLane', 'sportsField', 'coworking', 'playground', 'stadium', 'square'],
    postDeliveryServices: ['lobby', 'concierge', 'videoControl', 'lighting', 'landscaping', 'yardCleaning', 'stairCleaning'],
    securityFeatures: ['generator', 'accessControl', 'fireSystem'],
    coordinates: { lat: 41.7151, lng: 44.7450 },
    projectUnits: generateProjectUnits('cp1', 21, 4, 185000),
  },
  {
    id: 'cp2',
    slug: 'blue-horizon-tower',
    name: 'Blue Horizon Tower',
    address: 'შერიფ ხიმშიაშვილი ქ. 6',
    city: 'ბათუმი',
    district: 'ბულვარი',
    developer: 'Orbi City',
    managementCompany: 'Orbi Service',
    phone: '+995 422 25 25 25',
    units: 320,
    priceFrom: 98000,
    priceTo: 310000,
    pricePerSqmFrom: 2100,
    pricePerSqmTo: 3400,
    areaFrom: 38,
    areaTo: 95,
    completion: '2026 Q4',
    deliveryDate: '2026-12',
    status: 'presale',
    image: PROPERTY_IMAGES.luxury5,
    images: [PROPERTY_IMAGES.luxury5, PROPERTY_IMAGES.luxury6, PROPERTY_IMAGES.apt1, PROPERTY_IMAGES.interior3],
    floors: 36,
    buildings: 1,
    parking: 116,
    bedroomOptions: [1, 2, 3],
    greenArea: 1800,
    deliveryCondition: 'თეთრი კარკასი',
    constructionProgress: 48,
    constructionNote: 'მშენებლობა დასრულდება 22 თვეში',
    description: 'Blue Horizon Tower — ზღვის პირსასწორ პროექტი ბათუმის ბულვარზე. 1800 მ² გამწვანებული ტერიტორია, პანორამული აივნები და სასტუმროს დონის ლობი. პრე-გაყიდვის პირობები — 0% საკომისიო.',
    paymentOptions: ['installment', 'mortgage', 'cash'],
    territoryAmenities: ['pharmacy', 'supermarket', 'busStop', 'playground', 'sportsField', 'square'],
    postDeliveryServices: ['lobby', 'concierge', 'videoControl', 'lighting', 'landscaping', 'stairCleaning'],
    securityFeatures: ['generator', 'accessControl', 'fireSystem'],
    coordinates: { lat: 41.6461, lng: 41.6334 },
    projectUnits: generateProjectUnits('cp2', 36, 5, 98000),
  },
  {
    id: 'cp3',
    slug: 'saburtalo-green',
    name: 'Saburtalo Green',
    address: 'გალაქტიონ ტაბიძის ქ. 15',
    city: 'თბილისი',
    district: 'საბურტალო',
    developer: 'Domus Development',
    phone: '+995 32 240 40 40',
    units: 142,
    priceFrom: 142000,
    priceTo: 385000,
    pricePerSqmFrom: 2800,
    pricePerSqmTo: 3900,
    areaFrom: 48,
    areaTo: 112,
    completion: '2026 Q3',
    deliveryDate: '2026-09',
    status: 'building',
    image: PROPERTY_IMAGES.apt2,
    images: [PROPERTY_IMAGES.apt2, PROPERTY_IMAGES.apt3, PROPERTY_IMAGES.interior2, PROPERTY_IMAGES.luxury4],
    floors: 16,
    buildings: 1,
    parking: 72,
    bedroomOptions: [1, 2, 3],
    greenArea: 1200,
    deliveryCondition: 'მწვანე კარკასი',
    constructionProgress: 71,
    constructionNote: 'მშენებლობა დასრულდება 12 თვეში',
    description: 'Saburtalo Green — თანამედროვე კომპლექსი საბურთaloში, მეტროსა და უნივერსიტეტის ახლოს. ენერგოეფექტური ფასადი, მწვანე ეზო და საზოგადოებრივი სივრცეები.',
    paymentOptions: ['installment', 'mortgage'],
    territoryAmenities: ['kindergarten', 'busStop', 'supermarket', 'bikeLane', 'playground', 'coworking'],
    postDeliveryServices: ['lobby', 'videoControl', 'lighting', 'yardCleaning', 'stairCleaning'],
    securityFeatures: ['accessControl', 'fireSystem'],
    coordinates: { lat: 41.7225, lng: 44.7580 },
    projectUnits: generateProjectUnits('cp3', 16, 4, 142000),
  },
  {
    id: 'cp4',
    slug: 'mtskheta-hills',
    name: 'Mtskheta Hills',
    address: 'სტეფანე მცხეთელი ქ. 8',
    city: 'მცხეთა',
    district: 'ცენტრი',
    developer: 'Heritage Build',
    phone: '+995 32 277 77 77',
    units: 64,
    priceFrom: 118000,
    priceTo: 245000,
    pricePerSqmFrom: 2400,
    pricePerSqmTo: 3200,
    areaFrom: 52,
    areaTo: 98,
    completion: '2025 Q4',
    deliveryDate: '2025-12',
    status: 'completed',
    image: PROPERTY_IMAGES.luxury8,
    images: [PROPERTY_IMAGES.luxury8, PROPERTY_IMAGES.luxury7, PROPERTY_IMAGES.interior1],
    floors: 8,
    buildings: 1,
    parking: 48,
    bedroomOptions: [1, 2],
    greenArea: 900,
    deliveryCondition: 'სრული გარემონტება',
    constructionProgress: 100,
    constructionNote: 'პროექტი დასრულებულია',
    description: 'Mtskheta Hills — ელიტური საცხოვრებელი კომპლექსი მცხეთაში, ისტორიული ხედით. დასრულებული პროექტი — ბინები მზადაა შესახვეში.',
    paymentOptions: ['mortgage', 'cash'],
    territoryAmenities: ['pharmacy', 'busStop', 'supermarket', 'square'],
    postDeliveryServices: ['lobby', 'lighting', 'landscaping', 'yardCleaning'],
    securityFeatures: ['accessControl', 'fireSystem'],
    coordinates: { lat: 41.8414, lng: 44.7150 },
    projectUnits: generateProjectUnits('cp4', 8, 3, 118000),
  },
];

export function getProjectBySlug(slug: string): ConstructionProject | undefined {
  return constructionProjects.find(p => p.slug === slug);
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    id: 'f1',
    question: 'როგორ გავაქვეყნო განცხადება TbilisiRealtor.GE-ზე?',
    answer: 'დარეგისტრირდით, შექმენით პროფილი და დაამატეთ განცხადების ფოტოები, აღწერა და ფასი. განცხადება 24 საათში გადაიწ검ება და გამოჩნდება ძებნაში.',
  },
  {
    id: 'f2',
    question: 'რა არის SUPER VIP განცხადება?',
    answer: 'SUPER VIP პაკეტი განცხადებას აჩვენებს საიტის პრიორიტეტულ ზონაში, ზრდის ხილვადობას და უზრუნველყოფს მეტ ვიზიტს პოტენციური მყიდველებისგან.',
  },
  {
    id: 'f3',
    question: 'შემიძლია უფასოდ ვიპოვო ბინა?',
    answer: 'დიახ, პლატფორმის გამოყენება მყიდველებისთვის სრულიად უფასოა. შეგიძლიათ გაფილტროთ, შეადაროთ და დაუკავშირდეთ აგენტებს პირდაპირ.',
  },
  {
    id: 'f4',
    question: 'როგორ ხდება უძრავი განცხადების ვერიფიკაცია?',
    answer: 'ჩვენი გუნდი ამოწმებს განცხადების ფოტოებს, მისამართს და საკადასტრო ინფორმაციას. ვერიფიცირებულ განცხადებებს აქვთ სპეციალური ნიშანი.',
  },
  {
    id: 'f5',
    question: 'რა საკომისიო ეკისრება გარიგებაზე?',
    answer: 'საკომისიო დამოკიდებულია განცხადების ტიპზე და სერვისზე. დეტალური ინფორმაცია მიიღება კონსულტაციისას ან განცხადების განთავსებისას.',
  },
  {
    id: 'f6',
    question: 'შემიძლია იპოთეკის კონსულტაცია მივიღო?',
    answer: 'ჩვენ ვთანამშრომლობთ საბანკო პარტნიორებთან და დაგეხმარებით იპოთეკის პირობების შედარებასა და დოკუმენტების მომზადებაში.',
  },
];

export const stats = [
  { label: 'დარეგისტრირებული განცხადება', value: '12,400+', icon: 'Building' },
  { label: 'დამდგენი კლიენტი', value: '8,200+', icon: 'Users' },
  { label: 'გამოცდილი აგენტი', value: '350+', icon: 'Award' },
  { label: 'წარმატებული გარიგება', value: '5,800+', icon: 'CheckCircle' },
];

export const testimonials = [
  {
    id: 't1',
    name: 'ეკა ჯაფარიძე',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80',
    role: 'ბინის მყიდველი',
    content: 'TbilisiRealtor.GE-ს დახმარებით ვიპოვე ჩემი სოციუმი ვაკეში. პლატფორმა ძალიან მოხერხებულია და ქვეყნის ნებისმიერი კუთხიდან შემიძლია ნახვა.',
    rating: 5,
    date: '2026-05-15',
  },
  {
    id: 't2',
    name: 'ზურა ბახტაძე',
    photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&q=80',
    role: 'ინვესტორი',
    content: 'ბათუმში ინვესტიციისთვის ვიყენებ ამ პლატფორმას. ფასების ანალიტიკა და ბაზრის ინფორმაცია ძალიან მოსახერხებელია.',
    rating: 5,
    date: '2026-04-20',
  },
  {
    id: 't3',
    name: 'სალომე გიგაური',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80',
    role: 'ბინის მოიჯარე',
    content: 'თვეში ბინა ვიპოვე. გიორგი ძალიან გამოცდილი და კომპეტენტური სპეციალისტია. განსაკუთრებით მომეწონა ვირტუალური ტური.',
    rating: 5,
    date: '2026-06-01',
  },
];

/* Districts now live in src/data/districts.ts, where each one carries the OSM
   relation that holds its real outline. */
