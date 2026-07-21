import { Module } from '@nestjs/common';
import { AiModelFactory } from './ai-model.factory';
import { PromptSafetyCheckerService } from './prompt-safety-checker.service';

@Module({
  providers: [AiModelFactory, PromptSafetyCheckerService],
  exports: [AiModelFactory, PromptSafetyCheckerService],
})
export class AiModule {}
