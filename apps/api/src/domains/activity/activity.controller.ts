import { Controller, Get, Query } from '@nestjs/common';
import { ActivityQueryService } from './activity.service';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activity: ActivityQueryService) {}

  @Get()
  @RequiresPermission('activity:read', 'activity')
  list(
    @CurrentAuth() auth: TokenClaims,
    @Query('group') group?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.activity.list(auth, group, from, to);
  }
}
