import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

interface AuditRecordInput {
  eventType: string;
  actor: string | null | undefined;
  entityType?: string | null;
  entityId?: string | null;
  adminActionId?: string | null;
  payload?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record({
    eventType,
    actor,
    entityType,
    entityId,
    adminActionId,
    payload,
  }: AuditRecordInput) {
    return this.prisma.auditLog.create({
      data: {
        eventType,
        actor,
        entityType: entityType ?? undefined,
        entityId: entityId ?? undefined,
        adminActionId: adminActionId ?? undefined,
        payload: payload ?? undefined,
      },
    });
  }
}
