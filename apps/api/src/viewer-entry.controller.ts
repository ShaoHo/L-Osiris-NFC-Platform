import { Controller, Get, Param } from '@nestjs/common';

@Controller('viewer')
export class ViewerEntryController {
  @Get('entry/:publicTagId')
  resolve(@Param('publicTagId') publicTagId: string) {
    return {
      exhibition: {
        id: 'exh_placeholder',
        type: 'ONE_TO_ONE',
        totalDays: 365,
        status: 'ACTIVE',
        visibility: 'PUBLIC',
      },
      viewer: {
        requiresClaim: true,
        state: {
          status: 'NOT_STARTED',
          activatedAt: null,
          currentDayIndex: null,
        },
      },
      exhibit: {
        dayIndex: 1,
        isMasked: false,
        render: { mode: 'BLOCKS', blocks: [] },
      },
      debug: { publicTagId },
    };
  }
}
