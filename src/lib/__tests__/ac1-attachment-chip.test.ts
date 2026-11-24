/**
 * AC-1 — AttachmentChip presentation (agreed with Attachments HQ).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { chipPresentation, middleTruncate, chipAccessibleLabel } from '../attachmentChip';
import type { ChatAttachmentView } from '../chatDocuments/attachmentHistory';

const root = path.resolve(__dirname, '../../..');
const chip = fs.readFileSync(path.join(root, 'src/components/chat/AttachmentChip.tsx'), 'utf8');

const base: ChatAttachmentView = { documentId: '00000000-0000-4000-8000-000000000001', fileName: 'March statement.pdf', kind: 'pdf', pageCount: 3, status: 'processing', failureReason: null };

describe('chipPresentation', () => {
  it('covers the agreed states with text labels', () => {
    expect(chipPresentation({ ...base, status: 'uploading' })?.label).toBe('Uploading…');
    expect(chipPresentation(base)).toMatchObject({ label: 'Reading…', detail: '3 pages', showRemove: true });
    expect(chipPresentation({ ...base, status: 'ready' })).toMatchObject({ label: 'Ready', tone: 'ok', detail: '3 pages' });
    expect(chipPresentation({ ...base, status: 'removed' })).toEqual({ label: 'File removed', tone: 'muted', detail: null, showRemove: false, showRetry: false });
  });

  it('maps failure reasons to the agreed plain-language labels', () => {
    const u = (failureReason: ChatAttachmentView['failureReason']) => chipPresentation({ ...base, status: 'unreadable', failureReason });
    expect(u('too_large')?.label).toBe('File is too large');
    expect(u('too_many_pages')?.label).toBe('Too many pages');
    expect(u('unsupported')?.label).toBe('File type not supported');
    expect(u('unreadable')?.label).toBe("Couldn't read this file");
    expect(u('disabled')?.label).toBe('Attachments are turned off');
    expect(u('unauthorized')?.label).toBe('Please sign in again');
    expect(u('upload_failed')?.label).toBe("Upload didn't finish — try again");
    expect(u(null)?.label).toBe("Couldn't read this file");
  });

  it('timeout is muted, every failure keeps Remove, aborted shows nothing', () => {
    expect(chipPresentation({ ...base, status: 'unreadable', failureReason: 'timeout' })).toMatchObject({ label: 'Still reading — check back shortly', tone: 'muted', showRemove: true });
    expect(chipPresentation({ ...base, status: 'unreadable', failureReason: 'too_large' })?.showRemove).toBe(true);
    expect(chipPresentation({ ...base, status: 'unreadable', failureReason: 'aborted' })).toBeNull();
  });

  it('offers Retry only for retryable failures while the File is in memory', () => {
    const failed = { ...base, status: 'unreadable' as const, failureReason: 'upload_failed' as const };
    expect(chipPresentation(failed, { canRetry: true })?.showRetry).toBe(true);
    expect(chipPresentation(failed, { canRetry: false })?.showRetry).toBe(false);
    expect(chipPresentation({ ...base, status: 'unreadable', failureReason: 'too_large' }, { canRetry: true })?.showRetry).toBe(false);
  });

  it('removed hides the page count', () => {
    expect(chipPresentation({ ...base, status: 'removed', pageCount: 9 })?.detail).toBeNull();
  });
});

describe('helpers', () => {
  it('truncates in the middle and keeps the extension', () => {
    const out = middleTruncate('RBC_Visa_Statement_March_2025_final_version_copy.pdf', 30);
    expect(out.length).toBe(30);
    expect(out.endsWith('.pdf')).toBe(true);
    expect(out).toContain('…');
    expect(middleTruncate('short.pdf')).toBe('short.pdf');
  });

  it('builds a full screen-reader sentence', () => {
    const p = chipPresentation({ ...base, status: 'ready' })!;
    expect(chipAccessibleLabel({ ...base, status: 'ready' }, p)).toBe('March statement.pdf: Ready, 3 pages');
  });
});

describe('AttachmentChip component', () => {
  it('announces status politely, uses 44px actions and names Remove', () => {
    expect(chip).toMatch(/aria-live="polite"/);
    expect(chip).toMatch(/aria-label=\{`Remove \$\{attachment\.fileName\}`\}/);
    expect(chip).toMatch(/minWidth: CHAT_VISUALS\.touchTarget, minHeight: CHAT_VISUALS\.touchTarget/);
  });

  it('is presentational (no fetch, no storage) and renders names as text', () => {
    expect(chip).not.toMatch(/fetch\(|localStorage|sessionStorage|dangerouslySetInnerHTML/);
  });

  it('list shows 3 then "+N more"', () => {
    expect(chip).toMatch(/splitVisibleAttachments\(attachments, expanded\)/);
    expect(chip).toMatch(/\+\{hiddenCount\} more/);
  });
});
