import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface IssueGrantInput {
  viewerId: string;
  exhibitionId?: string | null;
  versionId?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class AccessGrantService {
  constructor(private prisma: PrismaService) {}

  async findGrantForExhibition(viewerId: string, exhibitionId: string) {
    if (!viewerId) {
      return null;
    }

    return this.prisma.accessGrant.findFirst({
      where: {
        viewerId,
        revokedAt: null,
        AND: [
          {
            OR: [
              { exhibitionId },
              {
                version: {
                  exhibitionId,
                },
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async hasValidGrantForExhibition(viewerId: string, exhibitionId: string) {
    const grant = await this.findGrantForExhibition(viewerId, exhibitionId);
    if (!grant) {
      return false;
    }

    if (grant.expiresAt && grant.expiresAt <= new Date()) {
      return false;
    }

    return true;
  }

  async issueGrant(input: IssueGrantInput) {
    return this.prisma.accessGrant.create({
      data: {
        viewerId: input.viewerId,
        exhibitionId: input.exhibitionId ?? null,
        versionId: input.versionId ?? null,
        expiresAt: input.expiresAt ?? null,
      },
    });
  }

  async revokeGrant(grantId: string) {
    return this.prisma.accessGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date() },
    });
  }
}
