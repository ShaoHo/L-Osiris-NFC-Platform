import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { AccessGrantService } from '../access/access-grant.service';

interface CheckoutSessionInput {
  viewerId: string;
  exhibitionId?: string | null;
  versionId?: string | null;
  expiresAt?: string | null;
}

export interface CheckoutSessionEvent {
  type?: string;
  data?: {
    object?: {
      metadata?: Record<string, string | null | undefined>;
    };
  };
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessGrantService: AccessGrantService,
  ) {}

  async createCheckoutSession(input: CheckoutSessionInput) {
    const { viewerId, exhibitionId, versionId, expiresAt } = input;

    if (!viewerId) {
      throw new BadRequestException('viewerId is required');
    }

    if (!exhibitionId && !versionId) {
      throw new BadRequestException('exhibitionId or versionId is required');
    }

    const viewer = await this.prisma.viewerProfile.findUnique({
      where: { id: viewerId },
    });

    if (!viewer) {
      throw new NotFoundException(`Viewer not found: ${viewerId}`);
    }

    const { resolvedExhibitionId, resolvedVersionId } =
      await this.resolveGrantTarget({ exhibitionId, versionId });

    const parsedExpiresAt = this.parseExpiresAt(expiresAt);
    const sessionId = `cs_${randomUUID()}`;

    return {
      id: sessionId,
      url: `https://payments.losiris.local/checkout/${sessionId}`,
      metadata: {
        viewerId,
        exhibitionId: resolvedExhibitionId,
        versionId: resolvedVersionId,
        expiresAt: parsedExpiresAt ? parsedExpiresAt.toISOString() : null,
      },
    };
  }

  async handleWebhook(event: CheckoutSessionEvent) {
    if (event?.type !== 'checkout.session.completed') {
      return { received: true };
    }

    const metadata = event.data?.object?.metadata ?? {};
    const viewerId = metadata.viewerId ?? '';
    const exhibitionId = metadata.exhibitionId ?? null;
    const versionId = metadata.versionId ?? null;
    const expiresAt = metadata.expiresAt ?? null;

    if (!viewerId) {
      throw new BadRequestException('viewerId metadata is required');
    }

    if (!exhibitionId && !versionId) {
      throw new BadRequestException('exhibitionId or versionId metadata is required');
    }

    const viewer = await this.prisma.viewerProfile.findUnique({
      where: { id: viewerId },
    });

    if (!viewer) {
      throw new NotFoundException(`Viewer not found: ${viewerId}`);
    }

    const { resolvedExhibitionId, resolvedVersionId } =
      await this.resolveGrantTarget({ exhibitionId, versionId });

    const parsedExpiresAt = this.parseExpiresAt(expiresAt);

    await this.accessGrantService.issueGrant({
      viewerId,
      exhibitionId: resolvedExhibitionId,
      versionId: resolvedVersionId,
      expiresAt: parsedExpiresAt,
    });

    return { received: true };
  }

  private parseExpiresAt(expiresAt?: string | null) {
    if (!expiresAt) {
      return null;
    }

    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('expiresAt must be a valid date');
    }

    return parsed;
  }

  private async resolveGrantTarget(input: {
    exhibitionId?: string | null;
    versionId?: string | null;
  }) {
    const exhibitionId = input.exhibitionId ?? null;
    const versionId = input.versionId ?? null;

    let resolvedExhibitionId = exhibitionId;

    if (exhibitionId) {
      const exhibition = await this.prisma.exhibition.findUnique({
        where: { id: exhibitionId },
      });

      if (!exhibition) {
        throw new NotFoundException(`Exhibition not found: ${exhibitionId}`);
      }
    }

    if (versionId) {
      const version = await this.prisma.exhibitionVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) {
        throw new NotFoundException(`Exhibition version not found: ${versionId}`);
      }

      if (resolvedExhibitionId && version.exhibitionId !== resolvedExhibitionId) {
        throw new BadRequestException('Version does not belong to exhibition');
      }

      resolvedExhibitionId = resolvedExhibitionId ?? version.exhibitionId;
    }

    return {
      resolvedExhibitionId,
      resolvedVersionId: versionId,
    };
  }
}
