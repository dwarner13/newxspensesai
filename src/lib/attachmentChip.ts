/**
 * AttachmentChip presentation rules (pure; agreed with Attachments HQ, 2026-11-23).
 *
 * States: uploading → processing → ready | unreadable, plus removed. Status is always text +
 * icon (never colour alone). Remove is offered on every failure; Retry only while the
 * original File is still in memory and the failure is retryable. 'aborted' shows no chip.
 */
import type { ChatAttachmentView } from '@/lib/chatDocuments/attachmentHistory';
import { CHAT_DOCUMENT_FAILURE_LABELS, RETRYABLE_CHAT_DOCUMENT_FAILURES } from '@/lib/chatDocuments/attachForDiscussion';

export type ChipTone = 'progress' | 'ok' | 'warn' | 'muted';

export interface ChipPresentation {
  /** Visible status text. */
  label: string;
  tone: ChipTone;
  /** "· 12 pages" when known and the file is not removed. */
  detail: string | null;
  showRemove: boolean;
  showRetry: boolean;
}

/** null = render nothing (the user cancelled the upload). */
export function chipPresentation(view: ChatAttachmentView, opts: { canRetry?: boolean } = {}): ChipPresentation | null {
  const pages = view.pageCount && view.status !== 'removed' ? `${view.pageCount} page${view.pageCount === 1 ? '' : 's'}` : null;
  switch (view.status) {
    case 'uploading':
      return { label: 'Uploading…', tone: 'progress', detail: null, showRemove: true, showRetry: false };
    case 'processing':
      return { label: 'Reading…', tone: 'progress', detail: pages, showRemove: true, showRetry: false };
    case 'ready':
      return { label: 'Ready', tone: 'ok', detail: pages, showRemove: true, showRetry: false };
    case 'removed':
      return { label: 'File removed', tone: 'muted', detail: null, showRemove: false, showRetry: false };
    case 'unreadable': {
      const reason = view.failureReason ?? null;
      if (reason === 'aborted') return null;
      const label = (reason && CHAT_DOCUMENT_FAILURE_LABELS[reason]) || "Couldn't read this file";
      const retryable = !!reason && RETRYABLE_CHAT_DOCUMENT_FAILURES.includes(reason);
      return {
        label,
        tone: reason === 'timeout' ? 'muted' : 'warn',
        detail: null,
        showRemove: true,
        showRetry: retryable && !!opts.canRetry,
      };
    }
    default:
      return null;
  }
}

/** Shorten long names in the middle so the extension stays visible ("Statement_Ma…2025.pdf"). */
export function middleTruncate(name: string, max = 36): string {
  const s = String(name || '');
  if (s.length <= max) return s;
  const dot = s.lastIndexOf('.');
  const ext = dot > 0 && s.length - dot <= 6 ? s.slice(dot) : '';
  const keep = max - ext.length - 1;
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;
  return `${s.slice(0, head)}…${s.slice(s.length - ext.length - tail, s.length - ext.length)}${ext}`;
}

/** Screen-reader sentence, e.g. "Statement.pdf: Ready, 3 pages". */
export function chipAccessibleLabel(view: ChatAttachmentView, p: ChipPresentation): string {
  return [`${view.fileName}: ${p.label}`, p.detail].filter(Boolean).join(', ');
}
