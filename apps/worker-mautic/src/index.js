#!/usr/bin/env node

import { QueueScheduler, Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const QUEUE_NAME = 'marketing-outbox';
const JOB_NAME = 'sync-contact';

const logger = {
  info: (message) => console.log(`[worker-mautic] ${message}`),
  warn: (message) => console.warn(`[worker-mautic] ${message}`),
  error: (message) => console.error(`[worker-mautic] ${message}`),
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

    const { eventId } = job.data ?? {};
    if (!eventId) {
      throw new Error('Missing eventId for marketing outbox job.');
    }

    const event = await prisma.marketingOutboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      logger.warn(`Marketing outbox event not found: ${eventId}.`);
      return;
    }

    if (event.status !== 'PENDING') {
      logger.info(`Marketing outbox event ${eventId} already handled (${event.status}).`);
      return;
    }

    await prisma.marketingOutboxEvent.update({
      where: { id: eventId },
      data: { status: 'PROCESSING', errorMessage: null },
    });

    try {
      if (event.eventType !== 'CONTACT_SYNC') {
        throw new Error(`Unsupported marketing event type: ${event.eventType}`);
      }

      const contactPayload = await buildContactPayload(event);
      await syncContactToMautic(contactPayload);

      await prisma.marketingOutboxEvent.update({
        where: { id: eventId },
        data: { status: 'COMPLETED', processedAt: new Date() },
      });

      logger.info(`Synced marketing contact for event ${eventId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await prisma.marketingOutboxEvent.update({
        where: { id: eventId },
        data: { status: 'FAILED', errorMessage: message },
      });

      logger.error(`Failed to sync marketing contact ${eventId}: ${message}`);
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
    throw new Error('DATABASE_URL is missing. Configure it for the marketing worker.');
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

async function buildContactPayload(event) {
  if (event.contactType === 'VIEWER') {
    const nickname = readString(event.payload?.nickname);
    const viewer = nickname
      ? null
      : await prisma.viewerProfile.findUnique({ where: { id: event.contactId } });

    return mapViewerContact({
      id: event.contactId,
      nickname: nickname ?? viewer?.nickname ?? null,
    });
  }

  const name = readString(event.payload?.name);
  const email = readString(event.payload?.email);
  const curator = name || email
    ? null
    : await prisma.curator.findUnique({ where: { id: event.contactId } });

  return mapCuratorContact({
    id: event.contactId,
    name: name ?? curator?.name ?? null,
    email: email ?? curator?.email ?? null,
  });
}

function mapViewerContact(viewer) {
  const contact = {
    firstname: viewer.nickname ?? `Viewer ${viewer.id}`,
    tags: ['viewer'],
  };

  return pruneEmpty(contact);
}

function mapCuratorContact(curator) {
  const { firstName, lastName } = splitName(curator.name);
  const contact = {
    firstname: firstName ?? curator.email ?? `Curator ${curator.id}`,
    lastname: lastName,
    email: curator.email ?? undefined,
    tags: ['curator'],
  };

  return pruneEmpty(contact);
}

function splitName(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    return { firstName: null, lastName: null };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.slice(1).join(' ') || null,
  };
}

function readString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pruneEmpty(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== null && value !== undefined),
  );
}

async function syncContactToMautic(contact) {
  const baseUrl = process.env.MAUTIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('MAUTIC_BASE_URL is missing. Configure it for Mautic sync.');
  }

  const headers = buildMauticAuthHeaders();
  headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/contacts/new`, {
    method: 'POST',
    headers,
    body: JSON.stringify(contact),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mautic sync failed (${response.status}): ${body}`);
  }

  return response.json();
}

function buildMauticAuthHeaders() {
  const username = process.env.MAUTIC_USERNAME;
  const password = process.env.MAUTIC_PASSWORD;

  if (!username || !password) {
    throw new Error('MAUTIC_USERNAME/MAUTIC_PASSWORD are required for Mautic sync.');
  }

  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    Authorization: `Basic ${token}`,
  };
}
