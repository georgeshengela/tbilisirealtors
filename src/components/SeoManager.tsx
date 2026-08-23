import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocale, useTranslation } from '../i18n/LocaleContext';
import { applySeo, SITE_NAME } from '../lib/seo';

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

    if (DETAIL_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
      const key = seoKey(pathname);
      applySeo({
        title: t(`seo.${key}.title`),
        description: t(`seo.${key}.description`),
        path: pathname,
        noindex,
      });
      return;
    }

    if (pathname.startsWith('/listings')) {
      const { title, description, path } = listingsSeo(searchParams, t);
      applySeo({ title, description, path, noindex });
      return;
    }

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

function listingsSeo(params: URLSearchParams, t: (key: string, vars?: Record<string, string | number>) => string) {
  const status = params.get('status') ?? '';
  const type = params.get('type') ?? '';
  const city = params.get('city') ?? '';
  const district = params.get('district') ?? '';

  const parts = [
    status === 'sale' || status === 'rent' ? t(`propertyStatus.${status}`) : '',
    TYPE_KEYS[type] ? t(TYPE_KEYS[type]) : '',
    district,
    city,
  ].filter(Boolean);

  const keep = new URLSearchParams();
  for (const key of ['status', 'city', 'district', 'type']) {
    const value = params.get(key);
    if (value) keep.set(key, value);
  }
  const query = keep.toString();
  const path = query ? `/listings?${query}` : '/listings';

  if (parts.length === 0) {
    return { title: t('seo.listings.title'), description: t('seo.listings.description'), path };
  }

  const summary = parts.join(' ');
  return {
    title: `${summary} | ${SITE_NAME}`,
    description: t('seo.listings.filteredDescription', { summary }),
    path,
  };
}

function seoKey(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/listings')) return 'listings';
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
