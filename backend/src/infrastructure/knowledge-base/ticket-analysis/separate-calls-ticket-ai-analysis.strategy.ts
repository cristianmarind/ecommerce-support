import { Inject, Injectable } from '@nestjs/common';
import {
  TicketAiAnalysis,
  TicketAiAnalysisPort,
} from '../../../domain/tickets/ticket-ai-analysis.port';
import {
  TICKET_CLASSIFIER_PORT,
  TicketClassifierPort,
} from '../../../domain/tickets/ticket-classifier.port';
import {
  RAG_QUERY_PORT,
  RagQueryPort,
} from '../../../domain/knowledge-base/rag-query.port';

/**
 * Estrategia "separate": la que se usaba originalmente. Corre en paralelo el
 * RAG (búsqueda vectorial + generación, confidence_score de la similitud) y
 * el clasificador (otro llamado al modelo aparte) — dos llamadas
 * independientes en vez de una sola estructurada.
 */
@Injectable()
export class SeparateCallsTicketAiAnalysisStrategy implements TicketAiAnalysisPort {
  constructor(
    @Inject(RAG_QUERY_PORT)
    private readonly ragQueryPort: RagQueryPort,
    @Inject(TICKET_CLASSIFIER_PORT)
    private readonly ticketClassifierPort: TicketClassifierPort,
  ) {}

  async analyze(description: string): Promise<TicketAiAnalysis> {
    const [{ aiSuggestedResponse, confidenceScore }, category] =
      await Promise.all([
        this.ragQueryPort.query(description),
        this.ticketClassifierPort.classify(description),
      ]);

    return { category, aiSuggestedResponse, confidenceScore };
  }
}
