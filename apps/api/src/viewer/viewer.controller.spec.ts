import { ViewerController } from './viewer.controller';

describe('ViewerController', () => {
  const prisma = {
    exhibition: { findUnique: jest.fn() },
    exhibitionVersion: { findFirst: jest.fn() },
    exhibitionRun: { create: jest.fn() },
    viewerExhibitionState: { findUnique: jest.fn(), upsert: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const marketingOutbox = {
    enqueueContactSync: jest.fn(),
  };

  const accessPolicy = {
    canAccessExhibition: jest.fn(),
  };

  const controller = new ViewerController(
    prisma as any,
    marketingOutbox as any,
    accessPolicy as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((ops: any[]) => Promise.all(ops));
  });

  it('creates a new run using latest published version on restart', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      type: 'ONE_TO_ONE',
      totalDays: 2,
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    });
    prisma.exhibitionVersion.findFirst.mockResolvedValue({ id: 'version-1' });
    prisma.exhibitionRun.create.mockResolvedValue({
      id: 'run-1',
      versionId: 'version-1',
      viewerSessionId: 'session-1',
      restartFromDay: 1,
    });
    prisma.viewerExhibitionState.upsert.mockResolvedValue({});
    prisma.viewerExhibitionState.findUnique.mockResolvedValue({
      viewerId: null,
      exhibitionId: 'ex-1',
      status: 'ACTIVE',
    });
    accessPolicy.canAccessExhibition.mockResolvedValue({
      allowed: true,
      reason: 'ALLOWED',
    });

    await controller.activate(
      'ex-1',
      { mode: 'RESTART' },
      undefined,
      'session-1',
    );

    expect(prisma.exhibitionVersion.findFirst).toHaveBeenCalled();
    expect(prisma.exhibitionRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionId: 'version-1' }),
      }),
    );
  });

  it('creates a new run using latest published version on continue', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-2',
      type: 'ONE_TO_ONE',
      totalDays: 2,
      visibility: 'PUBLIC',
      status: 'ACTIVE',
    });
    prisma.exhibitionVersion.findFirst.mockResolvedValue({ id: 'version-2' });
    prisma.exhibitionRun.create.mockResolvedValue({
      id: 'run-2',
      versionId: 'version-2',
      viewerSessionId: 'session-2',
      restartFromDay: 1,
    });
    prisma.viewerExhibitionState.findUnique.mockResolvedValue({
      lastDayIndex: 1,
    });
    prisma.viewerExhibitionState.upsert.mockResolvedValue({});
    prisma.viewerExhibitionState.findUnique.mockResolvedValue({
      viewerId: null,
      exhibitionId: 'ex-2',
      status: 'ACTIVE',
    });
    accessPolicy.canAccessExhibition.mockResolvedValue({
      allowed: true,
      reason: 'ALLOWED',
    });

    await controller.activate(
      'ex-2',
      { mode: 'CONTINUE' },
      undefined,
      'session-2',
    );

    expect(prisma.exhibitionRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ versionId: 'version-2' }),
      }),
    );
  });
});
