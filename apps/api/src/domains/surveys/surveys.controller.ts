import { Body, Controller, Get, Post } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './models/create-survey.dto';
import { RequiresPermission } from '../../shared/http/permission.decorator';
import { CurrentAuth } from '../../shared/http/current-auth.decorator';
import { TokenClaims } from '../../shared/ports/token-signer.port';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Get()
  @RequiresPermission('surveys:read')
  list(@CurrentAuth() auth: TokenClaims) {
    return this.surveys.list(auth);
  }

  @Get('active')
  @RequiresPermission('surveys:read', 'surveys')
  active(@CurrentAuth() auth: TokenClaims) {
    return this.surveys.active(auth);
  }

  @Post()
  @RequiresPermission('surveys:create', 'surveys')
  create(@CurrentAuth() auth: TokenClaims, @Body() body: CreateSurveyDto) {
    return this.surveys.create(auth, body);
  }
}
