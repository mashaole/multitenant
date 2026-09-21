import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityQueryService } from './activity.service';

@Module({
  controllers: [ActivityController],
  providers: [ActivityQueryService],
})
export class ActivityQueryModule {}
