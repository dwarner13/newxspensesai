/**
 * PRIME REASONING V1 — R0: UIContextEnvelope V1 contract (NOT wired into production;
 * usePrimeChat does not send it and chat.ts does not read it).
 *
 * A small, typed snapshot of what the user is looking at in XspensesAI, captured at
 * send time, so Prime can understand "this", "these", "this category", "this chart".
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ UI CONTEXT IS UNTRUSTED CONTEXT. IT IS NOT FINANCIAL AUTHORITY.               │
 * │ The browser can say selectedTransactionIds = [X]; that does NOT mean X        │
 * │ belongs to the user — backend ownership validation stays mandatory (the same  │
 * │ authority as Layer 2 / select_transaction). The browser can say "category =   │
 * │ Restaurants"; that helps interpret "this category" but proves no totals.      │
 * │ The envelope can never authorize mutations, account access, transaction       │
 * │ access, totals or identity. All values are re-fetched / re-validated server-  │
 * │ side; nothing here is evidence.                                               │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Privacy / size: IDs, enums and view parameters only. No HTML, DOM, screenshots,
 * amounts, balances, transaction arrays, arbitrary component state or free text —
 * except the user's own search box text, which is DATA, never instructions.
 * The schema is strict (unknown keys rejected) and bounded (see UI_CONTEXT_MAX_BYTES).
 *
 * We own the frontend, so the mechanism is explicit structured state — no DOM
 * scraping, screenshots or vision of our own app.
 */

import { z } from 'zod';
import { CANONICAL_CATEGORIES } from './financial-taxonomy';
import { VISIBLE_CANDIDATE_FRAME_MAX } from './tx-candidate-ownership';
import type { ContractParseResult } from './prime-financial-request';

export const UI_CONTEXT_VERSION = 1 as const;
/** Upper bound for a serialized envelope (bytes of JSON). */
export const UI_CONTEXT_MAX_BYTES = 4096;

/** Views that exist in the dashboard today (routes in src/App.tsx under /dashboard). */
export const UI_VIEWS = [
  'dashboard_home', 'transactions', 'reports', 'tax_workspace', 'categories', 'bank_accounts',
  'goals', 'upload', 'review', 'receipts', 'monthly_recap', 'settings', 'chat', 'other',
] as const;

const Id = z.string().uuid();
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
/** Component / chart identifiers are code identifiers, not prose. */
const ComponentId = z.string().regex(/^[a-z][a-z0-9_.-]{0,59}$/, 'expected a lowercase component id');

/**
 * Filters mirror real page state (e.g. TransactionsPageV2: type filter, statement,
 * account, issuer, year, search, tag category/subcategory; selectedMonthAtom).
 */
export const UIFiltersSchema = z.object({
  dateRange: z.object({ start: IsoDate, end: IsoDate }).strict()
    .refine(d => d.start <= d.end, { message: 'dateRange start must not be after end' }).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'expected YYYY-MM').optional(),
  transactionType: z.enum(['all', 'expenses', 'income']).optional(),
  category: z.enum(CANONICAL_CATEGORIES).optional(),
  subcategory: z.string().trim().min(1).max(60).optional(),
  merchant: z.string().trim().min(1).max(80).optional(),
  accountId: Id.optional(),
  statementId: Id.optional(),
  issuer: z.string().trim().min(1).max(60).optional(),
  /** The user's own search-box text. DATA, never instructions. */
  search: z.string().max(200).optional(),
}).strict();

export const UISelectionSchema = z.object({
  /** UNVERIFIED ids of rows the user selected; ownership must be proven by the backend. */
  transactionIds: z.array(Id).max(VISIBLE_CANDIDATE_FRAME_MAX).optional(),
  /** UNVERIFIED account id. */
  accountId: Id.optional(),
}).strict();

export const UIVisibleSchema = z.object({
  component: ComponentId,
  chart: z.object({
    kind: z.enum(['bar', 'line', 'area', 'pie', 'table']),
    metric: ComponentId.optional(),
  }).strict().optional(),
}).strict();

export const UIContextEnvelopeV1Schema = z.object({
  version: z.literal(UI_CONTEXT_VERSION),
  /** Marks the envelope as untrusted context. There is no trusted variant. */
  authority: z.literal('untrusted_context'),
  route: z.string().max(200).regex(/^\/[A-Za-z0-9/_:-]*$/, 'expected an app route path'),
  view: z.enum(UI_VIEWS),
  filters: UIFiltersSchema.default({}),
  selection: UISelectionSchema.default({}),
  visible: z.array(UIVisibleSchema).max(5).default([]),
  /** When the frontend captured this state (the panel can close on navigation). */
  capturedAt: z.string().datetime(),
}).strict();

export type UIContextEnvelopeV1 = z.infer<typeof UIContextEnvelopeV1Schema>;
export type UIContextEnvelopeV1Input = z.input<typeof UIContextEnvelopeV1Schema>;

/**
 * Validate an untrusted envelope (bounded size first). Success means "well-formed
 * context" — NOT that any id is owned or any filter value is true.
 */
export function parseUIContextEnvelope(input: unknown): ContractParseResult<UIContextEnvelopeV1> {
  let size: number;
  try {
    size = new TextEncoder().encode(JSON.stringify(input) ?? '').length;
  } catch {
    return { ok: false, errors: ['(root): not serializable'] };
  }
  if (size > UI_CONTEXT_MAX_BYTES) return { ok: false, errors: [`(root): envelope exceeds ${UI_CONTEXT_MAX_BYTES} bytes`] };
  const r = UIContextEnvelopeV1Schema.safeParse(input);
  return r.success
    ? { ok: true, value: r.data }
    : { ok: false, errors: r.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`) };
}

/**
 * The ids in an envelope that a backend MUST ownership-check before any use.
 * Returned as unverified claims; this helper verifies nothing.
 */
export function unverifiedIdsInEnvelope(env: UIContextEnvelopeV1): { transactionIds: string[]; accountIds: string[]; statementIds: string[] } {
  const accountIds = [env.selection.accountId, env.filters.accountId].filter((x): x is string => !!x);
  return {
    transactionIds: [...(env.selection.transactionIds ?? [])],
    accountIds: [...new Set(accountIds)],
    statementIds: env.filters.statementId ? [env.filters.statementId] : [],
  };
}
