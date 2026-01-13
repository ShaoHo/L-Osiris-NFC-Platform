import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { ViewerId, ViewerSessionId } from '../auth/viewer.decorator';
import { ViewerEntryService } from './viewer-entry.service';

@Controller('t')
export class NfcEntryController {
  constructor(private readonly viewerEntryService: ViewerEntryService) {}

  @Get(':publicTagId/resolve')
  @UseGuards(OptionalViewerAuthGuard)
  async resolveDecision(
    @Param('publicTagId') publicTagId: string,
    @ViewerId() viewerId?: string,
    @ViewerSessionId() sessionId?: string,
  ) {
    return this.viewerEntryService.resolveDecision({
      publicTagId,
      viewerId,
      sessionId,
    });
  }

  @Get(':publicTagId')
  @UseGuards(OptionalViewerAuthGuard)
  async resolve(
    @Param('publicTagId') publicTagId: string,
    @ViewerId() viewerId?: string,
    @ViewerSessionId() sessionId?: string,
  ) {
    return this.viewerEntryService.resolveEntry({
      publicTagId,
      viewerId,
      sessionId,
    });
  }
}
