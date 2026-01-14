import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AdminAccessGuard } from './admin-access.guard';
import { AiGenerationService } from '../jobs/ai-generation.service';
import { $Enums } from '@prisma/client';
import { Request } from 'express';
import { AuditService } from '../audit/audit.service';

interface GenerateDraftsDto {
  prompt: string;
  assetMetadata?: unknown;
  startDay?: number;
  endDay?: number;
  retryFailed?: boolean;
}

@Controller('admin/exhibitions/:exhibitionId/ai')
@UseGuards(AdminAuthGuard, AdminAccessGuard)
export class ExhibitionAiController {
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
    @Req() request: Request,
  ) {
    if (!dto.prompt?.trim()) {
      throw new BadRequestException('prompt is required');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition) {
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

    const actor = (request as any).adminUserEmail as string | undefined;
    await this.auditService.record({
      eventType: 'EXHIBITION_AI_DRAFTS_REQUESTED',
      actor,
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
