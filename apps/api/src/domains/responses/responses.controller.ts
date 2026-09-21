import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ResponsesService } from './responses.service';
import { SubmitResponseDto } from './models/submit-response.dto';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller('surveys')
export class ResponsesController {
  constructor(private readonly responses: ResponsesService) {}

  @Post(':id/responses')
  @RequiresPermission('responses:submit', 'responses')
  submit(
    @CurrentAuth() auth: TokenClaims,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SubmitResponseDto,
  ) {
    return this.responses.submit(auth, id, body);
  }
}
