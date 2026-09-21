import { Body, Controller, Get, Post } from '@nestjs/common';
import { AccessService } from './access.service';
import { CreateRoleDto } from './models/create-role.dto';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller()
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('permissions')
  listPermissions(@CurrentAuth() auth: TokenClaims) {
    return this.access.listPermissions(auth.permissions);
  }

  @Get('roles')
  @RequiresPermission('roles:read')
  listRoles(@CurrentAuth() auth: TokenClaims) {
    return this.access.listRoles(auth);
  }

  @Post('roles')
  @RequiresPermission('roles:create')
  createRole(@CurrentAuth() auth: TokenClaims, @Body() body: CreateRoleDto) {
    return this.access.createRole(auth, body.name, body.permissionKeys);
  }
}
