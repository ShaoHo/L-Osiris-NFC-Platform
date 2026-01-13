import { ExhibitionAiController } from './exhibition-ai.controller';

describe('ExhibitionAiController', () => {
  const prisma = {
    exhibition: {
      findUnique: jest.fn(),
    },
  };

  const aiGeneration = {
    enqueueDraftJobs: jest.fn(),
  };

  const controller = new ExhibitionAiController(
    prisma as any,
    aiGeneration as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('queues draft jobs for a day range', async () => {
    prisma.exhibition.findUnique.mockResolvedValue({
      id: 'ex-1',
      totalDays: 3,
    });
    aiGeneration.enqueueDraftJobs.mockResolvedValue([
      { id: 'job-1', dayIndex: 1, status: 'PENDING' },
      { id: 'job-2', dayIndex: 2, status: 'PENDING' },
    ]);

    const result = await controller.generateDrafts('ex-1', {
      prompt: 'Generate',
      startDay: 1,
      endDay: 2,
    });

    expect(result.jobs).toHaveLength(2);
    expect(result.jobs[0].dayIndex).toBe(1);
  });
});
