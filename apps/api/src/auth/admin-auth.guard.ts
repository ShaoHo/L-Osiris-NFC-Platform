import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AdminAuthService } from './admin-auth.service';

const ADMIN_ROLE_NAME = 'ADMIN';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private adminAuthService: AdminAuthService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const result = await this.adminAuthService.validateBasicAuth(authHeader);

    if (!result) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const { user, roleNames } = result;

    if (!roleNames.includes(ADMIN_ROLE_NAME)) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_ROLE_DENIED',
          actor: user.email,
          payload: {
            requiredRole: ADMIN_ROLE_NAME,
            roles: roleNames,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new ForbiddenException('Admin role required');
    }

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_ROUTE_ACCESSED',
        actor: user.email,
        payload: {
          method: request.method,
          path: request.originalUrl ?? request.url,
        },
      },
    });

    (request as any).adminUserId = user.id;
    (request as any).adminUserEmail = user.email;

    return true;
  }
}
