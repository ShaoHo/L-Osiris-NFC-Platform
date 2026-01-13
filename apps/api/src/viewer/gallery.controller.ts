import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { ViewerId, ViewerSessionId } from '../auth/viewer.decorator';
import { AccessPolicyService } from '../access/access-policy.service';
import { AccessGrantService } from '../access/access-grant.service';

@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
    private readonly accessGrantService: AccessGrantService,
  ) {}

  @Get()
  @UseGuards(OptionalViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async list(@ViewerSessionId() sessionId?: string) {
    const access = await this.accessPolicyService.canAccessGallery(sessionId);
    if (!access.allowed) {
      throw new NotFoundException('Gallery is not available');
    }

    const exhibitions = await this.prisma.exhibition.findMany({
      where: {
        type: 'ONE_TO_MANY',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        monetizationEnabled: true,
        governanceMaskedAt: null,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalDays: true,
        type: true,
        visibility: true,
        status: true,
        curatorId: true,
      },
    });

    return { exhibitions };
  }

  @Get(':id')
  @UseGuards(OptionalViewerAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detail(
    @Param('id') id: string,
    @ViewerSessionId() sessionId?: string,
    @ViewerId() viewerId?: string,
  ) {
    const access = await this.accessPolicyService.canAccessGallery(sessionId);
    if (!access.allowed) {
      throw new NotFoundException('Gallery is not available');
    }

    const exhibition = await this.prisma.exhibition.findFirst({
      where: {
        id,
        type: 'ONE_TO_MANY',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        monetizationEnabled: true,
        governanceMaskedAt: null,
        deletedAt: null,
      },
      select: {
        id: true,
        totalDays: true,
        type: true,
        visibility: true,
        status: true,
        curatorId: true,
        monetizationEnabled: true,
      },
    });

    if (!exhibition) {
      throw new NotFoundException('Gallery exhibition not available');
    }

    const viewerSubscription = viewerId
      ? {
          active: await this.accessGrantService.hasValidGrantForExhibition(
            viewerId,
            exhibition.id,
          ),
        }
      : null;

    return { exhibition, viewerSubscription };
  }
}
