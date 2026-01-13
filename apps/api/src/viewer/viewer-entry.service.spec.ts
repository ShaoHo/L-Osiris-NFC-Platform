import { ViewerEntryService } from './viewer-entry.service';
import { AccessPolicyService } from '../access/access-policy.service';

describe('ViewerEntryService', () => {
  const prisma = {
    nfcTag: { findUnique: jest.fn() },
    viewerSession: { create: jest.fn(), findUnique: jest.fn() },
    viewerExhibitionState: { findUnique: jest.fn(), update: jest.fn() },
    exhibitionRun: { findFirst: jest.fn() },
    exhibitionVersion: { findUnique: jest.fn() },
    exhibitionDayContent: { findUnique: jest.fn() },
    exhibit: { findUnique: jest.fn() },
  };

  const accessPolicy = {
    canAccessExhibition: jest.fn(),
  };

  const service = new ViewerEntryService(
    prisma as any,
    accessPolicy as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('calculates day index based on run start', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-05T12:00:00Z'));

    prisma.nfcTag.findUnique.mockResolvedValue({
      id: 'tag-1',
      publicTagId: 'tag-1',
      boundExhibition: {
        id: 'ex-1',
        type: 'ONE_TO_ONE',
        totalDays: 3,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      },
      curator: { policy: null },
    });
    prisma.viewerSession.create.mockResolvedValue({ id: 'session-1' });
    prisma.viewerExhibitionState.findUnique.mockResolvedValue({
      activatedAt: new Date(),
      status: 'ACTIVE',
      pausedAt: null,
      lastDayIndex: 1,
      viewer: null,
    });
    prisma.exhibitionRun.findFirst.mockResolvedValue({
      id: 'run-1',
      versionId: 'version-1',
      viewerSessionId: 'session-1',
      startedAt: new Date('2025-01-03T12:00:00Z'),
      restartFromDay: 1,
    });
    prisma.exhibitionVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      exhibitionId: 'ex-1',
      totalDays: 3,
      type: 'ONE_TO_ONE',
      status: 'ACTIVE',
      visibility: 'PUBLIC',
    });
    prisma.exhibitionDayContent.findUnique.mockResolvedValue({
      html: '<section>Day</section>',
      css: '',
      assetRefs: null,
      assets: [],
    });
    prisma.exhibit.findUnique.mockResolvedValue(null);

    accessPolicy.canAccessExhibition.mockResolvedValue({
      allowed: true,
      reason: 'ALLOWED',
    });

    const result = await service.resolveEntry({
      publicTagId: 'tag-1',
      sessionId: undefined,
      viewerId: undefined,
    });

    expect(result.exhibit.dayIndex).toBe(3);
    expect(result.sessionToken).toEqual(expect.any(String));
    expect(prisma.viewerExhibitionState.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          lastDayIndex: 3,
          pausedAt: null,
        }),
      }),
    );

    jest.useRealTimers();
  });
});
