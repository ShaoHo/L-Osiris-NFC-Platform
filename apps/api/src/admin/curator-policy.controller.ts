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
import { AdminAccessGuard } from './admin-access.guard';

interface UpdateCuratorPolicyDto {
  nfcScopePolicy: 'EXHIBITION_ONLY' | 'EXHIBITION_AND_GALLERY';
  requestedBy: string;
}

@Controller('admin/curators/:curatorId/policy')
@UseGuards(AdminAuthGuard, AdminAccessGuard)
export class CuratorPolicyAdminController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async requestUpdate(
    @Param('curatorId') curatorId: string,
    @Body() dto: UpdateCuratorPolicyDto,
  ) {
    if (!dto.requestedBy) {
      throw new BadRequestException('requestedBy is required');
    }

    if (!dto.nfcScopePolicy) {
      throw new BadRequestException('nfcScopePolicy is required');
    }

    const curator = await this.prisma.curator.findUnique({
      where: { id: curatorId },
    });

    if (!curator) {
      throw new NotFoundException(`Curator not found: ${curatorId}`);
    }

    const payload = {
      type: 'UPDATE_CURATOR_POLICY',
      data: {
        curatorId,
        nfcScopePolicy: dto.nfcScopePolicy,
      },
    } as const;

    const action = await this.prisma.adminAction.create({
      data: {
        action: 'UPDATE_CURATOR_POLICY',
        status: 'PENDING',
        requestedBy: dto.requestedBy,
        executeAfter: new Date(Date.now() + 30_000),
        payload,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ACTION_REQUESTED',
        actor: dto.requestedBy,
        adminActionId: action.id,
        payload,
      },
    });

    return {
      id: action.id,
      status: action.status,
      requestedBy: action.requestedBy,
      createdAt: action.createdAt,
    };
  }
}
