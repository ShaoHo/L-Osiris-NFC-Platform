import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AccessGrantService } from './access-grant.service';

export type AccessDecision =
  | { allowed: true; reason: 'ALLOWED' }
  | { allowed: false; reason: 'MASKED' | 'GOVERNANCE_LOCKED' | 'GRANT_REQUIRED' };

@Injectable()
export class AccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessGrantService: AccessGrantService,
  ) {}

  async canAccessGallery(sessionId?: string): Promise<AccessDecision> {
    if (!sessionId) {
      return { allowed: true, reason: 'ALLOWED' };
    }

    const session = await this.prisma.viewerSession.findUnique({
      where: { id: sessionId },
      include: {
        nfcTag: {
          include: { curator: { include: { policy: true } } },
        },
      },
    });

    const policy = session?.nfcTag?.curator?.policy;
    if (policy?.nfcScopePolicy === 'EXHIBITION_ONLY') {
      return { allowed: false, reason: 'GOVERNANCE_LOCKED' };
    }

    return { allowed: true, reason: 'ALLOWED' };
  }

  async canAccessExhibition(params: {
    exhibitionId: string;
    viewerId?: string | null;
    sessionId?: string | null;
  }): Promise<AccessDecision> {
    const exhibition = await this.prisma.exhibition.findUnique({
      where: { id: params.exhibitionId },
    });

    if (!exhibition) {
      return { allowed: false, reason: 'MASKED' };
    }

    if (exhibition.deletedAt) {
      return { allowed: false, reason: 'MASKED' };
    }

    if (exhibition.governanceMaskedAt) {
      return { allowed: false, reason: 'MASKED' };
    }

    if (params.sessionId) {
      const session = await this.prisma.viewerSession.findUnique({
        where: { id: params.sessionId },
        include: {
          nfcTag: {
            include: { curator: { include: { policy: true } } },
          },
        },
      });

      const policy = session?.nfcTag?.curator?.policy;
      if (
        policy?.nfcScopePolicy === 'EXHIBITION_ONLY' &&
        session?.nfcTag?.curatorId &&
        exhibition.curatorId !== session.nfcTag.curatorId
      ) {
        return { allowed: false, reason: 'GOVERNANCE_LOCKED' };
      }
    }

    const requiresGrant =
      exhibition.visibility !== 'PUBLIC' ||
      exhibition.status !== 'ACTIVE' ||
      (exhibition.type === 'ONE_TO_MANY' && exhibition.monetizationEnabled);

    if (!requiresGrant) {
      return { allowed: true, reason: 'ALLOWED' };
    }

    if (!params.viewerId) {
      return { allowed: false, reason: 'GRANT_REQUIRED' };
    }

    const grant = await this.accessGrantService.findGrantForExhibition(
      params.viewerId,
      exhibition.id,
    );

    if (!grant) {
      return { allowed: false, reason: 'GRANT_REQUIRED' };
    }

    if (grant.expiresAt && grant.expiresAt <= new Date()) {
      return { allowed: false, reason: 'GRANT_REQUIRED' };
    }

    return { allowed: true, reason: 'ALLOWED' };
  }
}
