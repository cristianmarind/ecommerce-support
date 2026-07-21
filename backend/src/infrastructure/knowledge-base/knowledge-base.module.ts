import { Module } from '@nestjs/common';
import { RAG_QUERY_PORT } from '../../domain/knowledge-base/rag-query.port';
import { KnowledgeBaseBootstrapService } from './knowledge-base-bootstrap.service';
import { ManualsSeedService } from './manuals-seed.service';
import { LangchainRagService } from './rag/langchain-rag.service';
import { ManualsIndexingService } from './rag/manuals-indexing.service';
import { VectorStoreProvider } from './rag/vector-store.provider';

@Module({
  providers: [
    ManualsSeedService,
    VectorStoreProvider,
    ManualsIndexingService,
    KnowledgeBaseBootstrapService,
    {
      provide: RAG_QUERY_PORT,
      useClass: LangchainRagService,
    },
  ],
  exports: [RAG_QUERY_PORT],
})
export class KnowledgeBaseModule {}
