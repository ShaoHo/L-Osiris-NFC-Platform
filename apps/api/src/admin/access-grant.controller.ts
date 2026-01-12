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
import { AccessGrantService } from '../access/access-grant.service';

interface IssueAccessGrantDto {
  viewerId: string;
  exhibitionId?: string;
  versionId?: string;
  expiresAt?: string | null;
}

@Controller('admin/access-grants')
export class AccessGrantAdminController {
  constructor(
    private prisma: PrismaService,
    private accessGrantService: AccessGrantService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async issue(@Body() dto: IssueAccessGrantDto) {
    const { viewerId, exhibitionId, versionId, expiresAt } = dto;

    if (!viewerId) {
      throw new BadRequestException('viewerId is required');
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

    const grant = await this.accessGrantService.issueGrant({
      viewerId,
      exhibitionId: resolvedExhibitionId,
      versionId: versionId ?? null,
      expiresAt: parsedExpiresAt,
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

  @Post(':grantId/revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(@Param('grantId') grantId: string) {
    const existing = await this.prisma.accessGrant.findUnique({
      where: { id: grantId },
    });

    if (!existing) {
      throw new NotFoundException(`Access grant not found: ${grantId}`);
    }

    const grant = await this.accessGrantService.revokeGrant(grantId);

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
}
