import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password.service';

const RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

  async validateBasicAuth(
    authHeader: string,
  ): Promise<{
    user: { id: string; email: string };
    roleNames: string[];
  } | null> {
    if (!authHeader.startsWith('Basic ')) {
      return null;
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64')
      .toString('utf8')
      .trim();
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const email = decoded.slice(0, separatorIndex).trim().toLowerCase();
    const password = decoded.slice(separatorIndex + 1);

    if (!email || !password) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const passwordValid = await this.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    return {
      user: { id: user.id, email: user.email },
      roleNames: user.roles.map((role) => role.role.name),
    };
  }

  async hashPassword(password: string): Promise<string> {
    return this.passwordService.hashPassword(password);
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    return this.passwordService.verifyPassword(password, storedHash);
  }

  async issuePasswordReset(email: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.user.update({
      where: { id: user.id },
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
    const user = await this.prisma.user.findFirst({
      where: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Reset token is invalid or expired');
    }

    const passwordHash = await this.hashPassword(nextPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordUpdatedAt: new Date(),
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });
  }
}
