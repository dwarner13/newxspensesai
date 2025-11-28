import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'account_balances_query';

export const inputSchema = z.object({
  accountType: z.enum(['checking', 'savings', 'credit', 'investment', 'all']).optional().default('all'),
});

export const outputSchema = z.object({
  accounts: z.array(z.object({
    id: z.string().nullable(),
    name: z.string().nullable(),
    type: z.string().nullable(),
    balance: z.number().nullable(),
    currency: z.string().nullable(),
  })),
  totalBalance: z.number(),
  summary: z.object({
    totalChecking: z.number(),
    totalSavings: z.number(),
    totalCredit: z.number(),
    totalInvestment: z.number(),
  }),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Query account balances and summaries
 * 
 * Use this when Finley needs current account balances for wealth calculations
 * or net worth projections.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { userId } = ctx;
    const supabase = getSupabaseServerClient();

    // Check if accounts table exists, otherwise calculate from transactions
    let query = supabase
      .from('accounts')
      .select('id, name, type, balance, currency')
      .eq('user_id', userId);

    if (input.accountType !== 'all') {
      query = query.eq('type', input.accountType);
    }

    const { data: accounts, error } = await query;

    // If accounts table doesn't exist or is empty, calculate from transactions
    if (error || !accounts || accounts.length === 0) {
      // Fallback: Calculate approximate balances from transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, category')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1000);

      const txns = transactions || [];
      const totalIncome = txns
        .filter(t => t.type === 'income' || (t.type === null && t.amount > 0))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalExpenses = txns
        .filter(t => t.type === 'expense' || (t.type === null && t.amount < 0))
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const estimatedBalance = totalIncome - totalExpenses;

      return Ok({
        accounts: [{
          id: null,
          name: 'Estimated Balance',
          type: 'checking',
          balance: estimatedBalance,
          currency: 'CAD',
        }],
        totalBalance: estimatedBalance,
        summary: {
          totalChecking: estimatedBalance,
          totalSavings: 0,
          totalCredit: 0,
          totalInvestment: 0,
        },
      });
    }

    // Process accounts
    const accountsList = accounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance || 0,
      currency: a.currency || 'CAD',
    }));

    const totalBalance = accountsList.reduce((sum, a) => sum + (a.balance || 0), 0);

    const summary = {
      totalChecking: accountsList
        .filter(a => a.type === 'checking')
        .reduce((sum, a) => sum + (a.balance || 0), 0),
      totalSavings: accountsList
        .filter(a => a.type === 'savings')
        .reduce((sum, a) => sum + (a.balance || 0), 0),
      totalCredit: accountsList
        .filter(a => a.type === 'credit')
        .reduce((sum, a) => sum + (a.balance || 0), 0),
      totalInvestment: accountsList
        .filter(a => a.type === 'investment')
        .reduce((sum, a) => sum + (a.balance || 0), 0),
    };

    return Ok({
      accounts: accountsList,
      totalBalance,
      summary,
    });
  } catch (error) {
    console.error('[account_balances_query] Error:', error);
    return Err(error as Error);
  }
}






