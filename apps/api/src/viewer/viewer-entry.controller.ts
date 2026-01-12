import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { OptionalViewerAuthGuard } from '../auth/optional-viewer-auth.guard';
import { ViewerId, ViewerSessionId } from '../auth/viewer.decorator';
import { ViewerEntryService } from './viewer-entry.service';

@Controller('viewer')
export class ViewerEntryController {
  constructor(
    private readonly viewerEntryService: ViewerEntryService,
  ) {}

  @Get('entry/:publicTagId')
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
