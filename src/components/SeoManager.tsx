import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { applySeo, pageUrl, setJsonLd, SITE_NAME } from '../lib/seo';
import { isListingsPath, isPropertySeoPath, listingsCanonicalPath, parseListingsLocation } from '../lib/seoListingsUrl';

const NOINDEX_PREFIXES = ['/login', '/register', '/favorites', '/dashboard', '/admin'];

const TYPE_KEYS: Record<string, string> = {
  apartment: 'propertyTypes.apartment',
  house: 'propertyTypes.house',
  villa: 'propertyTypes.villa',
  commercial: 'propertyTypes.commercial',
  land: 'propertyTypes.land',
  hotel: 'home.propertyTypes.hotel',
};

const DETAIL_PREFIXES = ['/property/', '/agent/', '/blog/', '/project/'];

export default function SeoManager() {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { locale } = useLocale();
  const { t } = useTranslation();

  useEffect(() => {
    const noindex = NOINDEX_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));

    if (pathname.startsWith('/admin')) {
      applySeo({
        title: `${SITE_NAME}`,
        description: t('seo.dashboard.description'),
        path: pathname,
        noindex: true,
      });
      return;
    }

    if (isPropertySeoPath(pathname) || pathname.startsWith('/property/')) {
      setJsonLd('listings-breadcrumbs', null);
      return;
    }

    if (DETAIL_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      setJsonLd('listings-breadcrumbs', null);
      const key = seoKey(pathname);
      applySeo({
        title: t(`seo.${key}.title`),
        description: t(`seo.${key}.description`),
        path: pathname,
        noindex,
      });
      return;
    }

    if (isListingsPath(pathname)) {
      const { title, description, path } = listingsSeo(pathname, searchParams, t);
      applySeo({ title, description, path, noindex });
      setJsonLd('listings-breadcrumbs', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: listingsBreadcrumbs(path, title, t),
      });
      return;
    }

    setJsonLd('listings-breadcrumbs', null);

    const key = seoKey(pathname);
    applySeo({
      title: t(`seo.${key}.title`),
      description: t(`seo.${key}.description`),
      path: pathname,
      noindex,
    });
  }, [pathname, searchParams, locale, t]);

  return null;
}

function listingsSeo(
  pathname: string,
  params: URLSearchParams,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  const filters = parseListingsLocation(pathname, `?${params.toString()}`);
  const path = listingsCanonicalPath(filters);

  const parts = [
    filters.status === 'daily_rent' ? t('propertyStatus.daily_rent') : '',
    filters.status === 'sale' || filters.status === 'rent' ? t(`propertyStatus.${filters.status}`) : '',
    TYPE_KEYS[filters.type ?? ''] ? t(TYPE_KEYS[filters.type ?? '']) : '',
    filters.bedrooms ? `${filters.bedrooms} ${t('listings.bedrooms')}` : '',
    filters.q || '',
    filters.district || '',
    filters.city || '',
  ].filter(Boolean);

  if (parts.length === 0) {
    return { title: t('seo.listings.title'), description: t('seo.listings.description'), path };
  }

  const summary = parts.join(' · ');
  return {
    title: `${summary} | ${SITE_NAME}`,
    description: t('seo.listings.filteredDescription', { summary }),
    path,
  };
}

function listingsBreadcrumbs(
  path: string,
  title: string,
  t: (key: string) => string,
) {
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: t('property.home'), item: pageUrl('/') },
    { '@type': 'ListItem', position: 2, name: t('common.listings'), item: pageUrl('/udzravi-qoneba/') },
  ];
  if (path !== '/udzravi-qoneba/') {
    crumbs.push({ '@type': 'ListItem', position: 3, name: title.replace(` | ${SITE_NAME}`, ''), item: pageUrl(path) });
  }
  return crumbs;
}

function seoKey(pathname: string): string {
  if (pathname === '/') return 'home';
  if (isListingsPath(pathname)) return 'listings';
  if (pathname.startsWith('/property/')) return 'property';
  if (pathname.startsWith('/agents')) return 'agents';
  if (pathname.startsWith('/agent/')) return 'agent';
  if (pathname.startsWith('/projects')) return 'projects';
  if (pathname.startsWith('/project/')) return 'project';
  if (pathname.startsWith('/blog/')) return 'blogPost';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/about')) return 'about';
  if (pathname.startsWith('/contact')) return 'contact';
  if (pathname.startsWith('/services')) return 'services';
  if (pathname.startsWith('/international')) return 'international';
  if (pathname.startsWith('/updates')) return 'updates';
  if (pathname.startsWith('/favorites')) return 'favorites';
  if (pathname.startsWith('/login')) return 'login';
  if (pathname.startsWith('/register')) return 'register';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  return 'home';
}
