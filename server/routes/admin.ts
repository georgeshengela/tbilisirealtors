import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { properties, adminUsers, agents, blogPosts, siteSettings } from '../schema.js';
import { eq, desc, count, sql } from 'drizzle-orm';
import { requireAdmin, AuthRequest } from '../middleware/auth.js';
import { nanoid } from '../utils.js';

const router = Router();

// All admin routes require admin auth
router.use(requireAdmin);

// ─── DASHBOARD STATS ───────────────────────────────────────────────────────────

router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [propCount] = await db.select({ count: count() }).from(properties);
    const [agentCount] = await db.select({ count: count() }).from(agents);
    const [blogCount] = await db.select({ count: count() }).from(blogPosts);
    const [userCount] = await db.select({ count: count() }).from(adminUsers);

    const totalViews = await db
      .select({ total: sql<number>`COALESCE(SUM(view_count), 0)` })
      .from(properties);

    const recentProperties = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(5);

    res.json({
      properties: Number(propCount.count),
      agents: Number(agentCount.count),
      blogPosts: Number(blogCount.count),
      adminUsers: Number(userCount.count),
      totalViews: Number(totalViews[0]?.total ?? 0),
      recentProperties,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PROPERTIES ────────────────────────────────────────────────────────────────

router.get('/properties', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
    const limit = Math.min(50, parseInt(String(req.query.limit ?? '20')));
    const offset = (page - 1) * limit;

    const all = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(limit)
      .offset(offset);

    const [total] = await db.select({ count: count() }).from(properties);

    res.json({ data: all, total: Number(total.count), page, limit });
  } catch (err) {
    console.error('Properties list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, req.params.id));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json(property);
  } catch (err) {
    console.error('Property get error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/properties', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = `p${nanoid(8)}`;
    const data = req.body;

    const [created] = await db
      .insert(properties)
      .values({
        id,
        title: data.title,
        description: data.description,
        price: data.price,
        pricePerSqm: data.pricePerSqm,
        address: data.address,
        city: data.city || 'თბილისი',
        district: data.district,
        type: data.type || 'apartment',
        status: data.status || 'sale',
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        floor: data.floor,
        totalFloors: data.totalFloors,
        yearBuilt: data.yearBuilt,
        images: data.images || [],
        amenities: data.amenities || [],
        features: data.features || [],
        isFeatured: data.isFeatured || false,
        isNew: data.isNew ?? true,
        isPremium: data.isPremium || false,
        coordinates: data.coordinates,
        viewCount: 0,
        listedDate: new Date().toISOString().split('T')[0],
        agentId: data.agentId,
        agentName: data.agentName,
        agentPhone: data.agentPhone,
        agentEmail: data.agentEmail,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Property create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/properties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;

    const [updated] = await db
      .update(properties)
      .set({
        title: data.title,
        description: data.description,
        price: data.price,
        pricePerSqm: data.pricePerSqm,
        address: data.address,
        city: data.city,
        district: data.district,
        type: data.type,
        status: data.status,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        floor: data.floor,
        totalFloors: data.totalFloors,
        yearBuilt: data.yearBuilt,
        images: data.images,
        amenities: data.amenities,
        features: data.features,
        isFeatured: data.isFeatured,
        isNew: data.isNew,
        isPremium: data.isPremium,
        coordinates: data.coordinates,
        agentName: data.agentName,
        agentPhone: data.agentPhone,
        agentEmail: data.agentEmail,
        updatedAt: new Date(),
      })
      .where(eq(properties.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Property update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/properties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(properties).where(eq(properties.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Property delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Quick toggle for property flags (VIP, Featured, New)
router.patch('/properties/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allowed = ['isFeatured', 'isNew', 'isPremium', 'viewCount'];
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const [updated] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Property patch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── AGENTS ────────────────────────────────────────────────────────────────────

router.get('/agents', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db.select().from(agents).orderBy(desc(agents.createdAt));
    res.json(all);
  } catch (err) {
    console.error('Agents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/agents', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = `a${nanoid(6)}`;
    const data = req.body;

    const [created] = await db
      .insert(agents)
      .values({
        id,
        name: data.name,
        photo: data.photo,
        phone: data.phone,
        email: data.email,
        rating: data.rating || '5.0',
        reviewCount: data.reviewCount || 0,
        propertyCount: data.propertyCount || 0,
        yearsExperience: data.yearsExperience || 0,
        specialization: data.specialization || [],
        bio: data.bio,
        company: data.company || 'TbilisiRealtors.ge',
        verified: data.verified ?? false,
        languages: data.languages || ['ქართული'],
        isActive: true,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Agent create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/agents/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;

    const [updated] = await db
      .update(agents)
      .set({
        name: data.name,
        photo: data.photo,
        phone: data.phone,
        email: data.email,
        bio: data.bio,
        company: data.company,
        verified: data.verified,
        isActive: data.isActive,
        languages: data.languages,
        specialization: data.specialization,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Agent update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/agents/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(agents).where(eq(agents.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Agent delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── BLOG POSTS ────────────────────────────────────────────────────────────────

router.get('/blog', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    res.json(all);
  } catch (err) {
    console.error('Blog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/blog', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = `b${nanoid(8)}`;
    const data = req.body;

    const [created] = await db
      .insert(blogPosts)
      .values({
        id,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        authorId: String(req.user!.id),
        authorName: req.user!.name,
        category: data.category,
        tags: data.tags || [],
        image: data.image,
        publishDate: data.publishDate || new Date().toISOString().split('T')[0],
        readTime: data.readTime || 5,
        isFeatured: data.isFeatured || false,
        isPublished: data.isPublished ?? true,
      })
      .returning();

    res.status(201).json(created);
  } catch (err) {
    console.error('Blog create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/blog/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = req.body;

    const [updated] = await db
      .update(blogPosts)
      .set({
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        category: data.category,
        tags: data.tags,
        image: data.image,
        readTime: data.readTime,
        isFeatured: data.isFeatured,
        isPublished: data.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('Blog update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/blog/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id));
    res.json({ success: true });
  } catch (err) {
    console.error('Blog delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── ADMIN USERS ───────────────────────────────────────────────────────────────

router.get('/users', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));

    res.json(all);
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, name, password, role } = req.body;

    if (!email || !name || !password) {
      res.status(400).json({ error: 'Email, name, and password are required' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [created] = await db
      .insert(adminUsers)
      .values({
        email: email.toLowerCase().trim(),
        name,
        passwordHash,
        role: role || 'admin',
        isActive: true,
      })
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        createdAt: adminUsers.createdAt,
      });

    res.status(201).json(created);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    console.error('User create error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, role, isActive, password } = req.body;
    const updates: Record<string, unknown> = { name, role, isActive, updatedAt: new Date() };

    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    const [updated] = await db
      .update(adminUsers)
      .set(updates)
      .where(eq(adminUsers.id, parseInt(req.params.id)))
      .returning({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
        createdAt: adminUsers.createdAt,
      });

    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (String(req.user!.id) === req.params.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    await db.delete(adminUsers).where(eq(adminUsers.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── SITE SETTINGS ─────────────────────────────────────────────────────────────

router.get('/settings', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const all = await db.select().from(siteSettings).orderBy(siteSettings.key);
    res.json(all);
  } catch (err) {
    console.error('Settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { settings } = req.body as { settings: Array<{ key: string; value: string; label?: string }> };

    for (const s of settings) {
      await db
        .insert(siteSettings)
        .values({ key: s.key, value: s.value, label: s.label, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: siteSettings.key,
          set: { value: s.value, updatedAt: new Date() },
        });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
