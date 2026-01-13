import { BadRequestException } from '@nestjs/common';

jest.mock('../database/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { CuratorAuthService } from './curator-auth.service';

describe('CuratorAuthService', () => {
  const prisma = {
    curator: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const passwordService = {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const service = new CuratorAuthService(prisma as any, passwordService as any);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('logs in with valid credentials', async () => {
    prisma.curator.findUnique.mockResolvedValue({
      id: 'cur-1',
      email: 'curator@example.com',
      passwordHash: 'hash',
      suspendedAt: null,
    });
    passwordService.verifyPassword.mockResolvedValue(true);
    prisma.curator.update.mockResolvedValue({
      id: 'cur-1',
      email: 'curator@example.com',
    });

    await expect(
      service.validateLogin('curator@example.com', 'password'),
    ).resolves.toEqual({
      id: 'cur-1',
      email: 'curator@example.com',
    });
  });

  it('rejects invalid passwords', async () => {
    prisma.curator.findUnique.mockResolvedValue({
      id: 'cur-1',
      email: 'curator@example.com',
      passwordHash: 'hash',
      suspendedAt: null,
    });
    passwordService.verifyPassword.mockResolvedValue(false);

    await expect(
      service.validateLogin('curator@example.com', 'wrong'),
    ).resolves.toBeNull();
  });

  it('rejects expired reset tokens', async () => {
    prisma.curator.findFirst.mockResolvedValue(null);

    await expect(service.resetPassword('token', 'next')).rejects.toThrow(
      new BadRequestException('Reset token is invalid or expired'),
    );
  });
});
