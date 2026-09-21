import { Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';

@Injectable()
export class ActivityQueryService {
  constructor(private readonly appPrisma: AppPrismaService) {}

  list(auth: TokenClaims, group?: string, from?: string, to?: string) {
    return withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      (tx) =>
        tx.activityLog.findMany({
          where: {
            orgId: auth.orgId,
            ...(group ? { group } : {}),
            ...(from || to
              ? {
                  createdAt: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lte: new Date(to) } : {}),
                  },
                }
              : {}),
          },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
    );
  }
}
