import {
  Users, Sparkles, Building2, Briefcase, Scale, Phone,
  Award, Ruler, Hammer, Landmark,
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

export function buildNavItems(t: TFn): NavItem[] {
  return [
    {
      label: t('nav.newProjects'),
      href: '/listings?new=true',
      icon: Building2,
      badge: 'NEW',
    },
    {
      label: t('nav.services'),
      href: '/services',
      icon: Briefcase,
      mega: {
        title: t('nav.servicesMega.title'),
        columns: [
          {
            heading: t('nav.servicesMega.heading'),
            color: '#2563eb',
            items: [
              { label: t('services.survey.title'), href: '/services#survey', icon: Ruler, color: '#2563eb', desc: t('services.survey.desc') },
              { label: t('services.design.title'), href: '/services#design', icon: Sparkles, color: '#ec4899', desc: t('services.design.desc') },
              { label: t('services.renovation.title'), href: '/services#renovation', icon: Hammer, color: '#f59e0b', desc: t('services.renovation.desc') },
              { label: t('services.banks.title'), href: '/services#banks', icon: Landmark, color: '#10b981', desc: t('services.banks.desc') },
            ],
          },
        ],
      },
    },
    {
      label: t('nav.valuation'),
      href: '/contact',
      icon: Scale,
    },
    { label: t('nav.team'), href: '/agents', icon: Users },
    { label: t('nav.about'), href: '/about', icon: Award },
    { label: t('nav.contact'), href: '/contact', icon: Phone },
  ];
}
