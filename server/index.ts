import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import deskRoutes from './routes/desk.js';
import analyticsRoutes from './routes/analytics.js';
import ratesRoutes from './routes/rates.js';
import publicRoutes from './routes/public.js';
import leadRoutes from './routes/leads.js';
import geoRoutes from './routes/geo.js';
import uploadRoutes from './routes/uploads.js';
import { refreshExpiredRentals } from './services/listingLifecycle.js';
import { isPropertySeoPath, listingsHrefFromSearchParams } from '../src/lib/seoListingsUrl.ts';
import {
  buildSitemapXml,
  injectPropertySeo,
  loadPublicProperty,
  loadPublicPropertyUrls,
  parsePropertyId,
  propertyHref,
} from './seoHtml.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    // In production the frontend is served by this same Express process (same origin),
    // so reflect the request origin. In dev, proxy from Vite dev server.
    origin: process.env.NODE_ENV === 'production'
      ? true
      : (process.env.FRONTEND_URL || 'http://localhost:5173'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
// Manager desk sits ahead of the generic admin router so its paths win.
// Both sit under /api/admin, so they have to be mounted before the catch-all router.
app.use('/api/admin/desk', deskRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', leadRoutes);
app.use('/api', publicRoutes);

app.get('/listings', (req, res) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') params.set(key, value);
    else if (Array.isArray(value) && typeof value[0] === 'string') params.set(key, value[0]);
  }
  res.redirect(301, listingsHrefFromSearchParams(params));
});

app.get('/property/:id', async (req, res) => {
  try {
    const property = await loadPublicProperty(String(req.params.id));
    if (!property) {
      res.redirect(302, '/udzravi-qoneba/');
      return;
    }
    res.redirect(301, propertyHref(property));
  } catch (err) {
    console.error('Legacy property redirect error:', err);
    res.redirect(302, '/udzravi-qoneba/');
  }
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const rows = await loadPublicPropertyUrls();
    res.type('application/xml').send(buildSitemapXml(rows.map(row => row.href)));
  } catch (err) {
    console.error('Sitemap error:', err);
    res.status(500).type('text/plain').send('Sitemap unavailable');
  }
});

// Legacy local uploads (pre-Cloudinary). New files go to Cloudinary CDN.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '30d' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  const indexFile = path.join(distPath, 'index.html');
  app.use(express.static(distPath, { index: false }));
  app.use(async (req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const listingId = parsePropertyId(req.path);
    if (listingId && (req.method === 'GET' || req.method === 'HEAD')) {
      try {
        const property = await loadPublicProperty(listingId);
        if (!property) {
          res.redirect(302, '/udzravi-qoneba/');
          return;
        }
        const canonical = propertyHref(property);
        const current = req.path.endsWith('/') ? req.path : `${req.path}/`;
        if (isPropertySeoPath(req.path) && current !== canonical) {
          res.redirect(301, canonical);
          return;
        }
        const html = await fs.readFile(indexFile, 'utf8');
        res.type('html').send(injectPropertySeo(html, property));
        return;
      } catch (err) {
        console.error('Property HTML render error:', err);
      }
    }

    res.sendFile(indexFile);
  });
}

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   DB: Neon PostgreSQL`);

  // Rentals whose term ran out become call-back reminders, checked hourly.
  refreshExpiredRentals(true);
  setInterval(() => refreshExpiredRentals(true), 60 * 60 * 1000).unref();
});
