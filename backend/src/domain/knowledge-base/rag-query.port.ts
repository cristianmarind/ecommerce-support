export interface RagAnswer {
  aiSuggestedResponse: string;
  confidenceScore: number;
}

/**
 * Puerto del dominio: la aplicación depende de esta interfaz para obtener una
 * respuesta sugerida por IA a partir de la base de conocimiento (manuales),
 * nunca de una implementación concreta (LangChain, Redis, OpenAI/Anthropic).
 */
export const RAG_QUERY_PORT = Symbol('RAG_QUERY_PORT');

export interface RagQueryPort {
  query(question: string): Promise<RagAnswer>;
}
