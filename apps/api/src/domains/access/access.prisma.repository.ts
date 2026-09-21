import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TenantTx } from '../../shared/tenant/with-tenant';
import { IAccessRepository } from './access.repository';

@Injectable()
export class AccessPrismaRepository implements IAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ domain: 'asc' }, { key: 'asc' }] });
  }

  listRoles(tx: TenantTx, orgId: string) {
    return tx.role.findMany({
      where: { OR: [{ orgId: null }, { orgId }] },
      select: {
        id: true,
        name: true,
        isSystem: true,
        orgId: true,
        perms: { select: { permission: { select: { key: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  findPermissionsByKeys(keys: string[]) {
    return this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true },
    });
  }

  async createRole(
    tx: TenantTx,
    data: { orgId: string; name: string; permissionIds: string[] },
  ) {
    return tx.role.create({
      data: {
        orgId: data.orgId,
        name: data.name,
        isSystem: false,
        perms: { create: data.permissionIds.map((permissionId) => ({ permissionId })) },
      },
      select: { id: true, name: true },
    });
  }
}
