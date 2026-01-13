import { ForbiddenException } from '@nestjs/common';
import { CuratorExhibitionController } from './curator-exhibition.controller';

describe('CuratorExhibitionController', () => {
  const prisma = {
    exhibition: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const controller = new CuratorExhibitionController(prisma as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('blocks ONE_TO_MANY creation for STANDARD tier', async () => {
    await expect(
      controller.create(
        { type: 'ONE_TO_MANY', totalDays: 30 },
        { curatorId: 'cur-1', curatorTier: 'STANDARD' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks monetization for STANDARD tier', async () => {
    await expect(
      controller.create(
        { type: 'ONE_TO_ONE', totalDays: 30, monetizationEnabled: true },
        { curatorId: 'cur-1', curatorTier: 'STANDARD' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks public publish for STANDARD tier', async () => {
    await expect(
      controller.publish('ex-1', {
        curatorId: 'cur-1',
        curatorTier: 'STANDARD',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
