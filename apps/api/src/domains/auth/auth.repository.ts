import { Prisma } from '@prisma/client';

export const AUTH_REPOSITORY = Symbol('AUTH_REPOSITORY');

export interface AuthUserRecord {
  id: string;
  orgId: string;
  roleId: string;
  name: string;
  email: string;
  passwordHash: string;
  deletedAt: Date | null;
  org: { id: string; name: string; maxSessionsPerUser: number };
  role: { id: string; name: string; perms: Array<{ permission: { key: string } }> };
}

export interface IAuthRepository {
  findActiveUsersByEmail(
    email: string,
    orgId?: string,
  ): Promise<AuthUserRecord[]>;
  listActiveSessions(userId: string, now: Date): Promise<Array<{ id: string; createdAt: Date }>>;
  revokeSessions(ids: string[], at: Date): Promise<void>;
  createSession(data: {
    id: string;
    userId: string;
    orgId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  setLastLogin(userId: string, at: Date): Promise<void>;
  revokeSession(id: string, at: Date): Promise<{ already: boolean }>;
}

export type AuthTx = Prisma.TransactionClient;
