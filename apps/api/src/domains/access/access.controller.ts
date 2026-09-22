import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AccessService } from './access.service';
import { CreateRoleDto } from './models/create-role.dto';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { PaginationQueryDto } from '../../shared/http/pagination.dto';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller()
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('permissions')
  listPermissions(
    @CurrentAuth() auth: TokenClaims,
    @Query() query: PaginationQueryDto,
  ) {
    return this.access.listPermissions(auth.permissions, query.page, query.limit);
  }

  @Get('roles')
  @RequiresPermission('roles:read')
  listRoles(
    @CurrentAuth() auth: TokenClaims,
    @Query() query: PaginationQueryDto,
  ) {
    return this.access.listRoles(auth, query.page, query.limit);
  }

  @Post('roles')
  @RequiresPermission('roles:create')
  createRole(@CurrentAuth() auth: TokenClaims, @Body() body: CreateRoleDto) {
    return this.access.createRole(auth, body.name, body.permissionKeys);
  }
}
