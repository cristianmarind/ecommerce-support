import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ManualsSeedService } from './manuals-seed.service';
import { ManualsIndexingService } from './rag/manuals-indexing.service';

/**
 * Orquesta el arranque de la base de conocimiento: primero asegura que los
 * PDF de manuales existan en disco (y terminen de escribirse), luego los
 * indexa en Redis. El orden importa (no se puede indexar lo que no existe),
 * por eso se hace explícito acá en vez de depender de que Nest llame los
 * hooks de ambos servicios en un orden particular.
 *
 * Todo el proceso está en un try/catch: un problema acá (un PDF corrupto,
 * Redis caído, la API de embeddings fallando) no debe tumbar el arranque del
 * backend — los tickets tienen que poder seguir creándose aunque el RAG no
 * esté disponible (ver fallback en LangchainRagService).
 */
@Injectable()
export class KnowledgeBaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(KnowledgeBaseBootstrapService.name);

  constructor(
    private readonly manualsSeedService: ManualsSeedService,
    private readonly manualsIndexingService: ManualsIndexingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.manualsSeedService.generate();
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
