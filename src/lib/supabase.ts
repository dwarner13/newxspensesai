import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;
  
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.log('⚠️ Supabase environment variables not configured - using mock mode');
    return null;
  }
  
  _client = createClient(url, key, {
    auth: { storageKey: "xspensesai-auth" } // avoid collisions
  });
  return _client;
}

// Backward compatibility - export the singleton instance
export const supabase = getSupabase();

// Transaction functions
export async function getTransactions(userId: string) {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('⚠️ Supabase not available - returning mock transactions');
    return [
      {
        id: '1',
        user_id: userId,
        amount: 25.50,
        description: 'Coffee Shop',
        category: 'Food & Dining',
        date: new Date().toISOString(),
        type: 'expense'
      },
      {
        id: '2',
        user_id: userId,
        amount: 1200.00,
        description: 'Salary',
        category: 'Income',
        date: new Date(Date.now() - 86400000).toISOString(),
        type: 'income'
      }
    ];
  }
  
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false});
  
  if (error) throw error;
  return data || [];
}

export async function getCategories() {
  const supabase = getSupabase();
  if (!supabase) {
    console.log('⚠️ Supabase not available - returning mock categories');
    return [
      { id: '1', name: 'Food & Dining', color: '#FF6B6B' },
      { id: '2', name: 'Transportation', color: '#4ECDC4' },
      { id: '3', name: 'Entertainment', color: '#45B7D1' },
      { id: '4', name: 'Income', color: '#96CEB4' }
    ];
  }
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data || [];
}