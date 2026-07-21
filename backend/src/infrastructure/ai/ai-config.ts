import { ConfigService } from '@nestjs/config';

export type AiProvider = 'openai' | 'anthropic';

export type TicketAnalysisStrategyName = 'separate' | 'structured';

export interface AiConfig {
  provider: AiProvider;
  /** API key para GENERAR la respuesta (OpenAI o Anthropic, según provider). */
  chatApiKey: string | null;
  chatModel: string;
  /**
   * API key para VECTORIZAR (embeddings). Siempre es una key de OpenAI, porque
   * Anthropic no ofrece una API de embeddings. Si provider="openai" se reutiliza
   * chatApiKey; si provider="anthropic" se toma de OPENAI_API_KEY aparte.
   */
  embeddingsApiKey: string | null;
  embeddingsModel: string;
  /**
   * Qué estrategia usa TicketAiAnalysisPort para obtener
   * category/ai_suggested_response/confidence_score:
   * "structured" (default) = un único llamado con Structured Output;
   * "separate" = RAG + clasificador como dos llamadas independientes.
   */
  analysisStrategy: TicketAnalysisStrategyName;
  /** A partir de qué confidence_score se considera que la IA "resolvió" el ticket. */
  confidenceThreshold: number;
}

export function loadAiConfig(configService: ConfigService): AiConfig {
  const provider = configService.get<string>('AI_PROVIDER', 'openai') as AiProvider;
  const chatApiKey = configService.get<string>('AI_API_KEY') || null;
  const defaultModel =
    provider === 'anthropic' ? 'claude-3-5-haiku-latest' : 'gpt-4o-mini';
  const chatModel = configService.get<string>('AI_MODEL', defaultModel);

  const openAiApiKey = configService.get<string>('OPENAI_API_KEY') || null;
  const embeddingsApiKey = provider === 'openai' ? chatApiKey : openAiApiKey;
  const embeddingsModel = configService.get<string>(
    'EMBEDDINGS_MODEL',
    'text-embedding-3-small',
  );

  const analysisStrategy: TicketAnalysisStrategyName =
    configService.get<string>('AI_ANALYSIS_STRATEGY', 'structured') === 'separate'
      ? 'separate'
      : 'structured';
  const confidenceThreshold = Number(
    configService.get<string>('AI_CONFIDENCE_THRESHOLD', '0.7'),
  );

  return {
    provider,
    chatApiKey,
    chatModel,
    embeddingsApiKey,
    embeddingsModel,
    analysisStrategy,
    confidenceThreshold,
  };
}
