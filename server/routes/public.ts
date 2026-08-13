import { Router, Response } from 'express';
import { db } from '../db.js';
import { properties, agents, blogPosts } from '../schema.js';
import { and, count, desc, eq } from 'drizzle-orm';

const router = Router();

router.get('/stats/counts', async (_req, res: Response): Promise<void> => {
  try {
    const [propCount] = await db.select({ count: count() }).from(properties);
    const [agentCount] = await db
      .select({ count: count() })
      .from(agents)
      .where(eq(agents.isActive, true));
    const [blogCount] = await db
      .select({ count: count() })
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true));

    res.json({
      properties: Number(propCount.count),
      agents: Number(agentCount.count),
      blog: Number(blogCount.count),
    });
  } catch (err) {
    console.error('Public counts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties', async (req, res: Response): Promise<void> => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '500'))));
    const data = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt))
      .limit(limit);

    const [total] = await db.select({ count: count() }).from(properties);
    res.json({ data, total: Number(total.count) });
  } catch (err) {
    console.error('Public properties error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/properties/:id', async (req, res: Response): Promise<void> => {
  try {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, req.params.id));

    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }

    await db
      .update(properties)
      .set({ viewCount: (property.viewCount ?? 0) + 1 })
      .where(eq(properties.id, req.params.id));

    res.json({ ...property, viewCount: (property.viewCount ?? 0) + 1 });
  } catch (err) {
    console.error('Public property error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/agents', async (_req, res: Response): Promise<void> => {
  try {
    const data = await db
      .select()
      .from(agents)
      .where(eq(agents.isActive, true))
      .orderBy(desc(agents.createdAt));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Public agents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/agents/:id', async (req, res: Response): Promise<void> => {
  try {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, req.params.id), eq(agents.isActive, true)));

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    res.json(agent);
  } catch (err) {
    console.error('Public agent error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blog', async (_req, res: Response): Promise<void> => {
  try {
    const data = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.isPublished, true))
      .orderBy(desc(blogPosts.publishDate));

    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Public blog error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blog/:id', async (req, res: Response): Promise<void> => {
  try {
    const [post] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, req.params.id), eq(blogPosts.isPublished, true)));

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    res.json(post);
  } catch (err) {
    console.error('Public blog post error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
