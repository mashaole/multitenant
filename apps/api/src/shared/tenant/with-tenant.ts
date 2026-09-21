import { Prisma } from '@prisma/client';
import { AppPrismaService } from '../prisma/prisma.service';

export interface TenantScope {
  orgId: string;
  userId: string;
  isOrgReader: boolean;
}

export type TenantTx = Prisma.TransactionClient;

export async function withTenant<T>(
  prisma: AppPrismaService,
  scope: TenantScope,
  fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_org_id', ${scope.orgId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_user_id', ${scope.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.is_org_reader', ${scope.isOrgReader ? 'true' : 'false'}, true)`;
    return fn(tx);
  });
}
