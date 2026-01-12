import {
  BadRequestException,
  Body,
  Controller,
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

    const published = await this.prisma.exhibitionDayContent.upsert({
      where: {
        versionId_dayIndex_status: {
          versionId: version.id,
          dayIndex,
          status: 'PUBLISHED',
        },
      },
      create: {
        versionId: version.id,
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

    return {
      id: published.id,
      exhibitionId,
      versionId: published.versionId,
      dayIndex: published.dayIndex,
      status: published.status,
      updatedAt: published.updatedAt,
    };
  }
}
