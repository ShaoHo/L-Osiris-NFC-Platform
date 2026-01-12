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

  async hasValidGrantForExhibition(viewerId: string, exhibitionId: string) {
    if (!viewerId) {
      return false;
    }

    const now = new Date();
    const grant = await this.prisma.accessGrant.findFirst({
      where: {
        viewerId,
        revokedAt: null,
        AND: [
          {
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
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
    });

    return Boolean(grant);
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
