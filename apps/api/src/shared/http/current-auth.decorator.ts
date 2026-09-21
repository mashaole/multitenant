import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TokenClaims } from '../ports/token-signer.port';
import { AuthRequest } from './auth-request';
import { AppError, ERROR_CODES } from './error-codes';

export const CurrentAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenClaims => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!req.auth) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Not authenticated', 401);
    }
    return req.auth;
  },
);
