import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { ViewerController } from './controllers/viewer.controller';

@Module({
  imports: [],
  controllers: [HealthController, ViewerController],
  providers: [],
})
export class AppModule {}