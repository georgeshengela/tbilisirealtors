export const SITE_URL = 'https://tbilisirealtors.ge';
export const SITE_NAME = 'TBILISIREALTOR.GE';
export const OG_IMAGE = `${SITE_URL}/5e6a55c3201bd.jpg`;

export type SeoProduct = {
  price?: string;
  currency?: string;
  id?: string;
  availability?: string;
  brand?: string;
  condition?: string;
};

export type SeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
  keywords?: string;
  pathEn?: string;
  product?: SeoProduct | null;
};

export function clipMeta(text: string, max = 160): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trimEnd()}…`;
}

export function pageUrl(path = '/'): string {
  if (path.startsWith('http')) return path;
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absoluteImage(src?: string | null): string {
  if (!src) return OG_IMAGE;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('//')) return `https:${src}`;
  return `${SITE_URL}${src.startsWith('/') ? src : `/${src}`}`;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function upsertLink(rel: string, href: string, extra?: Record<string, string>) {
  const extraSel = extra
    ? Object.entries(extra).map(([k, v]) => `[${k}="${v}"]`).join('')
    : '';
  let el = document.head.querySelector(`link[rel="${rel}"]${extraSel}`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    if (extra) {
      for (const [k, v] of Object.entries(extra)) el.setAttribute(k, v);
    }
    document.head.appendChild(el);
  }
  el.href = href;
}

export function setJsonLd(id: string, data: Record<string, unknown> | null) {
  const scriptId = `jsonld-${id}`;
  const existing = document.getElementById(scriptId);
  if (!data) {
    existing?.remove();
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = scriptId;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

const PRODUCT_KEYS = [
  'product:brand',
  'product:condition',
  'product:price:amount',
  'product:price:currency',
  'product:retailer_item_id',
  'product:availability',
] as const;

export function applySeo({
  title,
  description,
  path = '/',
  image,
  noindex = false,
  type = 'website',
  keywords,
  pathEn,
  product,
}: SeoInput) {
  const url = pageUrl(path);
  const urlEn = pageUrl(pathEn || path);
  const ogImage = absoluteImage(image);
  const locale = document.documentElement.lang === 'en' ? 'en_US' : 'ka_GE';

  document.title = title;
  upsertMeta('name', 'title', title);
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'image', ogImage);
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
  if (keywords) upsertMeta('name', 'keywords', keywords);
  else removeMeta('name', 'keywords');

  upsertLink('canonical', url);
  upsertLink('alternate', url, { hreflang: 'ka' });
  upsertLink('alternate', urlEn, { hreflang: 'en' });
  upsertLink('alternate', url, { hreflang: 'x-default' });

  upsertMeta('property', 'og:site_name', SITE_NAME);
  upsertMeta('property', 'og:type', type);
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', ogImage);
  upsertMeta('property', 'og:image:alt', title);
  upsertMeta('property', 'og:locale', locale);
  upsertMeta('property', 'og:locale:alternate', locale === 'en_US' ? 'ka_GE' : 'en_US');

  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', ogImage);

  if (product) {
    upsertMeta('property', 'product:brand', product.brand || SITE_NAME);
    upsertMeta('property', 'product:condition', product.condition || 'new');
    if (product.price) upsertMeta('property', 'product:price:amount', product.price);
    else removeMeta('property', 'product:price:amount');
    upsertMeta('property', 'product:price:currency', product.currency || 'GEL');
    if (product.id) upsertMeta('property', 'product:retailer_item_id', product.id);
    else removeMeta('property', 'product:retailer_item_id');
    upsertMeta('property', 'product:availability', product.availability || 'in stock');
  } else {
    for (const key of PRODUCT_KEYS) removeMeta('property', key);
  }
}
