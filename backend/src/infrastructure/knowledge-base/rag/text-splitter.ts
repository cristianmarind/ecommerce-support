/**
 * Chunker simple por tamaño de caracteres con solapamiento. Evita depender del
 * paquete `langchain` (que arrastra versiones incompatibles con
 * @langchain/core en este momento) solo para una utilidad tan chica.
 */
export function splitIntoChunks(
  text: string,
  chunkSize = 800,
  chunkOverlap = 150,
): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end).trim());
    if (end === clean.length) break;
    start = end - chunkOverlap;
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
