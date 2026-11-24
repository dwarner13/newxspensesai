/**
 * Attachments B1 — document purpose (SERVER-ONLY).
 *
 * A user_documents row is created with a purpose, decided by the server at smart-import-init and
 * never changed afterwards:
 *   - 'import'        : the existing Smart Import flow (OCR → normalize → stage → commit). Legacy
 *                        rows with a NULL purpose are treated as 'import'.
 *   - 'chat_document' : attach-and-discuss. OCR runs, the text is stored, and the document must
 *                        never become an import or transactions.
 *
 * The no-import rule is enforced at every entry point that can turn a document into staged or
 * committed transactions (smart-import-finalize routing, smart-import-ocr-background handoff,
 * normalize-transactions, smart-import-sync, commit-import), and by database triggers in
 * sql/migrations/20261123_user_documents_purpose.sql as a backstop.
 *
 * Never logs or returns document contents.
 */
import { detectFileType, type DetectedFileType } from './uploadFileValidation.js';

export type DocumentPurpose = 'chat_document' | 'import';

export const CHAT_DOCUMENT_PURPOSE: DocumentPurpose = 'chat_document';
export const IMPORT_PURPOSE: DocumentPurpose = 'import';

/** Owner decision (Attachments B1): 15 MB and 50 pages per chat document. */
export const CHAT_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
export const CHAT_DOCUMENT_MAX_PAGES = 50;

/** File types accepted for chat documents, by actual content (magic bytes). */
export const CHAT_DOCUMENT_TYPES: readonly DetectedFileType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

export const CHAT_DOCUMENT_NOT_IMPORTABLE = 'chat_document_not_importable';

/**
 * Runtime gate. Chat documents stay off until the owner activates the runtime path (after the
 * migration is applied and owner-only access is confirmed). Default: disabled.
 */
export function chatDocumentModeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.CHAT_DOCUMENT_MODE_ENABLED === 'true';
}

export type PurposeParse = { ok: true; purpose: DocumentPurpose } | { ok: false };

/** Parse a client-requested purpose. Absent means 'import' (existing callers are unchanged). */
export function parseRequestedPurpose(raw: unknown): PurposeParse {
  if (raw === undefined || raw === null || raw === '') return { ok: true, purpose: IMPORT_PURPOSE };
  if (raw === CHAT_DOCUMENT_PURPOSE) return { ok: true, purpose: CHAT_DOCUMENT_PURPOSE };
  if (raw === IMPORT_PURPOSE) return { ok: true, purpose: IMPORT_PURPOSE };
  return { ok: false };
}

export function isChatDocumentRow(row: { purpose?: unknown } | null | undefined): boolean {
  return Boolean(row) && row?.purpose === CHAT_DOCUMENT_PURPOSE;
}

/** Effective purpose of a stored row (NULL / unknown legacy values behave as 'import'). */
export function effectivePurpose(row: { purpose?: unknown } | null | undefined): DocumentPurpose {
  return isChatDocumentRow(row) ? CHAT_DOCUMENT_PURPOSE : IMPORT_PURPOSE;
}

function isMissingPurposeColumn(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null;
  const message = String(e?.message || '').toLowerCase();
  return e?.code === '42703' || (message.includes('purpose') && (message.includes('does not exist') || message.includes('schema cache')));
}

export type ImportBlock = { status: number; code: string };

type PurposeLookupClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder (service-role client)
  from: (table: string) => any;
};

/**
 * Returns null when the document may enter the import pipeline, or a block when it must not.
 *  - chat_document            → 409 chat_document_not_importable
 *  - lookup failure           → 503 (fail closed; the import pipeline already retries)
 *  - purpose column missing   → null: before the migration no chat document can exist, because
 *                               smart-import-init cannot create one without the column.
 *  - row not found            → null: the caller's own ownership / not-found handling applies.
 */
export async function documentImportBlock(
  sb: PurposeLookupClient,
  documentId: string,
  userId?: string | null,
): Promise<ImportBlock | null> {
  if (!documentId) return null;
  let query = sb.from('user_documents').select('purpose').eq('id', documentId);
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query.maybeSingle();
  if (error) {
    if (isMissingPurposeColumn(error)) return null;
    return { status: 503, code: 'document_purpose_unavailable' };
  }
  if (isChatDocumentRow(data)) return { status: 409, code: CHAT_DOCUMENT_NOT_IMPORTABLE };
  return null;
}

export type ChatDocumentFileCheck =
  | { ok: true; mime: DetectedFileType; pages: number }
  | { ok: false; status: number; code: string };

/** Count PDF pages with pdfjs (same loader the OCR function uses). Returns null if unreadable. */
export async function countPdfPages(buf: Buffer): Promise<number | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs legacy build is untyped here
    const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdfjs = pdfjsModule.default || pdfjsModule;
    const task = pdfjs.getDocument({ data: new Uint8Array(buf), disableWorker: true, stopAtErrors: false, verbosity: 0 });
    const doc = await task.promise;
    const n = Number(doc.numPages);
    try {
      await doc.destroy();
    } catch {
      /* ignore */
    }
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

/**
 * Validate a stored chat document by its real content: allowed type (magic bytes), the declared
 * MIME family must match the content, size ≤ 15 MB, and PDFs ≤ 50 pages (unreadable PDFs are
 * rejected). Images count as one page.
 */
export async function checkChatDocumentFile(
  buf: Buffer,
  declaredMime: string | null | undefined,
  opts: { maxBytes?: number; maxPages?: number; pageCounter?: (b: Buffer) => Promise<number | null> } = {},
): Promise<ChatDocumentFileCheck> {
  const maxBytes = opts.maxBytes ?? CHAT_DOCUMENT_MAX_BYTES;
  const maxPages = opts.maxPages ?? CHAT_DOCUMENT_MAX_PAGES;
  if (!buf || buf.length === 0) return { ok: false, status: 400, code: 'MISSING_FILE' };
  if (buf.length > maxBytes) return { ok: false, status: 413, code: 'FILE_TOO_LARGE' };
  const detected = detectFileType(buf);
  if (!detected || !CHAT_DOCUMENT_TYPES.includes(detected)) {
    return { ok: false, status: 415, code: 'UNSUPPORTED_FILE_TYPE' };
  }
  const declared = String(declaredMime || '').toLowerCase();
  const declaredIsPdf = declared === 'application/pdf';
  const detectedIsPdf = detected === 'application/pdf';
  if (declaredIsPdf !== detectedIsPdf) {
    return { ok: false, status: 415, code: 'CONTENT_TYPE_MISMATCH' };
  }
  if (!detectedIsPdf) return { ok: true, mime: detected, pages: 1 };
  const pages = await (opts.pageCounter ?? countPdfPages)(buf);
  if (pages === null) return { ok: false, status: 422, code: 'UNREADABLE_PDF' };
  if (pages > maxPages) return { ok: false, status: 413, code: 'TOO_MANY_PAGES' };
  return { ok: true, mime: detected, pages };
}
