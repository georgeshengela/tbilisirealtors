import { Request, Response, NextFunction } from 'express';

/**
 * Small in-process limiter for the credential endpoints. Enough to stop
 * password guessing and registration floods from a single address without
 * pulling in another dependency.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Drop expired buckets occasionally so the map cannot grow without bound.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit(options: { windowMs: number; max: number; key?: string }) {
  const { windowMs, max, key = 'default' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${key}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ error: 'ძალიან ბევრი მცდელობა. სცადეთ მოგვიანებით.' });
      return;
    }

    next();
  };
}
