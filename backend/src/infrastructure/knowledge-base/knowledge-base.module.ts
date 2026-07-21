import { Module } from '@nestjs/common';
import { ManualsSeedService } from './manuals-seed.service';

@Module({
  providers: [ManualsSeedService],
})
export class KnowledgeBaseModule {}
