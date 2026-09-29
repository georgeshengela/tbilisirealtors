import { Router, type Response } from 'express';
import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db } from '../db.js';
import { constructionProjects } from '../schema.js';
import { requirePermission, requireStaff, type AuthRequest } from '../middleware/auth.js';
import { nanoid } from '../utils.js';
import {
  DELIVERY_CONDITIONS,
  isProjectCurrency,
  isProjectStatus,
  mapProjectFromApi,
  MAX_PROJECT_BLOCKS,
  MAX_PROJECT_FLOORS,
  MAX_UNITS_PER_FLOOR,
  slugFromProjectName,
  type ProjectBlock,
  type ProjectPaymentOption,
  type ProjectUnit,
} from '../../src/lib/projects.ts';

const router = Router();
router.use(requireStaff);

const PAYMENTS = new Set<ProjectPaymentOption>(['installment', 'mortgage', 'cash']);

function asText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asInt(value: unknown, min = 0, max = 1_000_000): number {
  return Math.min(max, Math.max(min, Math.round(asNum(value))));
}

function strArr(value: unknown, allowed?: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const next = item.trim();
    if (!next) continue;
    if (allowed && !allowed.includes(next)) continue;
    if (!out.includes(next)) out.push(next);
  }
  return out;
}

function paymentsOf(value: unknown): ProjectPaymentOption[] {
  return strArr(value).filter((item): item is ProjectPaymentOption => PAYMENTS.has(item as ProjectPaymentOption));
}

function unitsOf(value: unknown, projectId: string, blockNames: Set<string>): ProjectUnit[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5000).map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const area = Math.max(0, asNum(row.area));
    const price = Math.max(0, asNum(row.price));
    const status = row.status === 'sold' || row.status === 'reserved' ? row.status : 'available';
    const block = asText(row.block, 12);
    const position = asInt(row.position, 0, MAX_UNITS_PER_FLOOR);
    return {
      id: asText(row.id, 80) || `${projectId}-u${index + 1}`,
      floor: asInt(row.floor, 1, MAX_PROJECT_FLOORS),
      number: asText(row.number, 20) || String(index + 1),
      bedrooms: asInt(row.bedrooms, 0, 12),
      area,
      price,
      pricePerSqm: asInt(row.pricePerSqm) || (area > 0 ? Math.round(price / area) : 0),
      status,
      ...(block && blockNames.has(block) ? { block } : {}),
      ...(position ? { position } : {}),
    };
  });
}

function blocksOf(value: unknown): ProjectBlock[] {
  if (!Array.isArray(value)) return [];
  const out: ProjectBlock[] = [];
  for (const item of value.slice(0, MAX_PROJECT_BLOCKS)) {
    const row = (item ?? {}) as Record<string, unknown>;
    const name = asText(row.name, 12) || String.fromCharCode(65 + out.length);
    if (out.some(b => b.name === name)) continue;
    out.push({
      id: asText(row.id, 40) || `b${out.length + 1}`,
      name,
      floors: asInt(row.floors, 1, MAX_PROJECT_FLOORS),
      unitsPerFloor: asInt(row.unitsPerFloor, 1, MAX_UNITS_PER_FLOOR),
    });
  }
  return out;
}

function imagesOf(value: unknown): string[] {
  return strArr(value).filter(url => /^https?:\/\//i.test(url) || url.startsWith('/')).slice(0, 40);
}

async function uniqueSlug(desired: string, excludeId?: string): Promise<string> {
  const base = (desired || 'project').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 160) || 'project';
  let slug = base;
  let n = 2;
  for (;;) {
    const [hit] = await db.select({ id: constructionProjects.id })
      .from(constructionProjects)
      .where(eq(constructionProjects.slug, slug))
      .limit(1);
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base.slice(0, 150)}-${n}`;
    n += 1;
    if (n > 50) return `${base}-${Date.now().toString(36)}`;
  }
}

function coordsOf(value: unknown): { lat: number; lng: number } {
  const row = value && typeof value === 'object' ? value as { lat?: unknown; lng?: unknown } : {};
  const lat = asNum(row.lat);
  const lng = asNum(row.lng);
  return {
    lat: lat || 41.7151,
    lng: lng || 44.8271,
  };
}

function publicRow(row: typeof constructionProjects.$inferSelect) {
  return mapProjectFromApi(row as unknown as Record<string, unknown>);
}

function payloadOf(
  body: Record<string, unknown>,
  id: string,
  slug: string,
  existing?: typeof constructionProjects.$inferSelect,
) {
  const images = imagesOf(body.images);
  const cover = asText(body.image, 800) || images[0] || '';
  const gallery = cover && !images.includes(cover) ? [cover, ...images] : images;
  const status = isProjectStatus(body.status) ? body.status : 'building';
  const deliveryCondition = asText(body.deliveryCondition, 120);
  // Blocks + units come from the admin plan editor; a body without them keeps what is stored.
  const blocks = Array.isArray(body.blocks)
    ? blocksOf(body.blocks)
    : blocksOf(existing?.blocks);
  const blockNames = new Set(blocks.map(b => b.name));
  const projectUnits = Array.isArray(body.projectUnits)
    ? unitsOf(body.projectUnits, id, blockNames)
    : (existing?.projectUnits ?? []);
  const priceCurrency = isProjectCurrency(body.priceCurrency)
    ? body.priceCurrency
    : (existing?.priceCurrency === 'USD' ? 'USD' : 'GEL');
  // With blocks the counts are derived, so the public floor picker can never drift from them.
  const floors = blocks.length
    ? Math.max(...blocks.map(b => b.floors))
    : asInt(body.floors, 1, MAX_PROJECT_FLOORS);
  const buildings = blocks.length ? blocks.length : asInt(body.buildings, 1, 40);
  const units = blocks.length ? projectUnits.length : asInt(body.units, 0, 20_000) || projectUnits.length;
  return {
    slug,
    name: asText(body.name, 255),
    address: asText(body.address, 500),
    city: asText(body.city, 255) || 'თბილისი',
    district: asText(body.district, 255),
    developer: asText(body.developer, 255),
    managementCompany: asText(body.managementCompany, 255) || null,
    phone: asText(body.phone, 50),
    units,
    priceFrom: String(Math.max(0, Math.round(asNum(body.priceFrom)))),
    priceTo: String(Math.max(0, Math.round(asNum(body.priceTo)))),
    priceCurrency,
    pricePerSqmFrom: String(Math.max(0, Math.round(asNum(body.pricePerSqmFrom)))),
    pricePerSqmTo: String(Math.max(0, Math.round(asNum(body.pricePerSqmTo)))),
    areaFrom: String(Math.max(0, asNum(body.areaFrom))),
    areaTo: String(Math.max(0, asNum(body.areaTo))),
    completion: asText(body.completion, 80),
    deliveryDate: asText(body.deliveryDate, 40),
    status,
    image: cover,
    images: gallery,
    floors,
    buildings,
    parking: asInt(body.parking, 0, 20_000),
    bedroomOptions: Array.isArray(body.bedroomOptions)
      ? (body.bedroomOptions as unknown[]).map(n => asInt(n, 1, 10)).filter(n => n > 0)
      : [1, 2, 3],
    greenArea: asInt(body.greenArea, 0, 1_000_000),
    deliveryCondition: DELIVERY_CONDITIONS.includes(deliveryCondition) ? deliveryCondition : deliveryCondition,
    constructionProgress: asInt(body.constructionProgress, 0, 100),
    constructionNote: asText(body.constructionNote, 500),
    description: asText(body.description, 20_000),
    paymentOptions: paymentsOf(body.paymentOptions),
    territoryAmenities: strArr(body.territoryAmenities),
    postDeliveryServices: strArr(body.postDeliveryServices),
    securityFeatures: strArr(body.securityFeatures),
    coordinates: coordsOf(body.coordinates),
    blocks,
    projectUnits,
    published: body.published !== false,
    sortOrder: asInt(body.sortOrder, 0, 10_000),
    updatedAt: new Date(),
  };
}

router.get('/projects', requirePermission('projects.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = asText(req.query.q, 80);
    const status = isProjectStatus(req.query.status) ? req.query.status : null;
    const filters = [];
    if (status) filters.push(eq(constructionProjects.status, status));
    if (q) {
      const like = `%${q}%`;
      filters.push(or(
        ilike(constructionProjects.name, like),
        ilike(constructionProjects.developer, like),
        ilike(constructionProjects.city, like),
        ilike(constructionProjects.district, like),
        ilike(constructionProjects.slug, like),
      ));
    }
    const where = filters.length ? and(...filters) : undefined;
    const rows = await db.select().from(constructionProjects)
      .where(where)
      .orderBy(asc(constructionProjects.sortOrder), desc(constructionProjects.createdAt));
    res.json({ data: rows.map(row => ({ ...publicRow(row), projectUnits: [] })), total: rows.length });
  } catch (err) {
    console.error('Admin projects list error:', err);
    res.status(500).json({ error: 'პროექტები ვერ ჩაიტვირთა' });
  }
});

router.get('/projects/:id', requirePermission('projects.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [row] = await db.select().from(constructionProjects)
      .where(eq(constructionProjects.id, asText(req.params.id, 50)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: 'პროექტი ვერ მოიძებნა' });
      return;
    }
    res.json(publicRow(row));
  } catch (err) {
    console.error('Admin project get error:', err);
    res.status(500).json({ error: 'პროექტი ვერ ჩაიტვირთა' });
  }
});

router.post('/projects', requirePermission('projects.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = asText(body.name, 255);
    const developer = asText(body.developer, 255);
    if (!name || !developer) {
      res.status(400).json({ error: 'სახელი და დეველოპერი სავალდებულოა' });
      return;
    }
    const id = `cp${nanoid(8)}`;
    const slug = await uniqueSlug(asText(body.slug, 180) || slugFromProjectName(name));
    const data = payloadOf(body, id, slug);
    const [row] = await db.insert(constructionProjects).values({ id, ...data }).returning();
    res.status(201).json(publicRow(row));
  } catch (err) {
    console.error('Admin project create error:', err);
    res.status(500).json({ error: 'პროექტი ვერ შეინახა' });
  }
});

router.put('/projects/:id', requirePermission('projects.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = asText(req.params.id, 50);
    const [existing] = await db.select().from(constructionProjects)
      .where(eq(constructionProjects.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: 'პროექტი ვერ მოიძებნა' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = asText(body.name, 255) || existing.name;
    const developer = asText(body.developer, 255) || existing.developer;
    if (!name || !developer) {
      res.status(400).json({ error: 'სახელი და დეველოპერი სავალდებულოა' });
      return;
    }
    const slug = await uniqueSlug(asText(body.slug, 180) || existing.slug || slugFromProjectName(name), id);
    const data = payloadOf({ ...body, name, developer }, id, slug, existing);
    const [row] = await db.update(constructionProjects)
      .set(data)
      .where(eq(constructionProjects.id, id))
      .returning();
    res.json(publicRow(row));
  } catch (err) {
    console.error('Admin project update error:', err);
    res.status(500).json({ error: 'პროექტი ვერ განახლდა' });
  }
});

router.patch('/projects/:id', requirePermission('projects.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = asText(req.params.id, 50);
    const [existing] = await db.select().from(constructionProjects)
      .where(eq(constructionProjects.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: 'პროექტი ვერ მოიძებნა' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: {
      updatedAt: Date;
      published?: boolean;
      sortOrder?: number;
      status?: string;
    } = { updatedAt: new Date() };
    if ('published' in body) patch.published = body.published !== false;
    if ('sortOrder' in body) patch.sortOrder = asInt(body.sortOrder, 0, 10_000);
    if (isProjectStatus(body.status)) patch.status = body.status;
    const [row] = await db.update(constructionProjects)
      .set(patch)
      .where(eq(constructionProjects.id, id))
      .returning();
    res.json(publicRow(row));
  } catch (err) {
    console.error('Admin project patch error:', err);
    res.status(500).json({ error: 'პროექტი ვერ განახლდა' });
  }
});

router.delete('/projects/:id', requirePermission('projects.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = asText(req.params.id, 50);
    const deleted = await db.delete(constructionProjects)
      .where(eq(constructionProjects.id, id))
      .returning({ id: constructionProjects.id });
    if (!deleted.length) {
      res.status(404).json({ error: 'პროექტი ვერ მოიძებნა' });
      return;
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error('Admin project delete error:', err);
    res.status(500).json({ error: 'პროექტი ვერ წაიშალა' });
  }
});

export default router;
