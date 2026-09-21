import { Injectable } from '@nestjs/common';
import { sign, verify, JwtPayload } from 'jsonwebtoken';
import { AppError, ERROR_CODES } from '../http/error-codes';
import { ITokenSigner, TokenClaims } from '../ports/token-signer.port';

@Injectable()
export class JwtTokenSignerAdapter implements ITokenSigner {
  private readonly secret = process.env.JWT_SECRET ?? 'local-dev-only-change-me';

  sign(claims: TokenClaims, expiresAt: Date): string {
    const exp = Math.floor(expiresAt.getTime() / 1000);
    return sign({ ...claims, exp }, this.secret, { algorithm: 'HS256' });
  }

  verify(token: string): TokenClaims & { exp: number } {
    try {
      const payload = verify(token, this.secret, {
        algorithms: ['HS256'],
      }) as JwtPayload & TokenClaims;
      if (!payload.sub || !payload.jti || !payload.orgId) {
        throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid token', 401);
      }
      return {
        sub: payload.sub,
        orgId: payload.orgId,
        roleId: payload.roleId,
        roleName: payload.roleName,
        permissions: payload.permissions ?? [],
        jti: payload.jti,
        exp: payload.exp ?? 0,
      };
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      const name = (err as { name?: string }).name;
      if (name === 'TokenExpiredError') {
        throw new AppError(ERROR_CODES.AUTH_TOKEN_EXPIRED, 'Token expired', 401);
      }
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Invalid token', 401);
    }
  }
}
