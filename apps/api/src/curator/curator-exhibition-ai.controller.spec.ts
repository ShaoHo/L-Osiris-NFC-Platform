import { CuratorExhibitionAiController } from './curator-exhibition-ai.controller';

describe('CuratorExhibitionAiController', () => {
  const prisma = {
    exhibition: {
      findUnique: jest.fn(),
    },
  };

  const aiGeneration = {
    enqueueDraftJobs: jest.fn(),
  };

  const auditService = {
    record: jest.fn(),
  };

  const controller = new CuratorExhibitionAiController(
    prisma as any,
    aiGeneration as any,
    auditService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('records audit logs when drafting with AI', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      curatorId: 'cur-1',
      totalDays: 5,
    });
    aiGeneration.enqueueDraftJobs.mockResolvedValue([
      { id: 'job-1', dayIndex: 1, status: 'PENDING' },
    ]);

    await controller.generateDrafts(
      'ex-1',
      {
        prompt: 'Generate',
        startDay: 1,
        endDay: 1,
      },
      { curatorId: 'cur-1', curatorTier: 'STANDARD' },
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'EXHIBITION_AI_DRAFTS_REQUESTED',
        actor: 'cur-1',
        entityId: 'ex-1',
      }),
    );
  });
});
