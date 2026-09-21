import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ITokenSigner, TOKEN_SIGNER } from '../ports/token-signer.port';
import { IClock, CLOCK } from '../ports/clock.port';
import { AppError, ERROR_CODES } from './error-codes';
import { AuthRequest, PUBLIC_PATHS } from './auth-request';

@Injectable()
export class TokenMiddleware implements NestMiddleware {
  constructor(
    @Inject(TOKEN_SIGNER) private readonly signer: ITokenSigner,
    private readonly prisma: PrismaService,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  async use(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
    const raw = (req.originalUrl ?? `${req.baseUrl}${req.path}`).split('?')[0];
    const path = raw.replace(/\/$/, '') || '/';
    if (PUBLIC_PATHS.has(path) || req.method === 'OPTIONS') {
      next();
      return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Missing bearer token', 401);
    }
    const token = header.slice(7);
    const claims = this.signer.verify(token);
    const session = await this.prisma.session.findUnique({
      where: { id: claims.jti },
      include: { user: true },
    });
    if (!session) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Session not found', 401);
    }
    if (session.revokedAt) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_REVOKED, 'Session revoked', 401);
    }
    if (session.expiresAt <= this.clock.now()) {
      throw new AppError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Session expired', 401);
    }
    if (session.user.deletedAt) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'User is not active', 401);
    }
    req.auth = claims;
    next();
  }
}
