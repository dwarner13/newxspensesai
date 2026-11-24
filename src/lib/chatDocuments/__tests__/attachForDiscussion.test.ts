/**
 * Attachments Phase C2 — paperclip decision + PrimeChatV2 wiring (static).
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { attachForDiscussion, CHAT_DOCUMENT_FAILURE_LABELS, RETRYABLE_CHAT_DOCUMENT_FAILURES } from '../attachForDiscussion';
import type { UploadChatDocumentResult, UploadableFile } from '../uploadChatDocument';

const file = Object.assign(new Blob(['x'], { type: 'application/pdf' }), { name: 'a.pdf' }) as UploadableFile;
const with_ = (r: UploadChatDocumentResult) => vi.fn(async () => r);

describe('attachForDiscussion', () => {
  it('ready → attached with the server-issued id', async () => {
    const up = with_({ ok: true, documentId: 'doc-1', status: 'ready', fileName: 'a.pdf', mimeType: 'application/pdf', pages: 2 });
    expect(await attachForDiscussion({ file, authToken: 't', uploader: up })).toEqual({ kind: 'attached', documentId: 'doc-1', pages: 2 });
  });

  it('feature off on the server (or an older deploy) → fallback to the existing import path', async () => {
    expect(await attachForDiscussion({ file, authToken: 't', uploader: with_({ ok: false, reason: 'disabled', documentId: null }) })).toEqual({ kind: 'fallback_import' });
    expect(await attachForDiscussion({ file, authToken: 't', uploader: with_({ ok: false, reason: 'server_mismatch', documentId: 'd' }) })).toEqual({ kind: 'fallback_import' });
  });

  it('other failures → agreed plain-language labels, never raw codes; cancel → no chip', async () => {
    const cases: Array<[UploadChatDocumentResult & { ok: false }, string | null]> = [
      [{ ok: false, reason: 'too_large', documentId: null }, 'File is too large'],
      [{ ok: false, reason: 'too_many_pages', documentId: 'd' }, 'Too many pages'],
      [{ ok: false, reason: 'unsupported', documentId: null }, 'File type not supported'],
      [{ ok: false, reason: 'unreadable', documentId: 'd' }, "Couldn't read this file"],
      [{ ok: false, reason: 'timeout', documentId: 'd' }, 'Still reading — check back shortly'],
      [{ ok: false, reason: 'unauthorized', documentId: null }, 'Please sign in again'],
      [{ ok: false, reason: 'upload_failed', documentId: 'd' }, "Upload didn't finish — try again"],
      [{ ok: false, reason: 'aborted', documentId: 'd' }, null],
    ];
    for (const [r, label] of cases) {
      const out = await attachForDiscussion({ file, authToken: 't', uploader: with_(r) });
      expect(out).toMatchObject({ kind: 'failed', reason: r.reason, label });
    }
    for (const label of Object.values(CHAT_DOCUMENT_FAILURE_LABELS)) {
      if (label) expect(label).not.toMatch(/_/);
    }
    expect(RETRYABLE_CHAT_DOCUMENT_FAILURES).toEqual(['upload_failed', 'failed', 'server_mismatch']);
  });

  it('a missing session token is passed as empty (the helper reports unauthorized)', async () => {
    const up = with_({ ok: false, reason: 'unauthorized', documentId: null });
    await attachForDiscussion({ file, authToken: undefined, uploader: up });
    expect(up).toHaveBeenCalledWith(expect.objectContaining({ authToken: '' }));
  });
});

describe('PrimeChatV2 paperclip wiring (static)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../../pages/PrimeChatV2/PrimeChatV2.tsx'), 'utf8');
  const cb = src.slice(src.indexOf('const processFile = useCallback'), src.indexOf('}, [userId, session, sendMessage]);'));

  it('PDF/images try attach-for-discussion first and send the documentId to chat', () => {
    expect(cb).toMatch(/await attachForDiscussion\(\{ file, authToken \}\)/);
    expect(cb).toMatch(/sendMessage\(`I've attached \$\{file\.name\}[^`]*`, \{ documentIds: \[attached\.documentId\] \}\)/);
    // attached → returns before the import pipeline
    const attachedIdx = cb.indexOf('if (attached.kind === "attached")');
    const importIdx = cb.indexOf('await runSmartImportPipeline(');
    expect(attachedIdx).toBeGreaterThan(0);
    expect(importIdx).toBeGreaterThan(attachedIdx);
    expect(cb.slice(attachedIdx, importIdx)).toMatch(/return;[\s\S]*if \(attached\.kind === "failed"\)[\s\S]*return;/);
  });

  it('spreadsheets keep the existing import path', () => {
    expect(cb.indexOf('isSpreadsheetFile(file.name)')).toBeLessThan(cb.indexOf('attachForDiscussion'));
    expect(cb).toMatch(/handleSpreadsheetUpload\(file, userId, authToken\)/);
  });
});
