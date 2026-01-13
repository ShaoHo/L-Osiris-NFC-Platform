import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CuratorAuthGuard } from '../auth/curator-auth.guard';
import { Curator, CuratorContext } from '../auth/curator.decorator';
import { CuratorExhibitionDayContentService } from './curator-exhibition-day-content.service';

interface SaveDraftDto {
  html?: string | null;
  css?: string | null;
  assetRefs?: unknown;
}

@Controller('curator/exhibitions/:exhibitionId')
@UseGuards(CuratorAuthGuard)
export class CuratorExhibitionDayContentController {
  constructor(
    private readonly dayContents: CuratorExhibitionDayContentService,
  ) {}

  @Put('days/:dayIndex/draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
    @Body() dto: SaveDraftDto,
    @Curator() curator: CuratorContext,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    return this.dayContents.saveDraft(exhibitionId, dayIndex, dto, curator);
  }

  @Post('days/:dayIndex/publish')
  @HttpCode(HttpStatus.OK)
  async publishDay(
    @Param('exhibitionId') exhibitionId: string,
    @Param('dayIndex') dayIndexParam: string,
    @Curator() curator: CuratorContext,
  ) {
    const dayIndex = Number(dayIndexParam);
    if (!Number.isInteger(dayIndex) || dayIndex < 1) {
      throw new BadRequestException('dayIndex must be a positive integer');
    }

    return this.dayContents.publishDay(exhibitionId, dayIndex, curator);
  }

  @Get('versions/:versionId/days')
  @HttpCode(HttpStatus.OK)
  async listVersionDayContents(
    @Param('exhibitionId') exhibitionId: string,
    @Param('versionId') versionId: string,
    @Curator() curator: CuratorContext,
  ) {
    return this.dayContents.listVersionDayContents(
      exhibitionId,
      versionId,
      curator,
    );
  }
}
