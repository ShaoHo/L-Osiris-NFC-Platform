import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ViewerController } from './viewer/viewer.controller';
import { ViewerEntryController } from './viewer/viewer-entry.controller';
import { DevController } from './dev/dev.controller';
import { DatabaseModule } from './database/database.module';
import { AccessGrantAdminController } from './admin/access-grant.controller';
import { AccessGrantService } from './access/access-grant.service';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AppController,
    HealthController,
    ViewerController,
    ViewerEntryController,
    DevController,
    AccessGrantAdminController,
  ],
  providers: [AppService, AccessGrantService],
})
export class AppModule {}
