import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CuratorAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const curatorIdHeader = request.headers['x-curator-id'];

    if (!curatorIdHeader || Array.isArray(curatorIdHeader)) {
      throw new UnauthorizedException('Missing curator identity');
    }

    const curatorId = curatorIdHeader.trim();
    if (!curatorId) {
      throw new UnauthorizedException('Missing curator identity');
    }

    const curator = await this.prisma.curator.findUnique({
      where: { id: curatorId },
    });

    if (!curator || curator.deletedAt) {
      throw new UnauthorizedException('Invalid curator identity');
    }

    if (curator.suspendedAt) {
      throw new ForbiddenException('Curator suspended');
    }

    (request as any).curatorId = curator.id;
    (request as any).curatorTier = curator.tier;
    (request as any).curatorEmail = curator.email;

    return true;
  }
}
