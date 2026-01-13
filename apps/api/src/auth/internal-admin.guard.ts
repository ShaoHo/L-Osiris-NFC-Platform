import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

const OTP_HEADER = 'x-internal-otp';
const DEFAULT_ALLOWLIST = new Set(['127.0.0.1', '::1']);

@Injectable()
export class InternalAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getRequestIp(request);
    const allowlist = this.getAllowlist();

    if (!ip || !allowlist.has(ip)) {
      throw new ForbiddenException('IP not allowlisted for internal admin');
    }

    const otp = request.headers[OTP_HEADER] as string | string[] | undefined;

    if (!otp || Array.isArray(otp) || !otp.trim()) {
      throw new UnauthorizedException('Missing internal admin OTP');
    }

    const expectedOtp = process.env.INTERNAL_ADMIN_OTP;

    if (expectedOtp && otp.trim() !== expectedOtp) {
      throw new UnauthorizedException('Invalid internal admin OTP');
    }

    return true;
  }

  private getAllowlist(): Set<string> {
    const raw = process.env.INTERNAL_ADMIN_IP_ALLOWLIST ?? '';
    const entries = raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (entries.length === 0) {
      return DEFAULT_ALLOWLIST;
    }

    return new Set(entries);
  }

  private getRequestIp(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.trim()) {
      return forwarded.split(',')[0].trim();
    }

    return request.ip ?? request.socket?.remoteAddress ?? undefined;
  }
}
