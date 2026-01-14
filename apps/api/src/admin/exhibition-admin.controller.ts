import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminAccessGuard } from './admin-access.guard';
import { buildSoftDeleteData } from '../utils/soft-delete';
import { AuditService } from '../audit/audit.service';

interface AdminRequestDto {
  requestedBy: string;
}

interface ForceUnpublishDto extends AdminRequestDto {}

interface SoftDeleteDto extends AdminRequestDto {
  retentionDays?: number;
}

interface SuspendCuratorDto extends AdminRequestDto {
  reason?: string | null;
}

interface EnableGovernancePolicyDto extends AdminRequestDto {
  reason?: string | null;
}

@Controller('admin')
@UseGuards(AdminAuthGuard, AdminAccessGuard)
export class ExhibitionAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Post('exhibitions/:exhibitionId/force-unpublish')
  @HttpCode(HttpStatus.OK)
  async requestForceUnpublish(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: ForceUnpublishDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const payload = {
      type: 'FORCE_UNPUBLISH_EXHIBITION',
      data: { exhibitionId },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'FORCE_UNPUBLISH_EXHIBITION',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.auditService.record({
      eventType: 'ADMIN_ACTION_REQUESTED',
      actor: dto.requestedBy,
      adminActionId: action.id,
      payload,
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }

  @Post('curators/:curatorId/suspend')
  @HttpCode(HttpStatus.OK)
  async requestSuspendCurator(
    @Param('curatorId') curatorId: string,
    @Body() dto: SuspendCuratorDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const curator = await this.prisma.curator.findUnique({
      where: { id: curatorId },
    });

    if (!curator) {
      throw new NotFoundException(`Curator not found: ${curatorId}`);
    }

    const payload = {
      type: 'SUSPEND_CURATOR',
      data: { curatorId, reason: dto.reason ?? null },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'SUSPEND_CURATOR',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.auditService.record({
      eventType: 'ADMIN_ACTION_REQUESTED',
      actor: dto.requestedBy,
      adminActionId: action.id,
      payload,
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }

  @Post('exhibitions/:exhibitionId/governance/enable')
  @HttpCode(HttpStatus.OK)
  async requestEnableGovernancePolicy(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: EnableGovernancePolicyDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const payload = {
      type: 'ENABLE_GOVERNANCE_POLICY',
      data: { exhibitionId, reason: dto.reason ?? null },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'ENABLE_GOVERNANCE_POLICY',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.auditService.record({
      eventType: 'ADMIN_ACTION_REQUESTED',
      actor: dto.requestedBy,
      adminActionId: action.id,
      payload,
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }

  @Post('exhibitions/:exhibitionId/delete')
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: SoftDeleteDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const { deletedAt, purgeAfter } = buildSoftDeleteData({
      retentionDays: dto.retentionDays,
    });

    const updated = await this.prisma.exhibition.update({
      where: { id: exhibitionId },
      data: {
        deletedAt,
        purgeAfter,
      },
    });

    await this.auditService.record({
      eventType: 'EXHIBITION_SOFT_DELETED',
      actor: dto.requestedBy,
      entityType: 'Exhibition',
      entityId: updated.id,
      payload: {
        deletedAt: updated.deletedAt,
        purgeAfter: updated.purgeAfter,
      },
    });

    return {
      id: updated.id,
      deletedAt: updated.deletedAt,
      purgeAfter: updated.purgeAfter,
    };
  }

  @Post('exhibitions/:exhibitionId/restore')
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: AdminRequestDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const updated = await this.prisma.exhibition.update({
      where: { id: exhibitionId },
      data: {
        deletedAt: null,
        purgeAfter: null,
      },
    });

    await this.auditService.record({
      eventType: 'EXHIBITION_RESTORED',
      actor: dto.requestedBy,
      entityType: 'Exhibition',
      entityId: updated.id,
    });

    return {
      id: updated.id,
      deletedAt: updated.deletedAt,
      purgeAfter: updated.purgeAfter,
    };
  }

  @Post('exhibitions/:exhibitionId/purge')
  @HttpCode(HttpStatus.OK)
  async purge(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: AdminRequestDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    if (!exhibition.purgeAfter || exhibition.purgeAfter > new Date()) {
      throw new BadRequestException('Exhibition is not ready for purge');
    }

    await this.prisma.exhibition.delete({
      where: { id: exhibitionId },
    });

    await this.auditService.record({
      eventType: 'EXHIBITION_PURGED',
      actor: dto.requestedBy,
      entityType: 'Exhibition',
      entityId: exhibitionId,
    });

    return { id: exhibitionId, purged: true };
  }
}
