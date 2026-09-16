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
  })),
  totalBalance: z.number().nullable(),
  hasVerifiedBalances: z.boolean(),
  provenance: z.enum(['verified_db', 'unavailable']),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Query verified account balances from linked accounts.
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
      .select('id, name, type, balance, currency')
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
      });
    }

    const accountsList = accounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance ?? null,
      currency: a.currency || 'CAD',
      source: 'verified_db' as const,
    }));

    const totalBalance = accountsList.reduce((sum, a) => sum + (a.balance || 0), 0);

    return Ok({
      accounts: accountsList,
      totalBalance,
      hasVerifiedBalances: true,
      provenance: 'verified_db' as const,
    });
  } catch (error) {
    console.error('[account_balances_query] Error:', error);
    return Err(error as Error);
  }
}
