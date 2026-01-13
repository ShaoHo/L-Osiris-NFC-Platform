import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CuratorAuthGuard } from '../auth/curator-auth.guard';
import { Curator, CuratorContext } from '../auth/curator.decorator';

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
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateExhibitionDto,
    @Curator() curator: CuratorContext,
  ) {
    if (!dto.type) {
      throw new BadRequestException('type is required');
    }

    if (!dto.totalDays || dto.totalDays <= 0) {
      throw new BadRequestException('totalDays must be greater than 0');
    }

    this.enforceTierRestrictions({
      curatorTier: curator.curatorTier,
      type: dto.type,
      visibility: dto.visibility,
      monetizationEnabled: dto.monetizationEnabled,
    });

    const exhibition = await this.prisma.exhibition.create({
      data: {
        type: dto.type,
        totalDays: dto.totalDays,
        visibility: dto.visibility ?? 'DRAFT',
        status: 'DRAFT',
        monetizationEnabled: dto.monetizationEnabled ?? false,
        curatorId: curator.curatorId,
      },
    });

    return {
      id: exhibition.id,
      status: exhibition.status,
      visibility: exhibition.visibility,
    };
  }

  @Patch(':exhibitionId')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('exhibitionId') exhibitionId: string,
    @Body() dto: UpdateExhibitionDto,
    @Curator() curator: CuratorContext,
  ) {
    if (
      dto.type === undefined &&
      dto.totalDays === undefined &&
      dto.visibility === undefined &&
      dto.monetizationEnabled === undefined
    ) {
      throw new BadRequestException('No fields provided');
    }

    this.enforceTierRestrictions({
      curatorTier: curator.curatorTier,
      type: dto.type,
      visibility: dto.visibility,
      monetizationEnabled: dto.monetizationEnabled,
    });

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const updated = await this.prisma.exhibition.update({
      where: { id: exhibitionId },
      data: {
        type: dto.type ?? exhibition.type,
        totalDays: dto.totalDays ?? exhibition.totalDays,
        visibility: dto.visibility ?? exhibition.visibility,
        monetizationEnabled:
          dto.monetizationEnabled ?? exhibition.monetizationEnabled,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      visibility: updated.visibility,
      monetizationEnabled: updated.monetizationEnabled,
    };
  }

  @Post(':exhibitionId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('exhibitionId') exhibitionId: string,
    @Curator() curator: CuratorContext,
  ) {
    this.enforceTierRestrictions({
      curatorTier: curator.curatorTier,
      visibility: 'PUBLIC',
    });

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const updated = await this.prisma.exhibition.update({
      where: { id: exhibitionId },
      data: {
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      visibility: updated.visibility,
    };
  }

  private enforceTierRestrictions(params: {
    curatorTier: CuratorContext['curatorTier'];
    type?: ExhibitionType;
    visibility?: ExhibitionVisibility;
    monetizationEnabled?: boolean;
  }) {
    if (params.curatorTier !== 'STANDARD') {
      return;
    }

    if (params.type === 'ONE_TO_MANY') {
      throw new ForbiddenException(
        'STANDARD tier cannot create ONE_TO_MANY exhibitions',
      );
    }

    if (params.visibility === 'PUBLIC') {
      throw new ForbiddenException(
        'STANDARD tier cannot publish public exhibitions',
      );
    }

    if (params.monetizationEnabled) {
      throw new ForbiddenException(
        'STANDARD tier cannot enable monetization',
      );
    }
  }
}
