import { Request } from 'express';
import { TokenClaims } from '../ports/token-signer.port';

export interface AuthRequest extends Request {
  auth?: TokenClaims;
}

export const PUBLIC_PATHS = new Set([
  '/auth/login',
  '/health',
]);
