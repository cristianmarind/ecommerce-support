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

  generate(): void {
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

      this.generatePdf(filePath, datos);
      this.logger.log(`Manual generado: ${filePath}`);
    }
  }

  private generatePdf(filePath: string, datos: ManualContent): void {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

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
  }
}
