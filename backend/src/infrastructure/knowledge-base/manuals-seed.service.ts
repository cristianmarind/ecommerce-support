import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { MANUALS_CONTENT, ManualContent } from './manuals.data';

export const MANUALS_DIR = path.join(process.cwd(), 'manuales');

/**
 * Genera los PDF de manuales de resolución por categoría, solo si todavía no
 * existen (idempotente). Se dispara desde KnowledgeBaseBootstrapService al
 * levantar la app, antes de indexarlos en Redis.
 */
@Injectable()
export class ManualsSeedService {
  private readonly logger = new Logger(ManualsSeedService.name);

  async generate(): Promise<void> {
    if (!fs.existsSync(MANUALS_DIR)) {
      fs.mkdirSync(MANUALS_DIR, { recursive: true });
    }

    for (const [categoria, datos] of Object.entries(MANUALS_CONTENT)) {
      const filePath = path.join(
        MANUALS_DIR,
        `manual_${categoria.toLowerCase()}.pdf`,
      );

      if (fs.existsSync(filePath)) {
        continue;
      }

      // Importante: esperar a que el stream termine de escribirse en disco
      // (evento "finish") antes de seguir. `doc.end()` solo señala que no hay
      // más contenido por escribir, no que el archivo ya quedó completo — si
      // no se espera, ManualsIndexingService puede leer un PDF a medio
      // escribir (truncado) y pdf-parse falla con "bad XRef entry".
      await this.generatePdf(filePath, datos);
      this.logger.log(`Manual generado: ${filePath}`);
    }
  }

  private generatePdf(filePath: string, datos: ManualContent): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      stream.on('finish', resolve);
      stream.on('error', reject);
      doc.on('error', reject);

      doc.pipe(stream);

      doc.fontSize(20).font('Helvetica-Bold').text(datos.titulo, {
        align: 'center',
      });
      doc.moveDown(2);

      datos.contenido.forEach((parrafo) => {
        doc.fontSize(12).font('Helvetica').text(parrafo, {
          align: 'justify',
          lineGap: 5,
        });
        doc.moveDown(1.5);
      });

      doc.end();
    });
  }
}
