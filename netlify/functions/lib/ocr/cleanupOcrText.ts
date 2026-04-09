export function cleanupOcrText(input: unknown): string {
  const text = String(input || '');
  // Remove invalid unicode/control chars and normalize noisy OCR spacing.
  return text
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    // Re-insert thousand-separator commas stripped by embedded_pdf_parse.
    // e.g. "4166.65" -> "4,166.65", "12181.33" -> "12,181.33"
    // Fixes amount parsing for ALL statement types downstream.
    .replace(/\b(\d{4,7})\.(\d{2})\b/g, (_, int, dec) =>
      Number(int).toLocaleString('en-CA') + '.' + dec
    )
    .trim();
}