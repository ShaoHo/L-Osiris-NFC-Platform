import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ViewerAuthGuard } from '../auth/viewer-auth.guard';
import { ViewerId, ViewerSessionId } from '../auth/viewer.decorator';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';

interface ClaimDto {
  publicTagId: string;
  nickname: string;
}

interface ActivateDto {
  mode: 'RESTART' | 'CONTINUE';
}

@Controller('viewer')
export class ViewerController {
  constructor(private prisma: PrismaService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claim(@Body() dto: ClaimDto) {
    const { publicTagId, nickname } = dto;

    // Find NfcTag by publicTagId
    const nfcTag = await this.prisma.nfcTag.findUnique({
      where: { publicTagId },
      include: { boundExhibition: true },
    });

    if (!nfcTag) {
      throw new NotFoundException(`NFC tag not found: ${publicTagId}`);
    }

    if (!nfcTag.boundExhibitionId) {
      throw new BadRequestException(`NFC tag ${publicTagId} is not bound to an exhibition`);
    }

    // Create ViewerProfile
    const viewerProfile = await this.prisma.viewerProfile.create({
      data: { nickname },
    });

    // Create ViewerSession with random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.viewerSession.create({
      data: {
        viewerId: viewerProfile.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      viewerId: viewerProfile.id,
      nickname: viewerProfile.nickname,
      exhibitionId: nfcTag.boundExhibitionId,
      sessionToken: rawToken,
    };
  }

  @Post('exhibitions/:exhibitionId/activate')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: ActivateDto,
    @ViewerId() viewerId: string,
    @ViewerSessionId() sessionId: string,
  ) {
    const { mode } = dto;

    // Verify exhibition exists
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const now = new Date();
    const snapshotData = {
      exhibitionId: exhibition.id,
      type: exhibition.type,
      totalDays: exhibition.totalDays,
      visibility: exhibition.visibility,
      status: exhibition.status,
    };

    if (mode === 'RESTART') {
      const version = await this.prisma.exhibitionVersion.create({
        data: snapshotData,
      });

      await this.prisma.$transaction([
        this.prisma.viewerExhibitionState.upsert({
          where: {
            viewerId_exhibitionId: {
              viewerId,
              exhibitionId,
            },
          },
          create: {
            viewerId,
            exhibitionId,
            status: 'ACTIVE',
            activatedAt: now,
            lastDayIndex: 1,
            pausedAt: null,
          },
          update: {
            status: 'ACTIVE',
            activatedAt: now,
            lastDayIndex: 1,
            pausedAt: null,
          },
        }),
        this.prisma.exhibitionRun.create({
          data: {
            viewerSessionId: sessionId,
            versionId: version.id,
            startedAt: now,
            restartFromDay: 1,
          },
        }),
      ]);
    } else if (mode === 'CONTINUE') {
      const existing = await this.prisma.viewerExhibitionState.findUnique({
        where: {
          viewerId_exhibitionId: {
            viewerId,
            exhibitionId,
          },
        },
      });

      const latestRun = await this.prisma.exhibitionRun.findFirst({
        where: {
          viewerSessionId: sessionId,
          version: {
            exhibitionId,
          },
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      const versionId =
        latestRun?.versionId ||
        (await this.prisma.exhibitionVersion.create({ data: snapshotData })).id;

      await this.prisma.$transaction([
        this.prisma.viewerExhibitionState.upsert({
          where: {
            viewerId_exhibitionId: {
              viewerId,
              exhibitionId,
            },
          },
          create: {
            viewerId,
            exhibitionId,
            status: 'ACTIVE',
            activatedAt: now,
            pausedAt: null,
            lastDayIndex: existing?.lastDayIndex || 1,
          },
          update: {
            status: 'ACTIVE',
            activatedAt: existing?.activatedAt || now,
            pausedAt: null,
          },
        }),
        this.prisma.exhibitionRun.create({
          data: {
            viewerSessionId: sessionId,
            versionId,
            startedAt: now,
            restartFromDay: existing?.lastDayIndex || 1,
          },
        }),
      ]);
    }

    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerId_exhibitionId: {
          viewerId,
          exhibitionId,
        },
      },
      include: {
        viewer: true,
        exhibition: true,
      },
    });

    return {
      viewerId: state?.viewerId,
      exhibitionId: state?.exhibitionId,
      status: state?.status,
      activatedAt: state?.activatedAt,
      pausedAt: state?.pausedAt,
      lastDayIndex: state?.lastDayIndex,
    };
  }
}
