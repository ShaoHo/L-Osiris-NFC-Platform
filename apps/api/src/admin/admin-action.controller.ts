import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminActionPayload } from './admin-action.types';
import { AdminActionService } from './admin-action.service';
import { AdminActionExecutionService } from '../jobs/admin-action-execution.service';
import { AuditService } from '../audit/audit.service';

interface ConfirmAdminActionDto {
  confirmedBy: string;
}

interface ExecuteAdminActionDto {
  executedBy: string;
}

interface CancelAdminActionDto {
  cancelledBy: string;
  reason?: string | null;
}

@Controller('admin/actions')
@UseGuards(AdminAuthGuard, AdminAccessGuard)
export class AdminActionController {
  constructor(
    private prisma: PrismaService,
    private adminActionService: AdminActionService,
    private adminActionExecutionService: AdminActionExecutionService,
    private auditService: AuditService,
  ) {}

  @Post(':actionId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @Param('actionId') actionId: string,
    @Body() dto: ConfirmAdminActionDto,
  ) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    if (!dto.confirmedBy) {
      throw new BadRequestException('confirmedBy is required');
    }

    const payload = action.payload as AdminActionPayload | null;

    if (!payload || !('type' in payload)) {
      throw new BadRequestException('Admin action payload is invalid');
    }

    let updated = action;

    if (action.status === 'PENDING') {
      updated = await this.prisma.adminAction.update({
        where: { id: action.id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmedBy: dto.confirmedBy,
        },
      });

      await this.auditService.record({
        eventType: 'ADMIN_ACTION_CONFIRMED',
        actor: dto.confirmedBy,
        adminActionId: action.id,
        payload: payload as unknown as Prisma.InputJsonValue,
      });

    }

    if (updated.status === 'CONFIRMED' && updated.executeAfter) {
      await this.adminActionExecutionService.scheduleExecution(
        updated.id,
        updated.executeAfter,
      );
    }

    return {
      id: updated.id,
      status: updated.status,
      confirmedAt: updated.confirmedAt,
      executeAfter: updated.executeAfter,
    };
  }

  @Post(':actionId/execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('actionId') actionId: string,
    @Body() dto: ExecuteAdminActionDto,
  ) {
    const { action, result } = await this.adminActionService.executeAction(
      actionId,
      dto.executedBy,
    );

    return {
      id: action.id,
      status: action.status,
      result,
    };
  }

  @Post(':actionId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('actionId') actionId: string,
    @Body() dto: CancelAdminActionDto,
  ) {
    const action = await this.prisma.adminAction.findUnique({
      where: { id: actionId },
    });

    if (!action) {
      throw new NotFoundException(`Admin action not found: ${actionId}`);
    }

    if (!dto.cancelledBy) {
      throw new BadRequestException('cancelledBy is required');
    }

    if (action.status === 'EXECUTED') {
      throw new BadRequestException('Admin action already executed');
    }

    const payload = action.payload as AdminActionPayload | null;

    const updated = await this.prisma.adminAction.update({
      where: { id: action.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: dto.cancelledBy,
      },
    });

    await this.auditService.record({
      eventType: 'ADMIN_ACTION_CANCELLED',
      actor: dto.cancelledBy,
      adminActionId: action.id,
      payload: {
        ...(payload ?? {}),
        reason: dto.reason ?? null,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      cancelledAt: updated.cancelledAt,
    };
  }

}
