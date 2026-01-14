import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AccessGrantService } from '../access/access-grant.service';
import { AdminActionPayload } from './admin-action.types';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessGrantService: AccessGrantService,
    private readonly auditService: AuditService,
  ) {}

  async executeAction(actionId: string, executedBy: string) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    if (action.status !== 'CONFIRMED') {
      throw new BadRequestException('Admin action must be confirmed before execution');
    }

    if (!executedBy) {
      throw new BadRequestException('executedBy is required');
    }

    if (action.executeAfter && action.executeAfter > new Date()) {
      throw new BadRequestException('Admin action is still in delay window');
    }

    const payload = action.payload as AdminActionPayload | null;

    if (!payload || !('type' in payload)) {
      throw new BadRequestException('Admin action payload is invalid');
    }

    const executed = await this.executeAdminAction(action, payload, executedBy);

    const updated = await this.prisma.adminAction.update({
      where: { id: action.id },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        executedBy,
      },
    });

    await this.auditService.record({
      eventType: 'ADMIN_ACTION_EXECUTED',
      actor: executedBy,
      adminActionId: action.id,
      payload: payload as unknown as Prisma.InputJsonValue,
    });

    return {
      action: updated,
      result: executed,
    };
  }

  private async executeAdminAction(
    action: { id: string; requestedBy: string },
    payload: AdminActionPayload,
    actor: string,
  ) {
    if (payload.type === 'ISSUE_ACCESS_GRANT') {
      const expiresAt = payload.data.expiresAt
        ? new Date(payload.data.expiresAt)
        : null;

      if (expiresAt && Number.isNaN(expiresAt.getTime())) {
        throw new BadRequestException('expiresAt must be a valid date');
      }

      const grant = await this.accessGrantService.issueGrant({
        viewerId: payload.data.viewerId,
        exhibitionId: payload.data.exhibitionId ?? null,
        versionId: payload.data.versionId ?? null,
        expiresAt,
      });

      await this.auditService.record({
        eventType: 'ACCESS_GRANT_ISSUED',
        actor,
        adminActionId: action.id,
        entityType: 'AccessGrant',
        entityId: grant.id,
        payload: {
          viewerId: grant.viewerId,
          exhibitionId: grant.exhibitionId,
          versionId: grant.versionId,
          expiresAt: grant.expiresAt,
          revokedAt: grant.revokedAt,
          createdAt: grant.createdAt,
        },
      });

      return {
        id: grant.id,
        viewerId: grant.viewerId,
        exhibitionId: grant.exhibitionId,
        versionId: grant.versionId,
        expiresAt: grant.expiresAt,
        revokedAt: grant.revokedAt,
        createdAt: grant.createdAt,
      };
    }

    if (payload.type === 'REVOKE_ACCESS_GRANT') {
      const grant = await this.accessGrantService.revokeGrant(
        payload.data.grantId,
      );

      await this.auditService.record({
        eventType: 'ACCESS_GRANT_REVOKED',
        actor,
        adminActionId: action.id,
        entityType: 'AccessGrant',
        entityId: grant.id,
        payload: {
          viewerId: grant.viewerId,
          exhibitionId: grant.exhibitionId,
          versionId: grant.versionId,
          expiresAt: grant.expiresAt,
          revokedAt: grant.revokedAt,
          createdAt: grant.createdAt,
        },
      });

      return {
        id: grant.id,
        viewerId: grant.viewerId,
        exhibitionId: grant.exhibitionId,
        versionId: grant.versionId,
        expiresAt: grant.expiresAt,
        revokedAt: grant.revokedAt,
        createdAt: grant.createdAt,
      };
    }

    if (payload.type === 'UPDATE_CURATOR_POLICY') {
      const curator = await this.prisma.curator.findUnique({
        where: { id: payload.data.curatorId },
      });

      if (!curator) {
        throw new NotFoundException(
          `Curator not found: ${payload.data.curatorId}`,
        );
      }

      const policy = await this.prisma.curatorPolicy.upsert({
        where: { curatorId: payload.data.curatorId },
        create: {
          curatorId: payload.data.curatorId,
          nfcScopePolicy: payload.data.nfcScopePolicy,
        },
        update: {
          nfcScopePolicy: payload.data.nfcScopePolicy,
        },
      });

      await this.auditService.record({
        eventType: 'CURATOR_POLICY_UPDATED',
        actor,
        adminActionId: action.id,
        entityType: 'CuratorPolicy',
        entityId: policy.id,
        payload: {
          curatorId: policy.curatorId,
          nfcScopePolicy: policy.nfcScopePolicy,
          createdAt: policy.createdAt,
          updatedAt: policy.updatedAt,
        },
      });

      return {
        id: policy.id,
        curatorId: policy.curatorId,
        nfcScopePolicy: policy.nfcScopePolicy,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      };
    }

    if (payload.type === 'FORCE_UNPUBLISH_EXHIBITION') {
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: payload.data.exhibitionId },
      });

      if (!exhibition) {
        throw new NotFoundException(
          `Exhibition not found: ${payload.data.exhibitionId}`,
        );
      }

      const updated = await this.prisma.exhibition.update({
        where: { id: exhibition.id },
        data: {
          visibility: 'DRAFT',
          status: 'ARCHIVED',
        },
      });

      await this.auditService.record({
        eventType: 'EXHIBITION_FORCE_UNPUBLISHED',
        actor,
        adminActionId: action.id,
        entityType: 'Exhibition',
        entityId: updated.id,
        payload: {
          visibility: updated.visibility,
          status: updated.status,
        },
      });

      return {
        id: updated.id,
        visibility: updated.visibility,
        status: updated.status,
      };
    }

    if (payload.type === 'SUSPEND_CURATOR') {
      const curator = await this.prisma.curator.findUnique({
        where: { id: payload.data.curatorId },
      });

      if (!curator) {
        throw new NotFoundException(
          `Curator not found: ${payload.data.curatorId}`,
        );
      }

      const updated = await this.prisma.curator.update({
        where: { id: curator.id },
        data: {
          suspendedAt: new Date(),
          suspendedReason: payload.data.reason ?? null,
          tier: 'STANDARD',
        },
      });

      await this.auditService.record({
        eventType: 'CURATOR_SUSPENDED',
        actor,
        adminActionId: action.id,
        entityType: 'Curator',
        entityId: updated.id,
        payload: {
          suspendedAt: updated.suspendedAt,
          suspendedReason: updated.suspendedReason,
          tier: updated.tier,
        },
      });

      return {
        id: updated.id,
        suspendedAt: updated.suspendedAt,
        suspendedReason: updated.suspendedReason,
        tier: updated.tier,
      };
    }

    if (payload.type === 'UNSUSPEND_CURATOR') {
      const curator = await this.prisma.curator.findUnique({
        where: { id: payload.data.curatorId },
      });

      if (!curator) {
        throw new NotFoundException(
          `Curator not found: ${payload.data.curatorId}`,
        );
      }

      const updated = await this.prisma.curator.update({
        where: { id: curator.id },
        data: {
          suspendedAt: null,
          suspendedReason: null,
        },
      });

      await this.auditService.record({
        eventType: 'CURATOR_UNSUSPENDED',
        actor,
        adminActionId: action.id,
        entityType: 'Curator',
        entityId: updated.id,
        payload: {
          suspendedAt: updated.suspendedAt,
          suspendedReason: updated.suspendedReason,
        },
      });

      return {
        id: updated.id,
        suspendedAt: updated.suspendedAt,
        suspendedReason: updated.suspendedReason,
      };
    }

    if (payload.type === 'ENABLE_GOVERNANCE_POLICY') {
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: payload.data.exhibitionId },
      });

      if (!exhibition) {
        throw new NotFoundException(
          `Exhibition not found: ${payload.data.exhibitionId}`,
        );
      }

      const updated = await this.prisma.exhibition.update({
        where: { id: exhibition.id },
        data: {
          governanceMaskedAt: new Date(),
          governanceMaskReason: payload.data.reason ?? null,
        },
      });

      await this.auditService.record({
        eventType: 'EXHIBITION_GOVERNANCE_ENABLED',
        actor,
        adminActionId: action.id,
        entityType: 'Exhibition',
        entityId: updated.id,
        payload: {
          governanceMaskedAt: updated.governanceMaskedAt,
          governanceMaskReason: updated.governanceMaskReason,
        },
      });

      return {
        id: updated.id,
        governanceMaskedAt: updated.governanceMaskedAt,
        governanceMaskReason: updated.governanceMaskReason,
      };
    }

    if (payload.type === 'TRANSFER_EXHIBITION_OWNERSHIP') {
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: payload.data.exhibitionId },
      });

      if (!exhibition) {
        throw new NotFoundException(
          `Exhibition not found: ${payload.data.exhibitionId}`,
        );
      }

      const curator = await this.prisma.curator.findUnique({
        where: { id: payload.data.toCuratorId },
      });

      if (!curator) {
        throw new NotFoundException(
          `Curator not found: ${payload.data.toCuratorId}`,
        );
      }

      const updated = await this.prisma.exhibition.update({
        where: { id: exhibition.id },
        data: {
          curatorId: payload.data.toCuratorId,
        },
      });

      await this.auditService.record({
        eventType: 'EXHIBITION_OWNERSHIP_TRANSFERRED',
        actor,
        adminActionId: action.id,
        entityType: 'Exhibition',
        entityId: updated.id,
        payload: {
          fromCuratorId: exhibition.curatorId ?? null,
          toCuratorId: updated.curatorId,
          reason: payload.data.reason ?? null,
        },
      });

      return {
        id: updated.id,
        fromCuratorId: exhibition.curatorId ?? null,
        toCuratorId: updated.curatorId,
      };
    }

    throw new BadRequestException('Unsupported admin action');
  }
}
