import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('dev')
export class DevController {
  constructor(private prisma: PrismaService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    // Only allow in development
    const isDev =
      process.env.APP_ENV === 'dev' || process.env.NODE_ENV === 'development';

    if (!isDev) {
      throw new NotFoundException();
    }

    // Create or upsert Exhibition
    const exhibition = await this.prisma.exhibition.upsert({
      where: { id: 'exh_test123' },
      create: {
        id: 'exh_test123',
        type: 'ONE_TO_ONE',
        totalDays: 365,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        curatorId: 'curator_dev',
      },
      update: {
        type: 'ONE_TO_ONE',
        totalDays: 365,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        curatorId: 'curator_dev',
      },
    });

    // Create or upsert NfcTag
    const nfcTag = await this.prisma.nfcTag.upsert({
      where: { publicTagId: 'tg_test123' },
      create: {
        publicTagId: 'tg_test123',
        status: 'ACTIVE',
        boundExhibitionId: exhibition.id,
      },
      update: {
        status: 'ACTIVE',
        boundExhibitionId: exhibition.id,
      },
    });

    // Create or upsert Exhibit for dayIndex=1
    await this.prisma.exhibit.upsert({
      where: {
        exhibitionId_dayIndex: {
          exhibitionId: exhibition.id,
          dayIndex: 1,
        },
      },
      create: {
        exhibitionId: exhibition.id,
        dayIndex: 1,
        mode: 'BLOCKS',
        blocksJson: {
          blocks: [
            { type: 'heading', text: 'Day 1' },
            { type: 'paragraph', text: 'Hello from seeded exhibit.' },
          ],
        },
      },
      update: {
        mode: 'BLOCKS',
        blocksJson: {
          blocks: [
            { type: 'heading', text: 'Day 1' },
            { type: 'paragraph', text: 'Hello from seeded exhibit.' },
          ],
        },
      },
    });

    return {
      exhibitionId: exhibition.id,
      publicTagId: 'tg_test123',
      seeded: true,
    };
  }
}