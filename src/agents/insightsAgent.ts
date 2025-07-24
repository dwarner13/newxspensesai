import { supabase } from '../lib/supabase';
import dayjs from 'dayjs';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generateSpendingInsights(userId?: string): Promise<{
  insights?: string[];
  stats?: any;
  error?: string;
}> {
  try {
    // Get current user if not provided
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found');
      userId = user.id;
    }
    // Date ranges
    const now = dayjs();
    const thisMonthStart = now.startOf('month').format('YYYY-MM-DD');
    const thisMonthEnd = now.endOf('month').format('YYYY-MM-DD');
    const lastMonthStart = now.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const lastMonthEnd = now.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
    // Fetch transactions
    const { data: thisMonthTxs, error: err1 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', thisMonthStart)
      .lte('date', thisMonthEnd);
    if (err1) throw err1;
    const { data: lastMonthTxs, error: err2 } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd);
    if (err2) throw err2;
    // Calculate totals
    const sumExpenses = (txs: any[]) => txs.filter(t => t.type?.toLowerCase() === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
    const thisMonthTotal = sumExpenses(thisMonthTxs || []);
    const lastMonthTotal = sumExpenses(lastMonthTxs || []);
    // Category breakdown
    const categoryBreakdown = (txs: any[]) => {
      const map: Record<string, number> = {};
      for (const t of txs) {
        if (t.type?.toLowerCase() === 'expense') {
          map[t.category || 'Uncategorized'] = (map[t.category || 'Uncategorized'] || 0) + Number(t.amount);
        }
      }
      return map;
    };
    const thisMonthCategories = categoryBreakdown(thisMonthTxs || []);
    const lastMonthCategories = categoryBreakdown(lastMonthTxs || []);
    // Recurring vendors
    const findRecurringVendors = (txs: any[]) => {
      const map: Record<string, { count: number; amounts: number[]; days: number[] }> = {};
      for (const t of txs) {
        const vendor = (t.description || '').toLowerCase().trim();
        if (!vendor) continue;
        if (!map[vendor]) map[vendor] = { count: 0, amounts: [], days: [] };
        map[vendor].count++;
        map[vendor].amounts.push(Number(t.amount));
        map[vendor].days.push(dayjs(t.date).date());
      }
      // Recurring: at least 2, similar amount, similar day
      return Object.entries(map)
        .filter(([_, v]) => v.count >= 2 && Math.max(...v.amounts) - Math.min(...v.amounts) < 2 && Math.max(...v.days) - Math.min(...v.days) <= 3)
        .map(([vendor]) => vendor);
    };
    const recurringVendors = findRecurringVendors([...thisMonthTxs || [], ...lastMonthTxs || []]);
    // Prepare prompt
    const stats = {
      thisMonthTotal,
      lastMonthTotal,
      thisMonthCategories,
      lastMonthCategories,
      recurringVendors
    };
    const prompt = `Based on the data below, provide 3 short and helpful financial insights the user would find useful. Focus on trends, changes, or savings opportunities.\n\nData:\n${JSON.stringify(stats, null, 2)}`;
    // Call OpenAI
    if (!OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful financial assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error('OpenAI error: ' + (err.error?.message || response.statusText));
    }
    const data = await response.json();
    const insightsText = data.choices?.[0]?.message?.content || '';
    // Try to split into 3 insights
    const insights = insightsText.split(/\d+\. /).map(s => s.trim()).filter(Boolean);
    return { insights, stats };
  } catch (error) {
    return { error: (error as Error).message };
  }
} 