import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'ai-generation';
const JOB_NAME = 'generate-exhibition-day-draft';

@Injectable()
export class AiGenerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationService.name);
  private queue?: Queue;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();
    if (!connection) {
      this.logger.warn('Redis not configured; skipping AI generation queue initialization.');
      return;
    }

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
    retryFailed?: boolean;
  }) {
    const [job] = await this.enqueueDraftJobs({
      exhibitionId: params.exhibitionId,
      dayIndices: [params.dayIndex],
      prompt: params.prompt,
      assetMetadata: params.assetMetadata,
      retryFailed: params.retryFailed,
    });

    return job;
  }

  async enqueueDraftJobs(params: {
    exhibitionId: string;
    dayIndices: number[];
    prompt: string;
    assetMetadata?: unknown;
    retryFailed?: boolean;
  }) {
    const jobs = await Promise.all(
      params.dayIndices.map(async (dayIndex) => {
        const existingFailed = params.retryFailed
          ? await this.prisma.aiGenerationJob.findFirst({
              where: {
                exhibitionId: params.exhibitionId,
                dayIndex,
                status: 'FAILED',
              },
              orderBy: { createdAt: 'desc' },
            })
          : null;

        if (existingFailed) {
          return this.prisma.aiGenerationJob.update({
            where: { id: existingFailed.id },
            data: {
              status: 'PENDING',
              errorMessage: null,
              prompt: params.prompt,
              assetMetadata: params.assetMetadata ?? undefined,
            },
          });
        }

        return this.prisma.aiGenerationJob.create({
          data: {
            exhibitionId: params.exhibitionId,
            dayIndex,
            prompt: params.prompt,
            assetMetadata: params.assetMetadata ?? undefined,
            status: 'PENDING',
          },
        });
      }),
    );

    if (!this.queue) {
      this.logger.warn('AI generation queue not initialized; skipping job enqueue.');
      return jobs;
    }

    await this.queue?.addBulk(
      jobs.map((job) => ({
        name: JOB_NAME,
        data: { jobId: job.id },
        opts: { removeOnComplete: true, removeOnFail: 100 },
      })),
    );

    return jobs;
  }

  private getRedisConnection() {
    const url = process.env.REDIS_URL;
    if (!url) {
      return null;
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
