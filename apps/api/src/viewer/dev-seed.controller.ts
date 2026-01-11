import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Controller('dev/seed')
export class DevSeedController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async seed() {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      throw new ForbiddenException('Seed endpoint only available in development');
    }

    // Create one Exhibition
    const exhibition = await this.prisma.exhibition.upsert({
      where: { id: 'exh_test123' },
      create: {
        id: 'exh_test123',
        type: 'ONE_TO_ONE',
        totalDays: 365,
        visibility: 'PUBLIC',
        status: 'ACTIVE',
      },
      update: {},
    });

    // Create one NfcTag with publicTagId "tg_test123"
    const nfcTag = await this.prisma.nfcTag.upsert({
      where: { publicTagId: 'tg_test123' },
      create: {
        publicTagId: 'tg_test123',
        status: 'ACTIVE',
        boundExhibitionId: exhibition.id,
      },
      update: {
        boundExhibitionId: exhibition.id,
      },
    });

    // Optionally create Exhibit dayIndex=1 placeholder
    const exhibit = await this.prisma.exhibit.upsert({
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
        blocksJson: [],
      },
      update: {},
    });

    return {
      message: 'Seed data created',
      exhibition: {
        id: exhibition.id,
        type: exhibition.type,
        totalDays: exhibition.totalDays,
      },
      nfcTag: {
        id: nfcTag.id,
        publicTagId: nfcTag.publicTagId,
        boundExhibitionId: nfcTag.boundExhibitionId,
      },
      exhibit: {
        id: exhibit.id,
        dayIndex: exhibit.dayIndex,
        mode: exhibit.mode,
      },
    };
  }
}