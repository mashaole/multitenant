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
        const [items, total] = await Promise.all([
          tx.activityLog.findMany({
            where,
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          tx.activityLog.count({ where }),
        ]);
        return paginate(items, total, page, limit);
      },
    );
  }
}
