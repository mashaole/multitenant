import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppPrismaService, PrismaService } from '../../shared/prisma/prisma.service';
import { TenantTx, withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import {
  assertPermissionSubset,
  canManageTenants,
  isOrgReader,
} from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { CLOCK, IClock } from '../../shared/ports/clock.port';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appPrisma: AppPrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
    @Inject(CLOCK) private readonly clock: IClock,
  ) {}

  private tenantWork<T>(
    auth: TokenClaims,
    fn: (tx: TenantTx) => Promise<T>,
  ): Promise<T> {
    return withTenant(
      this.appPrisma,
      {
        orgId: auth.orgId,
        userId: auth.sub,
        isOrgReader: isOrgReader(auth.permissions),
      },
      fn,
    );
  }

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
    const run = async (tx: TenantTx | PrismaService) => {
      const org = await tx.organization.findUnique({ where: { id: orgId } });
      if (!org) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Organization not found', 404);
      }
      if (org.maxSessionsPerUser === maxSessionsPerUser) {
        return { unchanged: true as const, org };
      }
      const now = this.clock.now();
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
      return { unchanged: false as const, org: next };
    };
    const result = canManageTenants(auth.permissions)
      ? await this.prisma.$transaction((tx) => run(tx))
      : await this.tenantWork(auth, (tx) => run(tx));
    if (!result.unchanged) {
      this.activity.emit({
        orgId,
        userId: auth.sub,
        group: 'admin',
        action: 'org.settings',
        metadata: {
          entityType: 'organization',
          entityId: orgId,
          name: String(maxSessionsPerUser),
        },
      });
    }
    return result.org;
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
    if (
      !canManageTenants(auth.permissions) &&
      role.orgId &&
      role.orgId !== auth.orgId
    ) {
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
    const data = {
      orgId,
      roleId: input.roleId,
      name: input.name,
      email: input.email,
      updatedBy: auth.sub,
    };
    try {
      const user = canManageTenants(auth.permissions)
        ? await this.prisma.user.create({ data })
        : await this.tenantWork(auth, (tx) => tx.user.create({ data }));
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
    const run = async (tx: TenantTx | PrismaService) => {
      const existing = await tx.user.findUnique({ where: { id: userId } });
      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'User not found', 404);
      }
      if (existing.deletedAt) {
        return { ok: true, unchanged: true, existing };
      }
      const now = this.clock.now();
      await tx.user.update({
        where: { id: userId },
        data: { deletedAt: now, updatedBy: auth.sub },
      });
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      return { ok: true, unchanged: false, existing };
    };
    const result = canManageTenants(auth.permissions)
      ? await this.prisma.$transaction((tx) => run(tx))
      : await this.tenantWork(auth, (tx) => run(tx));
    if (!result.unchanged) {
      this.activity.emit({
        orgId: result.existing.orgId,
        userId: auth.sub,
        group: 'admin',
        action: 'user.deleted',
        metadata: {
          entityType: 'user',
          entityId: userId,
          name: result.existing.name,
        },
      });
    }
    return { ok: true, unchanged: result.unchanged };
  }

  listUsers(auth: TokenClaims) {
    const select = {
      id: true,
      name: true,
      email: true,
      lastLogin: true,
      createdAt: true,
      org: { select: { id: true, name: true } },
      role: { select: { name: true } },
    } as const;
    if (canManageTenants(auth.permissions)) {
      return this.prisma.user.findMany({
        where: { deletedAt: null },
        select,
        orderBy: { name: 'asc' },
      });
    }
    return this.tenantWork(auth, (tx) =>
      tx.user.findMany({
        where: { deletedAt: null, orgId: auth.orgId },
        select,
        orderBy: { name: 'asc' },
      }),
    );
  }
}
