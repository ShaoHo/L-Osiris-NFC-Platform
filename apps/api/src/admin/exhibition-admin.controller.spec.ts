import { ExhibitionAdminController } from './exhibition-admin.controller';

describe('ExhibitionAdminController', () => {
  const prisma = {
    exhibition: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    adminAction: {
      create: jest.fn(),
    },
    curator: {
      findUnique: jest.fn(),
    },
  };

  const auditService = {
    record: jest.fn(),
  };

  const controller = new ExhibitionAdminController(
    prisma as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('soft deletes an exhibition with retention window', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({ id: 'ex-1' });
    prisma.exhibition.update.mockResolvedValue({
      id: 'ex-1',
      deletedAt: new Date(),
      purgeAfter: new Date(),
    });

    const result = await controller.softDelete('ex-1', {
      requestedBy: 'admin',
      retentionDays: 10,
    });

    expect(result.id).toBe('ex-1');
  });

  it('prevents purge before retention window', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-2',
      purgeAfter: new Date(Date.now() + 60_000),
    });

    await expect(
      controller.purge('ex-2', { requestedBy: 'admin' }),
    ).rejects.toThrow('Exhibition is not ready for purge');
  });
});
