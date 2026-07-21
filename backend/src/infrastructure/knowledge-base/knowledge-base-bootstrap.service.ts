import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ManualsSeedService } from './manuals-seed.service';
import { ManualsIndexingService } from './rag/manuals-indexing.service';

/**
 * Orquesta el arranque de la base de conocimiento: primero asegura que los
 * PDF de manuales existan en disco, luego los indexa en Redis. El orden
 * importa (no se puede indexar lo que no existe), por eso se hace explícito
 * acá en vez de depender de que Nest llame los hooks de ambos servicios en
 * un orden particular.
 */
@Injectable()
export class KnowledgeBaseBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly manualsSeedService: ManualsSeedService,
    private readonly manualsIndexingService: ManualsIndexingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.manualsSeedService.generate();
    await this.manualsIndexingService.indexManuals();
  }
}
