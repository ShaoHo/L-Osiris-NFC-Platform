import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MarketingContactType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'marketing-outbox';
const JOB_NAME = 'sync-contact';

@Injectable()
export class MarketingOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketingOutboxService.name);
  private queue?: Queue;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();
    this.queue = new Queue(QUEUE_NAME, { connection });
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  async enqueueContactSync(params: { contactType: MarketingContactType; contactId: string }) {
    if (!this.queue) {
      this.logger.warn('Queue not initialized yet; skipping enqueue');
      return;
    }

    const payload = await this.buildContactPayload(params.contactType, params.contactId);
    await this.queue.add(
      JOB_NAME,
      payload,
      { removeOnComplete: true, removeOnFail: 100 }
    );
  }

  private async buildContactPayload(
    contactType: MarketingContactType,
    contactId: string,
  ): Promise<Prisma.InputJsonValue> {
    if (contactType === 'VIEWER') {
      const viewer = await this.prisma.viewerProfile.findUnique({ where: { id: contactId } });
      return {
        contactType,
        contactId,
        nickname: viewer?.nickname ?? null,
      } satisfies Prisma.InputJsonValue;
    }

    return {
      contactType,
      contactId,
    } satisfies Prisma.InputJsonValue;
  }

  private getRedisConnection() {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = Number(process.env.REDIS_PORT ?? '6379');
    const password = process.env.REDIS_PASSWORD;

    return password
      ? { host, port, password }
      : { host, port };
  }
}
