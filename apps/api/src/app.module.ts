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
import { AdminActionController } from './admin/admin-action.controller';
import { SoftDeletePurgeModule } from './jobs/soft-delete-purge.module';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { ExhibitionDayContentAdminController } from './admin/exhibition-day-content.controller';
import { AiGenerationModule } from './jobs/ai-generation.module';
import { PasswordService } from './auth/password.service';
import { CuratorAuthService } from './auth/curator-auth.service';
import { MarketingOutboxModule } from './jobs/marketing-outbox.module';

@Module({
  imports: [
    DatabaseModule,
    SoftDeletePurgeModule,
    AiGenerationModule,
    MarketingOutboxModule,
  ],
  controllers: [
    AppController,
    HealthController,
    ViewerController,
    ViewerEntryController,
    DevController,
    AccessGrantAdminController,
    AdminActionController,
    ExhibitionDayContentAdminController,
  ],
  providers: [
    AppService,
    AccessGrantService,
    AdminAuthService,
    AdminAuthGuard,
    PasswordService,
    CuratorAuthService,
  ],
})
export class AppModule {}
