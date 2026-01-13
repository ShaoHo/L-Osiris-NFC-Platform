import {
  Controller,
  Post,
  Patch,
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
import { Viewer, ViewerId, ViewerSessionId } from '../auth/viewer.decorator';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { MarketingOutboxService } from '../jobs/marketing-outbox.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { Prisma } from '@prisma/client';
import type { ViewerProfile } from '@prisma/client';

interface ClaimDto {
  publicTagId: string;
  nickname?: string | null;
}

interface ActivateDto {
  mode: 'RESTART' | 'CONTINUE';
}

interface UpgradeDto {
  nickname: string;
}

interface UpdateExhibitionStateDto {
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  lastDayIndex?: number;
}

@Controller('viewer')
export class ViewerController {
  constructor(
    private prisma: PrismaService,
    private marketingOutboxService: MarketingOutboxService,
    private accessPolicyService: AccessPolicyService,
  ) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  async claim(@Body() dto: ClaimDto) {
    const { publicTagId, nickname } = dto;
    const displayName = nickname?.trim() || null;

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

    let viewerProfile: ViewerProfile | null = null;
    if (displayName) {
      // Create ViewerProfile
      viewerProfile = await this.prisma.viewerProfile.create({
        data: { nickname: displayName },
      });

      await this.marketingOutboxService.enqueueContactSync({
        contactType: 'VIEWER',
        contactId: viewerProfile.id,
      });
    }

    // Create ViewerSession with random token
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.viewerSession.create({
      data: {
        viewerId: viewerProfile?.id ?? null,
        nfcTagId: nfcTag.id,
        tokenHash,
        displayName,
        expiresAt,
      },
    });

    return {
      viewerId: viewerProfile?.id ?? null,
      nickname: viewerProfile?.nickname ?? null,
      exhibitionId: nfcTag.boundExhibitionId,
      sessionToken: rawToken,
    };
  }

  @Post('upgrade')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgrade(
    @Body() dto: UpgradeDto,
    @ViewerId() viewerId?: string,
    @Viewer() viewer?: { sessionId?: string },
  ) {
    const nickname = dto.nickname?.trim();
    if (!nickname) {
      throw new BadRequestException('Nickname is required to upgrade a session');
    }

    if (viewerId) {
      const existingProfile = await this.prisma.viewerProfile.findUnique({
        where: { id: viewerId },
      });

      return {
        viewerId: existingProfile?.id ?? viewerId,
        nickname: existingProfile?.nickname ?? nickname,
      };
    }

    const sessionId = viewer?.sessionId;
    if (!sessionId) {
      throw new BadRequestException('Session is required to upgrade');
    }

    const newProfile = await this.prisma.viewerProfile.create({
      data: { nickname },
    });

    await this.marketingOutboxService.enqueueContactSync({
      contactType: 'VIEWER',
      contactId: newProfile.id,
    });

    await this.prisma.viewerSession.update({
      where: { id: sessionId },
      data: {
        viewerId: newProfile.id,
        displayName: nickname,
      },
    });

    return {
      viewerId: newProfile.id,
      nickname: newProfile.nickname,
    };
  }

  @Post('exhibitions/:exhibitionId/activate')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: ActivateDto,
    @ViewerId() viewerId: string | undefined,
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

    const policy = await this.accessPolicyService.canAccessExhibition({
      exhibitionId: exhibition.id,
      viewerId,
      sessionId,
    });

    if (!policy.allowed) {
      if (policy.reason === 'GRANT_REQUIRED') {
        throw new BadRequestException('Access grant required to activate exhibition');
      }
      throw new BadRequestException('Exhibition access is restricted by policy');
    }

    const now = new Date();
    const versionWhere: Prisma.ExhibitionVersionWhereInput = {
      exhibitionId: exhibition.id,
      status: 'ACTIVE',
    };

    if (exhibition.visibility === 'PUBLIC') {
      versionWhere.visibility = 'PUBLIC';
    }

    const latestPublishedVersion = await this.prisma.exhibitionVersion.findFirst(
      {
        where: versionWhere,
        orderBy: {
          createdAt: 'desc',
        },
      },
    );

    if (!latestPublishedVersion) {
      throw new BadRequestException(
        'No published exhibition version available to activate',
      );
    }

    if (mode === 'RESTART') {
      const [run] = await this.prisma.$transaction([
        this.prisma.exhibitionRun.create({
          data: {
            viewerSessionId: sessionId,
            versionId: latestPublishedVersion.id,
            startedAt: now,
            restartFromDay: 1,
          },
        }),
        this.prisma.viewerExhibitionState.upsert({
          where: {
            viewerSessionId_exhibitionId: {
              viewerSessionId: sessionId,
              exhibitionId,
            },
          },
          create: {
            viewerId: viewerId ?? null,
            viewerSessionId: sessionId,
            exhibitionId,
            status: 'ACTIVE',
            activatedAt: now,
            lastDayIndex: 1,
            pausedAt: null,
          },
          update: {
            viewerId: viewerId ?? undefined,
            status: 'ACTIVE',
            activatedAt: now,
            lastDayIndex: 1,
            pausedAt: null,
          },
        }),
      ]);

      await this.prisma.auditLog.create({
        data: {
          eventType: 'EXHIBITION_RUN_STARTED',
          actor: viewerId ?? null,
          entityType: 'ExhibitionRun',
          entityId: run.id,
          payload: {
            exhibitionId,
            versionId: run.versionId,
            viewerSessionId: run.viewerSessionId,
            restartFromDay: run.restartFromDay,
          },
        },
      });
    } else if (mode === 'CONTINUE') {
      const existing = await this.prisma.viewerExhibitionState.findUnique({
        where: {
          viewerSessionId_exhibitionId: {
            viewerSessionId: sessionId,
            exhibitionId,
          },
        },
      });

      const [run] = await this.prisma.$transaction([
        this.prisma.exhibitionRun.create({
          data: {
            viewerSessionId: sessionId,
            versionId: latestPublishedVersion.id,
            startedAt: now,
            restartFromDay: existing?.lastDayIndex || 1,
          },
        }),
        this.prisma.viewerExhibitionState.upsert({
          where: {
            viewerSessionId_exhibitionId: {
              viewerSessionId: sessionId,
              exhibitionId,
            },
          },
          create: {
            viewerId: viewerId ?? null,
            viewerSessionId: sessionId,
            exhibitionId,
            status: 'ACTIVE',
            activatedAt: now,
            pausedAt: null,
            lastDayIndex: existing?.lastDayIndex || 1,
          },
          update: {
            viewerId: viewerId ?? undefined,
            status: 'ACTIVE',
            activatedAt: existing?.activatedAt || now,
            pausedAt: null,
          },
        }),
      ]);

      await this.prisma.auditLog.create({
        data: {
          eventType: 'EXHIBITION_RUN_STARTED',
          actor: viewerId ?? null,
          entityType: 'ExhibitionRun',
          entityId: run.id,
          payload: {
            exhibitionId,
            versionId: run.versionId,
            viewerSessionId: run.viewerSessionId,
            restartFromDay: run.restartFromDay,
          },
        },
      });
    }

    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
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

  @Post('exhibitions/:exhibitionId/pause')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async pause(
    @Param('exhibitionId') exhibitionId: string,
    @ViewerId() viewerId: string | undefined,
    @ViewerSessionId() sessionId: string,
  ) {
    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
    });

    if (!state) {
      throw new NotFoundException(
        `Exhibition state not found for session: ${exhibitionId}`,
      );
    }

    const updated = await this.prisma.viewerExhibitionState.update({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
      data: {
        viewerId: viewerId ?? undefined,
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });

    return {
      viewerId: updated.viewerId,
      exhibitionId: updated.exhibitionId,
      status: updated.status,
      activatedAt: updated.activatedAt,
      pausedAt: updated.pausedAt,
      lastDayIndex: updated.lastDayIndex,
    };
  }

  @Post('exhibitions/:exhibitionId/resume')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resume(
    @Param('exhibitionId') exhibitionId: string,
    @ViewerId() viewerId: string | undefined,
    @ViewerSessionId() sessionId: string,
  ) {
    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
    });

    if (!state) {
      throw new NotFoundException(
        `Exhibition state not found for session: ${exhibitionId}`,
      );
    }

    const updated = await this.prisma.viewerExhibitionState.update({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
      data: {
        viewerId: viewerId ?? undefined,
        status: 'ACTIVE',
        pausedAt: null,
      },
    });

    return {
      viewerId: updated.viewerId,
      exhibitionId: updated.exhibitionId,
      status: updated.status,
      activatedAt: updated.activatedAt,
      pausedAt: updated.pausedAt,
      lastDayIndex: updated.lastDayIndex,
    };
  }

  @Patch('exhibitions/:exhibitionId/state')
  @UseGuards(ViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async patchState(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: UpdateExhibitionStateDto,
    @ViewerId() viewerId: string | undefined,
    @ViewerSessionId() sessionId: string,
  ) {
    if (dto.status === undefined && dto.lastDayIndex === undefined) {
      throw new BadRequestException('State update requires status or lastDayIndex');
    }

    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
    });

    if (!state) {
      throw new NotFoundException(
        `Exhibition state not found for session: ${exhibitionId}`,
      );
    }

    const data: {
      viewerId?: string;
      status?: Prisma.ViewerExhibitionStatus;
      pausedAt?: Date | null;
      lastDayIndex?: number;
    } = {};

    if (viewerId) {
      data.viewerId = viewerId;
    }

    if (dto.status) {
      const allowedStatuses: Prisma.ViewerExhibitionStatus[] = [
        'ACTIVE',
        'PAUSED',
        'COMPLETED',
      ];
      if (!allowedStatuses.includes(dto.status as Prisma.ViewerExhibitionStatus)) {
        throw new BadRequestException(`Invalid status: ${dto.status}`);
      }
      data.status = dto.status as Prisma.ViewerExhibitionStatus;
      if (dto.status === 'PAUSED') {
        data.pausedAt = new Date();
      } else {
        data.pausedAt = null;
      }
    }

    if (dto.lastDayIndex !== undefined) {
      const lastDayIndex = Number(dto.lastDayIndex);
      if (!Number.isInteger(lastDayIndex) || lastDayIndex < 1) {
        throw new BadRequestException('lastDayIndex must be a positive integer');
      }
      let resolvedTotalDays: number | undefined;
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: exhibitionId },
        select: { totalDays: true },
      });

      if (exhibition) {
        resolvedTotalDays = exhibition.totalDays;
      } else {
        const latestActiveVersion =
          await this.prisma.exhibitionVersion.findFirst({
            where: {
              exhibitionId,
              status: 'ACTIVE',
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              totalDays: true,
            },
          });

        if (!latestActiveVersion) {
          throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
        }

        resolvedTotalDays = latestActiveVersion.totalDays;
      }

      if (lastDayIndex > resolvedTotalDays) {
        throw new BadRequestException(
          'lastDayIndex exceeds totalDays for exhibition',
        );
      }
      data.lastDayIndex = lastDayIndex;
    }

    const updated = await this.prisma.viewerExhibitionState.update({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId,
        },
      },
      data,
    });

    return {
      viewerId: updated.viewerId,
      exhibitionId: updated.exhibitionId,
      status: updated.status,
      activatedAt: updated.activatedAt,
      pausedAt: updated.pausedAt,
      lastDayIndex: updated.lastDayIndex,
    };
  }
}
