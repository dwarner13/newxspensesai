import { z } from 'zod';
import { Result, Ok, Err } from '../../../types/result';
import { getSupabaseServerClient } from '../../../server/db';

export const id = 'tag_create_manual_transaction';

export const inputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  merchant: z.string().optional(),
});

export const outputSchema = z.object({
  success: z.boolean(),
  transactionId: z.string(),
  amount: z.number(),
  date: z.string(),
  description: z.string(),
  category: z.string(),
  type: z.enum(['income', 'expense']),
  message: z.string(),
});

export type Input = z.infer<typeof inputSchema>;
export type Output = z.infer<typeof outputSchema>;

/**
 * Create a new manual transaction from chat
 * 
 * Allows Tag to create income or expense transactions when users request them.
 * Transactions created this way are marked with source_type='manual' or 'chat'.
 */
export async function execute(input: Input, ctx: { userId: string }): Promise<Result<Output>> {
  try {
    const { amount, date, description, category, merchant } = input;
    const { userId } = ctx;

    // Log tool invocation (dev only)
    if (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true') {
      console.log(`[Tag Create Transaction] Executing: amount=${amount}, date=${date}, category="${category}", userId=${userId}`);
    }

    // Determine transaction type based on category
    // If category is "Income" (case-insensitive), it's income, otherwise expense
    const isIncome = category.toLowerCase().trim() === 'income';
    const transactionType: 'income' | 'expense' = isIncome ? 'income' : 'expense';

    // Validate date format
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return Err(new Error(`Invalid date format: ${date}. Please use YYYY-MM-DD format.`));
    }

    const supabase = getSupabaseServerClient();

    // Insert new transaction
    const transactionData: any = {
      user_id: userId, // Always from context, never from input
      amount: isIncome ? Math.abs(amount) : -Math.abs(amount), // Income positive, expense negative
      date: date,
      posted_at: date, // Use same date for posted_at
      description: description,
      category: category,
      type: transactionType,
      category_source: 'manual', // Mark as manually created
      source_type: 'chat', // Mark as created via chat
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Add merchant if provided
    if (merchant && merchant.trim()) {
      transactionData.merchant = merchant.trim();
    }

    const { data: insertedTx, error: insertError } = await supabase
      .from('transactions')
      .insert(transactionData)
      .select('id, amount, date, description, category, type')
      .single();

    if (insertError) {
      console.error('[Tag Create Transaction] Insert error:', insertError);
      return Err(new Error(`Failed to create transaction: ${insertError.message}`));
    }

    if (!insertedTx) {
      return Err(new Error('Transaction was created but no data returned'));
    }

    const message = `Successfully created ${transactionType} transaction: $${Math.abs(amount).toFixed(2)} for "${description}" in "${category}" category on ${date}${merchant ? ` from ${merchant}` : ''}.`;

    return Ok({
      success: true,
      transactionId: insertedTx.id,
      amount: Math.abs(amount),
      date: insertedTx.date || date,
      description: insertedTx.description || description,
      category: insertedTx.category || category,
      type: insertedTx.type || transactionType,
      message,
    });

  } catch (error) {
    console.error('[Tag Create Transaction] Unexpected error:', error);
    return Err(error as Error);
  }
}

export const metadata = {
  name: 'Tag Create Manual Transaction',
  description: 'Create a new income or expense transaction from natural language. Use this when users say things like "add an income of $500", "I was paid $1000 on Feb 10", "create a transaction for $50 from GFS", or "add $200 income last Friday". Always confirm the amount, date, description, and category before calling this tool. If the user says "Income" category, the transaction type will be income; otherwise it will be expense.',
  requiresConfirmation: false,
  dangerous: false,
  category: 'categorization',
};






