import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password.service';

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

@Injectable()
export class CuratorAuthService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  async validateLogin(
    email: string,
    password: string,
  ): Promise<{ id: string; email: string } | null> {
    if (!email || !password) {
      return null;
    }

    const curator = await this.prisma.curator.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!curator || !curator.passwordHash) {
      return null;
    }

    const passwordValid = await this.passwordService.verifyPassword(
      password,
      curator.passwordHash,
    );
    if (!passwordValid) {
      return null;
    }

    await this.prisma.curator.update({
      where: { id: curator.id },
      data: { lastLoginAt: new Date() },
    });

    return { id: curator.id, email: curator.email };
  }

  async issuePasswordReset(email: string): Promise<string | null> {
    const curator = await this.prisma.curator.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!curator) {
      return null;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.curator.update({
      where: { id: curator.id },
      data: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: expiresAt,
      },
    });

    return token;
  }

  async resetPassword(token: string, nextPassword: string) {
    if (!token || !nextPassword) {
      throw new BadRequestException('Reset token and new password are required');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const curator = await this.prisma.curator.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!curator) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await this.passwordService.hashPassword(nextPassword);

    await this.prisma.curator.update({
      where: { id: curator.id },
      data: {
        passwordHash,
        passwordUpdatedAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
  }
}
