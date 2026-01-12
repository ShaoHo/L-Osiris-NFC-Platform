import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AiGenerationService } from '../jobs/ai-generation.service';

interface CreateDraftDto {
  prompt: string;
  assetMetadata?: unknown;
}

interface EditDraftDto {
  html?: string | null;
  css?: string | null;
  assetRefs?: unknown;
}

@Controller('admin/exhibitions/:exhibitionId/days/:dayIndex')
@UseGuards(AdminAuthGuard)
export class ExhibitionDayContentAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGeneration: AiGenerationService,
  ) {}

  private async loadVersion(exhibitionId: string) {
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const version = await this.prisma.exhibitionVersion.findFirst({
      where: { exhibitionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!version) {
      throw new NotFoundException(`Exhibition version not found: ${exhibitionId}`);
    }

    return { exhibition, version };
  }

  @Post('drafts')
  @HttpCode(HttpStatus.ACCEPTED)
  async createDraft(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
    @Body() dto: CreateDraftDto,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    if (!dto.prompt?.trim()) {
      throw new BadRequestException('prompt is required');
    }

    const { version } = await this.loadVersion(exhibitionId);

    if (dayIndex > version.totalDays) {
      throw new BadRequestException('dayIndex exceeds totalDays for exhibition');
    }

    const job = await this.aiGeneration.enqueueDraftJob({
      exhibitionId,
      dayIndex,
      prompt: dto.prompt.trim(),
      assetMetadata: dto.assetMetadata,
    });

    return {
      jobId: job.id,
      status: job.status,
      exhibitionId: job.exhibitionId,
      dayIndex: job.dayIndex,
      createdAt: job.createdAt,
    };
  }

  @Patch('draft')
  @HttpCode(HttpStatus.OK)
  async editDraft(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
    @Body() dto: EditDraftDto,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    const { version } = await this.loadVersion(exhibitionId);

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
        html: dto.html ?? null,
        css: dto.css ?? null,
        assetRefs: dto.assetRefs ?? null,
      },
      update: {
        html: dto.html ?? undefined,
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

  @Get('draft')
  @HttpCode(HttpStatus.OK)
  async getDraft(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    const { version } = await this.loadVersion(exhibitionId);

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

    return {
      id: draft.id,
      exhibitionId,
      versionId: draft.versionId,
      dayIndex: draft.dayIndex,
      status: draft.status,
      html: draft.html,
      css: draft.css,
      assetRefs: draft.assetRefs,
      updatedAt: draft.updatedAt,
    };
  }

  @Get('published')
  @HttpCode(HttpStatus.OK)
  async getPublished(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    const { version } = await this.loadVersion(exhibitionId);

    if (dayIndex > version.totalDays) {
      throw new BadRequestException('dayIndex exceeds totalDays for exhibition');
    }

    const published = await this.prisma.exhibitionDayContent.findUnique({
      where: {
        versionId_dayIndex_status: {
          versionId: version.id,
          dayIndex,
          status: 'PUBLISHED',
        },
      },
    });

    if (!published) {
      throw new NotFoundException('Published content not found');
    }

    return {
      id: published.id,
      exhibitionId,
      versionId: published.versionId,
      dayIndex: published.dayIndex,
      status: published.status,
      html: published.html,
      css: published.css,
      assetRefs: published.assetRefs,
      updatedAt: published.updatedAt,
    };
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    const { exhibition, version } = await this.loadVersion(exhibitionId);

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
          html: draft.html,
          css: draft.css,
          assetRefs: draft.assetRefs ?? undefined,
        },
        update: {
          html: draft.html,
          css: draft.css,
          assetRefs: draft.assetRefs ?? undefined,
        },
      });

      return { published, newVersion };
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
}
