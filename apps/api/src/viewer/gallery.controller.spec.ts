import { NotFoundException } from '@nestjs/common';
import { AccessGrantService } from '../access/access-grant.service';
import { AccessPolicyService } from '../access/access-policy.service';
import { GalleryController } from './gallery.controller';

describe('GalleryController', () => {
  const prisma = {
    exhibition: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const accessPolicyService = {
    canAccessGallery: jest.fn(),
  } as unknown as AccessPolicyService;

  const accessGrantService = {
    hasValidGrantForExhibition: jest.fn(),
  } as unknown as AccessGrantService;

  const controller = new GalleryController(
    prisma as any,
    accessPolicyService,
    accessGrantService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('hides gallery details when governance locks the gallery', async () => {
    accessPolicyService.canAccessGallery = jest
      .fn()
      .mockResolvedValue({ allowed: false, reason: 'GOVERNANCE_LOCKED' });

    await expect(
      controller.detail('ex-1', 'session-1', 'viewer-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects gallery details when exhibition is not eligible', async () => {
    accessPolicyService.canAccessGallery = jest
      .fn()
      .mockResolvedValue({ allowed: true, reason: 'ALLOWED' });
    prisma.exhibition.findFirst.mockResolvedValue(null);

    await expect(
      controller.detail('ex-1', 'session-1', 'viewer-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns viewer subscription status when viewer is present', async () => {
    accessPolicyService.canAccessGallery = jest
      .fn()
      .mockResolvedValue({ allowed: true, reason: 'ALLOWED' });
    prisma.exhibition.findFirst.mockResolvedValue({
      id: 'ex-1',
      totalDays: 30,
      type: 'ONE_TO_MANY',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      curatorId: 'cur-1',
      monetizationEnabled: true,
    });
    accessGrantService.hasValidGrantForExhibition = jest
      .fn()
      .mockResolvedValue(true);

    await expect(
      controller.detail('ex-1', 'session-1', 'viewer-1'),
    ).resolves.toEqual({
      exhibition: {
        id: 'ex-1',
        totalDays: 30,
        type: 'ONE_TO_MANY',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        curatorId: 'cur-1',
        monetizationEnabled: true,
      },
      viewerSubscription: { active: true },
    });
  });
});
