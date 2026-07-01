import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Dependency-free, in-memory rate limiter (fixed window per client IP).
 *
 * Intentionally avoids extra dependencies. Suitable for a single-instance
 * deployment; for multi-instance setups back this with a shared store (Redis).
 */
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface Counter {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;
  const hits = new Map<string, Counter>();

  // Periodically evict expired entries so the map doesn't grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    hits.forEach((counter, key) => {
      if (counter.resetAt <= now) {
        hits.delete(key);
      }
    });
  }, windowMs);
  // Don't keep the event loop alive just for the sweeper.
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let counter = hits.get(key);

    if (!counter || counter.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      hits.set(key, counter);
    }

    counter.count += 1;

    const remaining = Math.max(0, max - counter.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((counter.resetAt - now) / 1000)));

    if (counter.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((counter.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

/**
 * Dependency-free CORS middleware.
 *
 * If ALLOWED_ORIGINS is set (comma-separated), only those origins are allowed.
 * Otherwise all origins are reflected (sensible default for a public, free tool).
 */
export function cors(): RequestHandler {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const allowAll = configured.length === 0;

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && (allowAll || configured.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    } else if (allowAll && !origin) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    next();
  };
}
