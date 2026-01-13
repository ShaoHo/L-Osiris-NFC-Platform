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

interface UpdateRevenueShareDto {
  curatorShareBps: number;
  platformShareBps: number;
  requestedBy: string;
}

@Controller('admin/curators/:curatorId/revenue-share')
@UseGuards(AdminAuthGuard)
export class RevenueShareAdminController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async updateRevenueShare(
    @Param('curatorId') curatorId: string,
    @Body() dto: UpdateRevenueShareDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    if (dto.curatorShareBps === undefined || dto.curatorShareBps === null) {
      throw new BadRequestException('curatorShareBps is required');
    }

    if (dto.platformShareBps === undefined || dto.platformShareBps === null) {
      throw new BadRequestException('platformShareBps is required');
    }

    if (!Number.isInteger(dto.curatorShareBps) || dto.curatorShareBps < 0) {
      throw new BadRequestException('curatorShareBps must be a non-negative integer');
    }

    if (!Number.isInteger(dto.platformShareBps) || dto.platformShareBps < 0) {
      throw new BadRequestException('platformShareBps must be a non-negative integer');
    }

    if (dto.curatorShareBps + dto.platformShareBps !== 10_000) {
      throw new BadRequestException('curatorShareBps and platformShareBps must sum to 10000');
    }

    const curator = await this.prisma.curator.findUnique({
      where: { id: curatorId },
    });

    if (!curator) {
      throw new NotFoundException(`Curator not found: ${curatorId}`);
    }

    const existing = await this.prisma.revenueShareConfig.findUnique({
      where: { curatorId },
    });

    const updated = await this.prisma.revenueShareConfig.upsert({
      where: { curatorId },
      create: {
        curatorId,
        curatorShareBps: dto.curatorShareBps,
        platformShareBps: dto.platformShareBps,
      },
      update: {
        curatorShareBps: dto.curatorShareBps,
        platformShareBps: dto.platformShareBps,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'REVENUE_SHARE_UPDATED',
        actor: dto.requestedBy,
        entityType: 'RevenueShareConfig',
        entityId: updated.id,
        payload: {
          curatorId: updated.curatorId,
          previous: existing
            ? {
                curatorShareBps: existing.curatorShareBps,
                platformShareBps: existing.platformShareBps,
                updatedAt: existing.updatedAt,
              }
            : null,
          current: {
            curatorShareBps: updated.curatorShareBps,
            platformShareBps: updated.platformShareBps,
            updatedAt: updated.updatedAt,
          },
        },
      },
    });

    return {
      id: updated.id,
      curatorId: updated.curatorId,
      curatorShareBps: updated.curatorShareBps,
      platformShareBps: updated.platformShareBps,
      updatedAt: updated.updatedAt,
    };
  }
}
