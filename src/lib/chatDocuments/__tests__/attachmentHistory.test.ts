/**
 * Attachments C3 — client data contract for attachment chips.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  attachmentsFromMeta,
  fetchAttachmentStatuses,
  applyAttachmentStatuses,
  splitVisibleAttachments,
} from '../attachmentHistory';

const id = (n: number) => `c0c0c0c0-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('attachment history (client)', () => {
  it('reads validated refs from message metadata; messages without attachments → []', () => {
    expect(attachmentsFromMeta(undefined)).toEqual([]);
    expect(attachmentsFromMeta({ client_message_id: 'x' })).toEqual([]);
    expect(attachmentsFromMeta({ attachments: [
      { document_id: id(1), name: 'lease.pdf', mime: 'application/pdf', pages: 3 },
      { document_id: id(2), name: 'r.png', mime: 'image/png' },
      { document_id: 'bad' },
      { document_id: id(1) },
    ] })).toEqual([
      { documentId: id(1), fileName: 'lease.pdf', kind: 'pdf', pageCount: 3, status: 'processing', failureReason: null },
      { documentId: id(2), fileName: 'r.png', kind: 'image', pageCount: null, status: 'processing', failureReason: null },
    ]);
  });

  it('fetches live statuses with the user token and applies them (removed hides page count)', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, items: [
      { document_id: id(1), status: 'ready', pages: 3 },
      { document_id: id(2), status: 'removed', pages: null },
      { document_id: id(9), status: 'ready' },
      { document_id: id(3), status: 'weird' },
    ] }), { status: 200 }));
    const map = await fetchAttachmentStatuses([id(1), id(2), id(3), 'bad'], 'jwt', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledWith('/.netlify/functions/chat-attachments-status', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
      body: JSON.stringify({ documentIds: [id(1), id(2), id(3)] }),
    }));
    expect([...map.keys()]).toEqual([id(1), id(2)]);
    const list = attachmentsFromMeta({ attachments: [{ document_id: id(1), name: 'a.pdf', mime: 'application/pdf' }, { document_id: id(2), name: 'b.pdf', mime: 'application/pdf', pages: 5 }, { document_id: id(3), name: 'c.pdf' }] });
    expect(applyAttachmentStatuses(list, map).map((a) => [a.status, a.pageCount])).toEqual([['ready', 3], ['removed', null], ['processing', null]]);
  });

  it('status lookup failures leave chips as they are (no crash)', async () => {
    const failing = vi.fn(async () => new Response('', { status: 503 }));
    expect((await fetchAttachmentStatuses([id(1)], 'jwt', failing as unknown as typeof fetch)).size).toBe(0);
    const throwing = vi.fn(async () => { throw new Error('offline'); });
    expect((await fetchAttachmentStatuses([id(1)], 'jwt', throwing as unknown as typeof fetch)).size).toBe(0);
    const never = vi.fn();
    expect((await fetchAttachmentStatuses([id(1)], '', never as unknown as typeof fetch)).size).toBe(0);
    expect(never).not.toHaveBeenCalled();
  });

  it('3 visible then +N more; expanded shows all', () => {
    const five = [1, 2, 3, 4, 5];
    expect(splitVisibleAttachments(five, false)).toEqual({ visible: [1, 2, 3], hiddenCount: 2 });
    expect(splitVisibleAttachments(five, true)).toEqual({ visible: five, hiddenCount: 0 });
    expect(splitVisibleAttachments([1, 2, 3], false)).toEqual({ visible: [1, 2, 3], hiddenCount: 0 });
  });
});
