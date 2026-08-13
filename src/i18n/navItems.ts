import {
  Building2, Home, MapPin, Users, BookOpen, Info, MessageSquare,
  Tag, Key, Sparkles, TrendingUp, DollarSign, Map, Layers,
  HardHat, Calculator, Newspaper,
  UserCheck, BarChart3,
  type LucideIcon,
} from 'lucide-react';

export interface NavMegaItem {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  desc: string;
}

export interface NavMegaColumn {
  heading: string;
  color: string;
  items: NavMegaItem[];
}

export interface NavMega {
  title: string;
  columns: NavMegaColumn[];
  featured?: {
    image: string;
    title: string;
    price: string;
    label: string;
    href: string;
  };
}

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  mega?: NavMega;
}

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function buildNavItems(t: TFn, formatFeaturedPrice: (gel: number) => string): NavItem[] {
  return [
    {
      label: t('nav.listings'),
      href: '/listings',
      icon: Building2,
      mega: {
        title: t('nav.listingsMega.title'),
        columns: [
          {
            heading: t('nav.listingsMega.propertyType'),
            color: '#2563eb',
            items: [
              { label: t('nav.listingsMega.apartment'), href: '/listings?type=apartment', icon: Building2, color: '#2563eb', desc: t('nav.listingsMega.apartmentDesc') },
              { label: t('nav.listingsMega.house'), href: '/listings?type=house', icon: Home, color: '#10b981', desc: t('nav.listingsMega.houseDesc') },
              { label: t('nav.listingsMega.commercial'), href: '/listings?type=commercial', icon: Layers, color: '#f59e0b', desc: t('nav.listingsMega.commercialDesc') },
              { label: t('nav.listingsMega.land'), href: '/listings?type=land', icon: MapPin, color: '#2563eb', desc: t('nav.listingsMega.landDesc') },
            ],
          },
          {
            heading: t('nav.listingsMega.dealType'),
            color: '#10b981',
            items: [
              { label: t('nav.listingsMega.forSale'), href: '/listings?status=sale', icon: Tag, color: '#f59e0b', desc: t('nav.listingsMega.forSaleDesc') },
              { label: t('nav.listingsMega.forRent'), href: '/listings?status=rent', icon: Key, color: '#10b981', desc: t('nav.listingsMega.forRentDesc') },
              { label: t('nav.listingsMega.vip'), href: '/listings?premium=true', icon: Sparkles, color: '#ec4899', desc: t('nav.listingsMega.vipDesc') },
              { label: t('nav.listingsMega.recentlyAdded'), href: '/listings?new=true', icon: TrendingUp, color: '#22c55e', desc: t('nav.listingsMega.recentlyAddedDesc') },
            ],
          },
          {
            heading: t('nav.listingsMega.byCity'),
            color: '#ef4444',
            items: [
              { label: t('nav.listingsMega.tbilisi'), href: '/listings?city=tbilisi', icon: MapPin, color: '#ef4444', desc: t('nav.listingsMega.tbilisiDesc') },
              { label: t('nav.listingsMega.batumi'), href: '/listings?city=batumi', icon: MapPin, color: '#2563eb', desc: t('nav.listingsMega.batumiDesc') },
              { label: t('nav.listingsMega.kutaisi'), href: '/listings?city=kutaisi', icon: MapPin, color: '#2563eb', desc: t('nav.listingsMega.kutaisiDesc') },
              { label: t('nav.listingsMega.allCities'), href: '/listings', icon: Map, color: '#64748b', desc: t('nav.listingsMega.allCitiesDesc') },
            ],
          },
        ],
        featured: {
          image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80',
          title: t('nav.listingsMega.featuredTitle'),
          price: formatFeaturedPrice(1_200_000),
          label: t('nav.listingsMega.featuredLabel'),
          href: '/property/p7',
        },
      },
    },
    {
      label: t('nav.newProjects'),
      href: '/listings?new=true',
      icon: HardHat,
      badge: 'NEW',
    },
    {
      label: t('nav.agents'),
      href: '/agents',
      icon: Users,
      mega: {
        title: t('nav.agentsMega.title'),
        columns: [
          {
            heading: t('nav.agentsMega.heading'),
            color: '#2563eb',
            items: [
              { label: t('nav.agentsMega.allAgents'), href: '/agents', icon: Users, color: '#2563eb', desc: t('nav.agentsMega.allAgentsDesc') },
              { label: t('nav.agentsMega.verifiedAgents'), href: '/agents?verified=true', icon: UserCheck, color: '#10b981', desc: t('nav.agentsMega.verifiedAgentsDesc') },
              { label: t('nav.agentsMega.marketAnalysis'), href: '/blog?cat=market', icon: BarChart3, color: '#f59e0b', desc: t('nav.agentsMega.marketAnalysisDesc') },
              { label: t('nav.agentsMega.investmentConsult'), href: '/contact', icon: DollarSign, color: '#2563eb', desc: t('nav.agentsMega.investmentConsultDesc') },
            ],
          },
        ],
      },
    },
    {
      label: t('nav.valuation'),
      href: '/contact',
      icon: Calculator,
    },
    {
      label: t('nav.blog'),
      href: '/blog',
      icon: Newspaper,
      mega: {
        title: t('nav.blogMega.title'),
        columns: [
          {
            heading: t('nav.blogMega.heading'),
            color: '#2563eb',
            items: [
              { label: t('nav.blogMega.market'), href: '/blog?cat=market', icon: BarChart3, color: '#2563eb', desc: t('nav.blogMega.marketDesc') },
              { label: t('nav.blogMega.guide'), href: '/blog?cat=guide', icon: BookOpen, color: '#2563eb', desc: t('nav.blogMega.guideDesc') },
              { label: t('nav.blogMega.invest'), href: '/blog?cat=invest', icon: TrendingUp, color: '#22c55e', desc: t('nav.blogMega.investDesc') },
              { label: t('nav.blogMega.design'), href: '/blog?cat=design', icon: Sparkles, color: '#ec4899', desc: t('nav.blogMega.designDesc') },
            ],
          },
        ],
      },
    },
    { label: t('nav.about'), href: '/about', icon: Info },
    { label: t('nav.contact'), href: '/contact', icon: MessageSquare },
  ];
}
