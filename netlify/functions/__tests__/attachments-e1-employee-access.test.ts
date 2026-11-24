/**
 * Attachments E1 — employee document-access permissions (deny by default, server-side).
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

vi.hoisted(() => {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
});
vi.mock('../_shared/supabase', () => ({ admin: () => ({}), serverSupabase: () => ({}), supabaseAdmin: {} }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose rows for an in-memory Supabase stand-in
type Row = Record<string, any>;
const A = '11111111-1111-4111-8111-111111111111';
const CHAT = 'c0c0c0c0-0000-4000-8000-000000000001';
const IMPORT_DOC = 'a0a0a0a0-0000-4000-8000-000000000001';

function db(): Record<string, Row[]> {
  return {
    user_documents: [
      { id: CHAT, user_id: A, purpose: 'chat_document', status: 'ready', original_name: 'private-lease-name.pdf', extracted_data: { page_texts: [{ page: 1, text: 'Rent is $1,850 per month.' }] } },
      { id: IMPORT_DOC, user_id: A, purpose: 'import', status: 'ready', original_name: 'stmt.pdf', mime_type: 'application/pdf', ocr_text_length: 10, ocr_text_hash: 'h' },
    ],
    imports: [{ id: 'imp', user_id: A, document_id: IMPORT_DOC, status: 'completed', created_at: '2026-11-01', statement_breakdown_json: { statement_meta: { issuer: 'Owner Bank' } } }],
  };
}
function makeSb(data: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: Array<[string, string, unknown]> = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chainable stand-in
      const b: any = {
        select: () => b,
        eq: (c: string, v: unknown) => (filters.push(['eq', c, v]), b),
        in: (c: string, v: unknown) => (filters.push(['in', c, v]), b),
        order: () => b,
        limit: () => b,
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
          Promise.resolve({
            data: (data[table] || []).filter((r) => filters.every(([o, c, v]) => (o === 'eq' ? r[c] === v : (v as unknown[]).includes(r[c])))),
            error: null,
          }).then(res, rej),
      };
      return b;
    },
  };
}

const access = await import('../_shared/employeeDocumentAccess');
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loaded after env setup
let buildAttachmentContext: (sb: any, userId: string, ids: string[], opts?: { question?: string; allowChatDocuments?: boolean }) => Promise<string | null>;
beforeAll(async () => {
  buildAttachmentContext = (await import('../chat')).buildAttachmentContext;
}, 120_000);

describe('permission contract', () => {
  it('Prime (both slugs) keeps chat-document context and the D1 tool — unchanged behaviour', () => {
    for (const slug of ['prime', 'prime-boss', ' Prime-Boss ']) {
      expect(access.resolveEmployeeDocumentAccess(slug)).toEqual({ chatDocumentContext: true, tools: ['tag_document_findings'] });
    }
  });

  it('every other employee is denied until explicitly authorized (Tag, Byte, Crystal, Goalie, Finley, Custodian)', () => {
    for (const slug of ['tag', 'tag-ai', 'byte', 'byte-docs', 'crystal-analytics', 'goalie-goals', 'finley-ai', 'custodian', 'custodian-settings']) {
      expect(access.resolveEmployeeDocumentAccess(slug)).toEqual({ chatDocumentContext: false, tools: [] });
    }
  });

  it('unknown or malformed slugs are never guessed → deny', () => {
    for (const slug of ['prime-boss-2', 'primeboss', 'admin', '', null, undefined, 42, { slug: 'prime' }]) {
      expect(access.resolveEmployeeDocumentAccess(slug)).toEqual({ chatDocumentContext: false, tools: [] });
    }
  });

  it('the map is frozen (cannot be widened at runtime)', () => {
    expect(Object.isFrozen(access.EMPLOYEE_DOCUMENT_ACCESS)).toBe(true);
    expect(Object.isFrozen(access.EMPLOYEE_DOCUMENT_ACCESS.prime)).toBe(true);
  });
});

describe('server-side enforcement in buildAttachmentContext', () => {
  it('deny by default: chat documents are withheld with a note that leaks no names', async () => {
    const ctx = String(await buildAttachmentContext(makeSb(db()), A, [CHAT]));
    expect(ctx).toMatch(/1 attached document\(s\) are not available to this assistant\./);
    expect(ctx).not.toContain('Rent is');
    expect(ctx).not.toContain('private-lease-name');
  });

  it('authorized (Prime): excerpts are included as before', async () => {
    const ctx = String(await buildAttachmentContext(makeSb(db()), A, [CHAT], { allowChatDocuments: true }));
    expect(ctx).toContain('Rent is $1,850 per month.');
    expect(ctx).toContain('[p.1]');
  });

  it('import-document metadata is unaffected by the chat-document permission (e.g. Byte)', async () => {
    const ctx = String(await buildAttachmentContext(makeSb(db()), A, [IMPORT_DOC]));
    expect(ctx).toContain('stmt.pdf');
    expect(ctx).toContain('Owner Bank');
    expect(ctx).not.toMatch(/not available to this assistant/);
  });
});

describe('chat.ts wiring (static)', () => {
  const chat = fs.readFileSync(path.resolve(__dirname, '../chat.ts'), 'utf8');
  it('a specialist turn neither stores nor reads chat-document refs (only authorized employees compute them)', () => {
    expect(chat).toMatch(/const documentAccess = await authorizeEmployeeDocumentAccess\(\{ userId, employeeSlug: finalEmployeeSlug \}\);/);
    expect(chat).toMatch(/= documentAccess\.chatDocumentContext\s*\n\s*\? await Promise\.all\(\[\s*\n\s*resolveAttachmentRefs\(sb, userId, documentIds\),\s*\n\s*loadActiveDocumentIds\(sb, userId, finalSessionId\),\s*\n\s*\]\)\s*\n\s*: \[\[\], \[\]\];/);
  });
  it('the attachment context receives the permission; the D1 tool also requires it', () => {
    expect(chat).toMatch(/buildAttachmentContext\(sb, userId, contextDocumentIds, \{ question: masked, allowChatDocuments: documentAccess\.chatDocumentContext \}\)/);
    expect(chat).toMatch(/chatDocumentModeEnabled\(\) && resolveEmployeeDocumentAccess\(finalEmployeeSlug\)\.tools\.includes\('tag_document_findings'\) && !employeeTools\.includes\('tag_document_findings'\)/);
  });
  it('enforcement lives only on the server: no frontend file decides document permissions', () => {
    const lib = fs.readFileSync(path.resolve(__dirname, '../../../src/lib/chatDocuments/attachForDiscussion.ts'), 'utf8');
    expect(lib).not.toMatch(/employeeDocumentAccess|chatDocumentContext/);
  });
});

describe('entitlement hook (owner directive 2026-11-24): static permission AND authorizeCapability', () => {
  it('no resolver installed → Prime keeps access (allow-all until the entitlement matrix lands)', async () => {
    const caps = await import('../../../src/shared/capabilities');
    caps.setEntitlementResolver(null);
    expect(await access.authorizeEmployeeDocumentAccess({ userId: A, employeeSlug: 'prime-boss' })).toEqual({ chatDocumentContext: true, tools: ['tag_document_findings'] });
  });

  it('a resolver denying byte.chat_document_context → no access, so no excerpts and no refs', async () => {
    const caps = await import('../../../src/shared/capabilities');
    caps.setEntitlementResolver(async (_req, spec) => spec.capability !== 'byte.chat_document_context');
    try {
      const decided = await access.authorizeEmployeeDocumentAccess({ userId: A, employeeSlug: 'prime' });
      expect(decided).toEqual({ chatDocumentContext: false, tools: [] });
      const ctx = String(await buildAttachmentContext(makeSb(db()), A, [CHAT], { allowChatDocuments: decided.chatDocumentContext }));
      expect(ctx).not.toContain('Rent is');
      expect(ctx).toMatch(/not available to this assistant/);
    } finally {
      caps.setEntitlementResolver(null);
    }
  });

  it('the static deny still wins even when the resolver allows everything (never calls the hook)', async () => {
    const caps = await import('../../../src/shared/capabilities');
    const seen: string[] = [];
    caps.setEntitlementResolver(async (req) => { seen.push(req.actingEmployee); return true; });
    try {
      for (const slug of ['tag-ai', 'byte-docs', 'custodian', 'unknown-employee']) {
        expect(await access.authorizeEmployeeDocumentAccess({ userId: A, employeeSlug: slug })).toEqual({ chatDocumentContext: false, tools: [] });
      }
      expect(seen).toEqual([]);
    } finally {
      caps.setEntitlementResolver(null);
    }
  });

  it('actingEmployee is the canonical server-resolved key with the document_access path, never the raw slug', async () => {
    const caps = await import('../../../src/shared/capabilities');
    const reqs: Array<{ actingEmployee: string; toolId: string; via: string; userId: string }> = [];
    caps.setEntitlementResolver(async (req) => { reqs.push(req); return true; });
    try {
      await access.authorizeEmployeeDocumentAccess({ userId: A, employeeSlug: ' Prime-Boss ' });
      expect(reqs).toEqual([{ userId: A, actingEmployee: 'prime', toolId: 'chat_document_context', via: 'document_access' }]);
      expect(caps.capabilityForTool('chat_document_context')).toMatchObject({ capability: 'byte.chat_document_context', classified: true });
    } finally {
      caps.setEntitlementResolver(null);
    }
  });

  it('an entitlement error fails closed', async () => {
    const caps = await import('../../../src/shared/capabilities');
    caps.setEntitlementResolver(async () => { throw new Error('billing down'); });
    try {
      expect(await access.authorizeEmployeeDocumentAccess({ userId: A, employeeSlug: 'prime' })).toEqual({ chatDocumentContext: false, tools: [] });
    } finally {
      caps.setEntitlementResolver(null);
    }
  });
});
