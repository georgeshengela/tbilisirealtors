import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db.js';
import { users, passwordResetTokens } from '../schema.js';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { requireAuth, AuthRequest, signToken, loadActor } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { buildDisplayName, toAdminSession, profileFieldsFromBody } from '../utils/adminProfile.js';
import { isStaffRole } from '../permissions.js';

const router = Router();

const PROFILE_SELECT = {
  id: users.id,
  email: users.email,
  name: users.name,
  firstName: users.firstName,
  lastName: users.lastName,
  dateOfBirth: users.dateOfBirth,
  phone: users.phone,
  avatarUrl: users.avatarUrl,
  jobTitle: users.jobTitle,
  bio: users.bio,
  showOnFrontend: users.showOnFrontend,
  role: users.role,
  scope: users.scope,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

/** Session payload with the effective permission set attached. */
async function sessionFor(id: number) {
  const [row] = await db.select(PROFILE_SELECT).from(users).where(eq(users.id, id));
  if (!row) return null;
  const actor = await loadActor(id);
  return toAdminSession(row, {
    permissions: actor?.permissions ?? [],
    scope: actor?.scope,
  });
}

router.post(
  '/login',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, key: 'login' }),
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    try {
      const [user] = await db
        .select({
          id: users.id,
          isActive: users.isActive,
          passwordHash: users.passwordHash,
          tokenVersion: users.tokenVersion,
        })
        .from(users)
        .where(eq(users.email, String(email).toLowerCase().trim()));

      if (!user || !user.isActive) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

      const session = await sessionFor(user.id);
      const token = signToken(user.id, user.tokenVersion);

      res.json({ token, user: session });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

/** Public sign-up — always creates a plain member, never staff. */
router.post(
  '/register',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: 'register' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      const password = typeof req.body.password === 'string' ? req.body.password : '';
      const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : '';

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'შეიყვანეთ სწორი Email' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' });
        return;
      }
      if (!rawName) {
        res.status(400).json({ error: 'სახელი სავალდებულოა' });
        return;
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      if (existing) {
        res.status(409).json({ error: 'ეს Email უკვე რეგისტრირებულია' });
        return;
      }

      const parts = rawName.split(/\s+/).filter(Boolean);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ');
      const passwordHash = await bcrypt.hash(password, 12);

      const [created] = await db
        .insert(users)
        .values({
          email,
          name: buildDisplayName(firstName, lastName, rawName),
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          passwordHash,
          role: 'user',
          scope: 'own',
          isActive: true,
          showOnFrontend: false,
        })
        .returning({ id: users.id, tokenVersion: users.tokenVersion });

      const session = await sessionFor(created.id);
      const token = signToken(created.id, created.tokenVersion);

      res.status(201).json({ token, user: session });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        res.status(409).json({ error: 'ეს Email უკვე რეგისტრირებულია' });
        return;
      }
      console.error('Register error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const session = await sessionFor(req.user!.id);
    if (!session) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(session);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** Self-service profile edit — name, surname, DOB, avatar, frontend visibility, password. */
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [existing] = await db
      .select(PROFILE_SELECT)
      .from(users)
      .where(eq(users.id, req.user!.id));

    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updates: Record<string, unknown> = {
      ...profileFieldsFromBody(req.body, existing.name),
      updatedAt: new Date(),
    };

    // Members never appear on the public team page.
    if (!isStaffRole(existing.role)) delete updates.showOnFrontend;

    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' });
        return;
      }
      updates.passwordHash = await bcrypt.hash(password, 12);
    }

    // Recompute display name if only one of the name parts was sent.
    if ('firstName' in updates || 'lastName' in updates) {
      updates.name = buildDisplayName(
        (updates.firstName as string | null) ?? existing.firstName,
        (updates.lastName as string | null) ?? existing.lastName,
        existing.name,
      );
    }

    await db.update(users).set(updates).where(eq(users.id, req.user!.id));

    res.json(await sessionFor(req.user!.id));
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Password reset. The response never reveals whether the address exists.
 * There is no mailer wired up yet, so in development the token comes back in
 * the body; in production it is only logged for the operator to forward.
 */
router.post(
  '/forgot-password',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, key: 'forgot' }),
  async (req: Request, res: Response): Promise<void> => {
    const generic = { success: true, message: 'თუ ასეთი Email არსებობს, ბმულს გამოგიგზავნით' };
    try {
      const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
      if (!email) {
        res.json(generic);
        return;
      }

      const [user] = await db
        .select({ id: users.id, isActive: users.isActive })
        .from(users)
        .where(eq(users.email, email));

      if (!user || !user.isActive) {
        res.json(generic);
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      await db.insert(passwordResetTokens).values({
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      console.log(`[password-reset] token for ${email}: ${token}`);

      res.json(
        process.env.NODE_ENV === 'production' ? generic : { ...generic, devToken: token },
      );
    } catch (err) {
      console.error('Forgot password error:', err);
      res.json(generic);
    }
  },
);

router.post(
  '/reset-password',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: 'reset' }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
      const password = typeof req.body.password === 'string' ? req.body.password : '';

      if (password.length < 6) {
        res.status(400).json({ error: 'პაროლი მინიმუმ 6 სიმბოლო უნდა იყოს' });
        return;
      }

      const [row] = await db
        .select()
        .from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ));

      if (!row) {
        res.status(400).json({ error: 'ბმული არასწორია ან ვადა გაუვიდა' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      await db
        .update(users)
        .set({
          passwordHash,
          // Invalidates every session that was open with the old password.
          tokenVersion: sql`${users.tokenVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));

      await db
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.token, token));

      res.json({ success: true });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

export default router;
