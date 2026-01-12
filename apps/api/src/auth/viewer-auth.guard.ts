import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ViewerAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const session = await this.prisma.viewerSession.findUnique({
      where: { tokenHash },
      include: { viewer: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid token');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Token revoked');
    }

    const now = new Date();
    if (session.expiresAt < now) {
      throw new UnauthorizedException('Token expired');
    }

    (request as any).viewerId = session.viewerId;
    (request as any).sessionId = session.id;
    (request as any).nfcTagId = session.nfcTagId ?? null;

    return true;
  }
}
