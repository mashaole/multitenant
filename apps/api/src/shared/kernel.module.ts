import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { PrismaService, AppPrismaService } from './prisma/prisma.service';
import { LOGGER } from './ports/logger.port';
import { TOKEN_SIGNER } from './ports/token-signer.port';
import { TOKEN_HASHER } from './ports/token-hasher.port';
import { PASSWORD_HASHER } from './ports/password-hasher.port';
import { CLOCK } from './ports/clock.port';
import { ACTIVITY_EMITTER } from './ports/activity.port';
import { ConsoleLoggerAdapter } from './adapters/console-logger.adapter';
import { JwtTokenSignerAdapter } from './adapters/jwt-token-signer.adapter';
import { Sha256HasherAdapter } from './adapters/sha256-hasher.adapter';
import { ScryptPasswordHasherAdapter } from './adapters/scrypt-password-hasher.adapter';
import { SystemClockAdapter } from './adapters/system-clock.adapter';
import { AsyncActivityEmitter } from './activity/async-activity.emitter';
import { HttpErrorFilter } from './http/http-error.filter';
import { PermissionGuard } from './http/permission.guard';
import { MethodAllowlistMiddleware } from './http/method-allowlist.middleware';
import { RateLimitMiddleware } from './http/rate-limit.middleware';
import { TokenMiddleware } from './http/token.middleware';
import { HealthController } from './health/health.controller';

@Global()
@Module({
  controllers: [HealthController],
  providers: [
    PrismaService,
    AppPrismaService,
    { provide: LOGGER, useClass: ConsoleLoggerAdapter },
    { provide: TOKEN_SIGNER, useClass: JwtTokenSignerAdapter },
    { provide: TOKEN_HASHER, useClass: Sha256HasherAdapter },
    { provide: PASSWORD_HASHER, useClass: ScryptPasswordHasherAdapter },
    { provide: CLOCK, useClass: SystemClockAdapter },
    { provide: ACTIVITY_EMITTER, useClass: AsyncActivityEmitter },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [
    PrismaService,
    AppPrismaService,
    LOGGER,
    TOKEN_SIGNER,
    TOKEN_HASHER,
    PASSWORD_HASHER,
    CLOCK,
    ACTIVITY_EMITTER,
  ],
})
export class KernelModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(MethodAllowlistMiddleware, RateLimitMiddleware, TokenMiddleware)
      .forRoutes('*');
  }
}
