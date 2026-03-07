import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Tag, Brain, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TagWorkspacePanel } from '../../components/workspace/employees/TagWorkspacePanel';
import { TagUnifiedCard } from '../../components/workspace/employees/TagUnifiedCard';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { ActivityFeedSidebar } from '../../components/dashboard/ActivityFeedSidebar';
import { UncategorizedReviewQueue } from '../../components/transactions/UncategorizedReviewQueue';
import { CategoryBreakdownList } from '../../components/transactions/CategoryBreakdownList';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useSmartCategoriesStats } from '../../hooks/useSmartCategoriesStats';
import { useCategoryRules } from '../../hooks/useCategoryRules';
import { createCategoryRule } from '../../lib/categoryRules';
import type { EmployeeStat } from '../../config/employeeDisplayConfig';
import { PageCinematicFade } from '../../components/ui/PageCinematicFade';
import toast from 'react-hot-toast';

// Local Transaction type for Smart Categories page
interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  merchant: string | null;
  confidence?: number | null;
  source_type?: string | null;
}

export type SmartCategorySummary = {
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  isExpenseCategory: boolean;
  trend: 'up' | 'down' | 'flat'; // Placeholder for now
  // Tag learning metrics
  learnedCount: number;        // category_source = 'learned'
  aiCount: number;             // category_source = 'ai'
  manualCount: number;          // category_source = 'manual' or null
  avgConfidence: number | null; // Average confidence across all transactions
  learningDominance: 'mostly-learned' | 'mostly-ai' | 'mixed' | 'unknown';
};

const SmartCategoriesPage: React.FC = () => {
  // Scroll to top when page loads
  useScrollToTop();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();

  // Real stats from Supabase for Tag card + workspace panel
  const tagStats = useSmartCategoriesStats();
  const categoryRules = useCategoryRules();

  // Build EmployeeStat[] for the Tag card hero — "—" when data is unavailable
  const tagCardStats: EmployeeStat[] = [
    {
      value: tagStats.isLoading ? '…' : tagStats.itemsTagged !== null ? tagStats.itemsTagged.toLocaleString() : '—',
      label: 'Items Tagged',
      colorClass: 'text-cyan-400',
    },
    {
      value: tagStats.isLoading ? '…' : tagStats.autoTaggedPct !== null ? `${tagStats.autoTaggedPct}%` : '—',
      label: 'Auto-Tagged',
      colorClass: 'text-green-400',
    },
    {
      value: tagStats.isLoading ? '…' : tagStats.categoryCount !== null ? String(tagStats.categoryCount) : '—',
      label: 'Categories',
      colorClass: 'text-purple-400',
    },
  ];

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Removed workspace overlay state - now using unified chat slideout
  const [selectedCategoryForChat, setSelectedCategoryForChat] = useState<SmartCategorySummary | null>(null);
  const [isGeneratingStarterRules, setIsGeneratingStarterRules] = useState(false);

  // Fetch transactions with Tag learning data
  // Use requestIdleCallback or setTimeout to avoid blocking initial render
  useEffect(() => {
    if (userId) {
      // Defer data fetch slightly to allow UI to render first
      const timeoutId = setTimeout(() => {
        fetchTransactions();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [userId]);

  const fetchTransactions = async () => {
    if (!userId) {
      setError('Please sign in to view Smart Categories');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Fetch transactions with category_source and confidence for Tag learning metrics
      // Reduced limit for faster initial load - can paginate later if needed
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, date, posted_at, description, merchant, category, amount, type, confidence, category_source, source_type')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(250); // Reduced from 1000 for faster loading

      if (transactionsError) {
        throw new Error(transactionsError.message || 'Failed to load transactions');
      }

      // Transform Supabase data to match our Transaction interface
      // Include category_source and confidence for Tag learning metrics
      const formattedTransactions: Transaction[] = (transactionsData || []).map((tx: any) => ({
        id: tx.id,
        date: tx.date || tx.posted_at || '',
        description: tx.description || tx.memo || tx.merchant || 'Unknown',
        category: tx.category || 'Uncategorized',
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,
        type: (tx.type === 'income' || tx.type === 'Credit') ? 'income' : 'expense',
        merchant: tx.merchant || null,
        confidence: tx.confidence ?? null,
        source_type: tx.category_source || tx.source_type || null, // Use category_source from migration
      }));

      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Group transactions by category and calculate stats with Tag learning metrics
  const categorySummaries = useMemo<SmartCategorySummary[]>(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    // Group by category
    const categoryMap = new Map<string, Transaction[]>();

    transactions.forEach((tx) => {
      const category = tx.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(tx);
    });

    // Calculate stats for each category including Tag learning metrics
    const summaries: SmartCategorySummary[] = Array.from(categoryMap.entries()).map(([category, txs]) => {
      const totalAmount = txs.reduce((sum, tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount)) || 0;
        return sum + amount;
      }, 0);

      const transactionCount = txs.length;
      const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

      // Determine if expense category: net is negative OR most transactions are expenses
      const expenseCount = txs.filter(tx => tx.type === 'expense').length;
      const isExpenseCategory = totalAmount < 0 || expenseCount > transactionCount / 2;

      // Tag learning metrics
      const learnedCount = txs.filter(tx => tx.source_type === 'learned').length;
      const aiCount = txs.filter(tx => tx.source_type === 'ai').length;
      const manualCount = txs.filter(tx => 
        tx.source_type === 'manual' || 
        tx.source_type === null || 
        tx.source_type === undefined
      ).length;

      // Calculate average confidence (only for transactions with confidence values)
      const confidences = txs
        .map(tx => tx.confidence)
        .filter((conf): conf is number => conf !== null && conf !== undefined);
      const avgConfidence = confidences.length > 0
        ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
        : null;

      // Determine learning dominance
      let learningDominance: 'mostly-learned' | 'mostly-ai' | 'mixed' | 'unknown' = 'unknown';
      if (transactionCount > 0) {
        const learnedPercent = (learnedCount / transactionCount) * 100;
        const aiPercent = (aiCount / transactionCount) * 100;
        
        if (learnedPercent >= 70) {
          learningDominance = 'mostly-learned';
        } else if (aiPercent >= 70) {
          learningDominance = 'mostly-ai';
        } else if (learnedCount > 0 || aiCount > 0) {
          learningDominance = 'mixed';
        }
      }

      // Placeholder trend (fake for now)
      const trend: 'up' | 'down' | 'flat' = 'flat';

      return {
        category,
        totalAmount,
        transactionCount,
        averageAmount,
        isExpenseCategory,
        trend,
        learnedCount,
        aiCount,
        manualCount,
        avgConfidence,
        learningDominance,
      };
    });

    // Sort by absolute totalAmount descending (biggest categories at top)
    return summaries.sort((a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount));
  }, [transactions]);

  // Calculate overall stats
  const stats = useMemo(() => {
    const totalExpenses = categorySummaries
      .filter(cat => cat.isExpenseCategory)
      .reduce((sum, cat) => sum + Math.abs(cat.totalAmount), 0);

    const totalIncome = categorySummaries
      .filter(cat => !cat.isExpenseCategory)
      .reduce((sum, cat) => sum + cat.totalAmount, 0);

    return {
      categoryCount: categorySummaries.length,
      totalExpenses,
      totalIncome,
    };
  }, [categorySummaries]);

  // O(1) lookup: category name → SmartCategorySummary (for learning metrics)
  const summaryMap = useMemo(() => {
    const map = new Map<string, SmartCategorySummary>();
    for (const s of categorySummaries) {
      map.set(s.category, s);
    }
    return map;
  }, [categorySummaries]);

  // ── Month filter state ──────────────────────────────────────────────────────
  // selectedMonth: "2025-01" ISO year-month key, or null = All time
  // Persisted in URL as ?month=2025-01 so it survives page refreshes.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedMonth = searchParams.get('month') || null;
  const setSelectedMonth = (val: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (val) next.set('month', val); else next.delete('month');
    setSearchParams(next, { replace: true });
  };

  // Derive available months from transaction dates (most-recent first)
  const availableMonths = useMemo(() => {
    const seen = new Set<string>();
    const months: Array<{ label: string; value: string }> = [];
    for (const tx of transactions) {
      const raw = tx.date || '';
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen.has(key)) {
        seen.add(key);
        months.push({
          value: key,
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        });
      }
    }
    return months;
  }, [transactions]);

  // Month range from selectedMonth key → ISO date strings for Supabase queries
  const monthRange = useMemo(() => {
    if (!selectedMonth) return undefined;
    const [y, m] = selectedMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999); // last ms of month
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [selectedMonth]);

  // Transactions filtered by selectedMonth
  const monthFilteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions.filter((tx) => {
      const raw = tx.date || '';
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  // Previous month's per-category spending (for trend arrows on breakdown rows)
  const prevMonthBreakdown = useMemo(() => {
    if (!selectedMonth) return new Map<string, number>();
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1); // step back one month (month is 1-based, Date is 0-based)
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const raw = tx.date || '';
      if (!raw) continue;
      const d = new Date(raw);
      if (isNaN(d.getTime())) continue;
      const txKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (txKey !== prevKey) continue;
      const amt = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount)) || 0;
      if (amt >= 0) continue;
      const cat = tx.category || 'Uncategorized';
      map.set(cat, (map.get(cat) || 0) + Math.abs(amt));
    }
    return map;
  }, [selectedMonth, transactions]);

  // Category spending breakdown (expenses only, sorted desc) — enriched with learning + trend
  const breakdownEntries = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const tx of monthFilteredTransactions) {
      const amt = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount)) || 0;
      if (amt >= 0) continue; // expenses only (negative amounts)
      const cat = tx.category || 'Uncategorized';
      const prev = map.get(cat) || { amount: 0, count: 0 };
      map.set(cat, { amount: prev.amount + Math.abs(amt), count: prev.count + 1 });
    }
    return [...map.entries()]
      .map(([category, { amount, count }]) => {
        const summary = summaryMap.get(category);
        const prevAmount = prevMonthBreakdown.get(category);
        let trend: 'up' | 'down' | 'flat' = 'flat';
        let trendPct: number | undefined;
        if (selectedMonth && prevAmount !== undefined && prevAmount > 0) {
          const delta = ((amount - prevAmount) / prevAmount) * 100;
          if (Math.abs(delta) >= 5) { // only surface meaningful changes (≥5%)
            trend = delta > 0 ? 'up' : 'down';
            trendPct = Math.abs(Math.round(delta));
          }
        }
        return {
          category,
          amount,
          count,
          learningDominance: summary?.learningDominance,
          avgConfidence: summary?.avgConfidence ?? null,
          trend,
          trendPct,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthFilteredTransactions, summaryMap, prevMonthBreakdown, selectedMonth]);

  // Income breakdown (positive amounts only, sorted desc)
  const incomeBreakdownEntries = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const tx of monthFilteredTransactions) {
      const amt = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount)) || 0;
      if (amt <= 0) continue;
      const cat = tx.category || 'Uncategorized';
      const prev = map.get(cat) || { amount: 0, count: 0 };
      map.set(cat, { amount: prev.amount + amt, count: prev.count + 1 });
    }
    return [...map.entries()]
      .map(([category, { amount, count }]) => {
        const summary = summaryMap.get(category);
        return {
          category,
          amount,
          count,
          learningDominance: summary?.learningDominance,
          avgConfidence: summary?.avgConfidence ?? null,
          trend: 'flat' as const,
          trendPct: undefined,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [monthFilteredTransactions, summaryMap]);
  // ────────────────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getLearningBadge = (summary: SmartCategorySummary) => {
    if (summary.learningDominance === 'mostly-learned') {
      return {
        text: 'Mostly Learned',
        className: 'bg-green-500/20 text-green-300 border-green-500/30',
        icon: <Brain className="w-3 h-3" />
      };
    } else if (summary.learningDominance === 'mostly-ai') {
      return {
        text: 'Mostly AI',
        className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        icon: <Sparkles className="w-3 h-3" />
      };
    } else if (summary.learningDominance === 'mixed') {
      return {
        text: 'Mixed Source',
        className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        icon: <Tag className="w-3 h-3" />
      };
    }
    return {
      text: 'Unknown',
      className: 'bg-white/10 text-white/60 border-white/20',
      icon: null
    };
  };

  const handleAskTag = (categorySummary: SmartCategorySummary) => {
    // Open unified chat with Tag employee
    setSelectedCategoryForChat(categorySummary);
    openChat({
      initialEmployeeSlug: 'tag-ai',
      force: true,
      context: {
        page: 'smart-categories',
        data: {
          source: 'workspace-tag',
          category: categorySummary.category,
          learnedCount: categorySummary.learnedCount,
          aiCount: categorySummary.aiCount,
          avgConfidence: categorySummary.avgConfidence,
          transactionCount: categorySummary.transactionCount,
          totalAmount: categorySummary.totalAmount,
        },
      },
    });
  };

  const handleAskCrystal = (categorySummary: SmartCategorySummary) => {
    navigate('/dashboard/chat/crystal', {
      state: {
        source: 'smart-categories',
        contextType: 'category',
        from: location.pathname, // Return origin: Smart Categories page
        category: categorySummary.category,
        learnedCount: categorySummary.learnedCount,
        aiCount: categorySummary.aiCount,
        avgConfidence: categorySummary.avgConfidence,
        transactionCount: categorySummary.transactionCount,
        totalAmount: categorySummary.totalAmount,
      },
    });
  };

  const handleAskPrime = (categorySummary: SmartCategorySummary) => {
    navigate('/dashboard/chat/prime', {
      state: {
        source: 'smart-categories',
        contextType: 'category',
        from: location.pathname, // Return origin: Smart Categories page
        category: categorySummary.category,
        learnedCount: categorySummary.learnedCount,
        aiCount: categorySummary.aiCount,
        avgConfidence: categorySummary.avgConfidence,
        transactionCount: categorySummary.transactionCount,
        totalAmount: categorySummary.totalAmount,
      },
    });
  };

  const inferStarterCategory = (merchant: string): string => {
    const label = String(merchant || '').toLowerCase();
    if (/(sobeys|walmart|costco|superstore|metro|nofrills|loblaws|grocery)/i.test(label)) return 'Groceries';
    if (/(netflix|spotify|disney|prime video|youtube|subscription|audible|apple music)/i.test(label)) return 'Subscriptions';
    if (/(shell|petro|esso|gas|fuel|chevron|mobil|husky)/i.test(label)) return 'Transportation';
    if (/(tim hortons|starbucks|restaurant|cafe|coffee|pizza|food|uber eats|doordash|skip)/i.test(label)) return 'Food & Dining';
    if (/(uber|lyft|taxi|transit|bus|train|parking)/i.test(label)) return 'Transportation';
    if (/(rent|mortgage|lease|property)/i.test(label)) return 'Housing';
    return 'Other';
  };
  const starterRuleSuggestions = useMemo(() => {
    const activeRuleValues = new Set(
      categoryRules.rules
        .filter((rule) => rule.is_active)
        .map((rule) => String(rule.match_value || '').toLowerCase().trim())
        .filter(Boolean)
    );
    const counts = new Map<string, number>();
    for (const tx of transactions) {
      const merchant = String(tx.merchant || tx.description || '').trim();
      if (!merchant) continue;
      const key = merchant.toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([merchantKey, count]) => count >= 2 && !activeRuleValues.has(merchantKey))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([merchantKey, count]) => ({
        merchant: merchantKey.replace(/\b\w/g, (c) => c.toUpperCase()),
        category: inferStarterCategory(merchantKey),
        count,
      }));
  }, [categoryRules.rules, transactions]);
  const handleGenerateStarterRules = async () => {
    if (!userId) {
      toast.error('Sign in required');
      return;
    }
    if (starterRuleSuggestions.length === 0) {
      toast('No starter rules available right now');
      return;
    }
    setIsGeneratingStarterRules(true);
    try {
      let created = 0;
      for (const suggestion of starterRuleSuggestions) {
        const result = await createCategoryRule(userId, suggestion.merchant, suggestion.category, 'contains');
        if (result.ok) created += 1;
      }
      if (created > 0) {
        toast.success(`Created ${created} starter rule${created === 1 ? '' : 's'}`);
        categoryRules.refresh();
      } else {
        toast('No new starter rules were created');
      }
    } finally {
      setIsGeneratingStarterRules(false);
    }
  };

  // Build category context for workspace overlay (matches EmployeeChatPage format)
  const chatContext = useMemo(() => {
    if (!selectedCategoryForChat) return null;
    return {
      type: 'category' as const,
      data: {
        category: selectedCategoryForChat.category,
        learnedCount: selectedCategoryForChat.learnedCount,
        aiCount: selectedCategoryForChat.aiCount,
        avgConfidence: selectedCategoryForChat.avgConfidence,
        transactionCount: selectedCategoryForChat.transactionCount,
        totalAmount: selectedCategoryForChat.totalAmount,
      },
    };
  }, [selectedCategoryForChat]);

  // Build system prompt for Tag with category context (for workspace overlay)
  const systemPrompt = useMemo(() => {
    if (!chatContext || chatContext.type !== 'category') return null;
    
    const cat = chatContext.data;
    const learnedPercent = cat.transactionCount > 0 
      ? Math.round((cat.learnedCount / cat.transactionCount) * 100) 
      : 0;
    const aiPercent = cat.transactionCount > 0 
      ? Math.round((cat.aiCount / cat.transactionCount) * 100) 
      : 0;
    
    return `You are Tag, a friendly transaction categorization AI within **XspensesAI**. The user is asking about the "${cat.category}" category.

**CRITICAL: The category name is "${cat.category}" - you MUST use this EXACT name (case-sensitive) when calling tag_category_brain.**

**Category Stats (from UI - use these as fallback only):**
- Category: ${cat.category}
- Total transactions: ${cat.transactionCount}
- Learned from your corrections: ${cat.learnedCount} (${learnedPercent}%)
- AI categorized: ${cat.aiCount} (${aiPercent}%)
${cat.avgConfidence !== null && cat.avgConfidence !== undefined ? `- Average confidence: ${Math.round(cat.avgConfidence * 100)}%` : ''}
- Total amount: $${Math.abs(cat.totalAmount).toFixed(2)}

**Your Role & Tool Usage:**

**IMPORTANT: Only call tools when the user asks a question. Do NOT call tools automatically on conversation start or without a user query.**

1. **Category-level questions → ALWAYS use tag_category_brain FIRST:**
   - When users ask ANY of these patterns: "What have you learned about this category?", "How much do I usually spend here?", "Which merchants are most common?", "Is this trending up or down?", "Tell me about this category", "What can you tell me about ${cat.category}?", "What do you know about ${cat.category}?", "Show me stats for this category", "Analyze this category", "how much can I save?", "where does my money come from?", "what are my top sources?"
   - **ACTION:** Immediately call tag_category_brain with category="${cat.category}" (use the EXACT name from above, case-sensitive).
   - **DO NOT call this tool automatically** - wait for the user to ask a question first.
   - The tool returns: totalTransactions, totalSpent, totalIncome, avgTransactionAmount, topMerchants[], aiConfidenceSummary (avgConfidence, aiCount, learnedCount), notes[], firstSeenAt, lastSeenAt.
   - **USE THE TOOL'S DATA, NOT THE UI STATS** - the tool has the most accurate, up-to-date information from the database.
   
2. **Using tool data in follow-up questions:**
   - When answering questions like "how much can I save?" or "where does my money come from?", use the data from tag_category_brain that was already called in this conversation.
   - Reference specific numbers from the tool results: totalSpent, totalIncome, topMerchants, avgTransactionAmount.
   - Example: "Based on your Income category (~$${cat.totalAmount.toFixed(2)} from ${cat.transactionCount} transactions, mostly from [top merchant names]), here's a rough saving suggestion..."
   - If tag_category_brain hasn't been called yet for this question, call it first, then use its data to answer.

3. **Formatting Guidelines:**
   - Format currency: "$1,234.56" (use commas for thousands, 2 decimal places)
   - Format percentages: "75%" (round to whole numbers)
   - Format dates: "January 15, 2024" (readable format)
   - Keep responses concise: 2-4 sentences max, then invite follow-up questions

4. **Response Structure (when tag_category_brain returns data):**
   - Start with a warm greeting: "Great question! Let me check what I've learned..."
   - Share key stats: totalTransactions, totalSpent (or totalIncome if it's an income category)
   - Highlight top merchants: "Your top merchants here are [name1] with X transactions, [name2] with Y transactions..."
   - Include learning progress: Reference aiConfidenceSummary.learnedCount and celebrate if high
   - Use notes[] array: These contain helpful insights - incorporate them naturally
   - End with invitation: "Want to know more about any specific merchant or pattern?"

5. **Example Response (after calling tag_category_brain):**
   "Great question! I've analyzed ${cat.transactionCount} transactions in ${cat.category}. Here's what I found:

   - Total spending: $${Math.abs(cat.totalAmount).toFixed(2)}
   - Average per transaction: $[use avgTransactionAmount from tool]
   - Top merchants: [list top 3 from topMerchants array]
   - Learning progress: I've learned from [learnedCount] of your corrections (${learnedPercent}%) - ${learnedPercent >= 70 ? 'excellent!' : 'keep correcting and I\'ll learn faster!'}

   [Include relevant insights from notes[] array]

   Want to dive deeper into any specific merchant or pattern?"

6. **If tool returns empty/error:**
   - Say: "I don't have enough data yet for this category, but here's what I can see from the UI: ${cat.transactionCount} transaction${cat.transactionCount !== 1 ? 's' : ''} so far. As you add more transactions and correct my categorizations, I'll learn your patterns better!"

7. **Other Tools:**
   - Specific transaction "why" → Use tag_explain_category with transaction ID
   - Merchant history → Use tag_merchant_insights with merchant name

**Handoff Rules (XspensesAI Org Chart):**
- **Byte** (slug: byte-docs) handles: Smart Import, OCR, document uploads, bank statements, PDF/PNG parsing
- **Prime** (slug: prime-boss) handles: High-level strategy, "who should I talk to" questions, app-wide questions
- If user asks about document uploads, OCR, Smart Import, or bank statements → **immediately call request_employee_handoff** with targetEmployeeSlug: "byte-docs"
- If user asks "who handles X?" or "which employee should I talk to?" → call request_employee_handoff to the appropriate employee
- **DO NOT try to answer questions outside your domain** - hand off immediately

**Your Tools:**
- tag_category_brain: Get aggregated stats for a spending category
- tag_explain_category: Explain why a transaction is categorized a certain way
- tag_merchant_insights: Show learning history for a merchant
- request_employee_handoff: Transfer conversation to another employee (use this for upload/Smart Import questions)
- sheet_export: Export data to spreadsheets

**Tone:**
- Be warm, friendly, and encouraging
- Celebrate learning progress
- Keep it conversational, not robotic
- Use emojis sparingly (only when celebrating: 🎉 ✅)`;
  }, [chatContext]);

  // Removed all inline chat code - chat is now only in unified slideout

  // Handler to open unified chat with Tag
  const openTagWorkspace = () => {
    openChat({
      initialEmployeeSlug: 'tag-ai',
      force: true,
      context: {
        page: 'smart-categories',
        data: {
          source: 'workspace-tag',
        },
      },
    });
  };

  // Show loading state immediately - don't wait for data
  // This ensures the page renders instantly even while fetching transactions
  return (
    <PageCinematicFade>
      {/* Page title and status badges are handled by DashboardHeader - no duplicate here */}
      <DashboardPageShell
        left={
          <TagWorkspacePanel
            categoryCount={tagStats.categoryCount}
            taggedToday={tagStats.taggedToday}
            uncategorizedCount={tagStats.uncategorizedCount}
            activeRulesCount={categoryRules.activeCount ?? tagStats.activeRulesCount}
            isLoading={tagStats.isLoading}
            rules={categoryRules.rules}
            totalTimesApplied={categoryRules.totalTimesApplied}
            userCategories={categorySummaries.map((s) => s.category)}
            onRefreshRules={categoryRules.refresh}
            starterRuleSuggestions={starterRuleSuggestions}
            onGenerateStarterRules={handleGenerateStarterRules}
            isGeneratingStarterRules={isGeneratingStarterRules}
          />
        }
        center={
          <TagUnifiedCard
              stats={tagCardStats}
              onExpandClick={() => {
                openChat({
                  initialEmployeeSlug: 'tag-ai',
                  force: true,
                  context: {
                    page: 'smart-categories',
                    data: {
                      source: 'smart-categories-page',
                    },
                  },
                });
              }}
              onChatInputClick={() => {
                openChat({
                  initialEmployeeSlug: 'tag-ai',
                  force: true,
                  context: {
                    page: 'smart-categories',
                    data: {
                      source: 'smart-categories-page',
                    },
                  },
                });
              }}
            />
        }
        between={
          <div className="space-y-4">
            <CategoryBreakdownList
              entries={breakdownEntries}
              incomeEntries={incomeBreakdownEntries}
              availableMonths={availableMonths}
              selectedMonth={selectedMonth}
              onSelectMonth={setSelectedMonth}
              isLoading={isLoading}
              onUncategorizedClick={() =>
                document.getElementById('uncategorized-queue')?.scrollIntoView({ behavior: 'smooth' })
              }
              onAskTag={(cat) => {
                const summary = categorySummaries.find((s) => s.category === cat);
                if (summary) handleAskTag(summary);
              }}
            />
            <UncategorizedReviewQueue
              categories={categorySummaries.map((s) => s.category)}
              monthRange={monthRange}
            />
          </div>
        }
        right={<ActivityFeedSidebar scope="smart-categories" />}
      />
    </PageCinematicFade>
  );
};

export default SmartCategoriesPage;
