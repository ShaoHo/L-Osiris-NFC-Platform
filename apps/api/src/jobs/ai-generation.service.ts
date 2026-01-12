import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'ai-generation';
const JOB_NAME = 'generate-exhibition-day-draft';

@Injectable()
export class AiGenerationService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
  }

  async onModuleDestroy() {
    await this.queue?.close();
  }

  async enqueueDraftJob(params: {
    exhibitionId: string;
    dayIndex: number;
    prompt: string;
    assetMetadata?: unknown;
  }) {
    const job = await this.prisma.aiGenerationJob.create({
      data: {
        exhibitionId: params.exhibitionId,
        dayIndex: params.dayIndex,
        prompt: params.prompt,
        assetMetadata: params.assetMetadata ?? undefined,
        status: 'PENDING',
      },
    });

    await this.queue?.add(JOB_NAME, { jobId: job.id }, { removeOnComplete: true, removeOnFail: 100 });

    return job;
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
