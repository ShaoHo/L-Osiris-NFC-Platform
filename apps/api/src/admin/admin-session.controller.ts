import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { AdminAccessGuard } from './admin-access.guard';
import { getRequestIp, normalizeIp } from './admin-auth.utils';

@Controller('admin/session')
@UseGuards(AdminAuthGuard, AdminAccessGuard)
export class AdminSessionController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createSession(@Req() request: Request) {
    const actor = (request as any).adminUserEmail as string | undefined;
    const ip = normalizeIp(getRequestIp(request));

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_SESSION_CREATED',
        actor,
        payload: {
          ip,
          userAgent: request.headers['user-agent'],
        },
      },
    });

    return {
      userId: (request as any).adminUserId as string | undefined,
      email: actor,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  getSession(@Req() request: Request) {
    return {
      userId: (request as any).adminUserId as string | undefined,
      email: (request as any).adminUserEmail as string | undefined,
    };
  }
}
