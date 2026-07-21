import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Document } from '@langchain/core/documents';
import pdfParse from 'pdf-parse';
import { MANUALS_DIR } from '../manuals-seed.service';
import { splitIntoChunks } from './text-splitter';
import { VectorStoreProvider } from './vector-store.provider';

/**
 * Carga los PDF de `manuales/`, los divide en fragmentos y los indexa como
 * vectores en Redis. Es idempotente: si el índice ya tiene documentos, no
 * vuelve a vectorizar (evita gastar llamadas a la API de embeddings en cada
 * reinicio del contenedor en modo watch).
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

    if (!fs.existsSync(MANUALS_DIR)) {
      this.logger.warn(
        `No se encontró la carpeta de manuales (${MANUALS_DIR}); nada para indexar.`,
      );
      return;
    }

    if (await this.alreadyIndexed()) {
      this.logger.log('Los manuales ya estaban indexados en Redis, se omite.');
      return;
    }

    const files = fs
      .readdirSync(MANUALS_DIR)
      .filter((file) => file.endsWith('.pdf'));

    const documents: Document[] = [];
    for (const file of files) {
      const filePath = path.join(MANUALS_DIR, file);
      const buffer = fs.readFileSync(filePath);
      const { text } = await pdfParse(buffer);

      for (const chunk of splitIntoChunks(text)) {
        documents.push(
          new Document({ pageContent: chunk, metadata: { source: file } }),
        );
      }
    }

    if (documents.length === 0) {
      this.logger.warn('No se generaron fragmentos a partir de los manuales.');
      return;
    }

    await store.addDocuments(documents);
    this.logger.log(
      `Manuales indexados en Redis: ${documents.length} fragmentos de ${files.length} PDFs.`,
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
