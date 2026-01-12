import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class ViewerEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
  ) {}

  async resolveEntry(params: {
    publicTagId: string;
    viewerId?: string;
    sessionId?: string;
  }) {
    const nfcTag = await this.prisma.nfcTag.findUnique({
      where: { publicTagId: params.publicTagId },
      include: {
        boundExhibition: true,
        curator: {
          include: { policy: true },
        },
      },
    });

    if (!nfcTag) {
      throw new NotFoundException(`NFC tag not found: ${params.publicTagId}`);
    }

    const exhibition = nfcTag.boundExhibition;
    if (!exhibition) {
      throw new NotFoundException(
        `NFC tag ${params.publicTagId} is not bound to an exhibition`,
      );
    }

    let sessionId = params.sessionId;
    let sessionToken: string | null = null;
    if (!sessionId) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const session = await this.prisma.viewerSession.create({
        data: {
          viewerId: params.viewerId ?? null,
          nfcTagId: nfcTag.id,
          tokenHash,
          displayName: null,
          expiresAt,
        },
      });

      sessionId = session.id;
      sessionToken = rawToken;
    }

    const policy = await this.accessPolicyService.canAccessExhibition({
      exhibitionId: exhibition.id,
      viewerId: params.viewerId ?? null,
      sessionId,
    });

    if (!policy.allowed && policy.reason === 'GOVERNANCE_LOCKED') {
      throw new NotFoundException(
        `Exhibition ${exhibition.id} is not available for this curator policy`,
      );
    }

    if (!policy.allowed && policy.reason === 'MASKED') {
      throw new NotFoundException('Exhibition is not available');
    }

    if (!policy.allowed && policy.reason === 'GRANT_REQUIRED') {
      return {
        requiresGrant: true,
        sessionToken,
        exhibition: {
          id: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          status: exhibition.status,
          visibility: exhibition.visibility,
        },
      };
    }

    const state = await this.prisma.viewerExhibitionState.findUnique({
      where: {
        viewerSessionId_exhibitionId: {
          viewerSessionId: sessionId,
          exhibitionId: exhibition.id,
        },
      },
      include: {
        viewer: true,
      },
    });

    if (!state || !state.activatedAt) {
      return {
        requiresActivate: true,
        sessionToken,
        exhibition: {
          id: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          status: exhibition.status,
          visibility: exhibition.visibility,
        },
      };
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
    const now = new Date();
    const daysSinceRunStart = Math.floor(
      (now.getTime() - latestRun.startedAt.getTime()) / 86400000,
    );
    const dayIndex = Math.min(
      resolvedTotalDays,
      latestRun.restartFromDay + daysSinceRunStart,
    );

    const dayContent = await this.prisma.exhibitionDayContent.findUnique({
      where: {
        versionId_dayIndex_status: {
          versionId: resolvedVersion.id,
          dayIndex,
          status: 'PUBLISHED',
        },
      },
      include: {
        assets: true,
      },
    });

    const exhibit = await this.prisma.exhibit.findUnique({
      where: {
        exhibitionId_dayIndex: {
          exhibitionId: resolvedVersion.exhibitionId,
          dayIndex,
        },
      },
    });

    let render: any = null;
    if (dayContent) {
      render = {
        mode: 'HTML',
        html: dayContent.html || '',
        css: dayContent.css || '',
        assetRefs: dayContent.assetRefs || null,
        assets: dayContent.assets.map((asset) => ({
          id: asset.id,
          url: asset.assetUrl,
          thumbnailUrl: asset.thumbnailUrl,
          usageMetadata: asset.usageMetadata,
        })),
      };
    } else if (exhibit) {
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
      sessionToken,
      exhibition: {
        id: exhibition.id,
        type: resolvedVersion.type,
        totalDays: resolvedTotalDays,
        status: resolvedVersion.status,
        visibility: resolvedVersion.visibility,
      },
      viewer: {
        id: state.viewer?.id ?? null,
        nickname: state.viewer?.nickname ?? null,
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
