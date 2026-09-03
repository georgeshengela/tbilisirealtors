import { and, eq, ne } from 'drizzle-orm';
import { db } from './db.js';
import { properties } from './schema.js';
import { listingSitemapPaths } from '../src/lib/seoListingsUrl.ts';
import {
  parsePropertyId,
  propertyHref,
  propertySeoCopy,
  type PropertyUrlInput,
} from '../src/lib/seoPropertyUrl.ts';
import { SITE_NAME, SITE_URL, absoluteImage, clipMeta, pageUrl } from '../src/lib/seo.ts';

const publiclyVisible = and(
  eq(properties.moderationStatus, 'approved'),
  ne(properties.lifecycleState, 'old'),
);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function publicAddress(address: string | null | undefined, showAddress: boolean | null | undefined, district?: string | null, city?: string | null): string {
  if (showAddress === false && address) {
    const kept = address
      .split(',')
      .map(part => part.trim())
      .filter(part => part && !/\d/.test(part));
    return kept.join(', ') || [district, city].filter(Boolean).join(', ');
  }
  return address || '';
}

export async function loadPublicProperty(id: string): Promise<PropertyUrlInput | null> {
  const [row] = await db
    .select({
      id: properties.id,
      status: properties.status,
      type: properties.type,
      bedrooms: properties.bedrooms,
      rooms: properties.rooms,
      district: properties.district,
      city: properties.city,
      address: properties.address,
      showAddress: properties.showAddress,
      area: properties.area,
      price: properties.price,
      rentPrice: properties.rentPrice,
      priceCurrency: properties.priceCurrency,
      description: properties.description,
      title: properties.title,
      images: properties.images,
    })
    .from(properties)
    .where(and(eq(properties.id, id), publiclyVisible))
    .limit(1);

  if (!row) return null;
  return {
    ...row,
    address: publicAddress(row.address, row.showAddress, row.district, row.city),
  };
}

export async function loadPublicPropertyUrls(limit = 500): Promise<{ id: string; href: string }[]> {
  const rows = await db
    .select({
      id: properties.id,
      title: properties.title,
      status: properties.status,
      type: properties.type,
      bedrooms: properties.bedrooms,
      rooms: properties.rooms,
      district: properties.district,
      city: properties.city,
    })
    .from(properties)
    .where(publiclyVisible)
    .limit(limit);

  return rows.map(row => ({ id: row.id, href: propertyHref(row) }));
}

function replaceTag(html: string, pattern: RegExp, tag: string): string {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace('</head>', `    ${tag}\n  </head>`);
}

function setNamedMeta(html: string, name: string, content: string): string {
  return replaceTag(
    html,
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i'),
    `<meta name="${name}" content="${escapeHtml(content)}" />`,
  );
}

function setPropertyMeta(html: string, property: string, content: string): string {
  return replaceTag(
    html,
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]*>`, 'i'),
    `<meta property="${property}" content="${escapeHtml(content)}" />`,
  );
}

function setLink(html: string, rel: string, href: string, extra = ''): string {
  const extraRe = extra ? extra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const pattern = extra
    ? new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*${extraRe}[^>]*>`, 'i')
    : new RegExp(`<link[^>]+rel=["']${rel}["'][^>]*>`, 'i');
  const extraAttr = extra ? ` ${extra}` : '';
  return replaceTag(html, pattern, `<link rel="${rel}" href="${escapeHtml(href)}"${extraAttr} />`);
}

export function injectPropertySeo(html: string, input: PropertyUrlInput): string {
  const seo = propertySeoCopy(input, 'ka');
  const url = pageUrl(seo.path);
  const urlEn = pageUrl(seo.pathEn);
  const image = absoluteImage(input.images?.[0]);
  const description = clipMeta(input.description || seo.description, 240);

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  out = out.replace(/<html([^>]*)lang="[^"]*"/i, '<html$1lang="ka"');
  out = setNamedMeta(out, 'title', seo.title);
  out = setNamedMeta(out, 'description', seo.description);
  out = setNamedMeta(out, 'keywords', seo.keywords);
  out = setNamedMeta(out, 'image', image);
  out = setNamedMeta(out, 'robots', 'index, follow');
  out = setLink(out, 'canonical', url);
  out = setLink(out, 'alternate', url, 'hreflang="ka"');
  out = setLink(out, 'alternate', urlEn, 'hreflang="en"');
  out = setLink(out, 'alternate', url, 'hreflang="x-default"');
  out = setPropertyMeta(out, 'og:type', 'website');
  out = setPropertyMeta(out, 'og:title', seo.title);
  out = setPropertyMeta(out, 'og:description', description);
  out = setPropertyMeta(out, 'og:url', url);
  out = setPropertyMeta(out, 'og:image', image);
  out = setPropertyMeta(out, 'og:image:alt', seo.h1);
  out = setPropertyMeta(out, 'og:site_name', SITE_NAME);
  out = setPropertyMeta(out, 'product:brand', SITE_NAME);
  out = setPropertyMeta(out, 'product:condition', 'new');
  if (seo.price != null) out = setPropertyMeta(out, 'product:price:amount', String(seo.price));
  out = setPropertyMeta(out, 'product:price:currency', seo.priceCurrency);
  out = setPropertyMeta(out, 'product:retailer_item_id', input.id);
  out = setPropertyMeta(out, 'product:availability', 'in stock');
  out = setNamedMeta(out, 'twitter:title', seo.title);
  out = setNamedMeta(out, 'twitter:description', seo.description);
  out = setNamedMeta(out, 'twitter:image', image);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'RealEstateListing',
        name: seo.h1,
        description,
        url,
        image,
        address: {
          '@type': 'PostalAddress',
          streetAddress: input.address || undefined,
          addressLocality: input.city || undefined,
          addressRegion: input.district || undefined,
          addressCountry: 'GE',
        },
        offers: {
          '@type': 'Offer',
          price: String(seo.price ?? ''),
          priceCurrency: seo.priceCurrency,
          availability: 'https://schema.org/InStock',
          url,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: pageUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'განცხადებები', item: pageUrl('/udzravi-qoneba/') },
          { '@type': 'ListItem', position: 3, name: seo.h1, item: url },
        ],
      },
    ],
  };

  const jsonTag = `<script type="application/ld+json" id="jsonld-page">${JSON.stringify(jsonLd)}</script>`;
  if (/id="jsonld-page"/.test(out)) {
    out = out.replace(/<script type="application\/ld\+json" id="jsonld-page">[\s\S]*?<\/script>/, jsonTag);
  } else {
    out = out.replace('</head>', `    ${jsonTag}\n  </head>`);
  }
  return out;
}

export function buildSitemapXml(propertyHrefs: string[]): string {
  const staticUrls = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    ...listingSitemapPaths().map(path => ({
      loc: `${SITE_URL}${path}`,
      changefreq: 'hourly',
      priority: '0.9',
    })),
    { loc: `${SITE_URL}/projects`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/agents`, changefreq: 'weekly', priority: '0.7' },
    { loc: `${SITE_URL}/blog`, changefreq: 'weekly', priority: '0.6' },
    { loc: `${SITE_URL}/services`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.5' },
  ];

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of staticUrls) {
    if (seen.has(item.loc)) continue;
    seen.add(item.loc);
    urls.push(`  <url><loc>${item.loc}</loc><changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`);
  }
  for (const href of propertyHrefs) {
    const loc = `${SITE_URL}${href}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push(`  <url><loc>${loc}</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export { parsePropertyId, propertyHref };
