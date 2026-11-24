/**
 * Attachments B1 — page-by-page text for chat documents (SERVER-ONLY).
 *
 * The joined ocr_text is stored exactly as before. For chat documents we additionally keep
 * `extracted_data.page_texts = [{ page, text }]` so Phase C can cite page numbers.
 *
 * Page boundaries are trusted only when they reproduce the final OCR text (whitespace-insensitive).
 * If the final text came from a fallback engine without page boundaries, pages are omitted rather
 * than guessed. Images are a single page. Every page is masked by the caller-supplied masker
 * (the shared PII patterns), and nothing here logs text.
 */
import { CHAT_DOCUMENT_MAX_PAGES } from './documentPurpose.js';

export type ChatDocumentPage = { page: number; text: string };

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

export function buildChatDocumentPageTexts(args: {
  rawFinalText: string;
  rawPageTexts: string[] | null | undefined;
  isImage: boolean;
  mask: (text: string) => string;
  maxPages?: number;
}): ChatDocumentPage[] | null {
  const maxPages = args.maxPages ?? CHAT_DOCUMENT_MAX_PAGES;
  const finalText = String(args.rawFinalText || '');
  if (!finalText.trim()) return null;

  let pages: string[] | null = null;
  const raw = Array.isArray(args.rawPageTexts) ? args.rawPageTexts.map((t) => String(t ?? '')) : null;
  if (raw && raw.length > 0 && squash(raw.join('\n')) === squash(finalText)) {
    pages = raw;
  } else if (args.isImage) {
    pages = [finalText];
  }
  if (!pages || pages.length > maxPages) return null;
  return pages.map((text, i) => ({ page: i + 1, text: args.mask(text) }));
}
