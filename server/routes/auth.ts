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
import { EMAIL_RE, MIN_PASSWORD, deleteMemberAccount } from '../services/memberAccount.js';

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
          blockedReason: users.blockedReason,
          passwordHash: users.passwordHash,
          tokenVersion: users.tokenVersion,
        })
        .from(users)
        .where(eq(users.email, String(email).toLowerCase().trim()));

      const valid = user ? await bcrypt.compare(String(password), user.passwordHash) : false;
      if (!user || !valid) {
        res.status(401).json({ error: 'Email ან პაროლი არასწორია' });
        return;
      }

      // Only told after the password matched, so a block never confirms an address exists.
      if (!user.isActive) {
        res.status(403).json({
          error: 'ანგარიში დაბლოკილია',
          blocked: true,
          reason: user.blockedReason ?? null,
        });
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
      const phone = typeof req.body.phone === 'string' ? req.body.phone.trim().slice(0, 50) : '';
      // Older clients send one `name`; the form now sends the two parts.
      const legacy = typeof req.body.name === 'string' ? req.body.name.trim().split(/\s+/).filter(Boolean) : [];
      const firstName = (typeof req.body.firstName === 'string' ? req.body.firstName.trim() : legacy[0] ?? '').slice(0, 120);
      const lastName = (typeof req.body.lastName === 'string' ? req.body.lastName.trim() : legacy.slice(1).join(' ')).slice(0, 120);

      if (!firstName) {
        res.status(400).json({ error: 'სახელი სავალდებულოა', field: 'firstName' });
        return;
      }
      if (!email || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: 'შეიყვანეთ სწორი Email', field: 'email' });
        return;
      }
      if (password.length < MIN_PASSWORD) {
        res.status(400).json({ error: `პაროლი მინიმუმ ${MIN_PASSWORD} სიმბოლო უნდა იყოს`, field: 'password' });
        return;
      }

      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      if (existing) {
        res.status(409).json({ error: 'ეს Email უკვე რეგისტრირებულია', field: 'email' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const [created] = await db
        .insert(users)
        .values({
          email,
          name: buildDisplayName(firstName, lastName, email),
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
          passwordHash,
          role: 'user',
          lastLoginAt: new Date(),
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

    const member = !isStaffRole(existing.role);
    // Members never appear on the public team page, and have no job title or bio.
    if (member) {
      delete updates.showOnFrontend;
      delete updates.jobTitle;
      delete updates.bio;
    }

    const password = typeof req.body.password === 'string' ? req.body.password.trim() : '';
    let newToken: string | null = null;
    if (password) {
      const minimum = member ? MIN_PASSWORD : 6;
      if (password.length < minimum) {
        res.status(400).json({ error: `პაროლი მინიმუმ ${minimum} სიმბოლო უნდა იყოს`, field: 'password' });
        return;
      }
      // Members confirm the old password; a stolen open tab is not enough to take the account.
      if (member) {
        const [row] = await db
          .select({ passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.id, req.user!.id));
        const current = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
        if (!row || !current || !(await bcrypt.compare(current, row.passwordHash))) {
          res.status(400).json({ error: 'მიმდინარე პაროლი არასწორია', field: 'currentPassword' });
          return;
        }
        // Signs out every other device; this one gets a fresh token below.
        updates.tokenVersion = sql`${users.tokenVersion} + 1`;
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

    const [saved] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user!.id))
      .returning({ tokenVersion: users.tokenVersion });
    if (updates.tokenVersion) newToken = signToken(req.user!.id, saved.tokenVersion);

    const session = await sessionFor(req.user!.id);
    // Staff clients read the session at the top level, so the token rides alongside it.
    res.json(newToken ? { ...session, token: newToken } : session);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/** A member closes their own account. Staff accounts are removed from the admin panel only. */
router.delete(
  '/account',
  requireAuth,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: 'close-account' }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (isStaffRole(req.user!.role)) {
        res.status(403).json({ error: 'თანამშრომლის ანგარიში მხოლოდ ადმინისტრატორი შლის' });
        return;
      }
      const [row] = await db
        .select({ passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.id, req.user!.id));
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!row || !password || !(await bcrypt.compare(password, row.passwordHash))) {
        res.status(400).json({ error: 'პაროლი არასწორია', field: 'password' });
        return;
      }
      await deleteMemberAccount(req.user!.id);
      res.json({ success: true });
    } catch (err) {
      console.error('Close account error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  },
);

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

      if (password.length < MIN_PASSWORD) {
        res.status(400).json({ error: `პაროლი მინიმუმ ${MIN_PASSWORD} სიმბოლო უნდა იყოს` });
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
