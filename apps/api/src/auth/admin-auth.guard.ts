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
import { getRequestIp, normalizeIp } from '../admin/admin-auth.utils';

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
    const ip = normalizeIp(getRequestIp(request));

    if (!authHeader) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_AUTH_MISSING_HEADER',
          payload: {
            ip,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new UnauthorizedException('Missing authorization header');
    }

    const parsedCredentials = this.parseBasicAuthHeader(authHeader);
    const result = await this.adminAuthService.validateBasicAuth(authHeader);

    if (!result) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_AUTH_INVALID_CREDENTIALS',
          actor: parsedCredentials?.email,
          payload: {
            ip,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const { user, roleNames } = result;

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_AUTH_SUCCESS',
        actor: user.email,
        payload: {
          ip,
          method: request.method,
          path: request.originalUrl ?? request.url,
        },
      },
    });

    if (!roleNames.includes(ADMIN_ROLE_NAME)) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_ROLE_DENIED',
          actor: user.email,
          payload: {
            requiredRole: ADMIN_ROLE_NAME,
            roles: roleNames,
            ip,
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
          ip,
          method: request.method,
          path: request.originalUrl ?? request.url,
        },
      },
    });

    (request as any).adminUserId = user.id;
    (request as any).adminUserEmail = user.email;

    return true;
  }

  private parseBasicAuthHeader(
    authHeader: string,
  ): { email: string; password: string } | null {
    if (!authHeader.startsWith('Basic ')) {
      return null;
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64')
      .toString('utf8')
      .trim();
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const email = decoded.slice(0, separatorIndex).trim().toLowerCase();
    const password = decoded.slice(separatorIndex + 1);

    if (!email || !password) {
      return null;
    }

    return { email, password };
  }
}
