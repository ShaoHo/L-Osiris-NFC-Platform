import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ViewerController } from './viewer/viewer.controller';
import { ViewerEntryController } from './viewer/viewer-entry.controller';
import { DevSeedController } from './viewer/dev-seed.controller';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AppController,
    HealthController,
    ViewerController,
    ViewerEntryController,
    DevSeedController,
  ],
  providers: [AppService],
})
export class AppModule {}