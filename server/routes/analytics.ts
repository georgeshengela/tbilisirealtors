/**
 * Analytics API — the three reports a manager actually opens:
 *
 *   /inventory    inventory by district and status, sale vs rent, age of listing
 *   /leaderboard  views, new listings and attention items cleared, period over period
 *   /imports      failed and partial imports from myhome.ge / ss.ge
 *
 * Reads live in services/analytics and services/importQuality; this file owns
 * validation, permission gating and scope.
 */
import { Router, Response } from 'express';
import { requireStaff, requirePermission, AuthRequest } from '../middleware/auth.js';
import { can, type PermissionActor } from '../permissions.js';
import {
  isLeaderboardPeriod,
  inventoryReport,
  leaderboardReport,
  type DealFilter,
  type LeaderboardPeriod,
} from '../services/analytics.js';
import { marketPricesReport } from '../services/marketPrices.js';
import { externalMarketReport } from '../services/externalMarket.js';
import { importAttempt, importQualityReport } from '../services/importQuality.js';
import { runImport } from './admin.js';

const router = Router();

router.use(requireStaff);

/** Brokers only ever see their own numbers, whatever report they open. */
function scopeUserId(actor: PermissionActor): number | null {
  return actor.scope === 'own' ? actor.id : null;
}

function dealFilter(value: unknown): DealFilter {
  return value === 'rent' ? 'rent' : 'sale';
}

function period(value: unknown): LeaderboardPeriod {
  return isLeaderboardPeriod(value) ? value : 'week';
}

/* ── District / status funnel ────────────────────────────────────────────── */

router.get('/inventory', requirePermission('analytics.full'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' && req.query.city.trim()
      ? req.query.city.trim()
      : undefined;

    const report = await inventoryReport({
      city,
      deal: dealFilter(req.query.deal),
      ownerUserId: scopeUserId(req.user!),
    });

    res.json(report);
  } catch (err) {
    console.error('Inventory report error:', err);
    res.status(500).json({ error: 'ანგარიშის აგება ვერ მოხერხდა' });
  }
});

/* ── Broker leaderboard ─────────────────────────────────────────────────── */

router.get('/leaderboard', requirePermission('analytics.full'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const report = await leaderboardReport(period(req.query.period), scopeUserId(req.user!));
    res.json(report);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'ანგარიშის აგება ვერ მოხერხდა' });
  }
});

/* ── Market prices (ფასები) ─────────────────────────────────────────────── */

router.get('/market-prices', requirePermission('analytics.full'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const city = typeof req.query.city === 'string' && req.query.city.trim()
      ? req.query.city.trim()
      : undefined;

    const report = await marketPricesReport({
      city,
      deal: dealFilter(req.query.deal),
    });

    res.json(report);
  } catch (err) {
    console.error('Market prices report error:', err);
    res.status(500).json({ error: 'ბაზრის ფასების ანგარიში ვერ მოიძებნა' });
  }
});

/**
 * Market-wide benchmark scraped from MyGE.ge. Kept on its own endpoint so a slow or
 * failing third party never delays the main prices dashboard.
 */
router.get('/external-market', requirePermission('analytics.full'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json(await externalMarketReport(req.query.refresh === '1'));
  } catch (err) {
    console.error('External market report error:', err);
    res.status(502).json({ error: 'გარე ბაზრის მონაცემები ვერ ჩამოიტვირთა' });
  }
});

/* ── Import quality ─────────────────────────────────────────────────────── */

router.get('/imports', requirePermission('analytics.imports'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = Number(req.query.days);
    const report = await importQualityReport({
      days: Number.isFinite(days) && days > 0 ? Math.floor(days) : 30,
      source: typeof req.query.source === 'string' && req.query.source ? req.query.source : undefined,
      status: typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined,
    });

    res.json({ ...report, canRetry: can(req.user, 'listings.import') });
  } catch (err) {
    console.error('Import report error:', err);
    res.status(500).json({ error: 'ანგარიშის აგება ვერ მოხერხდა' });
  }
});

/**
 * Re-runs a recorded attempt against the same URL. The retry is written down as its
 * own row linked back to the original, so a source that recovered on its own shows
 * up as such instead of silently disappearing from the failure list.
 */
router.post(
  '/imports/:id/retry',
  requirePermission('analytics.imports', 'listings.import'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'არასწორი id' });
      return;
    }

    const attempt = await importAttempt(id);
    if (!attempt?.sourceUrl) {
      res.status(404).json({ error: 'ჩანაწერი ვერ მოიძებნა' });
      return;
    }

    await runImport(req, res, attempt.sourceUrl, id);
  },
);

export default router;
