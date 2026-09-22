import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACCESS_REPOSITORY, IAccessRepository } from './access.repository';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader, assertPermissionSubset, isRoleAssignableToOrg } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { slicePage } from '../../shared/http/pagination';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';

@Injectable()
export class AccessService {
  constructor(
    @Inject(ACCESS_REPOSITORY) private readonly repo: IAccessRepository,
    private readonly appPrisma: AppPrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
  ) {}

  async listPermissions(actorKeys: string[], page?: number, limit?: number) {
    const allowed = new Set(actorKeys);
    const rows = (await this.repo.listPermissions()).filter((row) =>
      allowed.has(row.key),
    );
    return slicePage(rows, page, limit);
  }

  async listRoles(auth: TokenClaims, page?: number, limit?: number) {
    const roles = await withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      (tx) => this.repo.listRoles(tx, auth.orgId),
    );
    const assignable = roles
      .filter((role) => isRoleAssignableToOrg(role.orgId, auth.orgId))
      .filter((role) =>
        assertPermissionSubset(
          auth.permissions,
          role.perms.map((p) => p.permission.key),
        ),
      )
      .map(({ perms, ...role }) => role);
    return slicePage(assignable, page, limit);
  }

  async createRole(auth: TokenClaims, name: string, permissionKeys: string[]) {
    if (!assertPermissionSubset(auth.permissions, permissionKeys)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN_PERMISSION,
        'You cannot grant permissions you do not have',
        403,
      );
    }
    const perms = await this.repo.findPermissionsByKeys(permissionKeys);
    if (perms.length !== permissionKeys.length) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Unknown permission key', 422);
    }
    try {
      const role = await withTenant(
        this.appPrisma,
        { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
        (tx) =>
          this.repo.createRole(tx, {
            orgId: auth.orgId,
            name,
            permissionIds: perms.map((p) => p.id),
          }),
      );
      this.activity.emit({
        orgId: auth.orgId,
        userId: auth.sub,
        group: 'access',
        action: 'role.created',
        metadata: { entityType: 'role', entityId: role.id, name: role.name },
      });
      return role;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(ERROR_CODES.CONFLICT_DUPLICATE, 'A role with that name exists', 409);
      }
      throw err;
    }
  }
}
