import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OptionalViewerAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true; // No auth provided, but that's OK for optional auth
    }

    const token = authHeader.substring(7);
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const session = await this.prisma.viewerSession.findUnique({
      where: { tokenHash },
      include: { viewer: true },
    });

    if (session && !session.revokedAt && session.expiresAt >= new Date()) {
      (request as any).viewerId = session.viewerId;
      (request as any).sessionId = session.id;
    }

    return true;
  }
}