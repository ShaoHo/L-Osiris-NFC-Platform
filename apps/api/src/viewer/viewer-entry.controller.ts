import {
  Controller,
  Get,
  Param,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { Viewer } from '../auth/viewer.decorator';

@Controller('viewer')
export class ViewerEntryController {
  constructor(private prisma: PrismaService) {}

  @Get('entry/:publicTagId')
  @UseGuards(OptionalViewerAuthGuard)
  async resolve(
    @Param('publicTagId') publicTagId: string,
    @Viewer() viewer?: { viewerId?: string; sessionId?: string },
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
    if (!viewer?.sessionId) {
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

    if (!viewer.viewerId) {
      return {
        requiresUpgrade: true,
        exhibition: {
          id: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          status: exhibition.status,
          visibility: exhibition.visibility,
        },
      };
    }

    const viewerId = viewer.viewerId;

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

    // Compute dayIndex
    const now = new Date();
    const daysSinceActivation = Math.floor(
      (now.getTime() - state.activatedAt.getTime()) / 86400000,
    );
    const dayIndex = Math.min(exhibition.totalDays, daysSinceActivation + 1);

    // Load Exhibit
    const exhibit = await this.prisma.exhibit.findUnique({
      where: {
        exhibitionId_dayIndex: {
          exhibitionId: exhibition.id,
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
        type: exhibition.type,
        totalDays: exhibition.totalDays,
        status: exhibition.status,
        visibility: exhibition.visibility,
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
