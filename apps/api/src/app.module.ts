import { Module } from '@nestjs/common';
import { KernelModule } from './shared/kernel.module';
import { AuthModule } from './domains/auth/auth.module';
import { AccessModule } from './domains/access/access.module';
import { AdminModule } from './domains/admin/admin.module';
import { SurveysModule } from './domains/surveys/surveys.module';
import { ResponsesModule } from './domains/responses/responses.module';
import { SummaryModule } from './domains/summary/summary.module';
import { ActivityQueryModule } from './domains/activity/activity.module';

@Module({
  imports: [
    KernelModule,
    AuthModule,
    AccessModule,
    AdminModule,
    SurveysModule,
    ResponsesModule,
    SummaryModule,
    ActivityQueryModule,
  ],
})
export class AppModule {}
