import { CuratorExhibitionService } from './curator-exhibition.service';

describe('CuratorExhibitionService', () => {
  const prisma = {
    exhibition: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    exhibitionVersion: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    exhibitionDayContent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    exhibitionDayAsset: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditService = {
    record: jest.fn(),
  };

  const service = new CuratorExhibitionService(
    prisma as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records audit logs for creation', async () => {
    prisma.exhibition.create.mockResolvedValue({
      id: 'ex-1',
      type: 'ONE_TO_ONE',
      totalDays: 3,
      visibility: 'DRAFT',
      status: 'DRAFT',
      monetizationEnabled: false,
    });

    await service.create(
      { type: 'ONE_TO_ONE', totalDays: 3 },
      { curatorId: 'cur-1', curatorTier: 'STANDARD' },
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_CREATED',
        actor: 'cur-1',
        entityId: 'ex-1',
      }),
    );
  });

  it('records audit logs for updates', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      curatorId: 'cur-1',
      type: 'ONE_TO_ONE',
      totalDays: 3,
      visibility: 'DRAFT',
      monetizationEnabled: false,
    });
    prisma.exhibition.update.mockResolvedValue({
      id: 'ex-1',
      type: 'ONE_TO_ONE',
      totalDays: 4,
      visibility: 'DRAFT',
      monetizationEnabled: false,
      status: 'DRAFT',
    });

    await service.update(
      'ex-1',
      { totalDays: 4 },
      { curatorId: 'cur-1', curatorTier: 'STANDARD' },
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_UPDATED',
        actor: 'cur-1',
        entityId: 'ex-1',
      }),
    );
  });

  it('records audit logs for publishing', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      curatorId: 'cur-1',
      type: 'ONE_TO_ONE',
      totalDays: 3,
      visibility: 'DRAFT',
      status: 'DRAFT',
    });

    const updated = {
      id: 'ex-1',
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      type: 'ONE_TO_ONE',
      totalDays: 3,
    };
    const version = {
      id: 'ver-1',
      createdAt: new Date(),
    };

    prisma.$transaction.mockImplementation(async (callback: any) => {
      const tx = {
        exhibitionVersion: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(version),
        },
        exhibitionDayContent: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
        },
        exhibitionDayAsset: {
          createMany: jest.fn(),
        },
        exhibition: {
          update: jest.fn().mockResolvedValue(updated),
        },
      };
      return callback(tx);
    });

    await service.publish('ex-1', {
      curatorId: 'cur-1',
      curatorTier: 'PRO',
    });

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_PUBLISHED',
        actor: 'cur-1',
        entityId: 'ver-1',
      }),
    );
  });

  it('records audit logs for archiving', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      curatorId: 'cur-1',
    });
    prisma.exhibition.update.mockResolvedValue({
      id: 'ex-1',
      status: 'ARCHIVED',
      visibility: 'DRAFT',
    });

    await service.archive('ex-1', {
      curatorId: 'cur-1',
      curatorTier: 'STANDARD',
    });

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_ARCHIVED',
        actor: 'cur-1',
        entityId: 'ex-1',
      }),
    );
  });
});
