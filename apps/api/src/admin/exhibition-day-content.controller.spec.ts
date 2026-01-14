import { ExhibitionDayContentAdminController } from './exhibition-day-content.controller';

describe('ExhibitionDayContentAdminController', () => {
  const prisma = {
    exhibition: {
      findUnique: jest.fn(),
    },
    exhibitionVersion: {
      findFirst: jest.fn(),
    },
  };

  const aiGeneration = {
    enqueueDraftJob: jest.fn(),
  };

  const auditService = {
    record: jest.fn(),
  };

  const controller = new ExhibitionDayContentAdminController(
    prisma as any,
    aiGeneration as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records audit logs when queuing a draft job', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      totalDays: 3,
    });
    prisma.exhibitionVersion.findFirst.mockResolvedValue({
      id: 'ver-1',
      totalDays: 3,
    });
    aiGeneration.enqueueDraftJob.mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
      exhibitionId: 'ex-1',
      dayIndex: 1,
      createdAt: new Date(),
    });

    await controller.createDraft(
      'ex-1',
      '1',
      { prompt: 'Generate' },
      { adminUserEmail: 'admin@example.com' } as any,
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_AI_DRAFT_REQUESTED',
        actor: 'admin@example.com',
        entityId: 'ex-1',
      }),
    );
  });
});
