import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateOrgDto, CreateUserDto, PatchSettingsDto, PutModulesDto } from './models/admin.dto';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { PaginationQueryDto } from '../../shared/http/pagination.dto';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('orgs')
  @RequiresPermission('orgs:create')
  listOrgs(@Query() query: PaginationQueryDto) {
    return this.admin.listOrgs(query.page, query.limit);
  }

  @Post('orgs')
  @RequiresPermission('orgs:create')
  createOrg(@CurrentAuth() auth: TokenClaims, @Body() body: CreateOrgDto) {
    return this.admin.createOrg(auth, body.name, body.maxSessionsPerUser ?? 1);
  }

  @Put('orgs/:id/modules')
  @RequiresPermission('modules:manage')
  putModules(
    @CurrentAuth() auth: TokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PutModulesDto,
  ) {
    return this.admin.putModules(auth, id, body.moduleKeys);
  }

  @Patch('orgs/:id/settings')
  @RequiresPermission('orgs:update')
  patchSettings(
    @CurrentAuth() auth: TokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PatchSettingsDto,
  ) {
    return this.admin.patchSettings(auth, id, body.maxSessionsPerUser);
  }

  @Post('users')
  @RequiresPermission('users:create')
  createUser(@CurrentAuth() auth: TokenClaims, @Body() body: CreateUserDto) {
    return this.admin.createUser(auth, body);
  }

  @Get('users')
  @RequiresPermission('users:create')
  listUsers(
    @CurrentAuth() auth: TokenClaims,
    @Query() query: PaginationQueryDto,
  ) {
    return this.admin.listUsers(auth, query.page, query.limit);
  }

  @Delete('users/:id')
  @RequiresPermission('users:delete')
  deleteUser(
    @CurrentAuth() auth: TokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.admin.softDeleteUser(auth, id);
  }
}
