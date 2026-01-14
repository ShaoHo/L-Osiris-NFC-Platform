import { Request } from 'express';

export function getRequestIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  return request.ip ?? request.socket?.remoteAddress ?? undefined;
}

export function normalizeIp(rawIp: string | undefined): string | undefined {
  if (!rawIp) {
    return undefined;
  }

  if (rawIp.startsWith('::ffff:')) {
    return rawIp.slice(7);
  }

  return rawIp;
}
