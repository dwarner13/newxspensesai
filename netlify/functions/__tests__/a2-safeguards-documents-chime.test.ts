/* eslint-disable @typescript-eslint/no-explicit-any -- fake clients */
/**
 * Owner "FINAL A-2 APPROVAL" safeguards 2 and 3 (2026-11-27). Synthetic ids only.
 *  2. Byte document tools enforce customer ownership, temporary access and retention.
 *  3. Chime notification tools are read/compose only — nothing is written or sent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isOwnedStoragePath, isOriginalWithinRetention, ORIGINAL_RETENTION_HOURS } from '../../../src/shared/document-access';

const state: { doc: any; signCalls: Array<{ bucket: string; path: string; ttl: number }>; openaiUrls: string[]; guardrailsThrow: boolean } =
  { doc: null, signCalls: [], openaiUrls: [], guardrailsThrow: false };

vi.mock('../../../src/server/db', () => ({
  getSupabaseServerClient: () => ({
    from: () => {
      const filters: Record<string, unknown> = {};
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => { filters[k] = v; return q; },
        maybeSingle: async () => {
          const d = state.doc;
          const match = d && d.id === filters.id && d.user_id === filters.user_id;
          return { data: match ? d : null, error: null };
        },
      };
      return q;
    },
    storage: {
      from: (bucket: string) => ({
        createSignedUrl: async (p: string, ttl: number) => {
          state.signCalls.push({ bucket, path: p, ttl });
          return { data: { signedUrl: `https://storage.example/sign/${bucket}/${p}?token=t` }, error: null };
        },
      }),
    },
  }),
}));
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: async (req: any) => {
      state.openaiUrls.push(req.messages[0].content[1].image_url.url);
      return { choices: [{ message: { content: 'Receipt total 12.34' } }] };
    } } };
  },
}));
vi.mock('../../../netlify/functions/_shared/guardrails-unified.js', () => ({
  runGuardrailsForText: async (t: string) => {
    if (state.guardrailsThrow) throw new Error('guardrails down');
    return { ok: true, text: t, signals: {} };
  },
}));

const { execute: visionOcr, inputSchema } = await import('../../../src/agent/tools/impl/vision_ocr_light');

const U = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const DOC = '33333333-3333-4333-8333-333333333333';
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'placeholder-not-a-key';
  state.doc = { id: DOC, user_id: U, storage_path: `${U}/${DOC}/receipt.png`, mime_type: 'image/png', created_at: hoursAgo(2) };
  state.signCalls = []; state.openaiUrls = []; state.guardrailsThrow = false;
});

describe('safeguard 2: Byte document access', () => {
  it('the model can no longer supply a URL — only a document id', () => {
    expect(inputSchema.safeParse({ imageUrl: 'https://evil.example/x.png' }).success).toBe(false);
    expect(inputSchema.safeParse({ documentId: DOC }).success).toBe(true);
  });

  it('own image within retention: read through a 60-second signed URL created server-side', async () => {
    const r: any = await visionOcr({ documentId: DOC, extractText: true, maxLength: 500 } as any, { userId: U });
    expect(r.value.ok).toBe(true);
    expect(state.signCalls).toEqual([{ bucket: 'docs', path: `${U}/${DOC}/receipt.png`, ttl: 60 }]);
    expect(state.openaiUrls[0]).toContain(`/sign/docs/${U}/`);
  });

  it("another customer's document is refused (no signed URL, no vision call)", async () => {
    const r: any = await visionOcr({ documentId: DOC, extractText: true, maxLength: 500 } as any, { userId: OTHER });
    expect(r.value.ok).toBe(false);
    expect(state.signCalls).toEqual([]);
    expect(state.openaiUrls).toEqual([]);
  });

  it('a row whose storage object is outside the customer prefix is refused', async () => {
    state.doc.storage_path = `${OTHER}/${DOC}/receipt.png`;
    const r: any = await visionOcr({ documentId: DOC, extractText: true, maxLength: 500 } as any, { userId: U });
    expect(r.value.ok).toBe(false);
    expect(state.signCalls).toEqual([]);
  });

  it(`originals older than ${ORIGINAL_RETENTION_HOURS} hours are not read`, async () => {
    state.doc.created_at = hoursAgo(ORIGINAL_RETENTION_HOURS + 1);
    const r: any = await visionOcr({ documentId: DOC, extractText: true, maxLength: 500 } as any, { userId: U });
    expect(r.value.ok).toBe(false);
    expect(r.value.message).toMatch(/72 hours/);
    expect(state.signCalls).toEqual([]);
  });

  it('masking fails CLOSED: if guardrails fail, no text is returned', async () => {
    state.guardrailsThrow = true;
    const r: any = await visionOcr({ documentId: DOC, extractText: true, maxLength: 500 } as any, { userId: U });
    expect(r.value.ok).toBe(false);
    expect(r.value.text).toBe('');
  });

  it('helpers: traversal, foreign prefix and bad dates fail closed', () => {
    expect(isOwnedStoragePath(`${U}/a/../${OTHER}/x`, U)).toBe(false);
    expect(isOwnedStoragePath(`${U}x/a`, U)).toBe(false);
    expect(isOwnedStoragePath('', U)).toBe(false);
    expect(isOriginalWithinRetention(null)).toBe(false);
    expect(isOriginalWithinRetention('not a date')).toBe(false);
    expect(isOriginalWithinRetention(new Date(Date.now() + 3600e3).toISOString())).toBe(false);
  });

  it('the other document tools are scoped to the customer', () => {
    for (const f of ['get_document_by_id.ts', 'get_recent_documents.ts']) {
      const src = fs.readFileSync(path.join(__dirname, `../../../src/agent/tools/impl/${f}`), 'utf8');
      expect(src, f).toMatch(/\.eq\('user_id', userId\)/);
    }
  });
});

describe('safeguard 3: Chime tools are read/compose only (no writes, no sending)', () => {
  const CHIME = ['chime_list_obligations', 'chime_list_upcoming_notifications', 'chime_summarize_upcoming_obligations',
    'chime_draft_notification_copy', 'chime_generate_notification'];
  it('no Chime tool writes to the database or sends anything', () => {
    for (const t of CHIME) {
      const src = fs.readFileSync(path.join(__dirname, `../../../src/agent/tools/impl/${t}.ts`), 'utf8');
      expect(src, t).not.toMatch(/\.(insert|update|upsert|delete)\(/);
      expect(src, t).not.toMatch(/\bfetch\(|sendEmail|resend|webpush|sendNotification|twilio|\.rpc\(/i);
    }
  });
  it('no Chime tool is registered as mutating', () => {
    const idx = fs.readFileSync(path.join(__dirname, '../../../src/agent/tools/index.ts'), 'utf8');
    for (const t of CHIME) {
      const start = idx.indexOf(`['${t}',`);
      expect(start, t).toBeGreaterThan(-1);
      const block = idx.slice(start, idx.indexOf('}],', start));
      expect(block, t).not.toMatch(/mutates:\s*true/);
    }
  });
});
