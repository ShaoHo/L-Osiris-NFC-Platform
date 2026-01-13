import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CuratorContext {
  curatorId: string;
  curatorTier: 'STANDARD' | 'CREATOR';
  curatorEmail?: string;
}

export const Curator = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CuratorContext => {
    const request = ctx.switchToHttp().getRequest();
    return {
      curatorId: request.curatorId,
      curatorTier: request.curatorTier,
      curatorEmail: request.curatorEmail,
    };
  },
);

export const CuratorId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.curatorId;
  },
);

export const CuratorTier = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.curatorTier;
  },
);
