import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Tag, Brain, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useSmartCategoriesStats } from '../../hooks/useSmartCategoriesStats';
import { useImportList } from '../../hooks/useImportList';
import { useCategoryRules } from '../../hooks/useCategoryRules';
import { createCategoryRule } from '../../lib/categoryRules';
import { fetchPrimeSummarySingleFlight } from '../../lib/ai/primeSummaryClient';
import type { EmployeeStat } from '../../config/employeeDisplayConfig';
import toast from 'react-hot-toast';

// Local Transaction type for Smart Categories page
interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  subcategory?: string | null;
  amount: number;
  type: 'income' | 'expense';
  merchant: string | null;
  confidence?: number | null;
  source_type?: string | null;
  import_id?: string | null;
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
  const CANONICAL_CATEGORIES = [
    'Income',
    'Groceries',
    'Food & Dining',
    'Transportation',
    'Housing',
    'Utilities',
    'Shopping',
    'Subscriptions',
    'Entertainment',
    'Healthcare',
    'Insurance',
    'Education',
    'Travel',
    'Transfers',
    'Bank Fees',
    'Business',
    'Personal Care',
    'Home & Garden',
    'Other',
    'Uncategorized',
  ] as const;
  // Scroll to top when page loads
  useScrollToTop();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();

  // Real stats from Supabase for Tag card + workspace panel
  const tagStats = useSmartCategoriesStats();
  const { imports: importList } = useImportList();
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
  const [isRunningHandoffTag, setIsRunningHandoffTag] = useState(false);
  const [breakdownSort, setBreakdownSort] = useState<'amount_desc' | 'tx_desc' | 'alpha' | 'trend_desc'>('amount_desc');
  const [selectedInspectorCategory, setSelectedInspectorCategory] = useState<string | null>(null);
  const [inspectorMoveCategory, setInspectorMoveCategory] = useState<string>('Other');
  const [inspectorMoveSubcategory, setInspectorMoveSubcategory] = useState<string>('');
  const [isInspectorApplying, setIsInspectorApplying] = useState(false);
  const [isMerchantApplying, setIsMerchantApplying] = useState<string | null>(null);
  const [merchantTargets, setMerchantTargets] = useState<Record<string, string>>({});
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedTabs, setExpandedTabs] = useState<Record<string, 'subcategories' | 'insights' | 'merchants'>>({});
  const [selectedMerchantByCategory, setSelectedMerchantByCategory] = useState<Record<string, string>>({});

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

      // Fetch full transaction history in pages to support tax-year workflows.
      const pageSize = 1000;
      let pageStart = 0;
      let allTransactionsData: any[] = [];
      while (true) {
        const pageEnd = pageStart + pageSize - 1;
        const { data: pageRows, error: pageError } = await supabase
          .from('transactions')
          .select('id, date, posted_at, description, merchant, category, subcategory, amount, type, confidence, category_source, source_type, import_id')
          .eq('user_id', userId)
          .order('posted_at', { ascending: false })
          .range(pageStart, pageEnd);
        if (pageError) {
          throw new Error(pageError.message || 'Failed to load transactions');
        }
        const rows = pageRows || [];
        allTransactionsData = allTransactionsData.concat(rows);
        if (rows.length < pageSize) break;
        pageStart += pageSize;
      }

      // Transform Supabase data to match our Transaction interface
      // Include category_source and confidence for Tag learning metrics
      const formattedTransactions: Transaction[] = allTransactionsData.map((tx: any) => ({
        id: tx.id,
        date: tx.date || tx.posted_at || '',
        description: tx.description || tx.memo || tx.merchant || 'Unknown',
        category: tx.category || 'Uncategorized',
        subcategory: tx.subcategory || null,
        amount: typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0,
        type: (tx.type === 'income' || tx.type === 'Credit') ? 'income' : 'expense',
        merchant: tx.merchant || null,
        confidence: tx.confidence ?? null,
        source_type: tx.category_source || tx.source_type || null, // Use category_source from migration
        import_id: tx.import_id || null,
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
  const handoffSource = String(searchParams.get('handoff') || '').trim();
  const handoffImportId = String(searchParams.get('importId') || '').trim();
  const handoffBannerVisible = Boolean(handoffSource);
  const handoffChatOpenedRef = useRef(false);
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
      start: start.toISOString(),
      end: end.toISOString(),
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
  const getTxDirection = (tx: Transaction): 'income' | 'expense' | 'unknown' => {
    const amount = Number(tx.amount) || 0;
    const category = String(tx.category || '').toLowerCase();
    const merchant = String(tx.merchant || '').toUpperCase().trim();
    const description = String(tx.description || '').toUpperCase().trim();

    // 1. Category override � if Tag/user explicitly set "Income", trust it
    if (category === 'income') return 'income';

    // 2. Merchant/description patterns � payments, credits, refunds are income
    const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
    const INCOME_CONTAINS = /\b(PAYMENT RECEIVED|PAYMENT THANK YOU|CREDIT ADJUSTMENT|REFUND|DEPOSIT|E-TRANSFER IN|PAYROLL)\b/;
    if (INCOME_PATTERNS.test(merchant) || INCOME_CONTAINS.test(merchant) || INCOME_CONTAINS.test(description)) {
      return 'income';
    }

    // 3. Explicit income type from DB (if import ever sets it correctly)
    const txType = String(tx.type || '').toLowerCase();
    if (txType === 'income' || txType === 'credit') return 'income';

    // 4. Everything else with a positive amount on a credit card statement is a charge
    return 'expense';
  };
  const isExpenseTx = (tx: Transaction): boolean => {
    return getTxDirection(tx) === 'expense';
  };
  const isIncomeTx = (tx: Transaction): boolean => {
    return getTxDirection(tx) === 'income';
  };

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
      if (!isExpenseTx(tx)) continue;
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
      if (!isExpenseTx(tx)) continue;
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
      if (!isIncomeTx(tx)) continue;
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
      currency: 'CAD',
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
  const dismissHandoffBanner = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('handoff');
    setSearchParams(next, { replace: true });
  };
  const runHandoffCategorization = async () => {
    if (!supabase) {
      toast.error('Database connection unavailable');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Session expired — please refresh');
      return;
    }
    setIsRunningHandoffTag(true);
    try {
      const endpoint = handoffImportId
        ? '/.netlify/functions/tag-categorize-batch'
        : '/.netlify/functions/tag-categorize-committed';
      const payload = handoffImportId
        ? { importId: handoffImportId, limit: 500, maxAiCallsPerRun: 50 }
        : { limit: 1000 };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        throw new Error(String(json?.error || json?.message || 'Categorization failed'));
      }
      const updated = Number(json?.updated ?? 0);
      // ── Re-fire Prime so summary reflects real categories ──────
      if (updated > 0 && handoffImportId) {
        try {
          await fetchPrimeSummarySingleFlight({ importId: handoffImportId }, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
        } catch {
          // non-fatal — categories are written, summary will be stale
        }
      }
      const processed = Number(json?.processed ?? json?.total ?? 0);
      toast.success(`Tag processed ${processed} row${processed === 1 ? '' : 's'} and updated ${updated}.`);
      await fetchTransactions();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to run categorization');
    } finally {
      setIsRunningHandoffTag(false);
    }
  };
  useEffect(() => {
    if (!handoffBannerVisible) {
      handoffChatOpenedRef.current = false;
      return;
    }
    if (handoffChatOpenedRef.current) return;
    openChat({
      initialEmployeeSlug: 'tag-ai',
      force: true,
      context: {
        page: 'smart-categories',
        data: {
          source: handoffSource || 'prime_to_tag',
          importId: handoffImportId || null,
        },
      },
    });
    handoffChatOpenedRef.current = true;
  }, [handoffBannerVisible, handoffSource, handoffImportId, openChat]);

  const totalSpendAll = transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const selectedImportFilter = String(searchParams.get('importId') || '').trim();
  const handleSelectImportFilter = (importId: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (importId) next.set('importId', importId);
    else next.delete('importId');
    setSearchParams(next, { replace: true });
  };
  const scopedForBreakdown = selectedImportFilter
    ? monthFilteredTransactions.filter((tx) => String(tx.import_id || '').trim() === selectedImportFilter)
    : monthFilteredTransactions;
  const totalSpent = scopedForBreakdown
    .filter((tx) => isExpenseTx(tx))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const incomeTotal = scopedForBreakdown
    .filter((tx) => isIncomeTx(tx))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount) || 0), 0);
  const netTotal = incomeTotal - totalSpent;
  const scopedExpenseBreakdownEntries = (() => {
    const map = new Map<string, { amount: number; count: number; confidenceSum: number; confidenceCount: number }>();
    for (const tx of scopedForBreakdown) {
      const amount = Number(tx.amount) || 0;
      if (!isExpenseTx(tx)) continue;
      const cat = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      const prev = map.get(cat) || { amount: 0, count: 0, confidenceSum: 0, confidenceCount: 0 };
      const confidence = typeof tx.confidence === 'number' ? tx.confidence : null;
      map.set(cat, {
        amount: prev.amount + Math.abs(amount),
        count: prev.count + 1,
        confidenceSum: prev.confidenceSum + (confidence ?? 0),
        confidenceCount: prev.confidenceCount + (confidence !== null ? 1 : 0),
      });
    }
    let rows = Array.from(map.entries()).map(([category, value]) => {
      const prevAmount = prevMonthBreakdown.get(category) ?? 0;
      const pctOfTotal = totalSpent > 0 ? Math.round((value.amount / totalSpent) * 100) : 0;
      const trendDelta = prevAmount > 0 ? ((value.amount - prevAmount) / prevAmount) * 100 : 0;
      const trend: 'up' | 'down' | 'flat' =
        prevAmount <= 0 || Math.abs(trendDelta) < 5 ? 'flat' : trendDelta > 0 ? 'up' : 'down';
      const trendPct = prevAmount > 0 && Math.abs(trendDelta) >= 5 ? Math.abs(Math.round(trendDelta)) : undefined;
      const avgConfidence = value.confidenceCount > 0 ? value.confidenceSum / value.confidenceCount : null;
      return {
        category,
        amount: value.amount,
        count: value.count,
        pctOfTotal,
        trend,
        trendPct,
        trendDeltaAbs: Math.abs(trendDelta),
        avgConfidence,
      };
    });
    if (rows.length === 0) {
      const fallbackMap = new Map<string, { amount: number; count: number; confidenceSum: number; confidenceCount: number }>();
      for (const tx of scopedForBreakdown) {
        const amount = Math.abs(Number(tx.amount) || 0);
        if (amount <= 0) continue;
        const cat = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
        const prev = fallbackMap.get(cat) || { amount: 0, count: 0, confidenceSum: 0, confidenceCount: 0 };
        const confidence = typeof tx.confidence === 'number' ? tx.confidence : null;
        fallbackMap.set(cat, {
          amount: prev.amount + amount,
          count: prev.count + 1,
          confidenceSum: prev.confidenceSum + (confidence ?? 0),
          confidenceCount: prev.confidenceCount + (confidence !== null ? 1 : 0),
        });
      }
      const fallbackTotal = Array.from(fallbackMap.values()).reduce((sum, value) => sum + value.amount, 0);
      rows = Array.from(fallbackMap.entries()).map(([category, value]) => ({
        category,
        amount: value.amount,
        count: value.count,
        pctOfTotal: fallbackTotal > 0 ? Math.round((value.amount / fallbackTotal) * 100) : 0,
        trend: 'flat' as const,
        trendPct: undefined,
        trendDeltaAbs: 0,
        avgConfidence: value.confidenceCount > 0 ? value.confidenceSum / value.confidenceCount : null,
      }));
    }
    rows.sort((a, b) => {
      if (breakdownSort === 'tx_desc') return b.count - a.count;
      if (breakdownSort === 'alpha') return a.category.localeCompare(b.category);
      if (breakdownSort === 'trend_desc') return b.trendDeltaAbs - a.trendDeltaAbs;
      return b.amount - a.amount;
    });
    return rows;
  })();
  const scopedIncomeBreakdownEntries = (() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const tx of scopedForBreakdown) {
      const amount = Number(tx.amount) || 0;
      if (!isIncomeTx(tx)) continue;
      const cat = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      const prev = map.get(cat) || { amount: 0, count: 0 };
      map.set(cat, {
        amount: prev.amount + amount,
        count: prev.count + 1,
      });
    }
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, amount: value.amount, count: value.count }))
      .sort((a, b) => b.amount - a.amount);
  })();
  const expenseCategorySet = new Set(
    scopedExpenseBreakdownEntries.map((entry) => String(entry.category || '').trim().toLowerCase())
  );
  const scopedCategoryEntries = [
    ...scopedExpenseBreakdownEntries.map((entry) => ({ ...entry, isIncome: false })),
    ...scopedIncomeBreakdownEntries
      .filter((entry) => {
        const key = String(entry.category || '').trim().toLowerCase();
        return key === 'income' || !expenseCategorySet.has(key);
      })
      .map((entry) => {
      const summary = summaryMap.get(entry.category);
      return {
        category: entry.category,
        amount: entry.amount,
        count: entry.count,
        pctOfTotal: incomeTotal > 0 ? Math.round((entry.amount / incomeTotal) * 100) : 0,
        trend: 'flat' as const,
        trendPct: undefined,
        trendDeltaAbs: 0,
        avgConfidence: summary?.avgConfidence ?? null,
        isIncome: true,
      };
    }),
  ].sort((a, b) => b.amount - a.amount);
  const maxBreakdownAmount = Math.max(...scopedCategoryEntries.map((entry) => entry.amount), 0);
  const otherBucket = scopedExpenseBreakdownEntries.find((entry) => entry.category.toLowerCase() === 'other');
  const otherPct = otherBucket ? (totalSpent > 0 ? (otherBucket.amount / totalSpent) * 100 : 0) : 0;
  const shouldWarnOther = otherPct >= 35 && (otherBucket?.amount || 0) > 0;
  const otherMerchantSuggestions = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const tx of scopedForBreakdown) {
      const amount = Number(tx.amount) || 0;
      if (!isExpenseTx(tx)) continue;
      const category = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      if (category.toLowerCase() !== 'other') continue;
      const merchant = String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase();
      const prev = map.get(merchant) || { count: 0, amount: 0 };
      map.set(merchant, {
        count: prev.count + 1,
        amount: prev.amount + Math.abs(amount),
      });
    }
    return Array.from(map.entries())
      .map(([merchant, value]) => ({
        merchant,
        count: value.count,
        amount: value.amount,
        suggestedCategory: inferStarterCategory(merchant),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [scopedForBreakdown]);
  const confidentMerchantSuggestions = useMemo(
    () => otherMerchantSuggestions.filter((item) => item.suggestedCategory !== 'Other'),
    [otherMerchantSuggestions]
  );
  const uncertainMerchantSuggestions = useMemo(
    () => otherMerchantSuggestions.filter((item) => item.suggestedCategory === 'Other').slice(0, 3),
    [otherMerchantSuggestions]
  );
  const selectedStatement = useMemo(
    () => importList.find((item) => item.id === selectedImportFilter) || null,
    [importList, selectedImportFilter]
  );
  const statementTabs = useMemo(
    () => [
      { id: '', label: 'All statements', sub: 'Full story' },
      ...importList.slice(0, 12).map((item) => ({
        id: item.id,
        label: item.statementLabel,
        sub: item.label,
      })),
    ],
    [importList]
  );
  const topExpenseCategory = scopedExpenseBreakdownEntries[0] || null;
  const topIncomeCategory = scopedIncomeBreakdownEntries[0] || null;
  const tagSceneBrief = `${confidentMerchantSuggestions.length} merchant group${
    confidentMerchantSuggestions.length === 1 ? '' : 's'
  } confident, ${uncertainMerchantSuggestions.length} need review.`;
  const primeSceneBrief = topExpenseCategory
    ? `Top spend: ${topExpenseCategory.category} (${formatCurrency(topExpenseCategory.amount)}). Net ${netTotal >= 0 ? 'positive' : 'negative'} at ${formatCurrency(netTotal)}.`
    : 'No major spend detected in this scope.';
  const finleySceneBrief = topIncomeCategory
    ? `Main income source: ${topIncomeCategory.category}. Cash flow is ${incomeTotal > totalSpent ? 'healthy' : 'tight'} this scene.`
    : 'No income mapped in this scope yet.';
  const inspectorRows = useMemo(() => {
    if (!selectedInspectorCategory) return [];
    return scopedForBreakdown.filter((tx) => (tx.category || 'Uncategorized') === selectedInspectorCategory);
  }, [selectedInspectorCategory, scopedForBreakdown]);
  const inspectorSourceBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of inspectorRows) {
      const source = String(tx.source_type || 'unknown').toLowerCase();
      const normalized =
        source === 'learned'
          ? 'Vendor memory'
          : source === 'rule' || source === 'rules'
          ? 'DB rule'
          : source === 'tag_chat' || source === 'manual'
          ? 'Inline/manual'
          : source === 'ai'
          ? 'AI'
          : 'Unknown';
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
  }, [inspectorRows]);
  const inspectorAvgConfidence = useMemo(() => {
    if (!inspectorRows.length) return null;
    const values = inspectorRows
      .map((tx) => (typeof tx.confidence === 'number' ? tx.confidence : null))
      .filter((v): v is number => v !== null);
    if (!values.length) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }, [inspectorRows]);
  const categoryColors: Record<string, string> = {
    'Groceries': '#1D9E75',
    'Transportation': '#8b5cf6',
    'Food & Dining': '#f97316',
    'Utilities': '#38bdf8',
    'Fuel': '#fbbf24',
    'Shopping': '#ec4899',
    'Healthcare': '#4ade80',
    'Subscriptions': '#94a3b8',
    'Entertainment': '#0F6E56',
    'Income': '#34d399',
    'Other': '#475569',
  };
  const ruleCategories = Array.from(new Set(categorySummaries.map((summary) => summary.category)));
  const subcategoryOptionsByCategory = useMemo(() => {
    const byCategory = new Map<string, string[]>();
    for (const tx of transactions) {
      const category = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      const subcategory = String(tx.subcategory || '').trim();
      if (!subcategory) continue;
      if (!byCategory.has(category)) byCategory.set(category, []);
      const bucket = byCategory.get(category)!;
      if (!bucket.includes(subcategory)) bucket.push(subcategory);
    }
    for (const [category, values] of byCategory.entries()) {
      values.sort((a, b) => a.localeCompare(b));
      byCategory.set(category, values);
    }
    return byCategory;
  }, [transactions]);
  const [ruleMerchantContains, setRuleMerchantContains] = useState('');
  const [ruleCategory, setRuleCategory] = useState<string>('');
  const [ruleSubcategory, setRuleSubcategory] = useState<string>('');
  const [isRuleBuilderSaving, setIsRuleBuilderSaving] = useState(false);
  const [isRuleBuilderCreateAndRun, setIsRuleBuilderCreateAndRun] = useState(false);
  const ruleMatchPreviewCount = useMemo(() => {
    const needle = ruleMerchantContains.trim().toLowerCase();
    if (!needle) return 0;
    let count = 0;
    for (const tx of transactions) {
      const haystack = `${String(tx.merchant || '')} ${String(tx.description || '')}`.toLowerCase();
      if (haystack.includes(needle)) count += 1;
    }
    return count;
  }, [ruleMerchantContains, transactions]);
  const subcategoryOptionsForSelectedCategory = subcategoryOptionsByCategory.get(ruleCategory) || [];

  useEffect(() => {
    if (ruleCategory) return;
    if (ruleCategories.length > 0) {
      setRuleCategory(ruleCategories[0]);
      return;
    }
    setRuleCategory('Other');
  }, [ruleCategory, ruleCategories]);

  useEffect(() => {
    if (!ruleSubcategory) return;
    if (subcategoryOptionsForSelectedCategory.length === 0) return;
    if (subcategoryOptionsForSelectedCategory.includes(ruleSubcategory)) return;
    setRuleSubcategory('');
  }, [ruleSubcategory, subcategoryOptionsForSelectedCategory]);

  const handleCreateRuleFromBuilder = async (runTagAfterCreate: boolean) => {
    if (!userId) {
      toast.error('Sign in required');
      return;
    }
    const merchantPattern = ruleMerchantContains.trim();
    if (!merchantPattern) {
      toast.error('Enter merchant text first');
      return;
    }
    const targetCategory = ruleCategory.trim() || 'Other';
    setIsRuleBuilderSaving(true);
    setIsRuleBuilderCreateAndRun(runTagAfterCreate);
    try {
      const result = await createCategoryRule(
        userId,
        merchantPattern,
        targetCategory,
        'contains',
        ruleSubcategory.trim() || null
      );
      if (!result.ok) {
        throw new Error(result.error || 'Failed to create rule');
      }
      toast.success(
        ruleSubcategory.trim()
          ? `Rule saved: ${targetCategory} > ${ruleSubcategory.trim()}`
          : `Rule saved: ${targetCategory}`
      );
      setRuleMerchantContains('');
      categoryRules.refresh();
      if (runTagAfterCreate) {
        await runHandoffCategorization();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create rule');
    } finally {
      setIsRuleBuilderSaving(false);
      setIsRuleBuilderCreateAndRun(false);
    }
  };
  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };
  const previewTagAction = async (matchValue: string, targetCategory: string, matchType: 'contains' | 'exact' = 'contains') => {
    const token = await getAccessToken();
    if (!token) throw new Error('Session expired — please refresh');
    const res = await fetch('/.netlify/functions/tag-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'preview',
        matchValue,
        targetCategory,
        matchType,
        importId: selectedImportFilter || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(String(data?.error || 'Preview failed'));
    }
    return data as {
      ok: boolean;
      matchCount: number;
      affectedIds: string[];
      targetCategory: string;
      targetSubcategory?: string | null;
    };
  };
  const commitTagAction = async (payload: {
    matchValue: string;
    targetCategory: string;
    matchType: 'contains' | 'exact';
    affectedIds: string[];
  }) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Session expired — please refresh');
    const res = await fetch('/.netlify/functions/tag-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'commit',
        ...payload,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new Error(String(data?.error || 'Commit failed'));
    }
    return data as { ok: boolean; updatedCount: number; targetCategory: string; targetSubcategory?: string | null };
  };
  const applyMerchantSuggestion = async (merchant: string, forcedTargetCategory?: string) => {
    const targetCategory = forcedTargetCategory || merchantTargets[merchant] || inferStarterCategory(merchant);
    setIsMerchantApplying(merchant);
    try {
      const preview = await previewTagAction(merchant, targetCategory, 'exact');
      if (!preview.matchCount) {
        toast('No matching rows found for this merchant');
        return;
      }
      const committed = await commitTagAction({
        matchValue: merchant,
        targetCategory,
        matchType: 'exact',
        affectedIds: preview.affectedIds,
      });
      toast.success(`Updated ${committed.updatedCount} ${merchant} transaction${committed.updatedCount === 1 ? '' : 's'}`);
      categoryRules.refresh();
      await fetchTransactions();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply merchant rule');
    } finally {
      setIsMerchantApplying(null);
    }
  };
  const handleClassifyConfidentMerchants = async () => {
    if (confidentMerchantSuggestions.length === 0) {
      toast('No confident merchant groups ready yet');
      return;
    }
    const confirmed = window.confirm(
      `Let Tag classify ${confidentMerchantSuggestions.length} merchant group${confidentMerchantSuggestions.length === 1 ? '' : 's'} now?`
    );
    if (!confirmed) return;
    try {
      for (const item of confidentMerchantSuggestions) {
        await applyMerchantSuggestion(item.merchant, item.suggestedCategory);
      }
      toast.success(`Tag classified ${confidentMerchantSuggestions.length} merchant group${confidentMerchantSuggestions.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to classify all merchants');
    }
  };
  const handleApproveAllSuggestedRules = async () => {
    if (confidentMerchantSuggestions.length === 0) {
      toast('No suggested rules to approve');
      return;
    }
    const confirmed = window.confirm(
      `Approve ${confidentMerchantSuggestions.length} suggested Tag rule${confidentMerchantSuggestions.length === 1 ? '' : 's'} now?`
    );
    if (!confirmed) return;
    try {
      for (const item of confidentMerchantSuggestions) {
        await applyMerchantSuggestion(item.merchant, merchantTargets[item.merchant] || item.suggestedCategory);
      }
      toast.success(`Approved ${confidentMerchantSuggestions.length} suggested rules`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve suggested rules');
    }
  };
  const moveCategoryTransactions = async (fromCategory: string, toCategory: string, toSubcategory?: string | null) => {
    if (!userId || !supabase) return false;
    const affected = scopedForBreakdown.filter((tx) => (tx.category || 'Uncategorized') === fromCategory);
    if (affected.length === 0) {
      toast('No transactions in current scope');
      return false;
    }
    const ids = affected.map((tx) => tx.id);
    const { error } = await supabase
      .from('transactions')
      .update({
        category: toCategory,
        subcategory: String(toSubcategory || '').trim() || null,
        category_source: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('id', ids);
    if (error) {
      throw new Error(error.message || 'Bulk move failed');
    }
    toast.success(`Moved ${ids.length} transaction${ids.length === 1 ? '' : 's'} to ${toCategory}`);
    await fetchTransactions();
    return true;
  };
  const handleRenameOrMergeCategory = async (fromCategory: string) => {
    const toCategory = window.prompt(`Rename / merge "${fromCategory}" to category:`, fromCategory)?.trim();
    if (!toCategory || toCategory === fromCategory) return;
    const toSubcategory = window.prompt('Subcategory (optional):', '')?.trim() || null;
    const confirmed = window.confirm(
      `Move all "${fromCategory}" transactions in current scope to ${toCategory}${toSubcategory ? ` > ${toSubcategory}` : ''}?`
    );
    if (!confirmed) return;
    setIsInspectorApplying(true);
    try {
      const moved = await moveCategoryTransactions(fromCategory, toCategory, toSubcategory);
      if (moved) {
        setSelectedInspectorCategory(toCategory);
        setInspectorMoveCategory(toCategory);
        setInspectorMoveSubcategory(toSubcategory || '');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Rename/merge failed');
    } finally {
      setIsInspectorApplying(false);
    }
  };
  const applyInspectorBulkMove = async () => {
    if (!selectedInspectorCategory || !userId) return;
    const toCategory = inspectorMoveCategory.trim() || 'Other';
    const affected = scopedForBreakdown.filter((tx) => (tx.category || 'Uncategorized') === selectedInspectorCategory);
    const confirmed = window.confirm(
      `Move ${affected.length} "${selectedInspectorCategory}" transaction${affected.length === 1 ? '' : 's'} to ${toCategory}${inspectorMoveSubcategory.trim() ? ` > ${inspectorMoveSubcategory.trim()}` : ''}?`
    );
    if (!confirmed) return;
    setIsInspectorApplying(true);
    try {
      const moved = await moveCategoryTransactions(selectedInspectorCategory, toCategory, inspectorMoveSubcategory.trim() || null);
      if (moved) {
        setSelectedInspectorCategory(toCategory);
        setExpandedCategory(toCategory);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to move category');
    } finally {
      setIsInspectorApplying(false);
    }
  };

  return (
    <DashboardPageShell
      center={
        <div className="grid grid-cols-1 gap-3 p-4">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Total spend</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">{formatCurrency(totalSpendAll)}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Auto-tagged %</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">
              {tagStats.autoTaggedPct !== null ? `${tagStats.autoTaggedPct}%` : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Categories</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {tagStats.categoryCount !== null ? tagStats.categoryCount : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Needs review</div>
            <div className={`mt-1 text-sm font-semibold ${(tagStats.uncategorizedCount || 0) > 0 ? 'text-amber-300' : 'text-slate-100'}`}>
              {tagStats.uncategorizedCount !== null ? tagStats.uncategorizedCount : '—'}
            </div>
          </div>
        </section>

            <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-start gap-2">
                <div className="mr-auto min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500">Statements</div>
                  <div className="mt-1 -mx-1 overflow-x-auto px-1 pb-1">
                    <div className="flex w-max items-center gap-1.5">
                      {statementTabs.map((tab) => {
                        const isActive = (selectedImportFilter || '') === tab.id;
                        return (
                          <button
                            key={`statement-tab-${tab.id || 'all'}`}
                            type="button"
                            onClick={() => handleSelectImportFilter(tab.id || null)}
                            className={`max-w-[210px] shrink-0 truncate rounded-md border px-2 py-1 text-[10px] ${
                              isActive
                                ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                                : 'border-slate-700 text-slate-300 hover:bg-slate-800/70'
                            }`}
                            title={`${tab.label} · ${tab.sub}`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {shouldWarnOther && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-semibold">Other is high:</span>{' '}
                    {formatCurrency(otherBucket?.amount || 0)} ({Math.round(otherPct)}% of spend)
                  </span>
                  <button
                    type="button"
                    onClick={runHandoffCategorization}
                    disabled={isRunningHandoffTag}
                    className="rounded-md border border-amber-300/40 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-400/20 disabled:opacity-60"
                  >
                    Run Auto-Tag
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 border-b border-slate-800 px-4 py-3 bg-slate-900/70">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="text-[11px] text-slate-400">Total spent</div>
                <div className="mt-1 text-sm font-semibold text-red-300">{formatCurrency(totalSpent)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="text-[11px] text-slate-400">Income</div>
                <div className="mt-1 text-sm font-semibold text-emerald-300">{formatCurrency(incomeTotal)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="text-[11px] text-slate-400">Net</div>
                <div className={`mt-1 text-sm font-semibold ${netTotal >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {formatCurrency(netTotal)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-[36px_minmax(170px,1fr)_minmax(120px,1fr)_70px_110px_70px_80px_90px] gap-2 border-b border-slate-800 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500">
                <div />
                <div>Category</div>
                <div>Bar</div>
                <div className="text-right">% Total</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Trend</div>
                <div className="text-right">Conf</div>
                <div className="text-right">Txns</div>
              </div>

              <div className="max-h-[56vh] overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-4 text-sm text-slate-400">Loading category breakdown...</div>
                ) : scopedCategoryEntries.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-400">No transactions available for this scope.</div>
                ) : (
                  scopedCategoryEntries.map((entry) => {
                    const categoryColor = categoryColors[entry.category] || '#8b5cf6';
                    const width = maxBreakdownAmount > 0 ? Math.max(4, (entry.amount / maxBreakdownAmount) * 100) : 0;
                    const isExpanded = expandedCategory === entry.category;
                    const activeTab = expandedTabs[entry.category] || 'subcategories';
                    const categoryTxs = scopedForBreakdown.filter((tx) => (tx.category || 'Uncategorized') === entry.category);
                    const subcategoryMap = new Map<string, { amount: number; count: number }>();
                    categoryTxs.forEach((tx) => {
                      const sub = String((tx as any).subcategory || 'Unspecified').trim() || 'Unspecified';
                      const prev = subcategoryMap.get(sub) || { amount: 0, count: 0 };
                      subcategoryMap.set(sub, {
                        amount: prev.amount + Math.abs(Number(tx.amount) || 0),
                        count: prev.count + 1,
                      });
                    });
                    const subRows = Array.from(subcategoryMap.entries())
                      .map(([subcategory, value]) => ({ subcategory, amount: value.amount, count: value.count }))
                      .sort((a, b) => b.amount - a.amount);
                    const maxSubAmount = Math.max(...subRows.map((s) => s.amount), 0);
                    const merchantMap = new Map<string, { amount: number; count: number }>();
                    categoryTxs.forEach((tx) => {
                      const merchant = String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase();
                      const prev = merchantMap.get(merchant) || { amount: 0, count: 0 };
                      merchantMap.set(merchant, {
                        amount: prev.amount + Math.abs(Number(tx.amount) || 0),
                        count: prev.count + 1,
                      });
                    });
                    const topMerchants = Array.from(merchantMap.entries())
                      .map(([merchant, value]) => ({ merchant, amount: value.amount, count: value.count }))
                      .sort((a, b) => b.amount - a.amount)
                      .slice(0, 8);
                    const categorySourceMap = new Map<string, number>();
                    categoryTxs.forEach((tx) => {
                      const source = String(tx.source_type || 'unknown').toLowerCase();
                      const normalized =
                        source === 'learned'
                          ? 'Vendor memory'
                          : source === 'rule' || source === 'rules'
                          ? 'DB rule'
                          : source === 'tag_chat' || source === 'manual'
                          ? 'Inline/manual'
                          : source === 'ai'
                          ? 'AI'
                          : 'Unknown';
                      categorySourceMap.set(normalized, (categorySourceMap.get(normalized) || 0) + 1);
                    });
                    const categorySourceBreakdown = Array.from(categorySourceMap.entries())
                      .map(([source, count]) => ({ source, count }))
                      .sort((a, b) => b.count - a.count);
                    const maxMerchantAmount = Math.max(...topMerchants.map((m) => m.amount), 0);
                    const selectedMerchant = selectedMerchantByCategory[entry.category] || topMerchants[0]?.merchant || '';
                    const selectedMerchantTxs = selectedMerchant
                      ? categoryTxs
                          .filter((tx) => String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase() === selectedMerchant)
                          .slice(0, 6)
                      : [];

                    return (
                      <div key={entry.category} className="border-b border-slate-800/80 last:border-b-0 group">
                        <div
                          className={`grid cursor-pointer grid-cols-[36px_minmax(170px,1fr)_minmax(120px,1fr)_70px_110px_70px_80px_90px] items-center gap-2 px-4 py-2 transition-colors ${
                            isExpanded ? 'bg-violet-500/12 border-l-2 border-violet-400' : 'hover:bg-slate-800/40 border-l-2 border-transparent'
                          }`}
                          onClick={() => {
                            const nextExpanded = isExpanded ? null : entry.category;
                            setExpandedCategory(nextExpanded);
                            setSelectedInspectorCategory(entry.category);
                            setInspectorMoveCategory(entry.category);
                            setInspectorMoveSubcategory('');
                            if (!expandedTabs[entry.category]) {
                              setExpandedTabs((prev) => ({ ...prev, [entry.category]: 'subcategories' }));
                            }
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextExpanded = isExpanded ? null : entry.category;
                              setExpandedCategory(nextExpanded);
                              setSelectedInspectorCategory(entry.category);
                              setInspectorMoveCategory(entry.category);
                              setInspectorMoveSubcategory('');
                            }}
                            className="h-6 w-6 rounded border border-slate-700 text-xs text-slate-300"
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInspectorCategory(entry.category);
                              setInspectorMoveCategory(entry.category);
                              setInspectorMoveSubcategory('');
                            }}
                            className="flex min-w-0 items-center gap-2 text-left"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
                            <span className="truncate text-sm text-slate-100">{entry.category}</span>
                            {entry.isIncome && (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                                Income
                              </span>
                            )}
                          </button>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: categoryColor }} />
                          </div>
                          <div className="text-right text-sm text-slate-300">{entry.pctOfTotal}%</div>
                          <div className="text-right text-sm font-medium text-slate-100">{formatCurrency(entry.amount)}</div>
                          <div className={`text-right text-xs ${
                            entry.trend === 'up' ? 'text-red-300' : entry.trend === 'down' ? 'text-emerald-300' : 'text-slate-400'
                          }`}>
                            {entry.trend === 'flat' ? '—' : `${entry.trend === 'up' ? '↑' : '↓'} ${entry.trendPct ?? ''}%`}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedInspectorCategory(entry.category);
                              setInspectorMoveCategory(entry.category);
                              setInspectorMoveSubcategory('');
                            }}
                            className={`text-right text-xs ${
                              entry.avgConfidence !== null && entry.avgConfidence < 0.7
                                ? 'text-amber-300 underline decoration-dotted underline-offset-2'
                                : 'text-slate-300'
                            }`}
                            title={
                              entry.avgConfidence !== null && entry.avgConfidence < 0.7
                                ? 'Low confidence — click for Tag explanation'
                                : 'Open Tag inspector'
                            }
                          >
                            {entry.avgConfidence === null || entry.avgConfidence < 0.01
                              ? 'Learning'
                              : `${Math.round(entry.avgConfidence * 100)}%`}
                          </button>
                          <div className="text-right text-sm text-slate-300">{entry.count}</div>
                        </div>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-out ${
                            isExpanded ? 'max-h-[620px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="border-t border-slate-800 bg-slate-950/45 px-4 py-3">
                            <div className="mb-2 flex items-center gap-1">
                              {([
                                { id: 'subcategories', label: 'Subcategories' },
                                { id: 'insights', label: 'Tag insights' },
                                { id: 'merchants', label: 'Top merchants' },
                              ] as const).map((tab) => (
                                <button
                                  key={`${entry.category}-${tab.id}`}
                                  type="button"
                                  onClick={() => setExpandedTabs((prev) => ({ ...prev, [entry.category]: tab.id }))}
                                  className={`rounded-md px-2.5 py-1 text-[11px] ${
                                    activeTab === tab.id
                                      ? 'bg-violet-500/20 text-violet-200 border border-violet-400/30'
                                      : 'text-slate-400 border border-slate-700 hover:bg-slate-800/70'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                            {activeTab === 'subcategories' && (
                              <div className="space-y-1.5">
                                {subRows.map((sub) => {
                                  const subWidth = maxSubAmount > 0 ? Math.max(6, (sub.amount / maxSubAmount) * 100) : 0;
                                  return (
                                    <button
                                      key={`${entry.category}-${sub.subcategory}`}
                                      type="button"
                                      onClick={() =>
                                        navigate(
                                          `/dashboard/transactions?category=${encodeURIComponent(entry.category)}&subcategory=${encodeURIComponent(sub.subcategory)}`
                                        )
                                      }
                                      className="grid w-full grid-cols-[minmax(180px,1fr)_minmax(160px,1fr)_120px_70px] items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-left hover:bg-slate-800/70"
                                    >
                                      <div className="truncate text-[12px] text-slate-200">{sub.subcategory}</div>
                                      <div className="h-1.5 rounded-full bg-slate-800">
                                        <div className="h-full rounded-full" style={{ width: `${subWidth}%`, backgroundColor: categoryColor }} />
                                      </div>
                                      <div className="text-right text-[12px] text-slate-300">{formatCurrency(sub.amount)}</div>
                                      <div className="text-right text-[12px] text-slate-400">{sub.count}</div>
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const sub = window.prompt(`Add subcategory for "${entry.category}"`, '')?.trim();
                                    if (!sub) return;
                                    setRuleCategory(entry.category);
                                    setRuleSubcategory(sub);
                                    toast.success(`Subcategory "${sub}" staged in AutoCat Builder`);
                                  }}
                                  className="mt-1 rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
                                >
                                  Add subcategory
                                </button>
                              </div>
                            )}
                            {activeTab === 'insights' && (
                              <div className="space-y-2 text-[12px]">
                                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2 text-slate-300">
                                  Confidence: {entry.avgConfidence !== null ? `${Math.round(entry.avgConfidence * 100)}%` : 'n/a'} ·
                                  Sources: {categorySourceBreakdown.map((src) => `${src.source} ${src.count}`).join(' | ') || 'No source data'}
                                </div>
                                <div className="rounded-md border border-slate-800 bg-slate-900/60 p-2 text-slate-300">
                                  {entry.trend === 'flat'
                                    ? 'Trend is flat vs last month.'
                                    : `Trend is ${entry.trend} by ${entry.trendPct ?? 0}% vs last month.`}{' '}
                                  {entry.avgConfidence !== null && entry.avgConfidence < 0.7
                                    ? 'Low confidence suggests inconsistent merchant mapping.'
                                    : 'Confidence looks stable.'}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInspectorCategory(entry.category);
                                      setInspectorMoveCategory(entry.category);
                                      setInspectorMoveSubcategory('');
                                    }}
                                    className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                                  >
                                    Reclassify from inspector
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRuleCategory(entry.category);
                                      if (topMerchants[0]?.merchant) setRuleMerchantContains(topMerchants[0].merchant);
                                    }}
                                    className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
                                  >
                                    Create rule from top merchant
                                  </button>
                                  <button
                                    type="button"
                                    onClick={openTagWorkspace}
                                    className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                                  >
                                    Ask Tag
                                  </button>
                                </div>
                              </div>
                            )}
                            {activeTab === 'merchants' && (
                              <div className="space-y-1.5">
                                {topMerchants.map((merchantRow) => {
                                  const merchantWidth = maxMerchantAmount > 0 ? Math.max(6, (merchantRow.amount / maxMerchantAmount) * 100) : 0;
                                  const selected = selectedMerchant === merchantRow.merchant;
                                  return (
                                    <button
                                      key={`${entry.category}-merchant-${merchantRow.merchant}`}
                                      type="button"
                                      onClick={() =>
                                        setSelectedMerchantByCategory((prev) => ({ ...prev, [entry.category]: merchantRow.merchant }))
                                      }
                                      className={`grid w-full grid-cols-[minmax(170px,1fr)_minmax(160px,1fr)_120px_70px] items-center gap-2 rounded-md border px-2.5 py-1.5 text-left ${
                                        selected
                                          ? 'border-violet-500/40 bg-violet-500/10'
                                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800/70'
                                      }`}
                                    >
                                      <div className="truncate text-[12px] text-slate-200">{merchantRow.merchant}</div>
                                      <div className="h-1.5 rounded-full bg-slate-800">
                                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${merchantWidth}%` }} />
                                      </div>
                                      <div className="text-right text-[12px] text-slate-300">{formatCurrency(merchantRow.amount)}</div>
                                      <div className="text-right text-[12px] text-slate-400">{merchantRow.count}</div>
                                    </button>
                                  );
                                })}
                                {selectedMerchant && selectedMerchantTxs.length > 0 && (
                                  <div className="mt-2 rounded-md border border-slate-800 bg-slate-900/60 p-2">
                                    <div className="mb-1 text-[11px] text-slate-400">{selectedMerchant} transactions</div>
                                    <div className="space-y-1">
                                      {selectedMerchantTxs.map((tx) => (
                                        <div key={`${entry.category}-tx-${tx.id}`} className="flex items-center justify-between text-[11px]">
                                          <span className="truncate text-slate-300">{tx.description || tx.merchant || 'Transaction'}</span>
                                          <span className="text-slate-400">{formatCurrency(Math.abs(Number(tx.amount) || 0))}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800 pt-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard/transactions?category=${encodeURIComponent(entry.category)}`)}
                                className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800"
                              >
                                View all transactions
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRuleCategory(entry.category);
                                  if (topMerchants[0]?.merchant) setRuleMerchantContains(topMerchants[0].merchant);
                                }}
                                className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
                              >
                                Create a rule
                              </button>
                              <button
                                type="button"
                                onClick={openTagWorkspace}
                                className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
                              >
                                Ask Tag
                              </button>
                              {entry.category.toLowerCase() === 'other' && (
                                <button
                                  type="button"
                                  onClick={runHandoffCategorization}
                                  disabled={isRunningHandoffTag}
                                  className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                                >
                                  Auto-Tag
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  void handleRenameOrMergeCategory(entry.category);
                                }}
                                className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                              >
                                Rename / merge category
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={runHandoffCategorization}
                disabled={isRunningHandoffTag}
                className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium text-violet-300 hover:bg-violet-500/20 disabled:opacity-60"
              >
                {isRunningHandoffTag ? 'Tag running…' : 'Auto-Tag all transactions'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/transactions?status=uncategorized')}
                className="rounded-md border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Review
              </button>
            </div>
          </div>

          <div className="space-y-3 xl:max-w-[300px]">
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-200">Tag copilot</div>
              <div className="mt-1 text-[10px] text-slate-400">
                Scene: {selectedStatement ? `${selectedStatement.statementLabel} · ${selectedStatement.label}` : 'All statements'}
              </div>
              <div className="mt-2 -mx-1 overflow-x-auto px-1 pb-1">
                <div className="flex w-max items-center gap-1">
                  {statementTabs.slice(0, 8).map((tab) => {
                    const isActive = (selectedImportFilter || '') === tab.id;
                    return (
                      <button
                        key={`copilot-scene-tab-${tab.id || 'all'}`}
                        type="button"
                        onClick={() => handleSelectImportFilter(tab.id || null)}
                        className={`max-w-[170px] shrink-0 truncate rounded border px-1.5 py-0.5 text-[10px] ${
                          isActive
                            ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                            : 'border-slate-700 text-slate-300 hover:bg-slate-800/70'
                        }`}
                        title={`${tab.label} · ${tab.sub}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-slate-200">
                I analyzed <span className="font-semibold text-white">{scopedForBreakdown.length}</span> transactions.
                I can confidently classify <span className="font-semibold text-emerald-300">{confidentMerchantSuggestions.length}</span> merchant groups in <span className="font-semibold text-amber-200">Other</span>.
                The remaining <span className="font-semibold text-amber-300">{uncertainMerchantSuggestions.length}</span> need your input.
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-slate-300">
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1"><span className="text-violet-300">Tag:</span> {tagSceneBrief}</div>
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1"><span className="text-cyan-300">Prime:</span> {primeSceneBrief}</div>
                <div className="rounded border border-slate-800 bg-slate-900/60 px-2 py-1"><span className="text-emerald-300">Finley:</span> {finleySceneBrief}</div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleClassifyConfidentMerchants();
                  }}
                  disabled={isRunningHandoffTag || confidentMerchantSuggestions.length === 0}
                  className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  Let Tag classify all {confidentMerchantSuggestions.length} merchants now
                </button>
                <button
                  type="button"
                  onClick={runHandoffCategorization}
                  disabled={isRunningHandoffTag}
                  className="w-full rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
                >
                  {isRunningHandoffTag ? 'Tag AI running…' : 'Run Tag AI pass on all transactions'}
                </button>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => openChat({ initialEmployeeSlug: 'tag-ai', force: true, context: { page: 'smart-categories', data: { importId: selectedImportFilter || null } } })}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => openChat({ initialEmployeeSlug: 'prime-boss', force: true, context: { page: 'smart-categories', data: { importId: selectedImportFilter || null } } })}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Prime
                  </button>
                  <button
                    type="button"
                    onClick={() => openChat({ initialEmployeeSlug: 'finley-forecasts', force: true, context: { page: 'smart-categories', data: { importId: selectedImportFilter || null } } })}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Finley
                  </button>
                </div>
              </div>
            </div>
            {uncertainMerchantSuggestions.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200">Need your input (top {uncertainMerchantSuggestions.length})</div>
                <div className="mt-2 space-y-2">
                  {uncertainMerchantSuggestions.map((item) => (
                    <div key={`uncertain-${item.merchant}`} className="rounded-md border border-amber-400/20 bg-slate-950/40 p-2">
                      <div className="truncate text-[11px] font-medium text-slate-100">{item.merchant}</div>
                      <div className="mt-1 text-[10px] text-amber-100/80">{item.count} tx · {formatCurrency(item.amount)} · Tag needs confirmation</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/transactions?status=uncategorized')}
                  className="mt-2 w-full rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-100 hover:bg-amber-500/20"
                >
                  Review only uncertain transactions
                </button>
              </div>
            )}
            {confidentMerchantSuggestions.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Suggested rules</div>
                <div className="mt-2 space-y-1.5">
                  {confidentMerchantSuggestions.slice(0, 6).map((item) => {
                    const selectedTarget = merchantTargets[item.merchant] || item.suggestedCategory;
                    return (
                      <div key={`suggested-${item.merchant}`} className="rounded-md border border-slate-800 bg-slate-900/60 p-2">
                        <div className="truncate text-[11px] font-medium text-slate-100">{item.merchant}</div>
                        <div className="mt-1 flex items-center gap-1">
                          <div className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">
                            {selectedTarget}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void applyMerchantSuggestion(item.merchant);
                            }}
                            disabled={isMerchantApplying === item.merchant}
                            className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-60"
                          >
                            {isMerchantApplying === item.merchant ? 'Applying…' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleApproveAllSuggestedRules();
                  }}
                  className="mt-2 w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20"
                >
                  Approve all suggested rules
                </button>
              </div>
            )}
          </div>
            </section>
          </div>
      }
    />
  );
};

export default SmartCategoriesPage;
