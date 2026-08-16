/**
 * Public lead intake. Deliberately the only unauthenticated write endpoint in the
 * app, so it is rate limited, size capped and protected by a honeypot field.
 */
import { Router, Request, Response } from 'express';
import { createLead, isLeadKind, type LeadKind } from '../services/leads.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const MAX_MESSAGE = 4000;

function str(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function parsePreferred(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // A viewing request in the past is either a mistake or a bot.
  if (date.getTime() < Date.now() - 60 * 60 * 1000) return null;
  return date;
}

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
const looksLikePhone = (value: string) => /^[+()\d\s-]{6,}$/.test(value);

router.post(
  '/leads',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 8, key: 'leads' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Hidden input no human ever fills in.
      if (str(req.body?.company, 100)) {
        res.status(202).json({ ok: true });
        return;
      }

      const kind: LeadKind = isLeadKind(req.body?.kind) ? req.body.kind : 'contact';
      const name = str(req.body?.name, 200);
      const phone = str(req.body?.phone, 50);
      const email = str(req.body?.email, 255);
      const message = str(req.body?.message, MAX_MESSAGE);

      if (email && !looksLikeEmail(email)) {
        res.status(400).json({ error: 'ელფოსტა არასწორია' });
        return;
      }
      if (phone && !looksLikePhone(phone)) {
        res.status(400).json({ error: 'ტელეფონის ნომერი არასწორია' });
        return;
      }

      // A newsletter signup is just an address; everything else needs a way to reply.
      if (kind === 'newsletter') {
        if (!email) {
          res.status(400).json({ error: 'ელფოსტა სავალდებულოა' });
          return;
        }
      } else if (!phone && !email) {
        res.status(400).json({ error: 'მიუთითეთ ტელეფონი ან ელფოსტა' });
        return;
      }

      const id = await createLead({
        kind,
        name,
        phone,
        email,
        subject: str(req.body?.subject, 300),
        message,
        propertyId: str(req.body?.propertyId, 50),
        preferredAt: parsePreferred(req.body?.preferredAt),
        sourceUrl: str(req.body?.sourceUrl, 600),
        locale: str(req.body?.locale, 10),
      });

      res.status(201).json({ ok: true, id });
    } catch (err) {
      console.error('Lead intake error:', err);
      res.status(500).json({ error: 'შეტყობინება ვერ გაიგზავნა' });
    }
  },
);

export default router;
