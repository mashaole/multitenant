import { Inject, Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { ACTIVITY_EMITTER, IActivityEmitter } from '../../shared/ports/activity.port';
import { isoWeekStart } from '../../shared/utils/week.util';
import { SubmitResponseDto } from './models/submit-response.dto';

function sameAnswers(
  existing: Array<{ questionId: string; ratingValue: number | null; yesNoValue: boolean | null }>,
  incoming: SubmitResponseDto['answers'],
): boolean {
  if (existing.length !== incoming.length) {
    return false;
  }
  const map = new Map(existing.map((a) => [a.questionId, a]));
  return incoming.every((a) => {
    const row = map.get(a.questionId);
    if (!row) {
      return false;
    }
    return row.ratingValue === (a.ratingValue ?? null) && row.yesNoValue === (a.yesNoValue ?? null);
  });
}

@Injectable()
export class ResponsesService {
  constructor(
    private readonly appPrisma: AppPrismaService,
    @Inject(ACTIVITY_EMITTER) private readonly activity: IActivityEmitter,
  ) {}

  async submit(auth: TokenClaims, surveyId: string, dto: SubmitResponseDto) {
    const weekStart = isoWeekStart();
    const scope = {
      orgId: auth.orgId,
      userId: auth.sub,
      isOrgReader: isOrgReader(auth.permissions),
    };
    const result = await withTenant(this.appPrisma, scope, async (tx) => {
      const survey = await tx.survey.findFirst({
        where: { id: surveyId, orgId: auth.orgId, isActive: true },
        include: { questions: true },
      });
      if (!survey) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Survey not found', 404);
      }
      const allowed = new Set(survey.questions.map((q) => q.id));
      if (dto.answers.some((a) => !allowed.has(a.questionId))) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, 'Unknown question for this survey', 422);
      }
      const existing = await tx.response.findUnique({
        where: {
          surveyId_userId_weekStart: { surveyId, userId: auth.sub, weekStart },
        },
        include: { answers: true },
      });
      if (existing) {
        if (sameAnswers(existing.answers, dto.answers)) {
          return { replay: true, response: existing };
        }
        throw new AppError(
          ERROR_CODES.CONFLICT_DUPLICATE,
          'You already submitted a different response this week',
          409,
        );
      }
      const created = await tx.response.create({
        data: {
          orgId: auth.orgId,
          surveyId,
          userId: auth.sub,
          weekStart,
          answers: {
            create: dto.answers.map((a) => ({
              orgId: auth.orgId,
              questionId: a.questionId,
              ratingValue: a.ratingValue,
              yesNoValue: a.yesNoValue,
            })),
          },
        },
        include: { answers: true },
      });
      return { replay: false, response: created };
    });
    if (!result.replay) {
      this.activity.emit({
        orgId: auth.orgId,
        userId: auth.sub,
        group: 'responses',
        action: 'response.submitted',
        metadata: { entityType: 'response', entityId: result.response.id, name: 'weekly pulse' },
      });
    }
    return result.response;
  }
}
