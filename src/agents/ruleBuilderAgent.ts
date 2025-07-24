import { supabase } from '../lib/supabase';
import { Transaction } from '../types/database.types';

export async function generateCategorizationRulesFromTransactions(userId?: string): Promise<{
  created: number;
  skipped: number;
  errors: number;
}> {
  const summary = { created: 0, skipped: 0, errors: 0 };
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');
      userId = user.id;
    }

    // Fetch transactions with manual category updates
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .not('description', 'is', null)
      .eq('category_updated_by_user', true);
    if (error) throw error;
    if (!transactions || transactions.length === 0) return summary;

    for (const tx of transactions as Transaction[]) {
      const vendor = tx.description?.toLowerCase().trim();
      const category = tx.category;
      if (!vendor || !category) continue;
      try {
        // Check for existing rule
        const { data: rule, error: ruleError } = await supabase
          .from('categorization_rules')
          .select('*')
          .eq('user_id', userId)
          .eq('rule_type', 'vendor_contains')
          .eq('match_value', vendor)
          .single();
        if (ruleError && ruleError.code !== 'PGRST116') throw ruleError;
        if (!rule) {
          // Insert new rule
          const { error: insertError } = await supabase
            .from('categorization_rules')
            .insert({
              user_id: userId,
              rule_type: 'vendor_contains',
              match_value: vendor,
              category,
              source: 'user',
              confidence: 1.0
            });
          if (insertError) throw insertError;
          summary.created++;
        } else {
          summary.skipped++;
        }
      } catch (err) {
        summary.errors++;
      }
    }

    // Reset the flag on processed transactions
    const txIds = transactions.map((tx: Transaction) => tx.id);
    if (txIds.length > 0) {
      await supabase
        .from('transactions')
        .update({ category_updated_by_user: false })
        .in('id', txIds);
    }
    return summary;
  } catch (error) {
    summary.errors++;
    return summary;
  }
} 