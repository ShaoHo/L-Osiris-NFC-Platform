import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ExhibitionDayContentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CuratorContext } from '../auth/curator.decorator';
import { sanitizeExhibitionHtml } from '../utils/html-sanitizer';

interface SaveDraftDto {
  html?: string | null;
  css?: string | null;
  assetRefs?: unknown;
}

interface CreateAssetMetadataDto {
  assetUrl: string;
  thumbnailUrl?: string | null;
  usageMetadata?: unknown;
}

@Injectable()
export class CuratorExhibitionDayContentService {
  constructor(private readonly prisma: PrismaService) {}

  async saveDraft(
    exhibitionId: string,
    dayIndex: number,
    dto: SaveDraftDto,
    curator: CuratorContext,
  ) {
    if (
      dto.html === undefined &&
      dto.css === undefined &&
      dto.assetRefs === undefined
    ) {
      throw new BadRequestException('No fields provided');
    }

    const { version } = await this.loadLatestVersion(exhibitionId, curator);

    if (dayIndex > version.totalDays) {
      throw new BadRequestException('dayIndex exceeds totalDays for exhibition');
    }

    const content = await this.prisma.exhibitionDayContent.upsert({
      where: {
        versionId_dayIndex_status: {
          versionId: version.id,
          dayIndex,
          status: 'DRAFT',
        },
      },
      create: {
        versionId: version.id,
        dayIndex,
        status: 'DRAFT',
        html: sanitizeExhibitionHtml(dto.html),
        css: dto.css ?? null,
        assetRefs: dto.assetRefs ?? Prisma.DbNull,
      },
      update: {
        html: dto.html !== undefined ? sanitizeExhibitionHtml(dto.html) : undefined,
        css: dto.css ?? undefined,
        assetRefs: dto.assetRefs ?? undefined,
      },
    });

    return {
      id: content.id,
      exhibitionId,
      versionId: content.versionId,
      dayIndex: content.dayIndex,
      status: content.status,
      updatedAt: content.updatedAt,
    };
  }

  async publishDay(
    exhibitionId: string,
    dayIndex: number,
    curator: CuratorContext,
  ) {
    const { exhibition, version } = await this.loadLatestVersion(
      exhibitionId,
      curator,
    );

    if (dayIndex > version.totalDays) {
      throw new BadRequestException('dayIndex exceeds totalDays for exhibition');
    }

    const draft = await this.prisma.exhibitionDayContent.findUnique({
      where: {
        versionId_dayIndex_status: {
          versionId: version.id,
          dayIndex,
          status: 'DRAFT',
        },
      },
    });

    if (!draft) {
      throw new NotFoundException('Draft content not found');
    }

    const publishedSourceContent = await this.prisma.exhibitionDayContent.findMany({
      where: {
        versionId: version.id,
        status: 'PUBLISHED',
      },
      include: {
        assets: true,
      },
    });

    const { published, newVersion } = await this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.exhibitionVersion.create({
        data: {
          exhibitionId: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          visibility: exhibition.visibility,
          status: exhibition.status,
        },
      });

      for (const content of publishedSourceContent) {
        const created = await tx.exhibitionDayContent.create({
          data: {
            versionId: newVersion.id,
            dayIndex: content.dayIndex,
            status: 'PUBLISHED',
            html: content.html,
            css: content.css,
            assetRefs: content.assetRefs ?? undefined,
          },
        });

        if (content.assets.length) {
          await tx.exhibitionDayAsset.createMany({
            data: content.assets.map((asset) => ({
              dayContentId: created.id,
              assetUrl: asset.assetUrl,
              thumbnailUrl: asset.thumbnailUrl ?? undefined,
              usageMetadata: asset.usageMetadata ?? undefined,
            })),
          });
        }
      }

      const published = await tx.exhibitionDayContent.upsert({
        where: {
          versionId_dayIndex_status: {
            versionId: newVersion.id,
            dayIndex,
            status: 'PUBLISHED',
          },
        },
        create: {
          versionId: newVersion.id,
          dayIndex,
          status: 'PUBLISHED',
          html: sanitizeExhibitionHtml(draft.html),
          css: draft.css,
          assetRefs: draft.assetRefs ?? undefined,
        },
        update: {
          html: sanitizeExhibitionHtml(draft.html),
          css: draft.css,
          assetRefs: draft.assetRefs ?? undefined,
        },
      });

      return { published, newVersion };
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'EXHIBITION_DAY_PUBLISHED',
        actor: curator.curatorId,
        entityType: 'ExhibitionVersion',
        entityId: newVersion.id,
        payload: {
          exhibitionId,
          dayIndex: published.dayIndex,
          publishedAt: published.updatedAt,
        },
      },
    });

    return {
      id: published.id,
      exhibitionId,
      versionId: newVersion.id,
      dayIndex: published.dayIndex,
      status: published.status,
      updatedAt: published.updatedAt,
    };
  }

  async listVersionDayContents(
    exhibitionId: string,
    versionId: string,
    curator: CuratorContext,
  ) {
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const version = await this.prisma.exhibitionVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.exhibitionId !== exhibition.id) {
      throw new NotFoundException(`Exhibition version not found: ${versionId}`);
    }

    const contents = await this.prisma.exhibitionDayContent.findMany({
      where: { versionId },
      orderBy: [{ dayIndex: 'asc' }, { status: 'asc' }],
    });

    return {
      exhibitionId,
      versionId,
      contents: contents.map((content) => ({
        id: content.id,
        dayIndex: content.dayIndex,
        status: content.status as ExhibitionDayContentStatus,
        html: content.html,
        css: content.css,
        assetRefs: content.assetRefs,
        createdAt: content.createdAt,
        updatedAt: content.updatedAt,
      })),
    };
  }

  async addAssetMetadata(
    exhibitionId: string,
    dayIndex: number,
    dto: CreateAssetMetadataDto,
    curator: CuratorContext,
  ) {
    if (!dto.assetUrl?.trim()) {
      throw new BadRequestException('assetUrl is required');
    }

    const { version } = await this.loadLatestVersion(exhibitionId, curator);

    if (dayIndex > version.totalDays) {
      throw new BadRequestException('dayIndex exceeds totalDays for exhibition');
    }

    const dayContent = await this.prisma.exhibitionDayContent.upsert({
      where: {
        versionId_dayIndex_status: {
          versionId: version.id,
          dayIndex,
          status: 'DRAFT',
        },
      },
      create: {
        versionId: version.id,
        dayIndex,
        status: 'DRAFT',
        html: null,
        css: null,
        assetRefs: Prisma.DbNull,
      },
      update: {},
    });

    const asset = await this.prisma.exhibitionDayAsset.create({
      data: {
        dayContentId: dayContent.id,
        assetUrl: dto.assetUrl.trim(),
        thumbnailUrl: dto.thumbnailUrl ?? undefined,
        usageMetadata: dto.usageMetadata ?? undefined,
      },
    });

    return {
      id: asset.id,
      dayContentId: dayContent.id,
      exhibitionId,
      dayIndex,
      assetUrl: asset.assetUrl,
      thumbnailUrl: asset.thumbnailUrl,
      usageMetadata: asset.usageMetadata,
      createdAt: asset.createdAt,
    };
  }

  private async loadLatestVersion(
    exhibitionId: string,
    curator: CuratorContext,
  ) {
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    let version = await this.prisma.exhibitionVersion.findFirst({
      where: { exhibitionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!version) {
      version = await this.prisma.exhibitionVersion.create({
        data: {
          exhibitionId: exhibition.id,
          type: exhibition.type,
          totalDays: exhibition.totalDays,
          visibility: exhibition.visibility,
          status: exhibition.status,
        },
      });
    }

    return { exhibition, version };
  }
}
