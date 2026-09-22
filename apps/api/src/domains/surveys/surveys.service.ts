import { Inject, Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { paginate, toPage } from '../../shared/http/pagination';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { CreateSurveyDto } from './models/create-survey.dto';
import { isoWeekStart, toDateOnly } from '../../shared/utils/week.util';

@Injectable()
export class SurveysService {
  constructor(
    private readonly appPrisma: AppPrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
  ) {}

  list(auth: TokenClaims, page?: number, limit?: number) {
    const { page: nextPage, limit: nextLimit, skip, take } = toPage(page, limit);
    return withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      async (tx) => {
        const where = { orgId: auth.orgId };
        const [items, total] = await Promise.all([
          tx.survey.findMany({
            where,
            include: { questions: true },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          tx.survey.count({ where }),
        ]);
        return paginate(items, total, nextPage, nextLimit);
      },
    );
  }

  async active(auth: TokenClaims) {
    const weekStart = isoWeekStart();
    const survey = await withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      async (tx) => {
        const active = await tx.survey.findFirst({
          where: { orgId: auth.orgId, isActive: true },
          include: { questions: { orderBy: { position: 'asc' } } },
          orderBy: { createdAt: 'desc' },
        });
        if (!active) {
          return null;
        }
        const existing = await tx.response.findUnique({
          where: {
            surveyId_userId_weekStart: {
              surveyId: active.id,
              userId: auth.sub,
              weekStart,
            },
          },
          select: { id: true },
        });
        return {
          ...active,
          submittedThisWeek: Boolean(existing),
          weekStart: toDateOnly(weekStart),
        };
      },
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
      async (tx) => {
        await tx.survey.updateMany({
          where: { orgId: auth.orgId, isActive: true },
          data: { isActive: false },
        });
        return tx.survey.create({
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
        });
      },
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
