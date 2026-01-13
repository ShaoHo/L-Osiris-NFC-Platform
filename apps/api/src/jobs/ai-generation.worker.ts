import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { sanitizeExhibitionHtml } from '../utils/html-sanitizer';

const QUEUE_NAME = 'ai-generation';
const JOB_NAME = 'generate-exhibition-day-draft';
const MAX_ATTEMPTS = 3;

interface GenerationResult {
  html: string;
  css?: string | null;
  assetRefs?: unknown;
  assetUrls?: Array<{
    assetUrl: string;
    thumbnailUrl?: string | null;
    usageMetadata?: unknown;
  }>;
}

@Injectable()
export class AiGenerationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiGenerationWorker.name);
  private worker?: Worker;
  private queue?: Queue;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => this.handleJob(job),
      { connection },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.worker?.close(),
      this.queue?.close(),
    ]);
  }

  private async handleJob(job: Job) {
    if (job.name !== JOB_NAME) {
      return;
    }

    const jobId = job.data?.jobId as string | undefined;
    if (!jobId) {
      this.logger.warn('AI generation job missing jobId payload');
      return;
    }

    const record = await this.prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
      include: { exhibition: true },
    });

    if (!record) {
      this.logger.warn(`AI generation job not found: ${jobId}`);
      return;
    }

    if (record.status === 'COMPLETED') {
      this.logger.log(`AI generation job already completed: ${jobId}`);
      return;
    }

    await this.prisma.aiGenerationJob.update({
      where: { id: record.id },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const result = await this.generateDraftContent(record.prompt, record);
      await this.persistDraft(record, result);

      await this.prisma.aiGenerationJob.update({
        where: { id: record.id },
        data: { status: 'COMPLETED', errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = (job.attemptsMade ?? 0) + 1;

      await this.prisma.aiGenerationJob.update({
        where: { id: record.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          errorMessage: message,
        },
      });

      if (attempts < MAX_ATTEMPTS) {
        await this.queue?.add(
          JOB_NAME,
          { jobId: record.id },
          {
            jobId: `ai-generation-${record.id}-${attempts}`,
            delay: this.getBackoffDelay(attempts),
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
      } else {
        this.logger.warn(`AI generation job failed after retries: ${message}`);
      }

      throw error;
    }
  }

  private async generateDraftContent(
    prompt: string,
    record: { dayIndex: number; exhibitionId: string; assetMetadata: unknown },
  ): Promise<GenerationResult> {
    const sanitizedPrompt = prompt.trim();
    if (!sanitizedPrompt) {
      throw new Error('Prompt cannot be empty');
    }

    const assetRefs = record.assetMetadata ?? null;
    const html = `
      <section>
        <h2>Day ${record.dayIndex} Draft</h2>
        <p>${sanitizedPrompt}</p>
      </section>
    `;

    return {
      html,
      css: null,
      assetRefs,
      assetUrls: this.extractAssetUrls(assetRefs),
    };
  }

  private extractAssetUrls(assetRefs: unknown): GenerationResult['assetUrls'] {
    if (!assetRefs || typeof assetRefs !== 'object') {
      return [];
    }

    if (!Array.isArray(assetRefs)) {
      return [];
    }

    return assetRefs
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const assetUrl = (entry as { assetUrl?: string }).assetUrl?.trim();
        if (!assetUrl) {
          return null;
        }

        return {
          assetUrl,
          thumbnailUrl: (entry as { thumbnailUrl?: string | null }).thumbnailUrl ?? null,
          usageMetadata: (entry as { usageMetadata?: unknown }).usageMetadata,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  private async persistDraft(
    record: { exhibitionId: string; dayIndex: number },
    result: GenerationResult,
  ) {
    const version = await this.prisma.exhibitionVersion.findFirst({
      where: { exhibitionId: record.exhibitionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!version) {
      throw new Error(`Exhibition version not found: ${record.exhibitionId}`);
    }

    if (record.dayIndex > version.totalDays) {
      throw new Error('dayIndex exceeds totalDays for exhibition');
    }

    await this.prisma.$transaction(async (tx) => {
      const draft = await tx.exhibitionDayContent.upsert({
        where: {
          versionId_dayIndex_status: {
            versionId: version.id,
            dayIndex: record.dayIndex,
            status: 'DRAFT',
          },
        },
        create: {
          versionId: version.id,
          dayIndex: record.dayIndex,
          status: 'DRAFT',
          html: sanitizeExhibitionHtml(result.html),
          css: result.css ?? null,
          assetRefs: result.assetRefs ?? Prisma.DbNull,
        },
        update: {
          html: sanitizeExhibitionHtml(result.html),
          css: result.css ?? undefined,
          assetRefs: result.assetRefs ?? Prisma.DbNull,
        },
      });

      await tx.exhibitionDayAsset.deleteMany({
        where: { dayContentId: draft.id },
      });

      if (result.assetUrls?.length) {
        await tx.exhibitionDayAsset.createMany({
          data: result.assetUrls.map((asset) => ({
            dayContentId: draft.id,
            assetUrl: asset.assetUrl,
            thumbnailUrl: asset.thumbnailUrl ?? undefined,
            usageMetadata: asset.usageMetadata ?? undefined,
          })),
        });
      }
    });
  }

  private getBackoffDelay(attempt: number) {
    const baseDelayMs = 2_000;
    return baseDelayMs * Math.pow(2, attempt - 1);
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
