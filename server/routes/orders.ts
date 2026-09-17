import { Router, type Response } from 'express';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { orders, type OrderComment, type OrderViewing } from '../schema.js';
import { requirePermission, requireStaff, type AuthRequest } from '../middleware/auth.js';
import { can } from '../permissions.js';
import { allocateOrderId } from '../services/orderId.js';

const router = Router();
router.use(requireStaff);

const STATUSES = ['new', 'current', 'old', 'problematic'] as const;
const DEAL_TYPES = ['sale', 'rent'] as const;
const ORIGINS = ['myhome', 'ssge', 'korteri', 'phone'] as const;

function editorName(req: AuthRequest): string {
  return req.user?.firstName || req.user?.name || req.user?.email || '';
}

function asText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function phoneOf(value: unknown): string {
  const raw = asText(value, 50).replace(/[^\d+]/g, '');
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 9 ? raw : '';
}

function dealOf(value: unknown): 'sale' | 'rent' | null {
  return value === 'sale' || value === 'rent' ? value : null;
}

function statusOf(value: unknown): (typeof STATUSES)[number] | null {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
    ? value as (typeof STATUSES)[number]
    : null;
}

function originOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === 'string' && (ORIGINS as readonly string[]).includes(item));
}

function budgetOf(value: unknown): string | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(Math.round(n)) : null;
}

function commentsOf(value: unknown, author: string): OrderComment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const text = asText((item as { text?: unknown })?.text, 2000);
      if (!text) return null;
      return {
        id: asText((item as { id?: unknown })?.id, 40) || `c${Date.now()}-${index}`,
        text,
        author: asText((item as { author?: unknown })?.author, 120) || author,
        createdAt: asText((item as { createdAt?: unknown })?.createdAt, 40) || new Date().toISOString(),
      };
    })
    .filter((item): item is OrderComment => Boolean(item));
}

function viewingsOf(value: unknown, author: string): OrderViewing[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const listingIds = Array.isArray((item as { listingIds?: unknown })?.listingIds)
        ? (item as { listingIds: unknown[] }).listingIds
          .map(id => String(id).replace(/\D/g, '').slice(0, 8))
          .filter(id => id.length >= 4)
        : [];
      const shownAt = asText((item as { shownAt?: unknown })?.shownAt, 20).slice(0, 10);
      if (!shownAt && listingIds.length === 0) return null;
      return {
        id: asText((item as { id?: unknown })?.id, 40) || `v${Date.now()}-${index}`,
        shownAt: shownAt || new Date().toISOString().slice(0, 10),
        listingIds,
        note: asText((item as { note?: unknown })?.note, 500) || undefined,
        author: asText((item as { author?: unknown })?.author, 120) || author,
        createdAt: asText((item as { createdAt?: unknown })?.createdAt, 40) || new Date().toISOString(),
      };
    })
    .filter((item): item is OrderViewing => Boolean(item));
}

function publicOrder(row: typeof orders.$inferSelect) {
  return {
    ...row,
    budgetAmount: row.budgetAmount != null ? Number(row.budgetAmount) : 0,
    comments: row.comments ?? [],
    viewings: row.viewings ?? [],
    origin: row.origin ?? [],
  };
}

router.get('/orders', requirePermission('orders.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = asText(req.query.q, 80);
    const status = statusOf(req.query.status);
    const dealType = dealOf(req.query.dealType);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 40));
    const offset = (page - 1) * limit;

    const filters = [];
    if (status) filters.push(eq(orders.status, status));
    if (dealType) filters.push(eq(orders.dealType, dealType));
    if (q) {
      const like = `%${q}%`;
      filters.push(or(
        ilike(orders.id, like),
        ilike(orders.clientName, like),
        ilike(orders.clientPhone, like),
        ilike(orders.createdByName, like),
      ));
    }

    const where = filters.length ? and(...filters) : undefined;
    const [rows, totals] = await Promise.all([
      db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
      db.select({
        total: sql<number>`count(*)::int`,
        new: sql<number>`count(*) filter (where ${orders.status} = 'new')::int`,
        current: sql<number>`count(*) filter (where ${orders.status} = 'current')::int`,
        old: sql<number>`count(*) filter (where ${orders.status} = 'old')::int`,
        problematic: sql<number>`count(*) filter (where ${orders.status} = 'problematic')::int`,
      }).from(orders),
    ]);

    res.json({
      data: rows.map(publicOrder),
      total: totals[0]?.total ?? 0,
      page,
      limit,
      summary: totals[0],
    });
  } catch (err) {
    console.error('List orders:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/orders/:id', requirePermission('orders.view'), async (req: AuthRequest, res: Response): Promise<void> => {
  const [row] = await db.select().from(orders).where(eq(orders.id, String(req.params.id)));
  if (!row) {
    res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
    return;
  }
  res.json(publicOrder(row));
});

router.post('/orders', requirePermission('orders.create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const clientPhone = phoneOf(req.body?.clientPhone);
    const clientName = asText(req.body?.clientName, 255);
    const dealType = dealOf(req.body?.dealType);
    const budgetAmount = budgetOf(req.body?.budgetAmount);
    const comment = asText(req.body?.comment, 2000);
    if (!clientPhone) {
      res.status(400).json({ error: 'კლიენტის ნომერი სავალდებულოა' });
      return;
    }
    if (!clientName) {
      res.status(400).json({ error: 'კლიენტის სახელი სავალდებულოა' });
      return;
    }
    if (!dealType) {
      res.status(400).json({ error: 'აირჩიე ყიდვა ან ქირაობა' });
      return;
    }
    if (!budgetAmount) {
      res.status(400).json({ error: 'ბიუჯეტი სავალდებულოა' });
      return;
    }
    if (!comment) {
      res.status(400).json({ error: 'კომენტარი სავალდებულოა' });
      return;
    }

    const id = await allocateOrderId();
    const author = editorName(req);
    const [created] = await db.insert(orders).values({
      id,
      clientName,
      clientPhone,
      dealType,
      budgetAmount,
      budgetCurrency: req.body?.budgetCurrency === 'GEL' ? 'GEL' : 'USD',
      origin: originOf(req.body?.origin),
      status: 'new',
      comments: [{
        id: `c${Date.now()}`,
        text: comment,
        author,
        createdAt: new Date().toISOString(),
      }],
      viewings: [],
      answers: {},
      createdByUserId: req.user?.id ?? null,
      createdByName: author,
      assignedToUserId: req.user?.id ?? null,
    }).returning();

    res.status(201).json(publicOrder(created));
  } catch (err) {
    console.error('Create order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/orders/:id', requirePermission('orders.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db.select().from(orders).where(eq(orders.id, String(req.params.id)));
    if (!existing) {
      res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
      return;
    }

    const clientPhone = phoneOf(req.body?.clientPhone) || existing.clientPhone;
    const clientName = asText(req.body?.clientName, 255) || existing.clientName;
    const dealType = dealOf(req.body?.dealType) || existing.dealType;
    const budgetAmount = budgetOf(req.body?.budgetAmount) || existing.budgetAmount;
    const author = editorName(req);

    if (!clientPhone || !clientName || !dealType || !budgetAmount) {
      res.status(400).json({ error: 'სახელი, ნომერი, გარიგება და ბიუჯეტი სავალდებულოა' });
      return;
    }

    let status = existing.status;
    if ('status' in req.body) {
      if (!can(req.user, 'orders.status')) {
        res.status(403).json({ error: 'სტატუსის შეცვლა მხოლოდ მენეჯერს შეუძლია' });
        return;
      }
      const next = statusOf(req.body.status);
      if (!next) {
        res.status(400).json({ error: 'არასწორი სტატუსი' });
        return;
      }
      const viewings = viewingsOf(req.body?.viewings ?? existing.viewings, author);
      if (next === 'current' && existing.status === 'new' && viewings.length === 0) {
        res.status(400).json({ error: 'CURRENT მხოლოდ ნაჩვენები ობიექტის შემდეგ' });
        return;
      }
      status = next;
    }

    const extraComment = asText(req.body?.comment, 2000);
    const comments = commentsOf(req.body?.comments ?? existing.comments, author);
    if (extraComment) {
      comments.push({
        id: `c${Date.now()}`,
        text: extraComment,
        author,
        createdAt: new Date().toISOString(),
      });
    }

    const [updated] = await db.update(orders).set({
      clientName,
      clientPhone,
      dealType,
      budgetAmount: String(budgetAmount),
      budgetCurrency: req.body?.budgetCurrency === 'GEL' ? 'GEL' : (existing.budgetCurrency === 'GEL' ? 'GEL' : 'USD'),
      origin: 'origin' in req.body ? originOf(req.body.origin) : existing.origin,
      status,
      comments,
      viewings: 'viewings' in req.body ? viewingsOf(req.body.viewings, author) : existing.viewings,
      updatedAt: new Date(),
    }).where(eq(orders.id, existing.id)).returning();

    res.json(publicOrder(updated));
  } catch (err) {
    console.error('Update order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/orders/:id', requirePermission('orders.edit'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db.select().from(orders).where(eq(orders.id, String(req.params.id)));
    if (!existing) {
      res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
      return;
    }
    const author = editorName(req);
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if ('status' in req.body) {
      if (!can(req.user, 'orders.status')) {
        res.status(403).json({ error: 'სტატუსის შეცვლა მხოლოდ მენეჯერს შეუძლია' });
        return;
      }
      const next = statusOf(req.body.status);
      if (!next) {
        res.status(400).json({ error: 'არასწორი სტატუსი' });
        return;
      }
      if (next === 'current' && existing.status === 'new' && (existing.viewings ?? []).length === 0) {
        res.status(400).json({ error: 'CURRENT მხოლოდ ნაჩვენები ობიექტის შემდეგ' });
        return;
      }
      updates.status = next;
    }
    if ('viewings' in req.body) updates.viewings = viewingsOf(req.body.viewings, author);
    if ('comments' in req.body) updates.comments = commentsOf(req.body.comments, author);
    if ('assignedToUserId' in req.body) updates.assignedToUserId = Number(req.body.assignedToUserId) || null;

    const [updated] = await db.update(orders).set(updates).where(eq(orders.id, existing.id)).returning();
    res.json(publicOrder(updated));
  } catch (err) {
    console.error('Patch order:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/orders/:id', requirePermission('orders.delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  const [row] = await db.delete(orders).where(eq(orders.id, String(req.params.id))).returning({ id: orders.id });
  if (!row) {
    res.status(404).json({ error: 'შეკვეთა ვერ მოიძებნა' });
    return;
  }
  res.json({ ok: true });
});

export default router;
