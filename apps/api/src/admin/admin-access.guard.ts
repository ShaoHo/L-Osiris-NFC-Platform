import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac } from 'crypto';
import { isIP } from 'net';
import { PrismaService } from '../database/prisma.service';
import { getRequestIp, normalizeIp } from './admin-auth.utils';

const OTP_HEADER = 'x-admin-otp';
const DEFAULT_ALLOWLIST = ['127.0.0.1/32', '::1/128'];
const DEFAULT_TOTP_STEP_SECONDS = 30;
const DEFAULT_TOTP_WINDOW = 1;

@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawIp = normalizeIp(getRequestIp(request));
    const actor = (request as any).adminUserEmail as string | undefined;

    if (!rawIp || !this.isIpAllowlisted(rawIp)) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_IP_DENIED',
          actor,
          payload: {
            ip: rawIp,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new ForbiddenException('IP not allowlisted for admin access');
    }

    const otpHeader = request.headers[OTP_HEADER];
    const otp = Array.isArray(otpHeader) ? otpHeader[0] : otpHeader;

    if (!otp || !otp.trim()) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_OTP_MISSING',
          actor,
          payload: {
            ip: rawIp,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new UnauthorizedException('Missing admin OTP');
    }

    if (!this.verifyTotp(otp.trim())) {
      await this.prisma.auditLog.create({
        data: {
          eventType: 'ADMIN_OTP_INVALID',
          actor,
          payload: {
            ip: rawIp,
            method: request.method,
            path: request.originalUrl ?? request.url,
          },
        },
      });
      throw new UnauthorizedException('Invalid admin OTP');
    }

    await this.prisma.auditLog.create({
      data: {
        eventType: 'ADMIN_OTP_VERIFIED',
        actor,
        payload: {
          ip: rawIp,
          method: request.method,
          path: request.originalUrl ?? request.url,
        },
      },
    });

    return true;
  }

  private isIpAllowlisted(ip: string): boolean {
    const allowlist = this.getAllowlist();
    if (allowlist.length === 0) {
      return false;
    }

    return allowlist.some((entry) => this.isIpInEntry(ip, entry));
  }

  private getAllowlist(): string[] {
    const raw = process.env.ADMIN_IP_ALLOWLIST_CIDRS ?? '';
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (entries.length === 0) {
      return DEFAULT_ALLOWLIST;
    }

    return entries;
  }

  private isIpInEntry(ip: string, entry: string): boolean {
    if (!entry.includes('/')) {
      return ip === entry;
    }

    const [cidrIp, prefixString] = entry.split('/');
    const prefix = Number(prefixString);
    const ipVersion = isIP(ip);
    const cidrVersion = isIP(cidrIp);

    if (!ipVersion || ipVersion !== cidrVersion || Number.isNaN(prefix)) {
      return false;
    }

    if (ipVersion === 4) {
      return this.isIpv4InCidr(ip, cidrIp, prefix);
    }

    return this.isIpv6InCidr(ip, cidrIp, prefix);
  }

  private isIpv4InCidr(ip: string, cidrIp: string, prefix: number): boolean {
    if (prefix < 0 || prefix > 32) {
      return false;
    }

    const ipValue = this.ipv4ToNumber(ip);
    const cidrValue = this.ipv4ToNumber(cidrIp);
    if (ipValue === null || cidrValue === null) {
      return false;
    }

    if (prefix === 0) {
      return true;
    }

    const shift = 32 - prefix;
    return (ipValue >>> shift) === (cidrValue >>> shift);
  }

  private isIpv6InCidr(ip: string, cidrIp: string, prefix: number): boolean {
    if (prefix < 0 || prefix > 128) {
      return false;
    }

    const ipValue = this.ipv6ToBigInt(ip);
    const cidrValue = this.ipv6ToBigInt(cidrIp);
    if (ipValue === null || cidrValue === null) {
      return false;
    }

    if (prefix === 0) {
      return true;
    }

    const shift = BigInt(128 - prefix);
    return (ipValue >> shift) === (cidrValue >> shift);
  }

  private ipv4ToNumber(ip: string): number | null {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }

    return (
      ((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0)
    );
  }

  private ipv6ToBigInt(ip: string): bigint | null {
    if (ip.includes('.')) {
      const lastColon = ip.lastIndexOf(':');
      if (lastColon === -1) {
        return null;
      }
      const ipv4Part = ip.slice(lastColon + 1);
      const ipv4Value = this.ipv4ToNumber(ipv4Part);
      if (ipv4Value === null) {
        return null;
      }
      const head = ip.slice(0, lastColon);
      const expanded = `${head}:${((ipv4Value >>> 16) & 0xffff).toString(
        16,
      )}:${(ipv4Value & 0xffff).toString(16)}`;
      return this.ipv6ToBigInt(expanded);
    }

    const [head, tail] = ip.split('::');
    const headParts = head ? head.split(':').filter(Boolean) : [];
    const tailParts = tail ? tail.split(':').filter(Boolean) : [];
    const missing = 8 - (headParts.length + tailParts.length);
    if (missing < 0) {
      return null;
    }
    const parts = [
      ...headParts,
      ...Array.from({ length: missing }, () => '0'),
      ...tailParts,
    ];
    if (parts.length !== 8) {
      return null;
    }

    let value = 0n;
    for (const part of parts) {
      const segment = Number.parseInt(part, 16);
      if (Number.isNaN(segment)) {
        return null;
      }
      value = (value << 16n) + BigInt(segment);
    }

    return value;
  }

  private verifyTotp(token: string): boolean {
    const secrets = this.getOtpSecrets();
    if (secrets.length === 0) {
      return false;
    }

    const stepValue = Number(
      process.env.ADMIN_TOTP_STEP_SECONDS ?? DEFAULT_TOTP_STEP_SECONDS,
    );
    const windowValue = Number(
      process.env.ADMIN_TOTP_WINDOW ?? DEFAULT_TOTP_WINDOW,
    );
    const step =
      Number.isFinite(stepValue) && stepValue > 0
        ? stepValue
        : DEFAULT_TOTP_STEP_SECONDS;
    const window =
      Number.isFinite(windowValue) && windowValue >= 0
        ? windowValue
        : DEFAULT_TOTP_WINDOW;
    const timeStep = Math.floor(Date.now() / 1000 / step);

    return secrets.some((secret) =>
      this.isTotpMatch(secret, token, timeStep, window),
    );
  }

  private getOtpSecrets(): Buffer[] {
    const raw = process.env.ADMIN_OTP_SECRETS ?? '';
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return entries.map((entry) => this.decodeSecret(entry));
  }

  private decodeSecret(secret: string): Buffer {
    const normalized = secret.replace(/\s+/g, '').toUpperCase();
    if (/^[A-Z2-7]+=*$/.test(normalized)) {
      const bytes: number[] = [];
      let buffer = 0;
      let bits = 0;
      for (const char of normalized.replace(/=+$/, '')) {
        const value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
        if (value < 0) {
          return Buffer.from(secret, 'utf8');
        }
        buffer = (buffer << 5) | value;
        bits += 5;
        if (bits >= 8) {
          bits -= 8;
          bytes.push((buffer >> bits) & 0xff);
        }
      }
      return Buffer.from(bytes);
    }

    return Buffer.from(secret, 'utf8');
  }

  private isTotpMatch(
    secret: Buffer,
    token: string,
    timeStep: number,
    window: number,
  ): boolean {
    for (let offset = -window; offset <= window; offset += 1) {
      const code = this.generateTotp(secret, timeStep + offset);
      if (code === token) {
        return true;
      }
    }
    return false;
  }

  private generateTotp(secret: Buffer, counter: number): string {
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', secret).update(buffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const code =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
  }
}
