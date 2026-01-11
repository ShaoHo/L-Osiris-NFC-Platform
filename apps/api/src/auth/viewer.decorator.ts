import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Viewer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      viewerId: request.viewerId,
      sessionId: request.sessionId,
    };
  },
);

export const ViewerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.viewerId;
  },
);