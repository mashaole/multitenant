import {
  consumeWindow,
  pruneExpired,
  readRateLimitConfig,
} from './rate-limit';

describe('rate-limit window', () => {
  it('allows up to the limit then rejects', () => {
    const store = new Map();
    const now = 1_000;
    expect(consumeWindow(store, 'a', now, 60_000, 2).allowed).toBe(true);
    expect(consumeWindow(store, 'a', now + 1, 60_000, 2).allowed).toBe(true);
    const blocked = consumeWindow(store, 'a', now + 2, 60_000, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the window', () => {
    const store = new Map();
    consumeWindow(store, 'a', 0, 1_000, 1);
    expect(consumeWindow(store, 'a', 999, 1_000, 1).allowed).toBe(false);
    expect(consumeWindow(store, 'a', 1_000, 1_000, 1).allowed).toBe(true);
  });

  it('isolates keys in O(1)', () => {
    const store = new Map();
    consumeWindow(store, 'a', 0, 1_000, 1);
    expect(consumeWindow(store, 'b', 0, 1_000, 1).allowed).toBe(true);
  });

  it('prunes expired windows', () => {
    const store = new Map();
    consumeWindow(store, 'old', 0, 10, 1);
    consumeWindow(store, 'live', 20, 100, 1);
    pruneExpired(store, 20);
    expect(store.has('old')).toBe(false);
    expect(store.has('live')).toBe(true);
  });

  it('reads env with safe defaults', () => {
    expect(readRateLimitConfig({})).toEqual({
      ttlMs: 60_000,
      limit: 100,
      loginLimit: 10,
    });
    expect(
      readRateLimitConfig({
        THROTTLE_TTL_MS: 'bogus',
        THROTTLE_LIMIT: '-1',
        THROTTLE_LOGIN_LIMIT: '5',
      }),
    ).toEqual({ ttlMs: 60_000, limit: 100, loginLimit: 5 });
  });
});
