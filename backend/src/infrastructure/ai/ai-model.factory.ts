import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatAnthropic } from '@langchain/anthropic';
import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { AiConfig, loadAiConfig } from './ai-config';

/**
 * Punto único para construir modelos de chat/embeddings de LangChain a partir
 * de la configuración de IA (AI_PROVIDER/AI_API_KEY/...). Inyectable para que
 * cualquier módulo que necesite un modelo (RAG hoy, otros usos de IA a
 * futuro) lo obtenga sin repetir el cableo de ConfigService.
 */
@Injectable()
export class AiModelFactory {
  constructor(private readonly configService: ConfigService) {}

  getConfig(): AiConfig {
    return loadAiConfig(this.configService);
  }

  getChatModel(options?: { temperature?: number }): BaseChatModel | null {
    const config = this.getConfig();
    if (!config.chatApiKey) return null;

    const modelOptions = {
      apiKey: config.chatApiKey,
      model: config.chatModel,
      ...(options?.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
    };

    if (config.provider === 'anthropic') {
      return new ChatAnthropic(modelOptions);
    }

    return new ChatOpenAI(modelOptions);
  }

  getEmbeddings(): Embeddings | null {
    const config = this.getConfig();
    if (!config.embeddingsApiKey) return null;

    return new OpenAIEmbeddings({
      apiKey: config.embeddingsApiKey,
      model: config.embeddingsModel,
    });
  }
}
