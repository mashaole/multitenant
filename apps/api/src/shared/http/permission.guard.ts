import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { AppError, ERROR_CODES } from './error-codes';
import { MODULE_KEY, PERMISSION_KEY } from './permission.decorator';
import { AuthRequest } from './auth-request';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) {
      return true;
    }
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.auth) {
      throw new AppError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Not authenticated', 401);
    }
    if (!req.auth.permissions.includes(permission)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN_PERMISSION,
        'You do not have permission to perform this action',
        403,
      );
    }
    const moduleKey = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (moduleKey) {
      const row = await this.prisma.orgModule.findFirst({
        where: { orgId: req.auth.orgId, module: { key: moduleKey } },
      });
      if (!row) {
        throw new AppError(
          ERROR_CODES.FORBIDDEN_MODULE,
          'This module is not enabled for your organization',
          403,
        );
      }
    }
    return true;
  }
}
