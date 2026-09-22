export interface RateLimitWindow {
  resetAt: number;
  count: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  ttlMs: number;
  limit: number;
  loginLimit: number;
}

function positiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.floor(n);
}

export function readRateLimitConfig(
  env: NodeJS.ProcessEnv = process.env,
): RateLimitConfig {
  return {
    ttlMs: positiveInt(env.THROTTLE_TTL_MS, 60_000),
    limit: positiveInt(env.THROTTLE_LIMIT, 100),
    loginLimit: positiveInt(env.THROTTLE_LOGIN_LIMIT, 10),
  };
}

/**
 * Fixed-window counter. Time O(1), space O(1) per key.
 */
export function consumeWindow(
  store: Map<string, RateLimitWindow>,
  key: string,
  now: number,
  ttlMs: number,
  limit: number,
): RateLimitResult {
  const current = store.get(key);
  if (!current || now >= current.resetAt) {
    store.set(key, { resetAt: now + ttlMs, count: 1 });
    return {
      allowed: true,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  }
  current.count += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((current.resetAt - now) / 1000),
  );
  if (current.count > limit) {
    return { allowed: false, retryAfterSeconds };
  }
  return { allowed: true, retryAfterSeconds };
}

export function pruneExpired(
  store: Map<string, RateLimitWindow>,
  now: number,
): void {
  for (const [key, window] of store) {
    if (now >= window.resetAt) {
      store.delete(key);
    }
  }
}
