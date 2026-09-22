import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AuthUserRecord, IAuthRepository } from './auth.repository';

const userInclude = {
  org: true,
  role: { include: { perms: { include: { permission: true } } } },
} as const;

@Injectable()
export class AuthPrismaRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUsersByEmail(email: string, orgId?: string): Promise<AuthUserRecord[]> {
    return this.prisma.user.findMany({
      where: {
        email,
        deletedAt: null,
        ...(orgId ? { orgId } : {}),
      },
      include: userInclude,
    });
  }

  listActiveSessions(userId: string, now: Date) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async revokeSessions(ids: string[], at: Date): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await this.prisma.session.updateMany({
      where: { id: { in: ids } },
      data: { revokedAt: at },
    });
  }

  async createSession(data: {
    id: string;
    userId: string;
    orgId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.session.create({ data });
  }

  async setLastLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLogin: at },
    });
  }

  async revokeSession(id: string, at: Date): Promise<{ already: boolean }> {
    const row = await this.prisma.session.findUnique({ where: { id } });
    if (!row || row.revokedAt) {
      return { already: true };
    }
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: at },
    });
    return { already: false };
  }
}
