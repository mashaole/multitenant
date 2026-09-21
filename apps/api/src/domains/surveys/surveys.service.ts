import { Inject, Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { CreateSurveyDto } from './models/create-survey.dto';

@Injectable()
export class SurveysService {
  constructor(
    private readonly appPrisma: AppPrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
  ) {}

  list(auth: TokenClaims) {
    return withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      (tx) => tx.survey.findMany({ where: { orgId: auth.orgId }, include: { questions: true } }),
    );
  }

  async active(auth: TokenClaims) {
    const survey = await withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      (tx) =>
        tx.survey.findFirst({
          where: { orgId: auth.orgId, isActive: true },
          include: { questions: { orderBy: { position: 'asc' } } },
        }),
    );
    if (!survey) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'No active survey', 404);
    }
    return survey;
  }

  async create(auth: TokenClaims, dto: CreateSurveyDto) {
    const survey = await withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      (tx) =>
        tx.survey.create({
          data: {
            orgId: auth.orgId,
            title: dto.title,
            isActive: true,
            questions: {
              create: dto.questions.map((q) => ({
                orgId: auth.orgId,
                text: q.text,
                type: q.type,
                position: q.position,
              })),
            },
          },
          include: { questions: true },
        }),
    );
    this.activity.emit({
      orgId: auth.orgId,
      userId: auth.sub,
      group: 'surveys',
      action: 'survey.created',
      metadata: { entityType: 'survey', entityId: survey.id, name: survey.title },
    });
    return survey;
  }
}
