#!/usr/bin/env node

import { QueueScheduler, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import sanitizeHtml from 'sanitize-html';

const QUEUE_NAME = 'ai-generation';
const JOB_NAME = 'generate-exhibition-day-draft';

const logger = {
  info: (message) => console.log(`[worker-ai] ${message}`),
  warn: (message) => console.warn(`[worker-ai] ${message}`),
  error: (message) => console.error(`[worker-ai] ${message}`),
};

const prisma = createPrismaClient();
const connection = getRedisConnection();

const scheduler = new QueueScheduler(QUEUE_NAME, { connection });
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name && job.name !== JOB_NAME) {
      logger.warn(`Skipping unknown job ${job.name}.`);
      return;
    }

    const { jobId } = job.data ?? {};
    if (!jobId) {
      throw new Error('Missing jobId for ai generation job.');
    }

    const aiJob = await prisma.aiGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!aiJob) {
      logger.warn(`AI job not found: ${jobId}.`);
      return;
    }

    if (aiJob.status !== 'PENDING') {
      logger.info(`AI job ${jobId} already handled (${aiJob.status}).`);
      return;
    }

    await prisma.aiGenerationJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      const { html, css, assetRefs } = buildDraftContent(aiJob.prompt, aiJob.assetMetadata);
      const version = await prisma.exhibitionVersion.findFirst({
        where: { exhibitionId: aiJob.exhibitionId },
        orderBy: { createdAt: 'desc' },
      });

      if (!version) {
        throw new Error(`Exhibition version not found for job ${aiJob.id}`);
      }

      await prisma.exhibitionDayContent.upsert({
        where: {
          versionId_dayIndex_status: {
            versionId: version.id,
            dayIndex: aiJob.dayIndex,
            status: 'DRAFT',
          },
        },
        create: {
          versionId: version.id,
          dayIndex: aiJob.dayIndex,
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

      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });

      logger.info(`Generated draft content for job ${jobId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status: 'FAILED', errorMessage: message },
      });

      logger.error(`Failed to generate draft for job ${jobId}: ${message}`);
      throw error;
    }
  },
  { connection },
);

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function shutdown(signal) {
  logger.info(`Shutting down (${signal})...`);
  await Promise.all([worker.close(), scheduler.close(), prisma.$disconnect()]);
  process.exit(0);
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is missing. Configure it for the AI worker.');
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

function getRedisConnection() {
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

function buildDraftContent(prompt, assetMetadata) {
  const trimmedPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  const html = sanitizeExhibitionHtml(
    `\n<section class="exhibition-day">\n  <h1>${trimmedPrompt || 'Untitled draft'}</h1>\n  <p>Generated draft content. Edit this copy to finalize the day experience.</p>\n</section>\n`.trim(),
  );
  const css = `\n.exhibition-day {\n  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;\n  padding: 24px;\n  background: #f7f7f7;\n  color: #1b1b1b;\n}\n\n.exhibition-day h1 {\n  font-size: 28px;\n  margin-bottom: 12px;\n}\n`.trim();

  return {
    html,
    css,
    assetRefs: assetMetadata ?? null,
  };
}

function sanitizeExhibitionHtml(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'section',
      'article',
      'div',
      'span',
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'img',
      'video',
      'source',
      'a',
      'figure',
      'figcaption',
      'blockquote',
      'hr',
      'br',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      video: ['src', 'poster', 'controls', 'preload', 'muted', 'loop', 'autoplay'],
      source: ['src', 'type'],
      '*': ['class', 'id', 'style', 'data-*'],
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}
