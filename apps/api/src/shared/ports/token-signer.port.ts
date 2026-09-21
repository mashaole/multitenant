export const TOKEN_SIGNER = Symbol('TOKEN_SIGNER');

export interface TokenClaims {
  sub: string;
  orgId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  jti: string;
}

export interface ITokenSigner {
  sign(claims: TokenClaims, expiresAt: Date): string;
  verify(token: string): TokenClaims & { exp: number };
}
