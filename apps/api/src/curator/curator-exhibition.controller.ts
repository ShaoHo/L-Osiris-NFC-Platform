import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CuratorAuthGuard } from '../auth/curator-auth.guard';
import { Curator, CuratorContext } from '../auth/curator.decorator';
import { CuratorExhibitionService } from './curator-exhibition.service';

type ExhibitionType = 'ONE_TO_ONE' | 'ONE_TO_MANY';
type ExhibitionVisibility = 'DRAFT' | 'PUBLIC';

interface CreateExhibitionDto {
  type: ExhibitionType;
  totalDays: number;
  visibility?: ExhibitionVisibility;
  monetizationEnabled?: boolean;
}

interface UpdateExhibitionDto {
  type?: ExhibitionType;
  totalDays?: number;
  visibility?: ExhibitionVisibility;
  monetizationEnabled?: boolean;
}

@Controller('curator/exhibitions')
@UseGuards(CuratorAuthGuard)
export class CuratorExhibitionController {
  constructor(private readonly curatorExhibitions: CuratorExhibitionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateExhibitionDto,
    @Curator() curator: CuratorContext,
  ) {
    return this.curatorExhibitions.create(dto, curator);
  }

  @Patch(':exhibitionId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: UpdateExhibitionDto,
    @Curator() curator: CuratorContext,
  ) {
    return this.curatorExhibitions.update(exhibitionId, dto, curator);
  }

  @Post(':exhibitionId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('exhibitionId') exhibitionId: string,
    @Curator() curator: CuratorContext,
  ) {
    return this.curatorExhibitions.publish(exhibitionId, curator);
  }

  @Post(':exhibitionId/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('exhibitionId') exhibitionId: string,
    @Curator() curator: CuratorContext,
  ) {
    return this.curatorExhibitions.archive(exhibitionId, curator);
  }
}
