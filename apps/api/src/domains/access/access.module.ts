import { Module } from '@nestjs/common';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { AccessPrismaRepository } from './access.prisma.repository';
import { ACCESS_REPOSITORY } from './access.repository';

@Module({
  controllers: [AccessController],
  providers: [
    AccessService,
    { provide: ACCESS_REPOSITORY, useClass: AccessPrismaRepository },
  ],
})
export class AccessModule {}
