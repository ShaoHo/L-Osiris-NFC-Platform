import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccessGrantService } from '../access/access-grant.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { Prisma } from '@prisma/client';

interface IssueAccessGrantPayload {
  type: 'ISSUE_ACCESS_GRANT';
  data: {
    viewerId: string;
    exhibitionId?: string | null;
    versionId?: string | null;
    expiresAt?: string | null;
  };
}

interface RevokeAccessGrantPayload {
  type: 'REVOKE_ACCESS_GRANT';
  data: {
    grantId: string;
  };
}

interface UpdateCuratorPolicyPayload {
  type: 'UPDATE_CURATOR_POLICY';
  data: {
    curatorId: string;
    nfcScopePolicy: 'EXHIBITION_ONLY' | 'EXHIBITION_AND_GALLERY';
  };
}

interface ForceUnpublishPayload {
  type: 'FORCE_UNPUBLISH_EXHIBITION';
  data: {
    exhibitionId: string;
  };
}

interface SuspendCuratorPayload {
  type: 'SUSPEND_CURATOR';
  data: {
    curatorId: string;
    reason?: string | null;
  };
}

type AdminActionPayload =
  | IssueAccessGrantPayload
  | RevokeAccessGrantPayload
  | UpdateCuratorPolicyPayload
  | ForceUnpublishPayload
  | SuspendCuratorPayload;

interface ConfirmAdminActionDto {
  confirmedBy: string;
}

interface ExecuteAdminActionDto {
  executedBy: string;
}

interface CancelAdminActionDto {
  cancelledBy: string;
  reason?: string | null;
}

@Controller('admin/actions')
@UseGuards(AdminAuthGuard)
export class AdminActionController {
  constructor(
    private prisma: PrismaService,
    private accessGrantService: AccessGrantService,
  ) {}

  @Post(':actionId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('actionId') actionId: string,
    @Body() dto: ConfirmAdminActionDto,
  ) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    if (!dto.confirmedBy) {
      throw new BadRequestException('confirmedBy is required');
    }

    const payload = action.payload as AdminActionPayload | null;

    if (!payload || !('type' in payload)) {
      throw new BadRequestException('Admin action payload is invalid');
    }

    if (action.status === 'PENDING') {
      const updated = await this.prisma.adminAction.update({
        where: { id: action.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedBy: dto.confirmedBy,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_ACTION_CONFIRMED',
          actor: dto.confirmedBy,
          adminActionId: action.id,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });

      return {
        id: updated.id,
        status: updated.status,
        confirmedAt: updated.confirmedAt,
        executeAfter: updated.executeAfter,
      };
    }

    return {
      id: action.id,
      status: action.status,
      confirmedAt: action.confirmedAt,
      executeAfter: action.executeAfter,
    };
  }

  @Post(':actionId/execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('actionId') actionId: string,
    @Body() dto: ExecuteAdminActionDto,
  ) {
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

    if (!dto.executedBy) {
      throw new BadRequestException('executedBy is required');
    }

    if (action.executeAfter && action.executeAfter > new Date()) {
      throw new BadRequestException('Admin action is still in delay window');
    }

    const payload = action.payload as AdminActionPayload | null;

    if (!payload || !('type' in payload)) {
      throw new BadRequestException('Admin action payload is invalid');
    }

    const executed = await this.executeAdminAction(action, payload);

    const updated = await this.prisma.adminAction.update({
      where: { id: action.id },
      data: {
        status: 'EXECUTED',
        executedAt: new Date(),
        executedBy: dto.executedBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_EXECUTED',
        actor: dto.executedBy,
        adminActionId: action.id,
        payload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      result: executed,
    };
  }

  @Post(':actionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('actionId') actionId: string,
    @Body() dto: CancelAdminActionDto,
  ) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (!dto.cancelledBy) {
      throw new BadRequestException('cancelledBy is required');
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    const payload = action.payload as AdminActionPayload | null;

    const updated = await this.prisma.adminAction.update({
      where: { id: action.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: dto.cancelledBy,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_CANCELLED',
        actor: dto.cancelledBy,
        adminActionId: action.id,
        payload: {
          ...(payload ?? {}),
          reason: dto.reason ?? null,
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt,
    };
  }

  private async executeAdminAction(
    action: { id: string; requestedBy: string },
    payload: AdminActionPayload,
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

      await this.prisma.auditLog.create({
        data: {
          eventType: 'ACCESS_GRANT_ISSUED',
          actor: action.requestedBy,
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

      await this.prisma.auditLog.create({
        data: {
          eventType: 'ACCESS_GRANT_REVOKED',
          actor: action.requestedBy,
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

      await this.prisma.auditLog.create({
        data: {
          eventType: 'CURATOR_POLICY_UPDATED',
          actor: action.requestedBy,
          adminActionId: action.id,
          entityType: 'CuratorPolicy',
          entityId: policy.id,
          payload: {
            curatorId: policy.curatorId,
            nfcScopePolicy: policy.nfcScopePolicy,
            createdAt: policy.createdAt,
            updatedAt: policy.updatedAt,
          },
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

      await this.prisma.auditLog.create({
        data: {
          eventType: 'EXHIBITION_FORCE_UNPUBLISHED',
          actor: action.requestedBy,
          adminActionId: action.id,
          entityType: 'Exhibition',
          entityId: updated.id,
          payload: {
            visibility: updated.visibility,
            status: updated.status,
          },
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

      await this.prisma.auditLog.create({
        data: {
          eventType: 'CURATOR_SUSPENDED',
          actor: action.requestedBy,
          adminActionId: action.id,
          entityType: 'Curator',
          entityId: updated.id,
          payload: {
            suspendedAt: updated.suspendedAt,
            suspendedReason: updated.suspendedReason,
            tier: updated.tier,
          },
        },
      });

      return {
        id: updated.id,
        suspendedAt: updated.suspendedAt,
        suspendedReason: updated.suspendedReason,
        tier: updated.tier,
      };
    }

    throw new BadRequestException('Unsupported admin action');
  }
}
