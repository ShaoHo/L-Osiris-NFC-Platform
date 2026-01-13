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
import { InternalAdminGuard } from '../auth/internal-admin.guard';

interface InternalAdminRequestDto {
  requestedBy: string;
}

interface InternalAdminSuspendDto extends InternalAdminRequestDto {
  reason?: string | null;
}

interface InternalAdminTransferDto extends InternalAdminRequestDto {
  toCuratorId: string;
  reason?: string | null;
}

@Controller('internal/admin')
@UseGuards(InternalAdminGuard)
export class InternalAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('curators/:curatorId/suspend')
  @HttpCode(HttpStatus.OK)
  async requestSuspendCurator(
    @Param('curatorId') curatorId: string,
    @Body() dto: InternalAdminSuspendDto,
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

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_REQUESTED',
        actor: dto.requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }

  @Post('curators/:curatorId/unsuspend')
  @HttpCode(HttpStatus.OK)
  async requestUnsuspendCurator(
    @Param('curatorId') curatorId: string,
    @Body() dto: InternalAdminRequestDto,
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
      type: 'UNSUSPEND_CURATOR',
      data: { curatorId },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'UNSUSPEND_CURATOR',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_REQUESTED',
        actor: dto.requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }

  @Post('exhibitions/:exhibitionId/transfer')
  @HttpCode(HttpStatus.OK)
  async requestTransferOwnership(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: InternalAdminTransferDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    if (!dto.toCuratorId) {
      throw new BadRequestException('toCuratorId is required');
    }

    const [exhibition, curator] = await Promise.all([
      this.prisma.exhibition.findUnique({ where: { id: exhibitionId } }),
      this.prisma.curator.findUnique({ where: { id: dto.toCuratorId } }),
    ]);

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    if (!curator) {
      throw new NotFoundException(`Curator not found: ${dto.toCuratorId}`);
    }

    if (exhibition.curatorId === dto.toCuratorId) {
      throw new BadRequestException('Exhibition already owned by curator');
    }

    const payload = {
      type: 'TRANSFER_EXHIBITION_OWNERSHIP',
      data: {
        exhibitionId,
        fromCuratorId: exhibition.curatorId ?? null,
        toCuratorId: dto.toCuratorId,
        reason: dto.reason ?? null,
      },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'TRANSFER_EXHIBITION_OWNERSHIP',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_REQUESTED',
        actor: dto.requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      executeAfter: action.executeAfter,
    };
  }
}
