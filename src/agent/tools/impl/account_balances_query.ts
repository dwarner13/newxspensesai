import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'account_balances_query';

export const inputSchema = z.object({
  accountType: z.enum(['checking', 'savings', 'credit', 'investment', 'all']).optional().default('all'),
});

export const outputSchema = z.object({
  accounts: z.array(z.object({
    id: z.string(),
    name: z.string().nullable(),
    type: z.string().nullable(),
    balance: z.number().nullable(),
    currency: z.string().nullable(),
    source: z.enum(['verified_db']),
    /** When this stored balance was last recorded (owner safeguard 4: quote with source, account and date). */
    asOf: z.string().nullable(),
  })),
  /**
   * Owner safeguard 4 (2026-11-27): always null — no aggregate balance is computed or claimed.
   * Each account's stored balance may be quoted singly, with its account, source and date.
   */
  totalBalance: z.null(),
  hasVerifiedBalances: z.boolean(),
  provenance: z.enum(['verified_db', 'unavailable']),
  /** PB-04: there is no live bank connection; these are stored records, never real-time balances. */
  liveConnection: z.literal(false),
  sourceNote: z.string(),
});

/** PB-04: what the model must say about where balances come from. */
export const ACCOUNT_BALANCE_SOURCE_NOTE = 'Stored account records only. XspensesAI has no live bank connection; balances are as recorded, may be out of date, and are not real-time. Quote each balance with its account name, that it is a stored record, and its "as of" date. Never add balances together or state a total balance.';

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Query stored account balance records (PB-04: not linked or live accounts — none exist).
 *
 * Returns only balances sourced from the accounts table (verified_db).
 * When no verified account data exists, returns an empty result with
 * provenance: 'unavailable' — never synthesizes or estimates balances.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    let query = supabase
      .from('accounts')
      .select('id, name, type, balance, currency, updated_at')
      .eq('user_id', userId);

    if (input.accountType !== 'all') {
      query = query.eq('type', input.accountType);
    }

    const { data: accounts, error } = await query;

    if (error || !accounts || accounts.length === 0) {
      return Ok({
        accounts: [],
        totalBalance: null,
        hasVerifiedBalances: false,
        provenance: 'unavailable' as const,
        liveConnection: false as const,
        sourceNote: ACCOUNT_BALANCE_SOURCE_NOTE,
      });
    }

    const accountsList = accounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance ?? null,
      currency: a.currency || 'CAD',
      source: 'verified_db' as const,
      asOf: (a as { updated_at?: string | null }).updated_at ?? null,
    }));

    return Ok({
      accounts: accountsList,
      totalBalance: null,
      hasVerifiedBalances: true,
      provenance: 'verified_db' as const,
      liveConnection: false as const,
      sourceNote: ACCOUNT_BALANCE_SOURCE_NOTE,
    });
  } catch (error) {
    console.error('[account_balances_query] Error:', error);
    return Err(error as Error);
  }
}
