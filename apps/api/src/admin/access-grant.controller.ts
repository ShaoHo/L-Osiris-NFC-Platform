import {
  Body,
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface IssueAccessGrantDto {
  viewerId: string;
  exhibitionId?: string;
  versionId?: string;
  expiresAt?: string | null;
  requestedBy: string;
}

interface RevokeAccessGrantDto {
  requestedBy: string;
}

@Controller('admin/access-grants')
export class AccessGrantAdminController {
  constructor(
    private prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async issue(@Body() dto: IssueAccessGrantDto) {
    const { viewerId, exhibitionId, versionId, expiresAt, requestedBy } = dto;

    if (!viewerId) {
      throw new BadRequestException('viewerId is required');
    }

    if (!requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    if (!exhibitionId && !versionId) {
      throw new BadRequestException('exhibitionId or versionId is required');
    }

    const viewer = await this.prisma.viewerProfile.findUnique({
      where: { id: viewerId },
    });

    if (!viewer) {
      throw new NotFoundException(`Viewer not found: ${viewerId}`);
    }

    let resolvedExhibitionId = exhibitionId ?? null;

    if (exhibitionId) {
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: exhibitionId },
      });

      if (!exhibition) {
        throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
      }
    }

    if (versionId) {
      const version = await this.prisma.exhibitionVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) {
        throw new NotFoundException(`Exhibition version not found: ${versionId}`);
      }

      if (resolvedExhibitionId && version.exhibitionId !== resolvedExhibitionId) {
        throw new BadRequestException('Version does not belong to exhibition');
      }

      resolvedExhibitionId = resolvedExhibitionId ?? version.exhibitionId;
    }

    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (Number.isNaN(parsedExpiresAt.getTime())) {
        throw new BadRequestException('expiresAt must be a valid date');
      }
    }

    const payload = {
      type: 'ISSUE_ACCESS_GRANT',
      data: {
        viewerId,
        exhibitionId: resolvedExhibitionId,
        versionId: versionId ?? null,
        expiresAt: parsedExpiresAt ? parsedExpiresAt.toISOString() : null,
      },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'ISSUE_ACCESS_GRANT',
        status: 'PENDING',
        requestedBy,
        payload,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_REQUESTED',
        actor: requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      createdAt: action.createdAt,
    };
  }

  @Post(':grantId/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @Param('grantId') grantId: string,
    @Body() dto: RevokeAccessGrantDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    const existing = await this.prisma.accessGrant.findUnique({
      where: { id: grantId },
    });

    if (!existing) {
      throw new NotFoundException(`Access grant not found: ${grantId}`);
    }

    const payload = {
      type: 'REVOKE_ACCESS_GRANT',
      data: { grantId },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'REVOKE_ACCESS_GRANT',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
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
      createdAt: action.createdAt,
    };
  }
}
