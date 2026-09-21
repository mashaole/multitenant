import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IActivityEmitter, ActivityPayload } from '../ports/activity.port';
import { ILogger, LOGGER } from '../ports/logger.port';

const ALLOWED = new Set(['entityType', 'entityId', 'name']);

@Injectable()
export class AsyncActivityEmitter implements IActivityEmitter {
  private queue: ActivityPayload[] = [];
  private draining = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  emit(payload: ActivityPayload): void {
    const metadata = {
      entityType: payload.metadata.entityType,
      entityId: payload.metadata.entityId,
      name: payload.metadata.name,
    };
    for (const key of Object.keys(payload.metadata as object)) {
      if (!ALLOWED.has(key)) {
        continue;
      }
    }
    this.queue.push({ ...payload, metadata });
    setImmediate(() => {
      void this.drain();
    });
  }

  async drain(): Promise<void> {
    if (this.draining) {
      while (this.draining) {
        await new Promise((r) => setImmediate(r));
      }
      return;
    }
    this.draining = true;
    try {
      while (this.queue.length > 0) {
        const item = this.queue.shift();
        if (!item) {
          break;
        }
        try {
          await this.prisma.activityLog.create({
            data: {
              orgId: item.orgId,
              userId: item.userId,
              group: item.group,
              action: item.action,
              metadata: item.metadata,
            },
          });
        } catch {
          this.logger.warn('activity persist failed', { action: item.action });
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
