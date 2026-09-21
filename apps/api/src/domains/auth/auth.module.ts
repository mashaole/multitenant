import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthPrismaRepository } from './auth.prisma.repository';
import { AUTH_REPOSITORY } from './auth.repository';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: AUTH_REPOSITORY, useClass: AuthPrismaRepository },
  ],
})
export class AuthModule {}
