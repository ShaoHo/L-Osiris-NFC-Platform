import { Module } from '@nestjs/common';
import { MarketingOutboxService } from './marketing-outbox.service';

@Module({
  providers: [MarketingOutboxService],
  exports: [MarketingOutboxService],
})
export class MarketingOutboxModule {}
