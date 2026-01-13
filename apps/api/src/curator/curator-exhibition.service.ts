import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CuratorContext } from '../auth/curator.decorator';

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

@Injectable()
export class CuratorExhibitionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExhibitionDto, curator: CuratorContext) {
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

    this.enforceMonetizationRules({
      type: dto.type,
      monetizationEnabled: dto.monetizationEnabled ?? false,
      payoutProfileCompleted: curator.payoutProfileCompleted,
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

  async update(
    exhibitionId: string,
    dto: UpdateExhibitionDto,
    curator: CuratorContext,
  ) {
    if (
      dto.type === undefined &&
      dto.totalDays === undefined &&
      dto.visibility === undefined &&
      dto.monetizationEnabled === undefined
    ) {
      throw new BadRequestException('No fields provided');
    }

    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    this.enforceTierRestrictions({
      curatorTier: curator.curatorTier,
      type: dto.type ?? exhibition.type,
      visibility: dto.visibility,
      monetizationEnabled: dto.monetizationEnabled ?? exhibition.monetizationEnabled,
    });

    this.enforceMonetizationRules({
      type: dto.type ?? exhibition.type,
      monetizationEnabled: dto.monetizationEnabled ?? exhibition.monetizationEnabled,
      payoutProfileCompleted: curator.payoutProfileCompleted,
    });

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

  async publish(exhibitionId: string, curator: CuratorContext) {
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

    const { updated, version } = await this.prisma.$transaction(async (tx) => {
      const latestVersion = await tx.exhibitionVersion.findFirst({
        where: { exhibitionId },
        orderBy: { createdAt: 'desc' },
      });

      const draftContents = latestVersion
        ? await tx.exhibitionDayContent.findMany({
            where: {
              versionId: latestVersion.id,
              status: 'DRAFT',
            },
            include: {
              assets: true,
            },
          })
        : [];

      const updated = await tx.exhibition.update({
        where: { id: exhibitionId },
        data: {
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        },
      });

      const version = await tx.exhibitionVersion.create({
        data: {
          exhibitionId: updated.id,
          type: updated.type,
          totalDays: updated.totalDays,
          visibility: updated.visibility,
          status: updated.status,
        },
      });

      for (const content of draftContents) {
        const created = await tx.exhibitionDayContent.create({
          data: {
            versionId: version.id,
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

      return { updated, version };
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'EXHIBITION_PUBLISHED',
        actor: curator.curatorId,
        entityType: 'ExhibitionVersion',
        entityId: version.id,
        payload: {
          exhibitionId: updated.id,
          status: updated.status,
          visibility: updated.visibility,
          publishedAt: version.createdAt,
        },
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      visibility: updated.visibility,
      versionId: version.id,
    };
  }

  async archive(exhibitionId: string, curator: CuratorContext) {
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: exhibitionId },
    });

    if (!exhibition || exhibition.curatorId !== curator.curatorId) {
      throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
    }

    const updated = await this.prisma.exhibition.update({
      where: { id: exhibitionId },
      data: {
        status: 'ARCHIVED',
        visibility: 'DRAFT',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'EXHIBITION_ARCHIVED',
        actor: curator.curatorId,
        entityType: 'Exhibition',
        entityId: updated.id,
        payload: {
          status: updated.status,
          visibility: updated.visibility,
        },
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

  private enforceMonetizationRules(params: {
    type: ExhibitionType;
    monetizationEnabled: boolean;
    payoutProfileCompleted: boolean;
  }) {
    if (!params.monetizationEnabled) {
      return;
    }

    if (params.type !== 'ONE_TO_MANY') {
      throw new BadRequestException(
        'monetizationEnabled can only be true for ONE_TO_MANY exhibitions',
      );
    }

    if (!params.payoutProfileCompleted) {
      throw new ForbiddenException(
        'Complete payout profile required to enable monetization',
      );
    }
  }
}
