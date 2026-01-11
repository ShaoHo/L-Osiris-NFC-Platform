import { Controller, Get, Param } from '@nestjs/common';

@Controller('viewer')
export class ViewerController {
  @Get('entry/:publicTagId')
  getEntry(@Param('publicTagId') publicTagId: string) {
    return {
      publicTagId,
      title: 'Placeholder Entry',
      content: 'This is a placeholder response for the viewer entry endpoint',
      createdAt: new Date().toISOString(),
    };
  }
}