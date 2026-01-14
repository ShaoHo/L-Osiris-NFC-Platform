import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CuratorAuthGuard } from '../auth/curator-auth.guard';
import { Curator, CuratorContext } from '../auth/curator.decorator';
import { PrismaService } from '../database/prisma.service';
import { AiGenerationService } from '../jobs/ai-generation.service';
import { $Enums } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

interface GenerateDraftsDto {
  prompt: string;
  assetMetadata?: unknown;
  startDay?: number;
  endDay?: number;
  retryFailed?: boolean;
}

@Controller('curator/exhibitions/:exhibitionId/ai')
@UseGuards(CuratorAuthGuard)
export class CuratorExhibitionAiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGeneration: AiGenerationService,
    private readonly auditService: AuditService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateDrafts(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: GenerateDraftsDto,
    @Curator() curator: CuratorContext,
  ) {
    if (!dto.prompt?.trim()) {
      throw new BadRequestException('prompt is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const startDay = dto.startDay ?? 1;
    const endDay = dto.endDay ?? exhibition.totalDays;

    if (
      !Number.isInteger(startDay) ||
      !Number.isInteger(endDay) ||
      startDay < 1 ||
      endDay < startDay ||
      endDay > exhibition.totalDays
    ) {
      throw new BadRequestException('Invalid day range for generation');
    }

    const dayIndices = Array.from(
      { length: endDay - startDay + 1 },
      (_, index) => startDay + index,
    );
    const queued = await this.aiGeneration.enqueueDraftJobs({
      exhibitionId,
      dayIndices,
      prompt: dto.prompt.trim(),
      assetMetadata: dto.assetMetadata,
      retryFailed: dto.retryFailed,
    });

    await this.auditService.record({
      eventType: 'EXHIBITION_AI_DRAFTS_REQUESTED',
      actor: curator.curatorId,
      entityType: 'Exhibition',
      entityId: exhibitionId,
      payload: {
        dayIndices,
        prompt: dto.prompt.trim(),
        retryFailed: dto.retryFailed ?? false,
      },
    });

    const jobs: Array<{ jobId: string; dayIndex: number; status: $Enums.AiGenerationJobStatus }> =
      queued.map((job) => ({
        jobId: job.id,
        dayIndex: job.dayIndex,
        status: job.status,
      }));

    return { exhibitionId, jobs };
  }
}
