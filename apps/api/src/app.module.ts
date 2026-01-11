import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ViewerEntryController } from './viewer-entry.controller';

@Module({
  imports: [],
  controllers: [AppController, HealthController, ViewerEntryController],
  providers: [AppService],
})
export class AppModule {}
