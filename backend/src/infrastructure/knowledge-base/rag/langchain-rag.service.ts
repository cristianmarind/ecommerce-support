import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Document } from '@langchain/core/documents';
import {
  RagAnswer,
  RagQueryPort,
} from '../../../domain/knowledge-base/rag-query.port';
import { loadAiConfig } from './ai-config';
import { buildChatModel } from './model-factory';
import { VectorStoreProvider } from './vector-store.provider';

const NOT_CONFIGURED_ANSWER: RagAnswer = {
  aiSuggestedResponse:
    'La IA todavía no está configurada (falta AI_API_KEY/OPENAI_API_KEY); un agente revisará tu caso.',
  confidenceScore: 0,
};

const NO_CONTEXT_ANSWER: RagAnswer = {
  aiSuggestedResponse:
    'No encontré información relevante en los manuales para este caso; un agente revisará tu caso.',
  confidenceScore: 0,
};

const RAG_PROMPT = (context: string, question: string) => `Eres un asistente de soporte de un e-commerce. Usa ÚNICAMENTE la siguiente información de los manuales internos para responder la consulta del cliente de forma clara, breve y en español. Si la información no alcanza para resolverlo, dilo explícitamente.

Manuales relevantes:
${context}

Consulta del cliente:
${question}

Respuesta:`;

/**
 * Implementación del puerto RagQueryPort usando LangChain: busca los
 * fragmentos de manual más relevantes en Redis (vector search) y le pide al
 * modelo de chat configurado (OpenAI o Anthropic) que redacte una respuesta
 * basada en ellos. confidence_score sale de la similitud de la búsqueda
 * vectorial, no del modelo de chat (ver decisión en README/CLAUDE.md).
 */
@Injectable()
export class LangchainRagService implements RagQueryPort {
  private readonly logger = new Logger(LangchainRagService.name);

  constructor(
    private readonly vectorStoreProvider: VectorStoreProvider,
    private readonly configService: ConfigService,
  ) {}

  async query(question: string): Promise<RagAnswer> {
    try {
      const aiConfig = loadAiConfig(this.configService);
      const chatModel = buildChatModel(aiConfig);
      const store = await this.vectorStoreProvider.getStore();

      if (!chatModel || !store) {
        this.logger.warn(
          'RAG no disponible: falta configurar AI_API_KEY y/o OPENAI_API_KEY.',
        );
        return NOT_CONFIGURED_ANSWER;
      }

      const results = await store.similaritySearchWithScore(question, 3);
      if (results.length === 0) {
        return NO_CONTEXT_ANSWER;
      }

      const context = results
        .map(([document]: [Document, number]) => document.pageContent)
        .join('\n\n---\n\n');

      // RedisVectorStore devuelve distancia (0 = idéntico); lo convertimos a
      // una confianza aproximada en [0,1]. Es un heurístico, no una
      // probabilidad calibrada — puede ajustarse más adelante.
      const bestDistance = results[0][1];
      const confidenceScore = Math.max(0, Math.min(1, 1 - bestDistance));

      const response = await chatModel.invoke(RAG_PROMPT(context, question));
      const aiSuggestedResponse =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      return { aiSuggestedResponse, confidenceScore };
    } catch (error) {
      this.logger.error(
        `Error consultando el RAG: ${error instanceof Error ? error.message : error}`,
      );
      return {
        aiSuggestedResponse:
          'Ocurrió un error al consultar la IA; un agente revisará tu caso.',
        confidenceScore: 0,
      };
    }
  }
}
