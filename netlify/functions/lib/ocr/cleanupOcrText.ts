export function cleanupOcrText(input: unknown): string {
  const text = String(input || '');
  // Remove invalid unicode/control chars and normalize noisy OCR spacing.
  return text
    .replace(/[\uD800-\uDFFF]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

