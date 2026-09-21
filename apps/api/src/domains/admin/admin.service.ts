import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { assertPermissionSubset, canManageTenants } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { CLOCK, IClock } from '../../shared/ports/clock.port';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  listOrgs() {
    return this.prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: { orgModules: { include: { module: true } } },
    });
  }

  async createOrg(auth: TokenClaims, name: string, maxSessionsPerUser = 1) {
    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name, maxSessionsPerUser },
      });
      const modules = await tx.module.findMany();
      await tx.orgModule.createMany({
        data: modules.map((m) => ({ orgId: created.id, moduleId: m.id })),
      });
      return created;
    });
    this.activity.emit({
      orgId: org.id,
      userId: auth.sub,
      group: 'admin',
      action: 'org.created',
      metadata: { entityType: 'organization', entityId: org.id, name: org.name },
    });
    return org;
  }

  async putModules(auth: TokenClaims, orgId: string, moduleKeys: string[]) {
    const modules = await this.prisma.module.findMany({
      where: { key: { in: moduleKeys } },
    });
    const existing = await this.prisma.orgModule.findMany({
      where: { orgId },
      include: { module: true },
    });
    const next = new Set(modules.map((m) => m.id));
    const prev = new Set(existing.map((e) => e.moduleId));
    const same =
      next.size === prev.size && [...next].every((id) => prev.has(id));
    if (same) {
      return { ok: true, unchanged: true };
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.orgModule.deleteMany({ where: { orgId } });
      if (modules.length > 0) {
        await tx.orgModule.createMany({
          data: modules.map((m) => ({ orgId, moduleId: m.id })),
        });
      }
    });
    this.activity.emit({
      orgId,
      userId: auth.sub,
      group: 'admin',
      action: 'module.granted',
      metadata: { entityType: 'organization', entityId: orgId, name: moduleKeys.join(',') },
    });
    return { ok: true, unchanged: false };
  }

  async patchSettings(auth: TokenClaims, orgId: string, maxSessionsPerUser: number) {
    if (!canManageTenants(auth.permissions) && auth.orgId !== orgId) {
      throw new AppError(ERROR_CODES.FORBIDDEN_PERMISSION, 'You can only update your own organization', 403);
    }
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Organization not found', 404);
    }
    if (org.maxSessionsPerUser === maxSessionsPerUser) {
      return org;
    }
    const now = this.clock.now();
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.organization.update({
        where: { id: orgId },
        data: { maxSessionsPerUser },
      });
      const users = await tx.user.findMany({
        where: { orgId, deletedAt: null },
        select: { id: true },
      });
      for (const user of users) {
        const sessions = await tx.session.findMany({
          where: { userId: user.id, revokedAt: null, expiresAt: { gt: now } },
          orderBy: { createdAt: 'asc' },
        });
        const extra = sessions.length - maxSessionsPerUser;
        if (extra > 0) {
          await tx.session.updateMany({
            where: { id: { in: sessions.slice(0, extra).map((s) => s.id) } },
            data: { revokedAt: now },
          });
        }
      }
      return next;
    });
    this.activity.emit({
      orgId,
      userId: auth.sub,
      group: 'admin',
      action: 'org.settings',
      metadata: { entityType: 'organization', entityId: orgId, name: String(maxSessionsPerUser) },
    });
    return updated;
  }

  async createUser(
    auth: TokenClaims,
    input: { name: string; email: string; roleId: string; orgId?: string },
  ) {
    const orgId = input.orgId ?? auth.orgId;
    if (!canManageTenants(auth.permissions) && orgId !== auth.orgId) {
      throw new AppError(ERROR_CODES.FORBIDDEN_PERMISSION, 'You can only add users to your organization', 403);
    }
    const role = await this.prisma.role.findUnique({
      where: { id: input.roleId },
      include: { perms: { include: { permission: true } } },
    });
    if (!role) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Role not found', 404);
    }
    const keys = role.perms.map((p) => p.permission.key);
    if (!assertPermissionSubset(auth.permissions, keys)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN_PERMISSION,
        'You cannot assign a role with permissions you do not have',
        403,
      );
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          orgId,
          roleId: input.roleId,
          name: input.name,
          email: input.email,
          updatedBy: auth.sub,
        },
      });
      this.activity.emit({
        orgId,
        userId: auth.sub,
        group: 'admin',
        action: 'user.created',
        metadata: { entityType: 'user', entityId: user.id, name: user.name },
      });
      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(ERROR_CODES.CONFLICT_DUPLICATE, 'Email already in use', 409);
      }
      throw err;
    }
  }

  async softDeleteUser(auth: TokenClaims, userId: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
    }
    if (!canManageTenants(auth.permissions) && existing.orgId !== auth.orgId) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
    }
    if (existing.deletedAt) {
      return { ok: true, unchanged: true };
    }
    const now = this.clock.now();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: now, updatedBy: auth.sub },
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
    this.activity.emit({
      orgId: existing.orgId,
      userId: auth.sub,
      group: 'admin',
      action: 'user.deleted',
      metadata: { entityType: 'user', entityId: userId, name: existing.name },
    });
    return { ok: true, unchanged: false };
  }

  listUsers(auth: TokenClaims) {
    const where = canManageTenants(auth.permissions)
      ? { deletedAt: null }
      : { deletedAt: null, orgId: auth.orgId };
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        lastLogin: true,
        createdAt: true,
        org: { select: { id: true, name: true } },
        role: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
