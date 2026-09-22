export const ERROR_CODES = {
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_REVOKED: 'AUTH_TOKEN_REVOKED',
  FORBIDDEN_PERMISSION: 'FORBIDDEN_PERMISSION',
  FORBIDDEN_MODULE: 'FORBIDDEN_MODULE',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT_DUPLICATE: 'CONFLICT_DUPLICATE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
