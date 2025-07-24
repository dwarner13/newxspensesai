import { supabase } from '../lib/supabase';
import { Transaction } from '../types/database.types';

export async function trainCategorizerFromUserChanges(userId?: string): Promise<{
  added: number;
  updated: number;
  errors: number;
}> {
  const summary = { added: 0, updated: 0, errors: 0 };
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
      const vendor = tx.description;
      const category = tx.category;
      if (!vendor || !category) continue;
      try {
        // Check for existing vendor/category pair
        const { data: memory, error: memError } = await supabase
          .from('memory')
          .select('*')
          .eq('user_id', userId)
          .eq('keyword', vendor)
          .single();
        if (memError && memError.code !== 'PGRST116') throw memError;
        if (!memory) {
          // Insert new mapping
          const { error: insertError } = await supabase
            .from('memory')
            .insert({ user_id: userId, keyword: vendor, category, subcategory: null });
          if (insertError) throw insertError;
          summary.added++;
        } else if (memory.category !== category) {
          // Update existing mapping
          const { error: updateError } = await supabase
            .from('memory')
            .update({ category })
            .eq('id', memory.id);
          if (updateError) throw updateError;
          summary.updated++;
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