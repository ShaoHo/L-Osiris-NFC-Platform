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
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AiGenerationService } from '../jobs/ai-generation.service';

interface GenerateDraftsDto {
  prompt: string;
  assetMetadata?: unknown;
  startDay?: number;
  endDay?: number;
}

@Controller('admin/exhibitions/:exhibitionId/ai')
@UseGuards(AdminAuthGuard)
export class ExhibitionAiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiGeneration: AiGenerationService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateDrafts(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: GenerateDraftsDto,
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

    const jobs = [];
    for (let dayIndex = startDay; dayIndex <= endDay; dayIndex += 1) {
      const job = await this.aiGeneration.enqueueDraftJob({
        exhibitionId,
        dayIndex,
        prompt: dto.prompt.trim(),
        assetMetadata: dto.assetMetadata,
      });
      jobs.push({
        jobId: job.id,
        dayIndex: job.dayIndex,
        status: job.status,
      });
    }

    return { exhibitionId, jobs };
  }
}
