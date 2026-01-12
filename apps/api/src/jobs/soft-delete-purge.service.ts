import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, QueueScheduler, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";

const QUEUE_NAME = "soft-delete-purge";
const JOB_NAME = "purge-soft-deleted-records";
const PURGE_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class SoftDeletePurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SoftDeletePurgeService.name);
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
      async () => {
        await this.purgeExpiredSoftDeletes();
      },
      { connection }
    );

    await this.queue.add(
      JOB_NAME,
      {},
      {
        repeat: { every: PURGE_INTERVAL_MS },
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.worker?.close(),
      this.scheduler?.close(),
      this.queue?.close(),
    ]);
  }

  private getRedisConnection() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL is missing. Configure it for BullMQ queues.");
    }

    const parsed = new URL(url);
    const port = parsed.port ? Number(parsed.port) : 6379;

    return {
      host: parsed.hostname,
      port,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  }

  private async purgeExpiredSoftDeletes() {
    const now = new Date();

    const results = await this.prisma.$transaction([
      this.prisma.auditLog.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.adminAction.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.userRole.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.role.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.user.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.curatorPolicy.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.curator.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.viewerExhibitionState.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.viewerSession.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.viewerProfile.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.accessGrant.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibitionDayAsset.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibitionDayContent.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibit.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.aiGenerationJob.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.marketingOutboxEvent.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibitionRun.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibitionVersion.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.exhibition.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
      this.prisma.nfcTag.deleteMany({
        where: {
          deletedAt: { not: null },
          purgeAfter: { lte: now },
        },
      }),
    ]);

    const [
      auditLogs,
      adminActions,
      userRoles,
      roles,
      users,
      curatorPolicies,
      curators,
      viewerStates,
      viewerSessions,
      viewerProfiles,
      accessGrants,
      dayAssets,
      dayContents,
      exhibits,
      aiJobs,
      marketingEvents,
      runs,
      versions,
      exhibitions,
      tags,
    ] = results.map((result) => result.count);

    this.logger.log(
      "Purged soft-deleted records " +
        `(auditLogs=${auditLogs}, adminActions=${adminActions}, userRoles=${userRoles}, roles=${roles}, users=${users}, ` +
        `curatorPolicies=${curatorPolicies}, curators=${curators}, viewerStates=${viewerStates}, viewerSessions=${viewerSessions}, ` +
        `viewerProfiles=${viewerProfiles}, accessGrants=${accessGrants}, dayAssets=${dayAssets}, dayContents=${dayContents}, ` +
        `exhibits=${exhibits}, aiJobs=${aiJobs}, marketingEvents=${marketingEvents}, runs=${runs}, versions=${versions}, ` +
        `exhibitions=${exhibitions}, tags=${tags}).`
    );
  }
}
