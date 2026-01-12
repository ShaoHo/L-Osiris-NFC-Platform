import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { ViewerId, ViewerSessionId } from '../auth/viewer.decorator';

@Controller('viewer')
export class ViewerEntryController {
  constructor(private prisma: PrismaService) {}

  @Get('entry/:publicTagId')
  @UseGuards(OptionalViewerAuthGuard)
  async resolve(
    @Param('publicTagId') publicTagId: string,
    @ViewerId() viewerId?: string,
    @ViewerSessionId() sessionId?: string,
  ) {
    // Find NfcTag by publicTagId
    const nfcTag = await this.prisma.nfcTag.findUnique({
      where: { publicTagId },
      include: { boundExhibition: true },
    });

    if (!nfcTag) {
      throw new NotFoundException(`NFC tag not found: ${publicTagId}`);
    }

    const exhibition = nfcTag.boundExhibition;
    if (!exhibition) {
      throw new NotFoundException(`NFC tag ${publicTagId} is not bound to an exhibition`);
    }

    // If no auth, return requiresClaim
    if (!viewerId) {
      return {
        requiresClaim: true,
        exhibition: {
          id: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          status: exhibition.status,
          visibility: exhibition.visibility,
        },
      };
    }

    // Find ViewerExhibitionState
    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerId_exhibitionId: {
          viewerId,
          exhibitionId: exhibition.id,
        },
      },
      include: {
        viewer: true,
      },
    });

    // If no state or not activated, return requiresActivate
    if (!state || !state.activatedAt) {
      return {
        requiresActivate: true,
        exhibition: {
          id: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          status: exhibition.status,
          visibility: exhibition.visibility,
        },
      };
    }

    if (!sessionId) {
      throw new NotFoundException('Viewer session not found');
    }

    const latestRun = await this.prisma.exhibitionRun.findFirst({
      where: {
        viewerSessionId: sessionId,
        version: {
          exhibitionId: exhibition.id,
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });

    if (!latestRun) {
      throw new NotFoundException('Exhibition run not found');
    }

    const resolvedVersion = await this.prisma.exhibitionVersion.findUnique({
      where: {
        id: latestRun.versionId,
      },
    });

    if (!resolvedVersion) {
      throw new NotFoundException('Exhibition version not found');
    }

    const resolvedTotalDays = resolvedVersion.totalDays;

    // Compute dayIndex
    const now = new Date();
    const daysSinceActivation = Math.floor(
      (now.getTime() - state.activatedAt.getTime()) / 86400000,
    );
    const dayIndex = Math.min(resolvedTotalDays, daysSinceActivation + 1);

    // Load Exhibit
    const exhibit = await this.prisma.exhibit.findUnique({
      where: {
        exhibitionId_dayIndex: {
          exhibitionId: resolvedVersion.exhibitionId,
          dayIndex,
        },
      },
    });

    // Prepare render based on mode
    let render: any = null;
    if (exhibit) {
      if (exhibit.mode === 'BLOCKS') {
        render = {
          mode: 'BLOCKS',
          blocks: exhibit.blocksJson || [],
        };
      } else if (exhibit.mode === 'HTML') {
        render = {
          mode: 'HTML',
          html: exhibit.html || '',
          css: exhibit.css || '',
        };
      }
    }

    return {
      exhibition: {
        id: exhibition.id,
        type: resolvedVersion.type,
        totalDays: resolvedTotalDays,
        status: resolvedVersion.status,
        visibility: resolvedVersion.visibility,
      },
      viewer: {
        id: state.viewer.id,
        nickname: state.viewer.nickname,
      },
      state: {
        status: state.status,
        activatedAt: state.activatedAt,
        pausedAt: state.pausedAt,
        lastDayIndex: state.lastDayIndex,
      },
      exhibit: {
        dayIndex,
        render,
      },
    };
  }
}
