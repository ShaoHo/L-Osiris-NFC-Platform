export const hash = jest.fn(async (value: string) => `hashed:${value}`);
export const verify = jest.fn(async () => true);
