import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccessGrantService } from '../access/access-grant.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

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

type AdminActionPayload =
  | IssueAccessGrantPayload
  | RevokeAccessGrantPayload
  | UpdateCuratorPolicyPayload;

@Controller('admin/actions')
@UseGuards(AdminAuthGuard)
export class AdminActionController {
  constructor(
    private prisma: PrismaService,
    private accessGrantService: AccessGrantService,
  ) {}

  @Post(':actionId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('actionId') actionId: string) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    const payload = action.payload as AdminActionPayload | null;

    if (!payload || !('type' in payload)) {
      throw new BadRequestException('Admin action payload is invalid');
    }

    if (action.status === 'PENDING') {
      await this.prisma.adminAction.update({
        where: { id: action.id },
        data: { status: 'CONFIRMED' },
      });

      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_ACTION_CONFIRMED',
          actor: action.requestedBy,
          adminActionId: action.id,
          payload,
        },
      });
    }

    const executed = await this.executeAdminAction(action, payload);

    await this.prisma.adminAction.update({
      where: { id: action.id },
      data: { status: 'EXECUTED' },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_EXECUTED',
        actor: action.requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: 'EXECUTED',
      result: executed,
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

    throw new BadRequestException('Unsupported admin action');
  }
}
