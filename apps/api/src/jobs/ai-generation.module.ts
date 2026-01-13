import { Module } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';
import { AiGenerationWorker } from './ai-generation.worker';

@Module({
  providers: [AiGenerationService, AiGenerationWorker],
  exports: [AiGenerationService],
})
export class AiGenerationModule {}
