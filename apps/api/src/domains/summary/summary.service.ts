import { Injectable } from '@nestjs/common';
import { AppPrismaService } from '../../shared/prisma/prisma.service';
import { withTenant } from '../../shared/tenant/with-tenant';
import { TokenClaims } from '../../shared/ports/token-signer.port';
import { isOrgReader } from '../../shared/access-control/permissions';
import { AppError, ERROR_CODES } from '../../shared/http/error-codes';
import { parseWeekStart, toDateOnly } from '../../shared/utils/week.util';

@Injectable()
export class SummaryService {
  constructor(private readonly appPrisma: AppPrismaService) {}

  async get(auth: TokenClaims, surveyId: string, week?: string) {
    const weekStart = parseWeekStart(week);
    return withTenant(
      this.appPrisma,
      { orgId: auth.orgId, userId: auth.sub, isOrgReader: isOrgReader(auth.permissions) },
      async (tx) => {
        const survey = await tx.survey.findFirst({
          where: { id: surveyId, orgId: auth.orgId },
          include: { questions: { orderBy: { position: 'asc' } } },
        });
        if (!survey) {
          throw new AppError(ERROR_CODES.NOT_FOUND, 'Survey not found', 404);
        }
        const memberCount = await tx.user.count({
          where: { orgId: auth.orgId, deletedAt: null, role: { name: 'MEMBER' } },
        });
        const responses = await tx.response.findMany({
          where: { surveyId, weekStart },
          include: { answers: true },
        });
        const completionCount = responses.length;
        const completionRate = memberCount === 0 ? 0 : completionCount / memberCount;
        const questions = survey.questions.map((q) => {
          const answers = responses.flatMap((r) =>
            r.answers.filter((a) => a.questionId === q.id),
          );
          if (q.type === 'RATING') {
            const values = answers
              .map((a) => a.ratingValue)
              .filter((v): v is number => v != null);
            const avg =
              values.length === 0
                ? 0
                : values.reduce((s, v) => s + v, 0) / values.length;
            return { questionId: q.id, text: q.text, type: q.type, average: avg, count: values.length };
          }
          const yes = answers.filter((a) => a.yesNoValue === true).length;
          const no = answers.filter((a) => a.yesNoValue === false).length;
          return { questionId: q.id, text: q.text, type: q.type, yes, no };
        });
        return {
          weekStart: toDateOnly(weekStart),
          completionCount,
          memberCount,
          completionRate,
          questions,
        };
      },
    );
  }
}
