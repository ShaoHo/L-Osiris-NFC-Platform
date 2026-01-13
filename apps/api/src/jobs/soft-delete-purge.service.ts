import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";

const QUEUE_NAME = "soft-delete-purge";
const JOB_NAME = "purge-soft-deleted-records";
const PURGE_INTERVAL_MS = 60 * 60 * 1000;
const FINANCIAL_RECORD_MODELS = ["AccessGrant"];
const EXCLUDED_PURGE_MODELS = new Set(["AuditLog", ...FINANCIAL_RECORD_MODELS]);

@Injectable()
export class SoftDeletePurgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SoftDeletePurgeService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
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

    const purgeTargets = [
      { name: "UserRole", delegate: this.prisma.userRole },
      { name: "Role", delegate: this.prisma.role },
      { name: "User", delegate: this.prisma.user },
      { name: "CuratorPolicy", delegate: this.prisma.curatorPolicy },
      { name: "Curator", delegate: this.prisma.curator },
      { name: "ViewerExhibitionState", delegate: this.prisma.viewerExhibitionState },
      { name: "ViewerSession", delegate: this.prisma.viewerSession },
      { name: "ViewerProfile", delegate: this.prisma.viewerProfile },
      { name: "ExhibitionDayAsset", delegate: this.prisma.exhibitionDayAsset },
      { name: "ExhibitionDayContent", delegate: this.prisma.exhibitionDayContent },
      { name: "Exhibit", delegate: this.prisma.exhibit },
      { name: "AiGenerationJob", delegate: this.prisma.aiGenerationJob },
      { name: "MarketingOutboxEvent", delegate: this.prisma.marketingOutboxEvent },
      { name: "ExhibitionRun", delegate: this.prisma.exhibitionRun },
      { name: "ExhibitionVersion", delegate: this.prisma.exhibitionVersion },
      { name: "Exhibition", delegate: this.prisma.exhibition },
      { name: "NfcTag", delegate: this.prisma.nfcTag },
      { name: "AccessGrant", delegate: this.prisma.accessGrant },
      { name: "AdminAction", delegate: this.prisma.adminAction },
      { name: "AuditLog", delegate: this.prisma.auditLog },
    ].filter((target) => !EXCLUDED_PURGE_MODELS.has(target.name));

    const results = await this.prisma.$transaction(
      purgeTargets.map((target) =>
        target.delegate.deleteMany({
          where: {
            deletedAt: { not: null },
            purgeAfter: { lte: now },
          },
        })
      )
    );

    const summary = purgeTargets
      .map((target, index) => `${target.name}=${results[index].count}`)
      .join(", ");

    this.logger.log(`Purged soft-deleted records (${summary}).`);
  }
}
