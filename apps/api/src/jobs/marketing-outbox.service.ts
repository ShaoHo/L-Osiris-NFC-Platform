import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueScheduler } from 'bullmq';
import { MarketingContactType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'marketing-outbox';
const JOB_NAME = 'sync-contact';

@Injectable()
export class MarketingOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketingOutboxService.name);
  private queue?: Queue;
  private scheduler?: QueueScheduler;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.scheduler = new QueueScheduler(QUEUE_NAME, { connection });
  }

  async onModuleDestroy() {
    await Promise.all([
      this.queue?.close(),
      this.scheduler?.close(),
    ]);
  }

  async enqueueContactSync(params: { contactType: MarketingContactType; contactId: string }) {
    const payload = await this.buildContactPayload(params.contactType, params.contactId);

    const event = await this.prisma.marketingOutboxEvent.create({
      data: {
        eventType: 'CONTACT_SYNC',
        contactType: params.contactType,
        contactId: params.contactId,
        payload,
        status: 'PENDING',
      },
    });

    await this.queue?.add(JOB_NAME, { eventId: event.id }, { removeOnComplete: true, removeOnFail: 100 });

    this.logger.log(`Queued marketing contact sync ${event.id} (${params.contactType}:${params.contactId}).`);

    return event;
  }

  private async buildContactPayload(
    contactType: MarketingContactType,
    contactId: string,
  ): Promise<Prisma.InputJsonValue> {
    if (contactType === 'VIEWER') {
      const viewer = await this.prisma.viewerProfile.findUnique({
        where: { id: contactId },
      });

      if (!viewer) {
        throw new Error(`Viewer profile not found for marketing sync: ${contactId}`);
      }

      return {
        nickname: viewer.nickname ?? null,
      };
    }

    const curator = await this.prisma.curator.findUnique({
      where: { id: contactId },
    });

    if (!curator) {
      throw new Error(`Curator not found for marketing sync: ${contactId}`);
    }

    return {
      name: curator.name ?? null,
      email: curator.email ?? null,
    };
  }

  private getRedisConnection() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL is missing. Configure it for BullMQ queues.');
    }

    const parsed = new URL(url);
    const port = parsed.port ? Number(parsed.port) : 6379;

    return {
      host: parsed.hostname,
      port,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }
}
