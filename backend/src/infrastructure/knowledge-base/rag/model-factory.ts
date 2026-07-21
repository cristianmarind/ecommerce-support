import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Embeddings } from '@langchain/core/embeddings';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { AiConfig } from './ai-config';

export function buildChatModel(config: AiConfig): BaseChatModel | null {
  if (!config.chatApiKey) return null;

  if (config.provider === 'anthropic') {
    return new ChatAnthropic({
      apiKey: config.chatApiKey,
      model: config.chatModel,
    });
  }

  return new ChatOpenAI({
    apiKey: config.chatApiKey,
    model: config.chatModel,
  });
}

export function buildEmbeddings(config: AiConfig): Embeddings | null {
  if (!config.embeddingsApiKey) return null;

  return new OpenAIEmbeddings({
    apiKey: config.embeddingsApiKey,
    model: config.embeddingsModel,
  });
}
