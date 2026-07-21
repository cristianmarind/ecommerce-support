import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ManualsIndexingService } from './rag/manuals-indexing.service';

/**
 * Indexa los manuales en Redis al arrancar la app. Todo el proceso está en un
 * try/catch: un problema acá (Redis caído, la API de embeddings fallando) no
 * debe tumbar el arranque del backend — los tickets tienen que poder seguir
 * creándose aunque el RAG no esté disponible (ver fallback en
 * LangchainRagService).
 */
@Injectable()
export class KnowledgeBaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeBaseBootstrapService.name);

  constructor(private readonly manualsIndexingService: ManualsIndexingService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.manualsIndexingService.indexManuals();
    } catch (error) {
      this.logger.error(
        `No se pudo preparar la base de conocimiento (RAG queda deshabilitado): ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
