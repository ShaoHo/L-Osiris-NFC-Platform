jest.mock('../database/prisma.service', () => ({
  PrismaService: class {},
}));

import { SoftDeletePurgeService } from './soft-delete-purge.service';

const createDelegate = () => ({
  deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
});

describe('SoftDeletePurgeService', () => {
  it('purges eligible models and skips excluded records', async () => {
    const prisma = {
      userRole: createDelegate(),
      role: createDelegate(),
      user: createDelegate(),
      curatorPolicy: createDelegate(),
      curator: createDelegate(),
      viewerExhibitionState: createDelegate(),
      viewerSession: createDelegate(),
      viewerProfile: createDelegate(),
      exhibitionDayAsset: createDelegate(),
      exhibitionDayContent: createDelegate(),
      exhibit: createDelegate(),
      aiGenerationJob: createDelegate(),
      marketingOutboxEvent: createDelegate(),
      exhibitionRun: createDelegate(),
      exhibitionVersion: createDelegate(),
      exhibition: createDelegate(),
      nfcTag: createDelegate(),
      accessGrant: createDelegate(),
      adminAction: createDelegate(),
      auditLog: createDelegate(),
      $transaction: jest.fn(),
    };

    prisma.$transaction.mockImplementation(async (operations: Array<Promise<{ count: number }>>) =>
      Promise.all(operations),
    );

    const service = new SoftDeletePurgeService(prisma as any);

    await (service as any).purgeExpiredSoftDeletes();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(18);
    expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
    expect(prisma.accessGrant.deleteMany).not.toHaveBeenCalled();
    expect(prisma.adminAction.deleteMany).toHaveBeenCalledWith({
      where: {
        deletedAt: { not: null },
        purgeAfter: { lte: expect.any(Date) },
      },
    });
  });
});
