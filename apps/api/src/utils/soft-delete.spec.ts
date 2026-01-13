import { buildSoftDeleteData, softDeleteEntity } from './soft-delete';

describe('soft delete helpers', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-02-01T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds deletedAt and purgeAfter based on retentionDays', () => {
    const result = buildSoftDeleteData({ retentionDays: 15 });

    expect(result.deletedAt.toISOString()).toBe('2025-02-01T10:00:00.000Z');
    expect(result.purgeAfter.toISOString()).toBe('2025-02-16T10:00:00.000Z');
  });

  it('updates entity with soft delete payload', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'ex-1' });

    const result = await softDeleteEntity({ update }, 'ex-1', {
      retentionDays: 5,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'ex-1' },
      data: {
        deletedAt: new Date('2025-02-01T10:00:00.000Z'),
        purgeAfter: new Date('2025-02-06T10:00:00.000Z'),
      },
    });
    expect(result).toEqual({ id: 'ex-1' });
  });
});
