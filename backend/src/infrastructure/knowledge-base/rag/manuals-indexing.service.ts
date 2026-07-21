import { Injectable, Logger } from '@nestjs/common';
import { Document } from '@langchain/core/documents';
import { MANUALS_CONTENT } from '../manuals.data';
import { splitIntoChunks } from './text-splitter';
import { VectorStoreProvider } from './vector-store.provider';

/**
 * Indexa el contenido de los manuales como vectores en Redis. Es idempotente:
 * si el índice ya tiene documentos, no vuelve a vectorizar (evita gastar
 * llamadas a la API de embeddings en cada reinicio del contenedor en modo
 * watch).
 *
 * Importante: indexa directamente MANUALS_CONTENT (el texto fuente), NO lee
 * de vuelta los PDF generados por ManualsSeedService. Se probó leer/parsear
 * los PDF con pdf-parse y resultó poco confiable en este entorno — generando
 * muchos documentos seguidos con pdfkit, una fracción salía con bytes
 * corruptos ("bad XRef entry") incluso esperando correctamente a que el
 * stream de escritura terminara. Como el texto de los manuales ya vive en
 * MANUALS_CONTENT, no hay necesidad de pasar por ese round-trip frágil
 * PDF→texto solo para indexar. Los PDF se siguen generando igual (para
 * cuando se quieran servir/descargar), pero quedan desacoplados del RAG.
 */
@Injectable()
export class ManualsIndexingService {
  private readonly logger = new Logger(ManualsIndexingService.name);

  constructor(private readonly vectorStoreProvider: VectorStoreProvider) {}

  async indexManuals(): Promise<void> {
    const store = await this.vectorStoreProvider.getStore();
    if (!store) {
      // VectorStoreProvider ya loguea por qué (falta API key de embeddings).
      return;
    }

    if (await this.alreadyIndexed()) {
      this.logger.log('Los manuales ya estaban indexados en Redis, se omite.');
      return;
    }

    const documents: Document[] = [];
    for (const [categoria, datos] of Object.entries(MANUALS_CONTENT)) {
      const text = [datos.titulo, ...datos.contenido].join('\n\n');

      for (const chunk of splitIntoChunks(text)) {
        documents.push(
          new Document({ pageContent: chunk, metadata: { source: categoria } }),
        );
      }
    }

    if (documents.length === 0) {
      this.logger.warn('No se generaron fragmentos a partir de los manuales.');
      return;
    }

    await store.addDocuments(documents);
    this.logger.log(
      `Manuales indexados en Redis: ${documents.length} fragmentos de ${
        Object.keys(MANUALS_CONTENT).length
      } categorías.`,
    );
  }

  private async alreadyIndexed(): Promise<boolean> {
    try {
      const client = await this.vectorStoreProvider.getClient();
      const info = await client.ft.info(this.vectorStoreProvider.getIndexName());
      return Number(info.numDocs ?? 0) > 0;
    } catch {
      // El índice todavía no existe en Redis.
      return false;
    }
  }
}
