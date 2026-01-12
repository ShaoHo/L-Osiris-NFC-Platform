import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueScheduler, Worker } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

const QUEUE_NAME = 'ai-generation';
const JOB_NAME = 'generate-exhibition-day-draft';

interface GenerateDraftJobPayload {
  jobId: string;
}

@Injectable()
export class AiGenerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationService.name);
  private queue?: Queue;
  private scheduler?: QueueScheduler;
  private worker?: Worker;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.scheduler = new QueueScheduler(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const payload = job.data as GenerateDraftJobPayload;
        await this.processDraftJob(payload.jobId);
      },
      { connection },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.worker?.close(),
      this.scheduler?.close(),
      this.queue?.close(),
    ]);
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

  private async processDraftJob(jobId: string) {
    const job = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      this.logger.warn(`AI job not found: ${jobId}`);
      return;
    }

    if (job.status !== 'PENDING') {
      this.logger.log(`AI job ${jobId} already processed with status ${job.status}.`);
      return;
    }

    await this.prisma.aiGenerationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const { html, css, assetRefs } = this.buildDraftContent(job.prompt, job.assetMetadata);
      const version = await this.prisma.exhibitionVersion.findFirst({
        where: { exhibitionId: job.exhibitionId },
        orderBy: { createdAt: 'desc' },
      });

      if (!version) {
        throw new Error(`Exhibition version not found for job ${job.id}`);
      }

      await this.prisma.exhibitionDayContent.upsert({
        where: {
          versionId_dayIndex_status: {
            versionId: version.id,
            dayIndex: job.dayIndex,
            status: 'DRAFT',
          },
        },
        create: {
          versionId: version.id,
          dayIndex: job.dayIndex,
          status: 'DRAFT',
          html,
          css,
          assetRefs,
        },
        update: {
          html,
          css,
          assetRefs,
        },
      });

      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });

      this.logger.log(`Generated draft content for job ${jobId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: message },
      });

      this.logger.error(`Failed to generate draft for job ${jobId}: ${message}`);
      throw error;
    }
  }

  private buildDraftContent(prompt: string, assetMetadata: unknown) {
    const trimmedPrompt = prompt.trim();
    const html = `\n<section class="exhibition-day">\n  <h1>${trimmedPrompt}</h1>\n  <p>Generated draft content. Edit this copy to finalize the day experience.</p>\n</section>\n`.trim();
    const css = `\n.exhibition-day {\n  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;\n  padding: 24px;\n  background: #f7f7f7;\n  color: #1b1b1b;\n}\n\n.exhibition-day h1 {\n  font-size: 28px;\n  margin-bottom: 12px;\n}\n`.trim();

    return {
      html,
      css,
      assetRefs: assetMetadata ?? null,
    };
  }
}
