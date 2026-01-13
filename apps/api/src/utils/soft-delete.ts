export const DEFAULT_RETENTION_DAYS = 30;

export interface SoftDeleteOptions {
  retentionDays?: number;
  now?: Date;
}

export interface SoftDeleteData {
  deletedAt: Date;
  purgeAfter: Date;
}

export const buildSoftDeleteData = (
  options: SoftDeleteOptions = {},
): SoftDeleteData => {
  const now = options.now ?? new Date();
  const retentionDays = options.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const purgeAfter = new Date(now.getTime() + retentionDays * 86400000);

  return {
    deletedAt: now,
    purgeAfter,
  };
};

export const softDeleteEntity = async <T>(
  delegate: { update: (args: { where: { id: string }; data: SoftDeleteData }) => Promise<T> },
  id: string,
  options: SoftDeleteOptions = {},
): Promise<T> => {
  const data = buildSoftDeleteData(options);

  return delegate.update({
    where: { id },
    data,
  });
};
