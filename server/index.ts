import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import deskRoutes from './routes/desk.js';
import ratesRoutes from './routes/rates.js';
import publicRoutes from './routes/public.js';
import geoRoutes from './routes/geo.js';
import uploadRoutes from './routes/uploads.js';
import { refreshExpiredRentals } from './services/listingLifecycle.js';

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
app.use('/api/admin/desk', deskRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rates', ratesRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', publicRoutes);

// Legacy local uploads (pre-Cloudinary). New files go to Cloudinary CDN.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), { maxAge: '30d' }));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  // SPA fallback — app.use (no path) is Express 5 compatible; app.get('*') is not
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
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
