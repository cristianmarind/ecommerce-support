import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisVectorStore } from '@langchain/redis';
import { createClient, RedisClientType } from 'redis';
import { AiModelFactory } from '../../ai/ai-model.factory';

/**
 * Crea (una sola vez, de forma perezosa) la conexión a Redis y el vector store
 * de LangChain, compartidos entre el indexado de manuales y las consultas RAG.
 * Si no hay una API key de embeddings configurada, retorna null y quien lo use
 * debe degradar con gracia (ver ManualsIndexingService / LangchainRagService).
 */
@Injectable()
export class VectorStoreProvider {
  private readonly logger = new Logger(VectorStoreProvider.name);
  private client: RedisClientType | null = null;
  private store: RedisVectorStore | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly aiModelFactory: AiModelFactory,
  ) {}

  async getClient(): Promise<RedisClientType> {
    if (this.client) return this.client;

    const url = this.configService.get<string>('REDIS_URL', 'redis://redis:6379');
    this.client = createClient({ url }) as RedisClientType;
    this.client.on('error', (error: Error) =>
      this.logger.error(`Error de conexión a Redis: ${error.message}`),
    );
    await this.client.connect();
    return this.client;
  }

  async getStore(): Promise<RedisVectorStore | null> {
    if (this.store) return this.store;

    const embeddings = this.aiModelFactory.getEmbeddings();
    if (!embeddings) {
      this.logger.warn(
        'RAG deshabilitado: falta configurar la API key de embeddings (AI_API_KEY/OPENAI_API_KEY).',
      );
      return null;
    }

    const client = await this.getClient();
    const indexName = this.configService.get<string>(
      'REDIS_INDEX_NAME',
      'manuales_idx',
    );

    this.store = new RedisVectorStore(embeddings, {
      redisClient: client,
      indexName,
    });

    return this.store;
  }

  getIndexName(): string {
    return this.configService.get<string>('REDIS_INDEX_NAME', 'manuales_idx');
  }
}
