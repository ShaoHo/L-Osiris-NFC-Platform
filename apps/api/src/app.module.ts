import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health.controller';
import { ViewerController } from './viewer/viewer.controller';
import { ViewerEntryController } from './viewer/viewer-entry.controller';
import { NfcEntryController } from './viewer/nfc-entry.controller';
import { GalleryController } from './viewer/gallery.controller';
import { DevController } from './dev/dev.controller';
import { DatabaseModule } from './database/database.module';
import { AccessGrantAdminController } from './admin/access-grant.controller';
import { AccessGrantService } from './access/access-grant.service';
import { AccessPolicyService } from './access/access-policy.service';
import { AdminActionController } from './admin/admin-action.controller';
import { SoftDeletePurgeModule } from './jobs/soft-delete-purge.module';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminAuthGuard } from './auth/admin-auth.guard';
import { ExhibitionDayContentAdminController } from './admin/exhibition-day-content.controller';
import { AiGenerationModule } from './jobs/ai-generation.module';
import { PasswordService } from './auth/password.service';
import { CuratorAuthService } from './auth/curator-auth.service';
import { MarketingOutboxModule } from './jobs/marketing-outbox.module';
import { CuratorPolicyAdminController } from './admin/curator-policy.controller';
import { RevenueShareAdminController } from './admin/revenue-share.controller';
import { ViewerEntryService } from './viewer/viewer-entry.service';
import { ExhibitionAdminController } from './admin/exhibition-admin.controller';
import { ExhibitionAiController } from './admin/exhibition-ai.controller';
import { CuratorAuthController } from './auth/curator-auth.controller';
import { CuratorExhibitionController } from './curator/curator-exhibition.controller';
import { CuratorAuthGuard } from './auth/curator-auth.guard';
import { CuratorExhibitionService } from './curator/curator-exhibition.service';
import { CuratorExhibitionDayContentController } from './curator/curator-exhibition-day-content.controller';
import { CuratorExhibitionDayContentService } from './curator/curator-exhibition-day-content.service';
import { CuratorExhibitionAiController } from './curator/curator-exhibition-ai.controller';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { AdminActionService } from './admin/admin-action.service';
import { AdminActionExecutionService } from './jobs/admin-action-execution.service';
import { InternalAdminController } from './internal/internal-admin.controller';
import { InternalAdminGuard } from './auth/internal-admin.guard';
import { AdminAccessGuard } from './admin/admin-access.guard';
import { AdminSessionController } from './admin/admin-session.controller';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    SoftDeletePurgeModule,
    AiGenerationModule,
    MarketingOutboxModule,
    AuditModule,
  ],
  controllers: [
    AppController,
    HealthController,
    ViewerController,
    ViewerEntryController,
    NfcEntryController,
    GalleryController,
    DevController,
    AccessGrantAdminController,
    AdminActionController,
    ExhibitionDayContentAdminController,
    CuratorPolicyAdminController,
    RevenueShareAdminController,
    ExhibitionAdminController,
    ExhibitionAiController,
    AdminSessionController,
    CuratorAuthController,
    CuratorExhibitionController,
    CuratorExhibitionDayContentController,
    CuratorExhibitionAiController,
    PaymentsController,
    InternalAdminController,
  ],
  providers: [
    AppService,
    AccessGrantService,
    AccessPolicyService,
    AdminAuthService,
    AdminAuthGuard,
    AdminAccessGuard,
    CuratorAuthGuard,
    PasswordService,
    CuratorAuthService,
    CuratorExhibitionService,
    CuratorExhibitionDayContentService,
    ViewerEntryService,
    AdminActionService,
    AdminActionExecutionService,
    PaymentsService,
    InternalAdminGuard,
  ],
})
export class AppModule {}
