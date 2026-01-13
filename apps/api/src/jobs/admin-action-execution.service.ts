import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { AdminActionService } from '../admin/admin-action.service';

const QUEUE_NAME = 'admin-action-execution';
const JOB_NAME = 'execute-admin-action';
const SYSTEM_EXECUTOR = 'system-scheduler';

@Injectable()
export class AdminActionExecutionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminActionExecutionService.name);
  private queue?: Queue;
  private worker?: Worker;

  constructor(private readonly adminActionService: AdminActionService) {}

  async onModuleInit() {
    const connection = this.getRedisConnection();

    this.queue = new Queue(QUEUE_NAME, { connection });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        if (job.name !== JOB_NAME) {
          return;
        }

        try {
          await this.adminActionService.executeAction(
            job.data.actionId,
            SYSTEM_EXECUTOR,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Skipping admin action execution: ${message}`);
        }
      },
      { connection },
    );
  }

  async onModuleDestroy() {
    await Promise.all([
      this.worker?.close(),
      this.queue?.close(),
    ]);
  }

  async scheduleExecution(actionId: string, executeAfter: Date) {
    if (!this.queue) {
      this.logger.warn('Queue not initialized yet; skipping admin action schedule');
      return;
    }

    const delay = Math.max(0, executeAfter.getTime() - Date.now());

    try {
      await this.queue.add(
        JOB_NAME,
        { actionId },
        {
          jobId: `admin-action-${actionId}`,
          delay,
          removeOnComplete: true,
          removeOnFail: 100,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to schedule admin action ${actionId}: ${message}`);
    }
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
