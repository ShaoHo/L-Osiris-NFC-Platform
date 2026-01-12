import { Controller, Get, HttpCode, HttpStatus, NotFoundException, UseGuards } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { ViewerSessionId } from '../auth/viewer.decorator';
import { AccessPolicyService } from '../access/access-policy.service';

@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicyService: AccessPolicyService,
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
}
