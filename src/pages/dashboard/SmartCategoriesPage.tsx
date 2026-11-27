import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { useSmartCategoriesStats } from '../../hooks/useSmartCategoriesStats';
import { useImportList } from '../../hooks/useImportList';
import { useCategoryRules } from '../../hooks/useCategoryRules';
import { fetchPrimeSummarySingleFlight } from '../../lib/ai/primeSummaryClient';
import toast from 'react-hot-toast';
import { newClientMessageId } from '@/lib/tagConversation';
import { useSetAtom } from 'jotai';
import { isPrimeBriefingOpenAtom } from '@/lib/uiStore';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { allTimeRange } from '@/lib/financialSummary';
import { hasFigures, formatMoney } from '@/components/finance/FinancialState';
import { FINANCIAL_LABELS } from '@/lib/financialLabels';
import { categoryTrend, insightText } from '@/lib/insightWording';
import { classifyCashFlow } from '@/shared/financial-taxonomy';
import { FinancialStateNotice } from '@/components/finance/FinancialState';

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
  transactionCount: number;
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
  const { imports: importList } = useImportList();
  const categoryRules = useCategoryRules();


  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isRunningHandoffTag, setIsRunningHandoffTag] = useState(false);
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
      // SC-5 (AR-1b R2): no money here; counts and Tag learning metrics only. Figures come from the engine.
      const transactionCount = txs.length;

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
        transactionCount,
        trend,
        learnedCount,
        aiCount,
        manualCount,
        avgConfidence,
        learningDominance,
      };
    });

    // Most-used categories first (no money ranking).
    return summaries.sort((a, b) => b.transactionCount - a.transactionCount || a.category.localeCompare(b.category));
  }, [transactions]);



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
  // FST-2 (AR-1b FR-009): the pasted merchant-name income patterns
  // (getTxDirection, isExpenseTx, isIncomeTx) and the unused month / breakdown memos built on it
  // are retired. Rows that need a direction use the engine classifier (classifyCashFlow).
  const rowPurpose = (tx: Transaction) =>
    classifyCashFlow({ type: (tx as { type?: string | null }).type, category: tx.category, subcategory: (tx as { subcategory?: string | null }).subcategory, amount: tx.amount }).purpose;
  // ────────────────────────────────────────────────────────────────────────────

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
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


  // Removed all inline chat code - chat is now only in unified slideout

  // SC-1 (owner 2026-11-26: restore supported active employee navigation). The unified chat
  // launcher (openChat) has no mounted renderer, so its buttons opened nothing. Each Ask button now
  // goes to the employee's working surface: Tag on Transactions (scoped to the statement), Prime's
  // briefing panel (as the header button), Crystal on My Story. Finley stays hidden (not active).
  const setIsPrimeBriefingOpen = useSetAtom(isPrimeBriefingOpenAtom);
  const askTag = () => {
    navigate(`/dashboard/transactions?openTag=1${selectedImportFilter ? `&import_id=${encodeURIComponent(selectedImportFilter)}` : ''}`);
  };
  const askPrime = () => setIsPrimeBriefingOpen(true);
  const askCrystal = () => navigate('/dashboard/my-story?crystal=1');
  const openTagWorkspace = askTag;
  const runHandoffCategorization = async () => {
    if (!supabase) {
      toast.error('Database connection unavailable');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error('Session expired - please refresh');
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
          // non-fatal - categories are written, summary will be stale
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
  // FST-2: every money figure below is the shared engine's for the page scope (all time or the
  // ?month, plus the selected statement). Rows keep non-money facts (counts, confidence, drill-down).
  const allTimeScope = useMemo(() => allTimeRange(), []);
  const allTimeFinancial = useFinancialSummary(allTimeScope);
  const allTimeSum = hasFigures(allTimeFinancial) ? allTimeFinancial.summary : null;
  const primeScope = useMemo(() => {
    let dates = allTimeRange();
    if (selectedMonth && /^[0-9]{4}-[0-9]{2}$/.test(selectedMonth)) {
      const [y, m] = selectedMonth.split('-').map(Number);
      dates = { startDate: `${selectedMonth}-01`, endDate: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10) };
    }
    return { ...dates, ...(selectedImportFilter ? { importIds: [selectedImportFilter] } : {}) };
  }, [selectedMonth, selectedImportFilter]);
  const primeFinancial = useFinancialSummary(primeScope);
  const primeSum = hasFigures(primeFinancial) ? primeFinancial.summary : null;
  const pageCurrency = primeSum?.scope.currency ?? 'CAD';
  const confidenceByCategory = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const tx of scopedForBreakdown) {
      if (typeof tx.confidence !== 'number') continue;
      const cat = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      const prev = m.get(cat) || { sum: 0, n: 0 };
      m.set(cat, { sum: prev.sum + tx.confidence, n: prev.n + 1 });
    }
    return new Map([...m.entries()].map(([k, v]) => [k, v.n > 0 ? v.sum / v.n : null] as const));
  }, [scopedForBreakdown]);
  const scopedCategoryEntries: Array<{ category: string; amount: number; count: number; pctOfTotal: number | null; avgConfidence: number | null; isIncome: boolean }> = primeSum
    ? [
        ...primeSum.spendingByCategory.map((c) => ({ category: c.category, amount: c.amount, count: c.count, pctOfTotal: c.share as number | null, avgConfidence: confidenceByCategory.get(c.category) ?? null, isIncome: false })),
        ...(primeSum.categories ?? []).filter((c) => c.purpose === 'income').map((c) => ({ category: c.category, amount: c.amount, count: c.count, pctOfTotal: null as number | null, avgConfidence: confidenceByCategory.get(c.category) ?? null, isIncome: true })),
      ]
    : [];
  const maxBreakdownAmount = Math.max(...scopedCategoryEntries.map((entry) => entry.amount), 0);
  const otherBucket = primeSum?.spendingByCategory.find((c) => c.category.toLowerCase() === 'other') ?? null;
  const otherPct = otherBucket ? otherBucket.share : 0;
  const shouldWarnOther = otherPct >= 35 && (otherBucket?.amount || 0) > 0;
  const otherMerchantSuggestions = useMemo(() => {
    const map = new Map<string, { count: number }>();
    for (const tx of scopedForBreakdown) {
      if (rowPurpose(tx) !== 'spending') continue;
      const category = String(tx.category || 'Uncategorized').trim() || 'Uncategorized';
      if (category.toLowerCase() !== 'other') continue;
      const merchant = String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase();
      const prev = map.get(merchant) || { count: 0 };
      map.set(merchant, { count: prev.count + 1 });
    }
    return Array.from(map.entries())
      .map(([merchant, value]) => ({
        merchant,
        count: value.count,
        suggestedCategory: inferStarterCategory(merchant),
      }))
      .sort((a, b) => b.count - a.count)
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
  const tagSceneBrief = `${confidentMerchantSuggestions.length} merchant group${
    confidentMerchantSuggestions.length === 1 ? '' : 's'
  } confident, ${uncertainMerchantSuggestions.length} need review.`;
  // FST-2: Prime's line uses the shared engine's figures for the same scope, never browser sums.
  const primeTop = primeSum?.spendingByCategory[0] ?? null;
  const primeSceneBrief = !primeSum
    ? 'Figures for this scope are not available right now.'
    : `${primeTop ? `Top spending: ${primeTop.category} (${formatMoney(primeTop.amount, primeSum.scope.currency)}). ` : ''}${FINANCIAL_LABELS.netCashFlow}: ${primeSum.labels.netCashFlow.amount > 0 ? '+' : ''}${formatMoney(primeSum.labels.netCashFlow.amount, primeSum.scope.currency)}.`;
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
  const [ruleCategory, setRuleCategory] = useState<string>('');
  const [ruleSubcategory, setRuleSubcategory] = useState<string>('');
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

  const getAccessToken = async (): Promise<string | null> => {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };
  // T-ACT-FINAL (Tag HQ): Smart Categories uses the ONE action safety contract. The preview is a
  // server proposal (verified affected set, customer-categorized rows kept, future rule + existing
  // changes spelled out, signed receipt in the Tag conversation); the change happens only through
  // tag-action commit_proposal after the customer confirms what the server proposed.
  type TagProposal = { action: string; subject: Record<string, string | number | null>; sessionId: string | null; reply: string; affected: number };
  const proposeTagRule = async (matchValue: string, targetCategory: string, matchType: 'contains' | 'exact'): Promise<{ proposal: TagProposal | null; reply: string }> => {
    const token = await getAccessToken();
    if (!token) throw new Error('Session expired - please refresh');
    const res = await fetch('/.netlify/functions/tag-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'preview', matchValue, targetCategory, matchType,
        conversation: { customerText: `Smart Categories: apply ${targetCategory} to ${matchValue}`, clientMessageId: newClientMessageId() },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const reply = String(data?.conversation?.reply || data?.error || 'Tag could not check those transactions, so nothing has changed.');
    const p = data?.proposal;
    if (res.ok && p && p.kind === 'action' && data?.conversation?.receipt?.state === 'proposed') {
      return { reply, proposal: { action: String(p.action), subject: p.subject, sessionId: data.conversation.sessionId ?? null, reply, affected: Number(p.subject?.affected ?? 0) } };
    }
    return { reply, proposal: null };
  };
  const confirmTagProposal = async (proposal: TagProposal): Promise<{ completed: boolean; count: number; reply: string }> => {
    const token = await getAccessToken();
    if (!token) throw new Error('Session expired - please refresh');
    const res = await fetch('/.netlify/functions/tag-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        intent: 'commit_proposal', action: proposal.action, subject: proposal.subject,
        conversation: { customerText: 'yes', clientMessageId: newClientMessageId(), ...(proposal.sessionId ? { sessionId: proposal.sessionId } : {}) },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const receipt = data?.conversation?.receipt;
    return {
      completed: receipt?.state === 'completed',
      count: typeof receipt?.count === 'number' ? receipt.count : 0,
      reply: String(data?.conversation?.reply || "Couldn't confirm whether that went through - check your transactions before trying again."),
    };
  };
  const applyMerchantSuggestion = async (merchant: string, forcedTargetCategory?: string) => {
    const targetCategory = forcedTargetCategory || merchantTargets[merchant] || inferStarterCategory(merchant);
    setIsMerchantApplying(merchant);
    try {
      const { proposal, reply } = await proposeTagRule(merchant, targetCategory, 'exact');
      if (!proposal) { toast(reply); return; }
      // Show the server's exact proposal; nothing changes until the customer confirms it.
      toast((t) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>{proposal.reply.replace(/\*\*/g, '')}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const r = await confirmTagProposal(proposal);
                  if (r.completed) {
                    toast.success(r.reply.replace(/\*\*/g, ''));
                    categoryRules.refresh();
                    await fetchTransactions();
                  } else {
                    toast.error(r.reply.replace(/\*\*/g, ''));
                  }
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Failed to apply merchant rule');
                }
              }}
              style={{ padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}
            >Confirm</button>
            <button onClick={() => toast.dismiss(t.id)} style={{ padding: '4px 10px', borderRadius: 8 }}>Cancel</button>
          </span>
        </span>
      ), { duration: 30000 });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to apply merchant rule');
    } finally {
      setIsMerchantApplying(null);
    }
  };
  // Several merchants at once: preview them all, confirm the verified totals once, then for each
  // merchant re-propose and commit it only if its scope is still exactly what the customer saw.
  const applyMerchantSuggestionsConfirmed = async (items: Array<{ merchant: string; category: string }>, verb: string) => {
    const seen: Array<{ merchant: string; category: string; fingerprint: unknown; affected: number }> = [];
    for (const item of items) {
      const { proposal } = await proposeTagRule(item.merchant, item.category, 'exact');
      if (proposal) seen.push({ ...item, fingerprint: proposal.subject.fingerprint, affected: proposal.affected });
    }
    if (seen.length === 0) { toast('Nothing to change'); return; }
    const total = seen.reduce((n, x) => n + x.affected, 0);
    const confirmed = window.confirm(
      `${verb} ${seen.length} merchant rule${seen.length === 1 ? '' : 's'} for future imports and change ${total} existing transaction${total === 1 ? '' : 's'} now? Transactions with a protected category (set by you, or of unverified origin) are kept.`
    );
    if (!confirmed) return;
    let done = 0; let changed = 0; let skipped = 0;
    for (const item of seen) {
      const { proposal } = await proposeTagRule(item.merchant, item.category, 'exact');
      if (!proposal || proposal.subject.fingerprint !== item.fingerprint) { skipped++; continue; }
      const r = await confirmTagProposal(proposal);
      if (r.completed) { done++; changed += r.count; } else { skipped++; }
    }
    toast.success(`${verb === 'Approve' ? 'Approved' : 'Saved'} ${done} rule${done === 1 ? '' : 's'}; ${changed} transaction${changed === 1 ? '' : 's'} changed${skipped ? `; ${skipped} skipped because they changed or failed` : ''}`);
    categoryRules.refresh();
    await fetchTransactions();
  };
  const handleClassifyConfidentMerchants = async () => {
    if (confidentMerchantSuggestions.length === 0) {
      toast('No confident merchant groups ready yet');
      return;
    }
    try {
      await applyMerchantSuggestionsConfirmed(confidentMerchantSuggestions.map(i => ({ merchant: i.merchant, category: i.suggestedCategory })), 'Save');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to classify all merchants');
    }
  };
  const handleApproveAllSuggestedRules = async () => {
    if (confidentMerchantSuggestions.length === 0) {
      toast('No suggested rules to approve');
      return;
    }
    try {
      await applyMerchantSuggestionsConfirmed(confidentMerchantSuggestions.map(i => ({ merchant: i.merchant, category: merchantTargets[i.merchant] || i.suggestedCategory })), 'Approve');
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

  return (
    <DashboardPageShell
      center={
        <div className="grid grid-cols-1 gap-3 p-4">
        <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{FINANCIAL_LABELS.actualSpending}</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">{allTimeSum ? formatMoney(allTimeSum.labels.actualSpending.amount, allTimeSum.scope.currency) : '-'}</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Auto-tagged %</div>
            <div className="mt-1 text-sm font-semibold text-emerald-300">
              {tagStats.autoTaggedPct !== null ? `${tagStats.autoTaggedPct}%` : '-'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Categories</div>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {tagStats.categoryCount !== null ? tagStats.categoryCount : '-'}
            </div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Needs review</div>
            <div className={`mt-1 text-sm font-semibold ${(tagStats.uncategorizedCount || 0) > 0 ? 'text-amber-300' : 'text-slate-100'}`}>
              {tagStats.uncategorizedCount !== null ? tagStats.uncategorizedCount : '-'}
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
                    {formatMoney(otherBucket?.amount || 0, pageCurrency)} ({otherPct}% of actual spending)
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
                <div className="text-[11px] text-slate-400">{FINANCIAL_LABELS.actualSpending}</div>
                <div className="mt-1 text-sm font-semibold text-red-300">{primeSum ? formatMoney(primeSum.labels.actualSpending.amount, pageCurrency) : '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="text-[11px] text-slate-400">{FINANCIAL_LABELS.actualIncome}</div>
                <div className="mt-1 text-sm font-semibold text-emerald-300">{primeSum ? formatMoney(primeSum.labels.actualIncome.amount, pageCurrency) : '-'}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                <div className="text-[11px] text-slate-400">{FINANCIAL_LABELS.netCashFlow}</div>
                <div className={`mt-1 text-sm font-semibold ${(primeSum?.labels.netCashFlow.amount ?? 0) >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  {primeSum ? `${primeSum.labels.netCashFlow.amount > 0 ? '+' : ''}${formatMoney(primeSum.labels.netCashFlow.amount, pageCurrency)}` : '-'}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(170px,1fr)_minmax(120px,1fr)_70px_110px_70px_80px_90px] gap-2 border-b border-slate-800 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500">
                <div />
                <div>Category</div>
                <div className="hidden md:block">Bar</div>
                <div className="hidden md:block text-right">% Total</div>
                <div className="text-right">Amount</div>
                <div className="hidden md:block text-right">Trend</div>
                <div className="hidden md:block text-right">Conf</div>
                <div className="hidden md:block text-right">Txns</div>
              </div>

              <div className="max-h-[56vh] overflow-y-auto">
                {isLoading ? (
                  <div className="px-4 py-4 text-sm text-slate-400">Loading category breakdown...</div>
                ) : !primeSum ? (
                  <div className="px-4 py-4"><FinancialStateNotice state={primeFinancial} compact onRetry={primeFinancial.status !== 'loading' ? primeFinancial.refetch : undefined} /></div>
                ) : scopedCategoryEntries.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-slate-400">No transactions available for this scope.</div>
                ) : (
                  scopedCategoryEntries.map((entry) => {
                    const categoryColor = categoryColors[entry.category] || '#8b5cf6';
                    const width = maxBreakdownAmount > 0 ? Math.max(4, (entry.amount / maxBreakdownAmount) * 100) : 0;
                    const isExpanded = expandedCategory === entry.category;
                    const activeTab = expandedTabs[entry.category] || 'subcategories';
                    const categoryTxs = scopedForBreakdown.filter((tx) => (tx.category || 'Uncategorized') === entry.category);
                    // SC-5: grouped and ranked by count only (no hidden spend ranking; amounts are G6).
                    const subcategoryMap = new Map<string, number>();
                    categoryTxs.forEach((tx) => {
                      const sub = String((tx as any).subcategory || 'Unspecified').trim() || 'Unspecified';
                      subcategoryMap.set(sub, (subcategoryMap.get(sub) || 0) + 1);
                    });
                    const subRows = Array.from(subcategoryMap.entries())
                      .map(([subcategory, count]) => ({ subcategory, count }))
                      .sort((a, b) => b.count - a.count || a.subcategory.localeCompare(b.subcategory));
                    const maxSubCount = Math.max(...subRows.map((s) => s.count), 0);
                    const merchantMap = new Map<string, number>();
                    categoryTxs.forEach((tx) => {
                      const merchant = String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase();
                      merchantMap.set(merchant, (merchantMap.get(merchant) || 0) + 1);
                    });
                    const topMerchants = Array.from(merchantMap.entries())
                      .map(([merchant, count]) => ({ merchant, count }))
                      .sort((a, b) => b.count - a.count || a.merchant.localeCompare(b.merchant))
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
                    const maxMerchantCount = Math.max(...topMerchants.map((m) => m.count), 0);
                    const selectedMerchant = selectedMerchantByCategory[entry.category] || topMerchants[0]?.merchant || '';
                    const selectedMerchantTxs = selectedMerchant
                      ? categoryTxs
                          .filter((tx) => String(tx.merchant || tx.description || 'UNKNOWN-MERCHANT').trim().toUpperCase() === selectedMerchant)
                          .slice(0, 6)
                      : [];

                    return (
                      <div key={entry.category} className="border-b border-slate-800/80 last:border-b-0 group">
                        <div
                          className={`grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] md:grid-cols-[36px_minmax(170px,1fr)_minmax(120px,1fr)_70px_110px_70px_80px_90px] items-center gap-2 px-4 py-2 transition-colors ${
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
                          <div className="hidden md:block h-2 rounded-full bg-slate-800">
                            <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: categoryColor }} />
                          </div>
                          <div className="hidden md:block text-right text-sm text-slate-300">{entry.pctOfTotal === null ? '-' : `${entry.pctOfTotal}%`}</div>
                          <div className="text-right text-sm font-medium text-slate-100">{formatMoney(entry.amount, pageCurrency)}</div>
                          {(() => {
                            // FST-2: only the server's coverage-gated category trend; never a browser month comparison.
                            const t = primeSum ? categoryTrend(primeSum.insights, entry.category) : null;
                            return (
                              <div title={t ? (insightText(t, primeSum?.wording) ?? undefined) : 'Not enough statement history to compare'} className={`hidden md:block text-right text-xs ${
                                t?.direction === 'up' ? 'text-red-300' : t?.direction === 'down' ? 'text-emerald-300' : 'text-slate-400'
                              }`}>
                                {t ? `${t.direction === 'up' ? '↑' : '↓'} ${t.percent}%` : '-'}
                              </div>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedInspectorCategory(entry.category);
                              setInspectorMoveCategory(entry.category);
                              setInspectorMoveSubcategory('');
                            }}
                            className={`hidden md:block text-right text-xs ${
                              entry.avgConfidence !== null && entry.avgConfidence < 0.7
                                ? 'text-amber-300 underline decoration-dotted underline-offset-2'
                                : 'text-slate-300'
                            }`}
                            title={
                              entry.avgConfidence !== null && entry.avgConfidence < 0.7
                                ? 'Low confidence - click for Tag explanation'
                                : 'Open Tag inspector'
                            }
                          >
                            {entry.avgConfidence === null || entry.avgConfidence < 0.01
                              ? 'Learning'
                              : `${Math.round(entry.avgConfidence * 100)}%`}
                          </button>
                          <div className="hidden md:block text-right text-sm text-slate-300">{entry.count}</div>
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
                                  const subWidth = maxSubCount > 0 ? Math.max(6, (sub.count / maxSubCount) * 100) : 0;
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
                                      <div className="text-right text-[12px] text-slate-500" title="Amounts by subcategory and merchant are not available yet">-</div>
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
                                  {(() => {
                                    // FST-2: the server's coverage-gated wording only; no "vs last month" from the browser.
                                    const t = primeSum ? categoryTrend(primeSum.insights, entry.category) : null;
                                    return t ? (insightText(t, primeSum?.wording) ?? '') : 'Not enough statement history to compare this category yet.';
                                  })()}{' '}
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
                                  const merchantWidth = maxMerchantCount > 0 ? Math.max(6, (merchantRow.count / maxMerchantCount) * 100) : 0;
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
                                      <div className="text-right text-[12px] text-slate-500" title="Amounts by subcategory and merchant are not available yet">-</div>
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
                {isRunningHandoffTag ? 'Tag running...' : 'Auto-Tag all transactions'}
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
                  {isRunningHandoffTag ? 'Tag AI running...' : 'Run Tag AI pass on all transactions'}
                </button>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={askTag}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Tag
                  </button>
                  <button
                    type="button"
                    onClick={askPrime}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Prime
                  </button>
                  <button
                    type="button"
                    onClick={askCrystal}
                    className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-800"
                  >
                    Ask Crystal
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
                      <div className="mt-1 text-[10px] text-amber-100/80">{item.count} tx · Tag needs confirmation</div>
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
                            {isMerchantApplying === item.merchant ? 'Applying...' : 'Approve'}
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
