import { Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';
import { paginate, toPage } from '../../shared/http/pagination';

@Injectable()
export class ActivityQueryService {
  constructor(private readonly appPrisma: AppPrismaService) {}

  list(
    auth: TokenClaims,
    filters: { group?: string; from?: string; to?: string; page?: number; limit?: number },
  ) {
    const { page, limit, skip, take } = toPage(filters.page, filters.limit);
    const where = {
      orgId: auth.orgId,
      ...(filters.group ? { group: filters.group } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };
    return withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      async (tx) => {
        const [rows, total] = await Promise.all([
          tx.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          tx.activityLog.count({ where }),
        ]);
        // Do not `include: { user }` — cross-org actors (e.g. SUPER_ADMIN
        // granting modules) are invisible under user RLS and Prisma then 500s.
        const userIds = [...new Set(rows.map((row) => row.userId))];
        const visibleUsers =
          userIds.length === 0
            ? []
            : await tx.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true },
              });
        const nameById = new Map(visibleUsers.map((u) => [u.id, u.name]));
        const items = rows.map((row) => ({
          ...row,
          user: { name: nameById.get(row.userId) ?? 'Platform admin' },
        }));
        return paginate(items, total, page, limit);
      },
    );
  }
}
