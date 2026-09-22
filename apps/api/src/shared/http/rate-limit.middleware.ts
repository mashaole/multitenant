import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { AppError, ERROR_CODES } from './error-codes';
import {
  consumeWindow,
  pruneExpired,
  RateLimitConfig,
  RateLimitWindow,
  readRateLimitConfig,
} from './rate-limit';

const PRUNE_EVERY = 256;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store = new Map<string, RateLimitWindow>();
  private readonly config: RateLimitConfig;
  private hits = 0;

  constructor() {
    this.config = readRateLimitConfig();
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }
    this.hits += 1;
    if (this.hits % PRUNE_EVERY === 0) {
      pruneExpired(this.store, Date.now());
    }
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const global = consumeWindow(
      this.store,
      `g:${ip}`,
      now,
      this.config.ttlMs,
      this.config.limit,
    );
    if (!global.allowed) {
      this.reject(res, global.retryAfterSeconds);
    }
    if (this.isLogin(req)) {
      const login = consumeWindow(
        this.store,
        `l:${ip}`,
        now,
        this.config.ttlMs,
        this.config.loginLimit,
      );
      if (!login.allowed) {
        this.reject(res, login.retryAfterSeconds);
      }
    }
    next();
  }

  private isLogin(req: Request): boolean {
    const raw = (req.originalUrl ?? `${req.baseUrl}${req.path}`).split('?')[0];
    const path = raw.replace(/\/$/, '') || '/';
    return req.method === 'POST' && path === '/auth/login';
  }

  private reject(res: Response, retryAfterSeconds: number): never {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    throw new AppError(
      ERROR_CODES.RATE_LIMITED,
      'Too many requests',
      429,
    );
  }
}
