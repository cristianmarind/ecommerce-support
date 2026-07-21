import { Module } from '@nestjs/common';
import { AiModelFactory } from './ai-model.factory';

@Module({
  providers: [AiModelFactory],
  exports: [AiModelFactory],
})
export class AiModule {}
