import { TicketCategory } from './ticket-category.enum';

export interface TicketAiAnalysis {
  category: TicketCategory;
  aiSuggestedResponse: string;
  confidenceScore: number;
}

/**
 * Puerto del dominio: la aplicación depende de esta interfaz para obtener el
 * análisis completo de un ticket (categoría + respuesta sugerida + confianza)
 * a partir de su descripción. Nunca de una implementación concreta — hay más
 * de una (ver infrastructure/knowledge-base/ticket-analysis/), seleccionada
 * por AI_ANALYSIS_STRATEGY (patrón Strategy).
 */
export const TICKET_AI_ANALYSIS_PORT = Symbol('TICKET_AI_ANALYSIS_PORT');

export interface TicketAiAnalysisPort {
  analyze(description: string): Promise<TicketAiAnalysis>;
}
