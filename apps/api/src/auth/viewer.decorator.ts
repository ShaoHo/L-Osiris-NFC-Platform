import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Viewer = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return {
      viewerId: request.viewerId,
      sessionId: request.sessionId,
      nfcTagId: request.nfcTagId,
    };
  },
);

export const ViewerId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.viewerId;
  },
);

export const ViewerSessionId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.sessionId;
  },
);

export const ViewerNfcTagId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.nfcTagId;
  },
);
