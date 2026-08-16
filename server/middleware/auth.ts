import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users, rolePermissions } from '../schema.js';
import {
  PermissionActor,
  effectivePermissions,
  isStaffRole,
  can,
} from '../permissions.js';

dotenv.config();

export interface AuthRequest extends Request {
  user?: PermissionActor;
}

interface TokenPayload {
  id: number;
  tokenVersion?: number;
}

export function signToken(id: number, tokenVersion: number): string {
  return jwt.sign({ id, tokenVersion }, process.env.JWT_SECRET!, { expiresIn: '7d' });
}

/**
 * Role templates change rarely but are read on every request, so keep them in a
 * short-lived cache. `invalidateRoleTemplates()` is called whenever they are edited.
 */
let templateCache: { at: number; map: Map<string, string[]> } | null = null;
const TEMPLATE_TTL_MS = 30_000;

export function invalidateRoleTemplates(): void {
  templateCache = null;
}

async function roleTemplates(): Promise<Map<string, string[]>> {
  if (templateCache && Date.now() - templateCache.at < TEMPLATE_TTL_MS) {
    return templateCache.map;
  }
  const map = new Map<string, string[]>();
  try {
    const rows = await db.select().from(rolePermissions);
    for (const row of rows) map.set(row.role, row.permissions ?? []);
  } catch {
    // Table may not exist yet on a fresh database — fall back to code defaults.
  }
  templateCache = { at: Date.now(), map };
  return map;
}

/**
 * Loads the actor fresh from the database on every request. Costs one indexed
 * primary-key lookup and means a demotion, block or permission change takes
 * effect immediately instead of waiting for the token to expire.
 */
export async function loadActor(id: number): Promise<PermissionActor | null> {
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      scope: users.scope,
      permissions: users.permissions,
      isActive: users.isActive,
      tokenVersion: users.tokenVersion,
    })
    .from(users)
    .where(eq(users.id, id));

  if (!row) return null;

  const templates = await roleTemplates();
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    scope: row.scope === 'own' ? 'own' : 'all',
    permissions: effectivePermissions(row.role, templates.get(row.role), row.permissions),
    isActive: row.isActive,
    tokenVersion: row.tokenVersion,
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const actor = await loadActor(payload.id);

    if (!actor || !actor.isActive) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Tokens issued before a role / password change are refused.
    if (typeof payload.tokenVersion === 'number' && payload.tokenVersion !== actor.tokenVersion) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    req.user = actor;
    next();
  } catch (err) {
    console.error('Auth lookup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/** Any role other than a public member. */
export function requireStaff(req: AuthRequest, res: Response, next: NextFunction): void {
  void requireAuth(req, res, () => {
    if (!isStaffRole(req.user?.role ?? '')) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

export function requirePermission(...keys: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const actor = req.user;
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const missing = keys.filter(key => !can(actor, key));
    if (missing.length) {
      res.status(403).json({ error: 'უფლება არ გაქვთ', missing });
      return;
    }
    next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  void requireAuth(req, res, () => {
    if (req.user?.role !== 'super_admin') {
      res.status(403).json({ error: 'Super admin access required' });
      return;
    }
    next();
  });
}

/** Legacy alias kept so older imports keep working. */
export const requireAdmin = requireStaff;
