/**
 * Attachments Phase C2 — the Prime paperclip's "attach for discussion" decision.
 *
 * - Chat documents enabled on the server → upload as a chat document (never imported).
 * - Server reports chat documents disabled (runtime gate off) or did not record a chat document
 *   (older deploy, before any bytes are uploaded) → 'fallback_import': the caller keeps today's
 *   import behaviour, so nothing changes until the owner activates the feature.
 * - Any other failure → a plain-language label agreed with UI/UX Studio (never raw codes).
 */
import { uploadChatDocument, type ChatDocumentFailure, type ChatDocumentStage, type UploadableFile, type UploadChatDocumentResult } from './uploadChatDocument';

/** UI/UX Studio's final chip text (2026-11-23). null = no chip (user cancelled). */
export const CHAT_DOCUMENT_FAILURE_LABELS: Record<ChatDocumentFailure, string | null> = {
  too_large: 'File is too large',
  too_many_pages: 'Too many pages',
  unsupported: 'File type not supported',
  unreadable: "Couldn't read this file",
  timeout: 'Still reading — check back shortly',
  disabled: 'Attachments are turned off',
  unauthorized: 'Please sign in again',
  upload_failed: "Upload didn't finish — try again",
  failed: "Upload didn't finish — try again",
  server_mismatch: "Upload didn't finish — try again",
  rate_limited: 'Upload limit reached — try again later',
  aborted: null,
};

/** Failures where retrying with the same in-memory File can help. */
export const RETRYABLE_CHAT_DOCUMENT_FAILURES: readonly ChatDocumentFailure[] = ['upload_failed', 'failed', 'server_mismatch'];

export type AttachForDiscussionResult =
  | { kind: 'attached'; documentId: string; pages: number | null }
  | { kind: 'fallback_import' }
  | { kind: 'failed'; reason: ChatDocumentFailure; label: string | null; documentId: string | null };

export async function attachForDiscussion(args: {
  file: UploadableFile;
  authToken: string | undefined;
  onStage?: (stage: ChatDocumentStage) => void;
  signal?: AbortSignal;
  uploader?: (input: Parameters<typeof uploadChatDocument>[0]) => Promise<UploadChatDocumentResult>;
}): Promise<AttachForDiscussionResult> {
  const upload = args.uploader ?? uploadChatDocument;
  const r = await upload({ file: args.file, authToken: args.authToken || '', onStage: args.onStage, signal: args.signal });
  if (r.ok) return { kind: 'attached', documentId: r.documentId, pages: r.pages };
  if (r.reason === 'disabled' || r.reason === 'server_mismatch') return { kind: 'fallback_import' };
  return { kind: 'failed', reason: r.reason, label: CHAT_DOCUMENT_FAILURE_LABELS[r.reason], documentId: r.documentId };
}
