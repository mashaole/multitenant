import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller('surveys')
export class SummaryController {
  constructor(private readonly summary: SummaryService) {}

  @Get(':id/summary')
  @RequiresPermission('summary:read', 'summary')
  get(
    @CurrentAuth() auth: TokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('week') week?: string,
  ) {
    return this.summary.get(auth, id, week);
  }
}
