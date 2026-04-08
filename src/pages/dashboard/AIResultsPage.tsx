import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

type TxRow = {
  id: string;
  posted_at: string;
  amount: number;
  category: string;
  merchant_name: string;
  category_source: string | null;
  type: string | null;
  import_id: string | null;
};

type ImportRow = {
  id: string;
  created_at: string;
};

type ImportSummaryRow = {
  import_id: string;
  summary_text: string | null;
  created_at: string;
  employee: string | null;
  version: number | null;
};

const INCOME_KEYWORDS = [
  'PAYMENT', 'DEPOSIT', 'COLLECTED', 'INTERAC', 'TRANSFER IN',
  'DIRECT DEP', 'PAYROLL', 'CREDIT', 'REFUND', 'IN&OUT', 'REGISTRY',
];

function monthKey(dateLike: string): string {
  const date = new Date(dateLike);
  if (isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, 1);
  return date.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value || 0);
}

function stripMarkdownNoise(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractPrimeReadNarrative(summaryText: string): string {
  const text = String(summaryText || '');
  if (!text.trim()) return '';
  const primeReadMatch = text.match(/##\s*Prime's Read([\s\S]*?)(?=\n##\s+[A-Za-z]|\s*$)/i);
  const section = primeReadMatch ? primeReadMatch[1] : text;
  const cleaned = stripMarkdownNoise(section)
    .replace(/^Prime verdict:\s*/i, '')
    .replace(/^Summary\s*/i, '')
    .trim();

  const compact = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      const lower = line.toLowerCase();
      if (lower.includes('view this statement in transactions')) return false;
      if (lower.includes('start tag categorization')) return false;
      if (line.startsWith('/dashboard/')) return false;
      if (/\d{4}-\d{2}-\d{2}\s+\|/.test(line)) return false;
      if (lower.startsWith('transactions (cleaned)')) return false;
      return true;
    })
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return compact;
}

function isIncome(tx: TxRow): boolean {
  const merchantUpper = String(tx.merchant_name || '').toUpperCase();
  return tx.category === 'Income'
    || INCOME_KEYWORDS.some((keyword) => merchantUpper.includes(keyword))
    || tx.type === 'credit'
    || tx.type === 'Credit';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AIResultsPage() {
  const { userId } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  const [searchParams, setSearchParams] = useSearchParams();
  const agentSectionRef = useRef<HTMLDivElement | null>(null);
  const selectedScopeFromUrl = searchParams.get('scope') || 'all';
  const showDebug = import.meta.env.DEV && searchParams.get('debugStory') === '1';

  const [selectedScope, setSelectedScope] = useState<string>(selectedScopeFromUrl);
  const [selectedAgent, setSelectedAgent] = useState<'prime' | 'tag' | 'crystal' | 'sage' | 'spark'>('prime');
  const [activeChapter, setActiveChapter] = useState(1);
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [includeInReport, setIncludeInReport] = useState({
    prime: true,
    tag: true,
    crystal: true,
    sage: false,
    txList: true,
    predictions: false,
    yearCompare: false,
  });
  const [sendMode, setSendMode] = useState<null | 'pdf' | 'email' | 'accountant' | 'print'>(null);
  const [primeNoteText, setPrimeNoteText] = useState('');
  const [isSendPanelOpen, setIsSendPanelOpen] = useState(false);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [summaries, setSummaries] = useState<ImportSummaryRow[]>([]);
  const [rulesCount, setRulesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [emailTo, setEmailTo] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedScope === 'all') next.delete('scope');
    else next.set('scope', selectedScope);
    setSearchParams(next, { replace: true });
  }, [selectedScope, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedScopeFromUrl !== selectedScope) {
      setSelectedScope(selectedScopeFromUrl);
    }
  }, [selectedScopeFromUrl]);

  useEffect(() => {
    const run = async () => {
      if (!userId || !supabase) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const [
          { data: txData, error: txErr },
          { data: importData, error: importErr },
          { data: sumData, error: sumErr },
          { count, error: ruleErr },
        ] = await Promise.all([
          supabase
            .from('transactions')
            .select('id, posted_at, amount, category, merchant_name, category_source, type, import_id')
            .eq('user_id', userId)
            .order('posted_at', { ascending: true }),
          supabase
            .from('imports')
            // Keep this schema-safe: some environments do not have file_name on imports.
            .select('id, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('import_summaries')
            .select('import_id, summary_text, created_at, employee, version')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          supabase
            .from('category_rules')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_active', true),
        ]);

        if (txErr) throw txErr;
        if (importErr) throw importErr;
        if (sumErr) throw sumErr;
        if (ruleErr) throw ruleErr;

        const txRows: TxRow[] = (txData || []).map((row: any) => ({
          id: String(row.id),
          posted_at: String(row.posted_at || ''),
          amount: Number(row.amount) || 0,
          category: String(row.category || 'Uncategorized'),
          merchant_name: String(row.merchant_name || ''),
          category_source: row.category_source || null,
          type: row.type || null,
          import_id: row.import_id || null,
        }));
        setTransactions(txRows);
        setImports((importData || []) as ImportRow[]);
        setSummaries((sumData || []) as ImportSummaryRow[]);
        setRulesCount(Number(count || 0));
      } catch (err: any) {
        toast.error(err?.message || 'Failed to load financial story');
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [userId]);

  const monthMap = useMemo(() => {
    const map = new Map<string, TxRow[]>();
    for (const tx of transactions) {
      const key = monthKey(tx.posted_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tx);
    }
    return map;
  }, [transactions]);

  const monthKeys = useMemo(
    () => Array.from(monthMap.keys()).filter((key) => key !== 'unknown').sort(),
    [monthMap]
  );

  useEffect(() => {
    if (selectedScope !== 'all' && !monthKeys.includes(selectedScope)) {
      setSelectedScope('all');
    }
  }, [selectedScope, monthKeys]);

  const scopedTx = useMemo(() => {
    if (selectedScope === 'all') return transactions;
    return monthMap.get(selectedScope) || [];
  }, [transactions, monthMap, selectedScope]);

  const monthlyTotalsByKey = useMemo(() => {
    const out = new Map<string, { income: number; expenses: number; txCount: number }>();
    monthKeys.forEach((key) => {
      const rows = monthMap.get(key) || [];
      let income = 0;
      let expenses = 0;
      for (const tx of rows) {
        if (isIncome(tx)) income += Math.abs(tx.amount);
        else expenses += Math.abs(tx.amount);
      }
      out.set(key, { income, expenses, txCount: rows.length });
    });
    return out;
  }, [monthMap, monthKeys]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const tx of scopedTx) {
      if (isIncome(tx)) totalIncome += Math.abs(tx.amount);
      else totalExpenses += Math.abs(tx.amount);
    }
    return {
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      txCount: scopedTx.length,
    };
  }, [scopedTx]);

  const allTimeStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const tx of transactions) {
      if (isIncome(tx)) totalIncome += Math.abs(tx.amount);
      else totalExpenses += Math.abs(tx.amount);
    }
    const net = totalIncome - totalExpenses;
    return {
      totalIncome,
      totalExpenses,
      net,
      txCount: transactions.length,
      monthCount: monthKeys.length,
      avgMonthlySpend: monthKeys.length ? totalExpenses / monthKeys.length : 0,
      savingsRate: totalIncome > 0 ? (net / totalIncome) * 100 : 0,
    };
  }, [transactions, monthKeys]);

  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of scopedTx) {
      if (isIncome(tx)) continue;
      map.set(tx.category, (map.get(tx.category) || 0) + Math.abs(tx.amount));
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { category: sorted[0][0], amount: sorted[0][1] } : null;
  }, [scopedTx]);

  const timelineByYear = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of monthKeys) {
      const y = key.slice(0, 4);
      const bucket = map.get(y) || [];
      bucket.push(key);
      map.set(y, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [monthKeys]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return labels.map((key) => {
      const t = monthlyTotalsByKey.get(key) || { income: 0, expenses: 0, txCount: 0 };
      return { key, ...t };
    });
  }, [monthlyTotalsByKey]);

  const maxMonthlySpend = Math.max(...monthlyData.map((m) => m.expenses), 1);
  const maxMonthlyIncome = Math.max(...monthlyData.map((m) => m.income), 1);
  const selectedMonthData = monthlyData.find((m) => m.key === selectedScope) || null;

  const uncategorizedCount = useMemo(
    () =>
      scopedTx.filter((tx) => {
        const key = String(tx.category || '').trim().toLowerCase();
        return !key || key === 'other' || key === 'uncategorized';
      }).length,
    [scopedTx]
  );

  const reclassifiedIncomeCount = useMemo(
    () => scopedTx.filter((tx) => (isIncome(tx) && tx.amount < 0) || (!isIncome(tx) && tx.amount > 0)).length,
    [scopedTx]
  );

  const hasPrimeLlmSummary = useMemo(() => {
    if (selectedScope === 'all') {
      return summaries.some((s) => String(s.employee || '').toLowerCase().includes('prime') && !!s.summary_text);
    }
    const scopedImportIds = new Set(scopedTx.map((tx) => String(tx.import_id || '').trim()).filter(Boolean));
    return summaries.some(
      (s) =>
        String(s.employee || '').toLowerCase().includes('prime') &&
        scopedImportIds.has(String(s.import_id || '').trim()) &&
        !!s.summary_text
    );
  }, [selectedScope, summaries, scopedTx]);

  const primeSummary = useMemo(() => {
    const scopedImportIds = new Set(scopedTx.map((tx) => String(tx.import_id || '').trim()).filter(Boolean));
    const primeText = summaries.find(
      (s) =>
        String(s.employee || '').toLowerCase().includes('prime') &&
        scopedImportIds.has(String(s.import_id || '').trim()) &&
        s.summary_text
    )?.summary_text;
    if (primeText) {
      const clean = extractPrimeReadNarrative(primeText);
      if (clean) return clean;
    }
    const scopeLabel = selectedScope === 'all' ? 'this full story period' : monthLabel(selectedScope);
    const grade = allTimeStats.savingsRate > 20 ? 'A' : allTimeStats.savingsRate > 10 ? 'B' : 'C';
    return `Your financial narrative for ${scopeLabel} is a story of ${formatCurrency(totals.totalIncome)} in income against ${formatCurrency(totals.totalExpenses)} in expenses, leaving a net of ${formatCurrency(totals.netSavings)}. ${topCategory ? `${topCategory.category} dominated spending at ${formatCurrency(topCategory.amount)}.` : ''} Overall assessment: ${grade}.`;
  }, [selectedScope, scopedTx, summaries, allTimeStats.savingsRate, totals, topCategory]);

  useEffect(() => {
    setPrimeNoteText(primeSummary);
  }, [primeSummary]);

  const grade = allTimeStats.savingsRate > 20 ? 'A' : allTimeStats.savingsRate > 10 ? 'B' : 'C';
  const yearRange = useMemo(() => {
    if (monthKeys.length === 0) return '-';
    const start = monthKeys[0].slice(0, 4);
    const end = monthKeys[monthKeys.length - 1].slice(0, 4);
    return start === end ? start : `${start} {"->"} ${end}`;
  }, [monthKeys]);

  const storySubtitle =
    allTimeStats.savingsRate > 20 ? 'Building Momentum'
      : allTimeStats.savingsRate > 10 ? 'The Growth Chapter'
      : 'Steady Progress';

  const chapterText = useMemo(() => {
    const fullStory = [
      `Income story: ${formatCurrency(totals.totalIncome)} arrived through this scope, with a cadence that reflects your current inflow pattern.`,
      `Spending story: ${formatCurrency(totals.totalExpenses)} was spent, with ${topCategory?.category || 'no single category'} as the leading driver.`,
      `Pattern story: average monthly spend sits around ${formatCurrency(allTimeStats.avgMonthlySpend)} and current net is ${formatCurrency(totals.netSavings)}.`,
      `Next chapter: protect momentum by tightening ${topCategory?.category || 'top categories'} and reviewing ${uncategorizedCount} uncertain items.`,
    ].join('\n\n');
    if (activeChapter === 2) return `Income story: ${formatCurrency(totals.totalIncome)} arrived through this scope, with a cadence that reflects your current inflow pattern.`;
    if (activeChapter === 3) return `Spending story: ${formatCurrency(totals.totalExpenses)} was spent, with ${topCategory?.category || 'no single category'} as the leading driver.`;
    if (activeChapter === 4) return `Pattern story: average monthly spend sits around ${formatCurrency(allTimeStats.avgMonthlySpend)} and current net is ${formatCurrency(totals.netSavings)}.`;
    if (activeChapter === 5) return `Next chapter: protect momentum by tightening ${topCategory?.category || 'top categories'} and reviewing ${uncategorizedCount} uncertain items.`;
    return fullStory;
  }, [activeChapter, totals, topCategory, allTimeStats.avgMonthlySpend, uncategorizedCount]);

  const approvalItems = useMemo(
    () => [
      {
        id: 'prime-note',
        label: 'Approve Prime advisory note for export',
        pending: hasPrimeLlmSummary,
        icon: '👑',
      },
      {
        id: 'tag-reclassify',
        label: `Approve Tag's reclassification of ${uncategorizedCount} merchants`,
        pending: uncategorizedCount > 0,
        icon: '🏷️',
      },
      {
        id: 'income-split',
        label: 'Confirm income reclassification',
        pending: reclassifiedIncomeCount > 0,
        icon: '💱',
      },
      {
        id: 'predictions-saved',
        label: 'Spending predictions saved',
        pending: false,
        icon: '🔮',
      },
    ],
    [hasPrimeLlmSummary, uncategorizedCount, reclassifiedIncomeCount]
  );

  const pendingApprovals = approvalItems.filter((item) => item.pending && !approvals[item.id]).length;

  const setScope = (scope: string) => setSelectedScope(scope || 'all');

  const exportSection = (key: keyof typeof includeInReport, label: string) => {
    setIncludeInReport((prev) => ({ ...prev, [key]: true }));
    toast.success(`${label} added to report`);
  };

  const openAgent = (agent: 'prime' | 'tag' | 'crystal' | 'sage' | 'spark') => {
    setSelectedAgent(agent);
    const slug =
      agent === 'prime' ? 'prime-boss'
        : agent === 'tag' ? 'tag-ai'
        : agent === 'crystal' ? 'crystal-ai'
        : agent === 'spark' ? 'finley-forecasts'
        : 'prime-boss';
    openChat({
      initialEmployeeSlug: slug,
      force: true,
      context: { page: 'ai-results', data: { scope: selectedScope } },
    });
  };

  const callGenerateReport = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Session expired');
    const response = await fetch('/.netlify/functions/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        scope: selectedScope,
        include: includeInReport,
        primeNote: primeNoteText,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.ok === false) throw new Error(json?.error || 'Report generation failed');
    if (json?.pdfUrl) {
      window.open(String(json.pdfUrl), '_blank');
      return;
    }
    if (json?.html) {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(String(json.html));
        win.document.close();
      } else {
        window.print();
      }
      return;
    }
    window.print();
  };

  const sendReport = async () => {
    if (!sendMode || !supabase) return;
    setIsSending(true);
    try {
      if (sendMode === 'print') {
        window.print();
        return;
      }
      if (sendMode === 'pdf') {
        await callGenerateReport();
        toast.success('Report generated');
        return;
      }
      if (sendMode === 'accountant' && !isValidEmail(emailTo)) {
        throw new Error('Please enter a valid accountant email.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expired');
      const response = await fetch('/.netlify/functions/send-report-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: sendMode,
          to: emailTo || null,
          scope: selectedScope,
          include: includeInReport,
          primeNote: primeNoteText,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.ok === false) throw new Error(json?.error || 'Send failed');
      toast.success(json?.message || (sendMode === 'accountant' ? 'Sent to accountant' : 'Email prepared'));
    } catch (err: any) {
      toast.error(err?.message || 'Send failed');
    } finally {
      setIsSending(false);
    }
  };

  const selectedScopeIdx = monthKeys.indexOf(selectedScope);
  const prevScope = selectedScopeIdx > 0 ? monthKeys[selectedScopeIdx - 1] : null;
  const nextScope = selectedScopeIdx >= 0 && selectedScopeIdx < monthKeys.length - 1 ? monthKeys[selectedScopeIdx + 1] : null;

  const emptyState = !isLoading && transactions.length === 0;

  const agentCards: Array<{
    key: 'prime' | 'tag' | 'crystal' | 'sage' | 'spark';
    title: string;
    role: string;
    avatar: string;
    container: string;
    header: string;
    body: string;
    exportKey: keyof typeof includeInReport;
  }> = [
    {
      key: 'prime',
      title: 'Prime',
      role: 'Advisor',
      avatar: '👑',
      container: 'border-amber-500/20 bg-amber-500/[0.03]',
      header: 'bg-amber-500/[0.05]',
      body: `${selectedScope === 'all' ? 'This period' : monthLabel(selectedScope)} is ${totals.netSavings >= 0 ? 'strong' : 'challenging'} with ${formatCurrency(totals.totalIncome)} in income against ${formatCurrency(totals.totalExpenses)} in expenses. Net is ${formatCurrency(totals.netSavings)}. ${topCategory ? `${topCategory.category} is the key driver at ${formatCurrency(topCategory.amount)}.` : ''} Overall assessment: ${grade}.`,
      exportKey: 'prime',
    },
    {
      key: 'tag',
      title: 'Tag',
      role: 'Categorization',
      avatar: '🏷️',
      container: 'border-violet-500/20 bg-violet-500/[0.02]',
      header: 'bg-violet-500/[0.04]',
      body: `I categorized ${totals.txCount} transactions in this scope. ${uncategorizedCount} remain uncertain. Rules learned: ${rulesCount}.`,
      exportKey: 'tag',
    },
    {
      key: 'crystal',
      title: 'Crystal',
      role: 'Analytics',
      avatar: '💎',
      container: 'border-sky-500/18 bg-sky-500/[0.02]',
      header: 'bg-sky-500/[0.03]',
      body: `Patterns: average monthly spend is ${formatCurrency(allTimeStats.avgMonthlySpend)}. Peak category concentration is ${topCategory?.category || 'n/a'}.`,
      exportKey: 'crystal',
    },
    {
      key: 'sage',
      title: 'Sage',
      role: 'Wellness',
      avatar: '💚',
      container: 'border-emerald-500/18 bg-emerald-500/[0.02]',
      header: 'bg-emerald-500/[0.03]',
      body: `Behavior note: your spending rhythm appears ${allTimeStats.savingsRate > 10 ? 'disciplined' : 'variable'}. Awareness around ${topCategory?.category || 'top categories'} can support better choices.`,
      exportKey: 'sage',
    },
    {
      key: 'spark',
      title: 'Spark',
      role: 'Predictions',
      avatar: '🔮',
      container: 'border-orange-500/18 bg-orange-500/[0.02]',
      header: 'bg-orange-500/[0.03]',
      body: `Projection: based on ${monthKeys.length} months, baseline monthly spend is ${formatCurrency(allTimeStats.avgMonthlySpend)} if current trend continues.`,
      exportKey: 'predictions',
    },
  ];

  const center = (
    <div className="p-4" style={{ backgroundColor: '#070a12' }}>
      <style>{`
        @media print {
          aside, [data-floating-rail], .no-print, button, select { display:none !important; }
          body, .print-surface { background:#fff !important; color:#111 !important; border-color:#ddd !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`story-skeleton-${idx}`} className="h-28 animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.03]" />
          ))}
        </div>
      ) : emptyState ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          <div className="text-2xl font-bold text-white">My Financial Story</div>
          <div className="mt-2 text-sm text-slate-400">Upload your first statement to begin your financial story.</div>
          <button
            type="button"
            onClick={() => openChat({ initialEmployeeSlug: 'byte-docs', force: true })}
            className="mt-4 rounded-xl border border-violet-500/35 bg-violet-500/15 px-4 py-2 text-sm text-violet-200"
          >
            Upload statement
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-4 max-[1200px]:flex-col">
          <div className="flex-1 space-y-5">
            <section className="flex items-start justify-between">
              <div>
                <h1 className="text-[22px] font-bold tracking-tight text-white">My Financial Story</h1>
                <div className="mt-1.5 text-[12px] text-slate-500">
                  Narrated by Prime · {imports.length} statements · {transactions.length} transactions
                </div>
              </div>
              <div className="no-print flex items-center gap-2">
                <select
                  value={selectedScope}
                  onChange={(e) => setScope(e.target.value)}
                  className="cursor-pointer rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[11px] text-slate-300"
                >
                  <option value="all">Full story</option>
                  {monthKeys.map((key) => (
                    <option key={`scope-${key}`} value={key}>
                      {monthLabel(key)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setIsSendPanelOpen(true);
                    setSendMode('pdf');
                  }}
                  className="rounded-xl border border-white/[0.1] px-3 py-2 text-[11px] text-slate-300"
                >
                  Export story
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSendPanelOpen(true);
                    setSendMode('email');
                  }}
                  className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-[11px] text-violet-200"
                >
                  📧 Send
                </button>
              </div>
            </section>

            <section className="print-surface rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/12 to-indigo-500/8 p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="text-[28px] font-extrabold tracking-tight text-white">{yearRange}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {imports.length} statements imported · {monthKeys.length} months
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/15 px-4 py-2 text-center">
                  <div className="text-[22px] font-bold text-emerald-300">{grade}</div>
                  <div className="text-[10px] text-emerald-400">Financial health</div>
                </div>
              </div>

              <div className="rounded-xl border-l-4 border-violet-500/50 bg-black/25 p-4">
                <div className="mb-2 text-[11px] font-bold text-amber-400">👑 Prime</div>
                <textarea
                  value={primeNoteText}
                  onChange={(e) => setPrimeNoteText(e.target.value)}
                  rows={4}
                  className="w-full resize-y bg-transparent text-[13px] leading-[1.85] text-slate-300 outline-none"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                {[
                  ['Total income', formatCurrency(allTimeStats.totalIncome), 'text-emerald-400'],
                  ['Total expenses', formatCurrency(allTimeStats.totalExpenses), 'text-red-400'],
                  ['Net saved', `${allTimeStats.net >= 0 ? '+' : '-'}${formatCurrency(Math.abs(allTimeStats.net))}`, allTimeStats.net >= 0 ? 'text-emerald-400' : 'text-red-400'],
                  ['Transactions', String(allTimeStats.txCount), 'text-violet-300'],
                  ['Statements', String(imports.length), 'text-amber-400'],
                ].map(([label, value, cls]) => (
                  <div key={`stat-${label}`} className="rounded-xl bg-black/30 p-3 text-center">
                    <div className={`text-[18px] font-bold ${cls}`}>{value}</div>
                    <div className="mt-1 text-[9px] uppercase text-slate-600">{label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="mb-5 flex items-center justify-between">
                <div className="text-[13px] font-semibold text-white">Monthly spending</div>
                <div className="text-[10px] text-slate-700">Click any month to drill in</div>
              </div>
              <div className="grid grid-cols-12 gap-2">
                {monthlyData.map((month) => {
                  const expenseHeight = Math.max((month.expenses / maxMonthlySpend) * 70, month.txCount ? 4 : 0);
                  const incomeHeight = Math.max((month.income / maxMonthlyIncome) * 20, month.txCount ? 2 : 0);
                  const selected = selectedScope === month.key;
                  return (
                    <button
                      key={`heatmap-${month.key}`}
                      type="button"
                      onClick={() => {
                        setScope(month.key);
                        agentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="group flex flex-col items-center gap-1.5"
                    >
                      <div className="text-[9px] font-semibold uppercase text-slate-700">
                        {new Date(`${month.key}-01`).toLocaleDateString('en-CA', { month: 'short' })}
                      </div>
                      <div className="flex h-[90px] w-full flex-col items-center justify-end gap-1">
                        <div className="w-[55%] rounded-t-sm bg-emerald-500/30" style={{ height: `${incomeHeight}px` }} />
                        <div
                          className={`w-full rounded-t transition-transform group-hover:scale-y-[1.03] ${month.txCount ? 'bg-violet-500' : 'bg-white/[0.05]'} ${selected ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-transparent' : ''}`}
                          style={{ height: `${expenseHeight}px` }}
                        />
                      </div>
                      <div className="text-[8px] text-slate-700">{month.txCount ? `$${Math.round(month.expenses / 1000)}k` : ''}</div>
                    </button>
                  );
                })}
              </div>
              {selectedMonthData && (
                <div className="mt-3 text-[10px] text-slate-700">
                  {monthLabel(selectedMonthData.key)} · {formatCurrency(selectedMonthData.expenses)} spent · {formatCurrency(selectedMonthData.income)} income · {selectedMonthData.txCount} transactions
                </div>
              )}
            </section>

            {selectedScope !== 'all' && selectedMonthData && (
              <section className="rounded-xl border border-violet-500/20 bg-violet-500/[0.07] px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-violet-300">Showing: {monthLabel(selectedScope)}</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {selectedMonthData.txCount} transactions · {formatCurrency(selectedMonthData.expenses)} spent · {formatCurrency(selectedMonthData.income)} income
                    </div>
                  </div>
                  <div className="no-print flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!prevScope}
                      onClick={() => prevScope && setScope(prevScope)}
                      className="text-[10px] text-violet-400 disabled:opacity-40"
                    >
                      ← Previous
                    </button>
                    <button
                      type="button"
                      disabled={!nextScope}
                      onClick={() => nextScope && setScope(nextScope)}
                      className="text-[10px] text-violet-400 disabled:opacity-40"
                    >
                      Next {"->"}
                    </button>
                    <button type="button" onClick={() => setScope('all')} className="text-[10px] text-violet-400">
                      Clear · show full story
                    </button>
                  </div>
                </div>
              </section>
            )}

            <section ref={agentSectionRef}>
              <div className="mb-4 flex items-center gap-3">
                <div className="text-[13px] font-semibold text-white">
                  {selectedScope === 'all' ? 'Full story' : monthLabel(selectedScope)} · AI Team analysis
                </div>
                <div className="h-px flex-1 bg-white/[0.05]" />
              </div>
              {agentCards.map((card, idx) => {
                const isPrime = idx === 0;
                const expanded = isPrime || selectedAgent === card.key;
                return (
                  <div key={`agent-card-${card.key}`} className={`mb-4 overflow-hidden rounded-2xl border ${card.container}`}>
                    <div className={`flex items-center justify-between px-4 py-3 ${card.header}`}>
                      <button
                        type="button"
                        onClick={() => setSelectedAgent(card.key)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span>{card.avatar}</span>
                        <div>
                          <div className="text-[13px] font-semibold text-white">{card.title}</div>
                          <div className="text-[10px] text-slate-500">{card.role}</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => exportSection(card.exportKey, `${card.title} section`)}
                        className="text-[10px] text-slate-600 hover:text-slate-400"
                      >
                        Export {"->"}
                      </button>
                    </div>
                    {expanded && (
                      <div className="px-4 py-3 text-[12px] leading-[1.85] text-slate-400">
                        {card.key === 'prime' ? primeNoteText : card.body}
                        <div className="no-print mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openAgent(card.key)}
                            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-slate-300"
                          >
                            Ask {card.title}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSection('txList', 'Transactions list')}
                            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-slate-300"
                          >
                            Add to PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            {approvalItems.some((item) => item.pending) && (
              <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
                  <div className="text-[13px] font-semibold text-white">Approvals</div>
                  <div className={`rounded px-2 py-0.5 text-[10px] ${pendingApprovals > 0 ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                    {pendingApprovals} pending
                  </div>
                </div>
                {approvalItems.map((item) => {
                  const approved = approvals[item.id] || !item.pending;
                  return (
                    <div key={`approval-${item.id}`} className={`flex items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 last:border-b-0 ${approved ? 'opacity-50' : ''}`}>
                      <div className="text-[18px]">{item.icon}</div>
                      <div className="flex-1 text-[12px] text-slate-500">
                        <span className="text-slate-300">{item.label}</span>
                      </div>
                      {approved ? (
                        <div className="text-[10px] text-emerald-400">✓ Approved</div>
                      ) : (
                        <div className="flex items-center gap-2 no-print">
                          <button
                            type="button"
                            onClick={() => setApprovals((prev) => ({ ...prev, [item.id]: true }))}
                            className="rounded-lg border border-emerald-500/25 bg-emerald-500/12 px-3 py-1.5 text-[10px] text-emerald-400"
                          >
                            Approve
                          </button>
                          <button type="button" className="px-2 text-[10px] text-red-400/60 hover:text-red-400">
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] to-emerald-500/[0.04] p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="text-[17px] font-bold text-white">📖 The {yearRange} Story: {storySubtitle}</div>
                  <div className="mt-1 text-[10px] text-slate-600">A narrative by Prime · Updated with every statement</div>
                </div>
                <div className="no-print flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendPanelOpen(true);
                      setSendMode('pdf');
                    }}
                    className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-slate-300"
                  >
                    Export
                  </button>
                  <button type="button" onClick={() => toast('Podcast draft request sent')} className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-[11px] text-slate-300">
                    🎙️ Podcast
                  </button>
                </div>
              </div>
              <div className="mb-5 flex flex-wrap gap-2">
                {['Full story', 'Ch.1: The Income', 'Ch.2: The Spending', 'Ch.3: The Patterns', "Ch.4: What's Next"].map((label, idx) => (
                  <button
                    key={`chapter-${label}`}
                    type="button"
                    onClick={() => setActiveChapter(idx + 1)}
                    className={`rounded-full px-3 py-1.5 text-[10px] ${activeChapter === idx + 1 ? 'border border-violet-500/40 bg-violet-500/18 text-violet-200' : 'border border-white/[0.07] bg-white/[0.03] text-slate-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-[1.95] text-slate-400">{chapterText}</div>
              <div className="no-print mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => openAgent('prime')} className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-[11px] text-violet-200">
                  Continue story {"->"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSendPanelOpen(true);
                    setSendMode('pdf');
                  }}
                  className="rounded-xl border border-white/[0.1] px-3 py-2 text-[11px] text-slate-300"
                >
                  Export story
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSendPanelOpen(true);
                    setSendMode('email');
                  }}
                  className="rounded-xl border border-white/[0.1] px-3 py-2 text-[11px] text-slate-300"
                >
                  📧 Send to email
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="mb-4 text-[13px] font-semibold text-white">Year Scenes · click any to enter</div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {monthlyData.filter((month) => month.txCount > 0).map((month) => (
                  <button
                    key={`scene-${month.key}`}
                    type="button"
                    onClick={() => {
                      setScope(month.key);
                      agentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-[140px] shrink-0 rounded-xl border border-white/[0.07] bg-black/30 p-3 text-left transition-all hover:border-violet-500/30 hover:bg-violet-500/[0.05]"
                  >
                    <div className="text-[11px] font-bold text-white">
                      {new Date(`${month.key}-01`).toLocaleDateString('en-CA', { month: 'short' })}
                    </div>
                    <div className="text-[9px] text-slate-600">{month.key.slice(0, 4)}</div>
                    <div className="my-2 flex h-[28px] items-end gap-0.5">
                      {[0.4, 0.8, 0.6, 1].map((factor, idx) => (
                        <div
                          key={`scene-bar-${month.key}-${idx}`}
                          className="w-2 rounded-sm bg-violet-500/60"
                          style={{ height: `${Math.max(4, (month.expenses / maxMonthlySpend) * 18 * factor)}px` }}
                        />
                      ))}
                    </div>
                    <div className="text-[13px] font-bold text-slate-200">{formatCurrency(month.expenses)}</div>
                    <div className={`text-[10px] ${month.income - month.expenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {month.income - month.expenses >= 0 ? '+' : '-'}{formatCurrency(Math.abs(month.income - month.expenses))}
                    </div>
                    <div className="mt-1 truncate text-[9px] text-slate-600">{topCategory?.category || 'Story scene'}</div>
                  </button>
                ))}
              </div>
            </section>

            <section className="no-print rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-center">
              <div className="text-[16px] font-bold text-white">
                📊 Generate {selectedScope === 'all' ? 'Full Story' : monthLabel(selectedScope)} Report
              </div>
              <div className="mt-1 text-[12px] text-violet-200">Prime will compile all AI insights into a branded PDF.</div>
              <button
                type="button"
                onClick={() => {
                  setIsSendPanelOpen(true);
                  setSendMode('pdf');
                }}
                className="mt-3 rounded-xl bg-black/30 px-5 py-2 text-[12px] font-semibold text-white"
              >
                Generate report
              </button>
            </section>

            {showDebug && (
              <section className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] text-amber-200">
                <div>Debug Story Check</div>
                <div>Scope: {selectedScope}</div>
                <div>Scoped tx: {totals.txCount}</div>
                <div>Income: {formatCurrency(totals.totalIncome)}</div>
                <div>Expenses: {formatCurrency(totals.totalExpenses)}</div>
                <div>Net: {formatCurrency(totals.netSavings)}</div>
              </section>
            )}
          </div>

          <div className="w-[300px] max-[1200px]:w-full">
            <div className="sticky top-4 space-y-3 max-[1200px]:static">
              <div className="print-surface overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827]">
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/50 px-3 py-2">
                  <div className="text-[10px] text-slate-600">
                    📄 {selectedScope === 'all' ? 'Full story' : monthLabel(selectedScope)} · Live preview
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={`page-${n}`} className={`rounded px-1.5 py-0.5 text-[9px] ${n === 1 ? 'bg-violet-500/20 text-violet-300' : 'bg-white/[0.03] text-slate-600'}`}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="mb-3 rounded-lg bg-gradient-to-r from-violet-600/40 to-indigo-600/30 p-3">
                    <div className="text-sm font-bold text-white">XspensesAI</div>
                    <div className="text-[10px] text-violet-200">Statement Report</div>
                  </div>
                  <div className="mb-3 grid grid-cols-2 gap-1.5 text-[9px]">
                    <div className="rounded bg-white/[0.04] p-2 text-emerald-300">Income {formatCurrency(totals.totalIncome)}</div>
                    <div className="rounded bg-white/[0.04] p-2 text-red-300">Expenses {formatCurrency(totals.totalExpenses)}</div>
                    <div className="rounded bg-white/[0.04] p-2 text-violet-300">Txns {totals.txCount}</div>
                    <div className="rounded bg-white/[0.04] p-2 text-slate-200">Net {formatCurrency(totals.netSavings)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSendMode('pdf');
                      void sendReport();
                    }}
                    className="no-print w-full rounded-md bg-violet-600/70 px-3 py-2 text-[11px] font-semibold text-white"
                  >
                    ⬇️ Download PDF
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <div className="text-[12px] font-semibold text-white">Include in report</div>
                  <div className="text-[10px] text-slate-600">Toggle sections</div>
                </div>
                {[
                  ['prime', 'Prime advisory note'],
                  ['tag', 'Tag category breakdown'],
                  ['crystal', 'Crystal analytics'],
                  ['sage', 'Sage wellness notes'],
                  ['txList', 'All transactions list'],
                  ['predictions', 'Spending predictions'],
                  ['yearCompare', 'Year comparison'],
                ].map(([key, label]) => (
                  <div key={`toggle-${key}`} className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5 text-[12px] text-slate-500 last:border-b-0">
                    <span>{label}</span>
                    <button
                      type="button"
                      onClick={() => setIncludeInReport((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                      className={`relative h-4 w-8 rounded-full border transition-colors ${includeInReport[key as keyof typeof includeInReport] ? 'border-violet-500/60 bg-violet-500/50' : 'border-white/10 bg-white/[0.06]'}`}
                    >
                      <span className={`absolute top-[3px] h-2.5 w-2.5 rounded-full transition-all ${includeInReport[key as keyof typeof includeInReport] ? 'right-[3px] bg-violet-300' : 'left-[3px] bg-slate-600'}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                <div className="border-b border-white/[0.06] px-4 py-3 text-[12px] font-semibold text-white">Send & publish</div>
                {[
                  ['accountant', '🤝', 'Send to accountant', 'Prime writes cover note · PDF + CSV'],
                  ['email', '📧', 'Email to myself', 'Sent to your account email'],
                  ['pdf', '📁', 'Save to documents', 'Stored by year and month'],
                  ['print', '🖨️', 'Print', 'Print-optimized layout'],
                ].map(([mode, icon, title, sub]) => (
                  <button
                    key={`send-option-${mode}`}
                    type="button"
                    onClick={() => {
                      setIsSendPanelOpen(true);
                      setSendMode(mode as 'accountant' | 'email' | 'pdf' | 'print');
                    }}
                    className="no-print flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-3 text-left hover:bg-white/[0.025]"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.03] text-[16px]">{icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-slate-200">{title}</div>
                      <div className="mt-0.5 text-[10px] text-slate-600">{sub}</div>
                    </div>
                    <span className="rounded px-2 py-0.5 text-[9px] font-bold text-emerald-300">Ready</span>
                  </button>
                ))}
                <div className="no-print p-3">
                  <button
                    type="button"
                    onClick={() => void sendReport()}
                    disabled={!sendMode || isSending}
                    className="w-full rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-2 text-[11px] font-semibold text-violet-200 disabled:opacity-50"
                  >
                    {isSending ? 'Working...' : `Run ${sendMode || 'send'} action`}
                  </button>
                </div>
              </div>

              {isSendPanelOpen && sendMode === 'accountant' && (
                <div className="rounded-2xl border border-emerald-500/18 bg-emerald-500/[0.05] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[12px] font-semibold text-emerald-300">📬 Send to accountant</div>
                    <button type="button" onClick={() => setIsSendPanelOpen(false)} className="no-print text-[11px] text-slate-600">
                      ✕
                    </button>
                  </div>
                  <input
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="Accountant email address..."
                    className="mb-2 w-full rounded-xl border border-emerald-500/20 bg-black/25 px-3 py-2 text-[11px] text-slate-200"
                  />
                  <div className="mb-3 rounded-xl border-l-2 border-emerald-500/30 bg-black/30 p-3 text-[11px] italic leading-6 text-slate-600">
                    Prime cover: I am sending {selectedScope === 'all' ? 'the full story' : monthLabel(selectedScope)} report.
                    Income {formatCurrency(totals.totalIncome)}. Expenses {formatCurrency(totals.totalExpenses)}.
                    Net {formatCurrency(totals.netSavings)}. {uncategorizedCount} items are flagged for review.
                  </div>
                  <button
                    type="button"
                    onClick={() => void sendReport()}
                    disabled={isSending}
                    className="no-print w-full rounded-xl bg-emerald-600/70 px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    {isSending ? 'Sending...' : 'Send now'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return <DashboardPageShell center={center} />;
}

