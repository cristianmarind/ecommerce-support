import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RAG_QUERY_PORT } from '../../domain/knowledge-base/rag-query.port';
import { TICKET_AI_ANALYSIS_PORT } from '../../domain/tickets/ticket-ai-analysis.port';
import { TICKET_CLASSIFIER_PORT } from '../../domain/tickets/ticket-classifier.port';
import { AiModule } from '../ai/ai.module';
import { loadAiConfig } from '../ai/ai-config';
import { KnowledgeBaseBootstrapService } from './knowledge-base-bootstrap.service';
import { ManualsSeedService } from './manuals-seed.service';
import { LangchainRagService } from './rag/langchain-rag.service';
import { ManualsIndexingService } from './rag/manuals-indexing.service';
import { VectorStoreProvider } from './rag/vector-store.provider';
import { SeparateCallsTicketAiAnalysisStrategy } from './ticket-analysis/separate-calls-ticket-ai-analysis.strategy';
import { StructuredOutputTicketAiAnalysisStrategy } from './ticket-analysis/structured-output-ticket-ai-analysis.strategy';
import { TicketClassifierService } from './ticket-classifier.service';

@Module({
  imports: [AiModule],
  providers: [
    ManualsSeedService,
    VectorStoreProvider,
    ManualsIndexingService,
    KnowledgeBaseBootstrapService,
    SeparateCallsTicketAiAnalysisStrategy,
    StructuredOutputTicketAiAnalysisStrategy,
    {
      provide: RAG_QUERY_PORT,
      useClass: LangchainRagService,
    },
    {
      provide: TICKET_CLASSIFIER_PORT,
      useClass: TicketClassifierService,
    },
    {
      // Selección de estrategia (patrón Strategy) vía AI_ANALYSIS_STRATEGY.
      provide: TICKET_AI_ANALYSIS_PORT,
      useFactory: (
        configService: ConfigService,
        separateStrategy: SeparateCallsTicketAiAnalysisStrategy,
        structuredStrategy: StructuredOutputTicketAiAnalysisStrategy,
      ) => {
        const { analysisStrategy } = loadAiConfig(configService);
        return analysisStrategy === 'separate'
          ? separateStrategy
          : structuredStrategy;
      },
      inject: [
        ConfigService,
        SeparateCallsTicketAiAnalysisStrategy,
        StructuredOutputTicketAiAnalysisStrategy,
      ],
    },
  ],
  exports: [TICKET_AI_ANALYSIS_PORT],
})
export class KnowledgeBaseModule {}
