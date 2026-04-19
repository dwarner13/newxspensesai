import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useSetAtom } from 'jotai';
import { Search, ChevronRight, ChevronDown, ArrowDownLeft, ArrowUpRight, TrendingDown, Hash, Upload, Download, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useImportList } from '@/hooks/useImportList';
import { useUnifiedChatLauncher } from '@/hooks/useUnifiedChatLauncher';
import { isPrimeBriefingOpenAtom } from '@/lib/uiStore';
import { TransactionInsightDrawer } from '@/components/transactions/TransactionInsightDrawer';
import type { CommittedTransaction } from '@/types/transactions';
import { getSupabase } from '@/lib/supabase';
import { TagCopilotPanel } from '@/components/transactions/TagCopilotPanel';
import { AgentFloatingBubble } from '@/components/ui/AgentFloatingBubble';
import { useProfile } from '@/hooks/useProfile';

const CAT_COLORS: Record<string, string> = {
  'Personal Care': '#ec4899', Subscriptions: '#818cf8', Shopping: '#a78bfa',
  Groceries: '#fbbf24', 'Food & Dining': '#fb923c', Transportation: '#38bdf8',
  Healthcare: '#f87171', 'Bank Fees': '#94a3b8', Income: '#34d399', Other: '#475569',
};
const CAT_ICONS: Record<string, string> = {
  'Personal Care': '\u2728', Subscriptions: '\ud83d\udd01', Shopping: '\ud83d\udecd\ufe0f',
  Groceries: '\ud83e\uded2', 'Food & Dining': '\ud83c\udf7d\ufe0f', Transportation: '\ud83d\ude97',
  Healthcare: '\ud83c\udfe5', 'Bank Fees': '\ud83c\udfe6', Income: '\ud83d\udcb0',
  Other: '\ud83d\udcc1', Uncategorized: '\u2753',
};
const colorFor = (c?: string) => CAT_COLORS[c || ''] || '#475569';
const iconFor = (c?: string) => CAT_ICONS[c || ''] || '\ud83d\udcc1';

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncomeTx(t: CommittedTransaction): boolean {
  const cat = (t.category || '').toLowerCase();
  const merchant = (t.merchant_name || '').toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || '').toLowerCase();
  // type field is set by commit-import from balance-delta math — most reliable signal.
  // Always trust it when present so "Debit Card Purchase, FLAME & BARREL" (type=expense)
  // never shows as income even if category_rules tagged the merchant as Business Income.
  if (txType === 'income') return true;
  if (txType === 'expense') return false;
  // Fallback when type field is not set (older imports)
  return cat === 'income' || cat === 'business income' || INCOME_PATTERNS.test(merchant);
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  if (!d) return "Unknown Date";
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export default function TransactionsPageV2() {
  const location = useLocation();
  const { fullName } = useProfile();
  const firstName = fullName?.split(' ')[0] || '';
  // Read import_id, issuer, and openTag from URL synchronously so the initial
  // filter + Tag panel state are in sync on mount (no flicker).
  const initialParams = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const result = {
        importId: sp.get('import_id') || sp.get('importId') || null,
        issuer: sp.get('issuer') || null,
        openTag: sp.get('openTag') === '1',
      };
      // [DIAG] First render URL snapshot — proves whether params survived navigation
      console.log('[TxPage] [DIAG] initialParams read:', {
        rawSearch: window.location.search,
        rawPathname: window.location.pathname,
        parsed: result,
      });
      return result;
    } catch { return { importId: null, issuer: null, openTag: false }; }
  })();
  const { transactions, isLoading, refetch } = useTransactions();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await refetch?.(); } finally { setTimeout(() => setIsRefreshing(false), 600); }
  }, [isRefreshing, refetch]);
  const { imports } = useImportList();
  const { openChat } = useUnifiedChatLauncher();
  const [filter, setFilter] = useState<'all' | 'expenses' | 'income'>('all');
  const listRef = useRef<HTMLDivElement>(null);
  const [statementFilter, setStatementFilter] = useState<string>(initialParams.importId || 'all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>(initialParams.issuer || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagFilterLabel, setTagFilterLabel] = useState('');
  const [tagCategoryFilter, setTagCategoryFilter] = useState('');
  const [tagSubcategoryFilter, setTagSubcategoryFilter] = useState('');
  const txListRef = (typeof window !== 'undefined') ? { current: null } : { current: null };
  const [selectedTx, setSelectedTx] = useState<CommittedTransaction | null>(null);
  const [tagInsight, setTagInsight] = useState<{ category?: string; categorySource?: string; confidence?: number; message?: string } | null>(null);
  const [tagInsightLoading, setTagInsightLoading] = useState(false);
  const [tagPanelOpen, setTagPanelOpen] = useState(initialParams.openTag);
  const [tagPanelTx, setTagPanelTx] = useState<CommittedTransaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(100);
  const [tagBadgeCount, setTagBadgeCount] = useState(0);
  const [tagInboxData, setTagInboxData] = useState<any>(null);
  const [tagActivityOpen, setTagActivityOpen] = useState(false);
  const [lastBulkAction, setLastBulkAction] = useState<{ ids: string[]; previousCategory: string } | null>(null);
  const [pendingSweep, setPendingSweep] = useState<any>(null);
  const [badgePulse, setBadgePulse] = useState(false);
  const [reclassifyPreview, setReclassifyPreview] = useState<any>(null);
  const [tagInjectedMsg, setTagInjectedMsg] = useState<string | null>(null);
  const [tagFollowupMerchants, setTagFollowupMerchants] = useState<any[] | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showProcessingBanner, setShowProcessingBanner] = useState(false);
  useEffect(() => {
    // [DIAG] Effect-time URL snapshot — after router has processed navigation
    console.log('[TxPage] [DIAG] first useEffect fired:', {
      searchParamsString: searchParams.toString(),
      importId: searchParams.get('import_id') || searchParams.get('importId'),
      openTag: searchParams.get('openTag'),
      from: searchParams.get('from'),
      currentStatementFilter: statementFilter,
    });
    if (searchParams.get("from") === "upload") {
      setShowProcessingBanner(true);
      // Preserve issuer param when clearing "from"
      setSearchParams(p => { p.delete("from"); return p; }, { replace: true });
      // Auto-dismiss banner after 12 seconds
      setTimeout(() => setShowProcessingBanner(false), 12000);
    }
    const filterParam = searchParams.get("filter");
    if (filterParam === "income") setFilter("income");
    else if (filterParam === "expenses") setFilter("expenses");
    // Handle ?issuer= param (from upload redirect or bookmarks)
    const issuerParam = searchParams.get("issuer");
    if (issuerParam) {
      setIssuerFilter(issuerParam);
    }
    // Handle import_id from StatementProcessingOverlay (uses underscore) AND
    // legacy importId (camelCase) from other navigation sources
    const importIdParam = searchParams.get("import_id") || searchParams.get("importId");
    if (importIdParam) {
      console.log('[TxPage] [DIAG] applying import_id filter:', importIdParam);
      setStatementFilter(importIdParam);
      // NOTE: Don't strip import_id/importId from URL here. A parent component
      // (suspected route config with location-dependent `key`) remounts this
      // component on URL changes, which resets statementFilter to 'all' and
      // collapses the scoped view. Keeping the param in URL also makes scoped
      // views refresh-safe and bookmarkable. Tracked as tech debt to find the
      // remount trigger in the routing layer.
    } else {
      console.log('[TxPage] [DIAG] NO import_id in URL — staying on global view');
    }
    // Strip ?openTag=1 from URL after consumption (state was set synchronously in
    // the useState initializer above, so we just need to clean the URL).
    // NOTE: URL strip disabled — parent route remounts on URL change (see
    // import_id note above). Leaving openTag=1 in the URL is harmless; the
    // synchronous useState initializer reads it once and tagPanelOpen state
    // owns the panel visibility from there.
    // if (searchParams.get("openTag")) {
    //   setSearchParams(p => { p.delete("openTag"); return p; }, { replace: true });
    // }
    // Auto-open drawer from tag-inbox Answer button
    const autoOpenId = searchParams.get("autoOpen");
    if (autoOpenId) {
      const waitForTx = () => {
        const tx = transactions.find(t => t.id === autoOpenId);
        if (tx) { setSelectedTx(tx); void fetchTagInsight(tx); }
      };
      setTimeout(waitForTx, 500);
    }
    const searchParam = searchParams.get("search");
    if (searchParam) setSearchQuery(searchParam);

    const categoryParam = searchParams.get("category");
    if (categoryParam) { setTagCategoryFilter(categoryParam); setTagFilterLabel(categoryParam); }

    const subcategoryParam = searchParams.get("subcategory");
    if (subcategoryParam) { setTagSubcategoryFilter(subcategoryParam); setTagFilterLabel(subcategoryParam); }
  }, []);
  // Refetch on window focus AND on a 'transactions:refresh' custom event
  // fired by Tag after any write (rule save, bulk apply, delete rule).
  // NOT on a timer - polling was causing scroll jumps.
  useEffect(() => {
    const handler = () => { void refetch(); };
    window.addEventListener('focus', handler);
    window.addEventListener('transactions:refresh', handler);
    return () => {
      window.removeEventListener('focus', handler);
      window.removeEventListener('transactions:refresh', handler);
    };
  }, [refetch]);
  // Tell badge consumers the data is live on mount
  useEffect(() => { try { window.dispatchEvent(new Event('tag:stats-refresh')); } catch { /* noop */ } }, []);

  // Sweep apply/dismiss
  const applySweepFromChat = useCallback(async (payload: any) => {
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const res = await fetch('/.netlify/functions/tag-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ intent: 'bulk_apply', groups: (payload.confident_groups ?? []).map((g: any) => ({ ids: g.ids, category: g.category })) }),
      });
      const d = await res.json();
      if (d.ok) { toast.success(`Tag categorized ${d.applied} transactions`); void dismissSweep(); void refetch(); void fetchTagInbox(); }
    } catch { toast.error('Could not apply'); }
  }, []);
  const dismissSweep = useCallback(async () => {
    if (!pendingSweep) return;
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      await fetch('/.netlify/functions/tag-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ id: pendingSweep.id }),
      });
    } catch { /* silent */ }
    setPendingSweep(null);
  }, [pendingSweep]);

  // Fetch tag inbox for badge count
  const fetchTagInbox = useCallback(async () => {
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const res = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) { const d = await res.json(); setTagInboxData(d); setTagBadgeCount(d.badge_count ?? 0); }
    } catch { /* silent */ }
  }, []);
  useEffect(() => { fetchTagInbox(); }, [fetchTagInbox]);

  // Poll for Tag sweep notifications
  const checkTagNotifications = useCallback(async () => {
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const res = await fetch('/.netlify/functions/tag-notifications', { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const d = await res.json();
      const sweepNotif = d.notifications?.find((n: any) => n.type === 'sweep_result' || n.type === 'import_complete');
      if (sweepNotif && !pendingSweep) {
        setPendingSweep(sweepNotif);
        setBadgePulse(true);
        setTimeout(() => setBadgePulse(false), 3000);
        // Auto-open Tag panel and inject the report
        if (sweepNotif.type === 'import_complete') {
          setTagPanelOpen(true);
          const p = sweepNotif.payload;
          const hasFollowup = p?.needs_input_count > 0;
          setTagInjectedMsg(sweepNotif.message);
          if (hasFollowup) {
            // Delay followup fetch so report shows first
            setTimeout(async () => {
              try {
                const inboxRes = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
                const inboxD = await inboxRes.json();
                setTagFollowupMerchants((inboxD.unresolved ?? []).slice(0, 8));
              } catch { /* silent */ }
            }, 1200);
          }
        }
      }
    } catch { /* silent */ }
  }, [pendingSweep]);
  useEffect(() => {
    checkTagNotifications();
    const interval = setInterval(checkTagNotifications, 30000);
    return () => clearInterval(interval);
  }, [checkTagNotifications]);

  const handleUpload = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      context: { data: { source: 'transactions-upload', intent: 'upload' } },
      routeHint: '/dashboard/prime-chat',
    });
    window.setTimeout(() => {
      const inputs = Array.from(
        document.querySelectorAll('input[type="file"][accept*=".pdf"][accept*=".csv"]')
      ) as HTMLInputElement[];
      const el = inputs.find(i => !i.disabled);
      el?.click();
    }, 120);
  }, [openChat]);

  const setIsPrimeBriefingOpen = useSetAtom(isPrimeBriefingOpenAtom);
  const handleOpenPrime = useCallback(() => {
    setIsPrimeBriefingOpen(true);
  }, [setIsPrimeBriefingOpen]);

  const fetchTagInsight = useCallback(async (tx: CommittedTransaction) => {
    setTagInsight(null);
    setTagInsightLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch(`/.netlify/functions/tag-explain`, {
        method: `POST`,
        headers: { 'content-type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ transactionId: tx.id }),
      });
      if (res.ok) setTagInsight(await res.json());
    } catch { /* silent */ } finally { setTagInsightLoading(false); }
  }, []);

  // Account membership: importId -> accountId (computed before `filtered`)
  type AccountCard = {
    id: string;
    name: string;
    type: 'Credit Card' | 'Chequing';
    statementCount: number;
    importIds: string[];
    totalSpent: number;
    totalIncome: number;
    uncategorizedCount: number;
  };
  const accounts: AccountCard[] = useMemo(() => {
    const detectIssuer = (imp: any): string => {
      const fromCol = String(imp?.issuer || '').trim();
      if (fromCol) return fromCol;
      const raw = String(imp?.docName || imp?.file_name || '').toUpperCase();
      if (/\bBMO\b/.test(raw)) return 'BMO';
      if (/\bTD\b/.test(raw)) return 'TD';
      if (/\bRBC\b|ROYAL BANK/.test(raw)) return 'RBC';
      if (/\bCIBC\b/.test(raw)) return 'CIBC';
      if (/SCOTIA/.test(raw)) return 'Scotiabank';
      if (/TANGERINE/.test(raw)) return 'Tangerine';
      if (/AMEX|AMERICAN EXPRESS/.test(raw)) return 'Amex';
      if (/CANADIAN TIRE|TRIANGLE/.test(raw)) return 'Canadian Tire';
      if (/MBNA/.test(raw)) return 'MBNA';
      if (/CAPITAL ONE/.test(raw)) return 'Capital One';
      return 'BMO'; // default for current corpus
    };
    const detectType = (imp: any): 'Credit Card' | 'Chequing' => {
      const raw = String(imp?.docName || imp?.file_name || '').toLowerCase();
      if (/credit|visa|mastercard|amex|mc\b|cc\b|triangle/.test(raw)) return 'Credit Card';
      return 'Chequing';
    };
    const groups = new Map<string, AccountCard>();
    imports
      .filter(i => i.status === 'committed')
      .forEach(i => {
        const issuer = detectIssuer(i);
        const type = detectType(i);
        const key = `${issuer}|${type}`;
        let g = groups.get(key);
        if (!g) {
          g = {
            id: key,
            name: `${issuer} ${type === 'Credit Card' ? 'Credit' : 'Chequing'}`,
            type,
            statementCount: 0,
            importIds: [],
            totalSpent: 0,
            totalIncome: 0,
            uncategorizedCount: 0,
          };
          groups.set(key, g);
        }
        g.statementCount += 1;
        g.importIds.push(i.id);
      });
    const byImportId = new Map<string, AccountCard>();
    for (const a of groups.values()) {
      for (const tid of a.importIds) byImportId.set(tid, a);
    }
    transactions.forEach(t => {
      const a = byImportId.get(t.import_id || '');
      if (!a) return;
      if (isIncomeTx(t)) a.totalIncome += Math.abs(t.amount);
      else a.totalSpent += Math.abs(t.amount);
      if (!t.category || t.category === 'Uncategorized' || t.category === 'Other') {
        a.uncategorizedCount += 1;
      }
    });
    return Array.from(groups.values()).sort((a, b) => b.statementCount - a.statementCount);
  }, [imports, transactions]);

  // Resolve ?issuer= URL param into an accountFilter once accounts are loaded
  useEffect(() => {
    if (!issuerFilter || accounts.length === 0) return;
    const match = accounts.find(a => a.name.toLowerCase().includes(issuerFilter.toLowerCase()));
    if (match) {
      setAccountFilter(match.id);
      setIssuerFilter(''); // consumed — don't re-trigger
    }
  }, [issuerFilter, accounts]);

  // Filtering
  const filtered = useMemo(() => {
    let list = transactions;
    if (filter === 'expenses') list = list.filter(t => !isIncomeTx(t));
    else if (filter === 'income') list = list.filter(t => isIncomeTx(t));
    if (statementFilter !== 'all') list = list.filter(t => t.import_id === statementFilter);
    if (accountFilter !== 'all') {
      const acct = accounts.find(a => a.id === accountFilter);
      if (acct) {
        const ids = new Set(acct.importIds);
        list = list.filter(t => ids.has(t.import_id || ''));
      }
    }
    if (tagCategoryFilter) {
      list = list.filter(t => (t.category || '').toLowerCase() === tagCategoryFilter.toLowerCase());
    }
    if (tagSubcategoryFilter) {
      list = list.filter(t => (t.subcategory || '').toLowerCase().includes(tagSubcategoryFilter.toLowerCase()));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => {
        const tx = t as Record<string, unknown>;
        return (t.merchant_name || '').toLowerCase().includes(q)
          || String(tx.merchant || '').toLowerCase().includes(q)
          || String(tx.description || '').toLowerCase().includes(q)
          || (t.category || '').toLowerCase().includes(q)
          || String(t.subcategory || '').toLowerCase().includes(q)
          || String(t.amount).includes(q);
      });
    }
    return [...list].sort((a, b) => (b.date || b.posted_at || '').localeCompare(a.date || a.posted_at || ''));
  }, [transactions, filter, statementFilter, accountFilter, accounts, searchQuery, tagCategoryFilter, tagSubcategoryFilter]);

  const handleExport = useCallback(() => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = filtered.map(t => [
      t.date || t.posted_at?.slice(0, 10) || '',
      escape(t.merchant_name || 'Unknown'),
      (isIncomeTx(t) ? '' : '-') + Math.abs(t.amount).toFixed(2),
      escape(t.category || 'Uncategorized'),
      escape(t.import_id || ''),
    ].join(','));
    const csv = ['Date,Merchant,Amount,Category,Statement Source', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  // Duplicate detector — any tx flagged by the drawer's "Mark Duplicate"
  const isDuplicate = (t: CommittedTransaction): boolean =>
    ((t as any).is_duplicate === true) || (t.category === 'Duplicate');

  // Stats — computed from filtered list, duplicates excluded
  const totalSpent = useMemo(() => filtered.reduce((s, t) => (!isIncomeTx(t) && !isDuplicate(t)) ? s + Math.abs(t.amount) : s, 0), [filtered]);
  const totalIncome = useMemo(() => filtered.reduce((s, t) => (isIncomeTx(t) && !isDuplicate(t)) ? s + Math.abs(t.amount) : s, 0), [filtered]);
  const netFlow = totalIncome - totalSpent;

  // Category data for donut — duplicates excluded
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(t => { if (!isIncomeTx(t) && !isDuplicate(t)) map[t.category || 'Other'] = (map[t.category || 'Other'] || 0) + Math.abs(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);
  const catTotal = catData.reduce((s, d) => s + d.value, 0);

  // Statement options for dropdown (each individual import with filename)
  const stmtOptions = useMemo(() => {
    return imports
      .filter(i => i.status === 'committed')
      .map(i => {
        let label = i.docName || '';
        // Strip file extension for cleaner display
        label = label.replace(/\.[a-z0-9]+$/i, '');
        if (!label || label === 'Statement') {
          // Fallback to date if no filename
          const d = new Date(i.created_at);
          label = `Statement � ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return { id: i.id, label };
      });
  }, [imports]);
  const [stmtDropdownOpen, setStmtDropdownOpen] = useState(false);

  // AI insights � from filtered
  const insights = useMemo(() => {
    const uncatCount = filtered.filter(t => !t.category || t.category === 'Uncategorized').length;
    const catCount = filtered.length - uncatCount;
    const topCat = catData[0];
    const topPct = topCat && catTotal > 0 ? ((topCat.value / catTotal) * 100).toFixed(0) : '0';
    const merchantCounts: Record<string, number> = {};
    filtered.forEach(t => { if (t.merchant_name) merchantCounts[t.merchant_name] = (merchantCounts[t.merchant_name] || 0) + 1; });
    const recurring = Object.entries(merchantCounts).find(([, c]) => c >= 2);
    return [
      { agent: 'Tag', color: '#34d399', title: `${catCount} categorized, ${uncatCount} need review`, detail: uncatCount > 0 ? 'Tap uncategorized rows to assign categories' : 'All transactions categorized' },
      { agent: 'Crystal', color: '#ec4899', title: `Top: ${topCat?.name || 'N/A'} at ${topPct}%`, detail: topCat ? `$${fmt(topCat.value)} spent in ${topCat.name}` : 'No spending data yet' },
      { agent: 'Chime', color: '#fbbf24', title: recurring ? `${recurring[0]} appears ${recurring[1]}x` : 'No recurring detected', detail: recurring ? 'Possible recurring charge detected' : 'Upload more statements for patterns' },
    ];
  }, [filtered, catData, catTotal]);

  // Date groups
  const dateGroups = useMemo(() => {
    const visible = filtered.slice(0, visibleCount);
    const groups: { date: string; label: string; txs: CommittedTransaction[] }[] = [];
    let unknownLogged = false;
    visible.forEach(t => {
      const d = (t.date || t.posted_at || (t as any).transaction_date || (t as any).txn_date || "").slice(0, 10);
      if (!d && !unknownLogged) {
        unknownLogged = true;
        console.log('[TransactionsPageV2] Unknown Date transaction - available fields:', {
          id: t.id, date: t.date, posted_at: t.posted_at,
          transaction_date: (t as any).transaction_date, txn_date: (t as any).txn_date,
          created_at: (t as any).created_at, merchant: t.merchant_name,
          keys: Object.keys(t),
        });
      }
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.txs.push(t);
      else groups.push({ date: d, label: d ? fmtDate(d) : "Unknown Date", txs: [t] });
    });
    return groups;
  }, [filtered, visibleCount]);

  const uncategorizedCount = filtered.filter(t => !t.category || t.category === 'Uncategorized').length;
  const isStatementMode = statementFilter !== 'all';
  const activeStatement = isStatementMode ? stmtOptions.find(s => s.id === statementFilter) : null;
  const activeStatementLabel = activeStatement?.label || 'Statement';

  if (isLoading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.1)' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#22d3ee', animation: 'spin 0.8s linear infinite' }} />
      </div>
      <div style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>Loading transactions...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      {showProcessingBanner && (
        <div style={{ background: "linear-gradient(135deg, #0f1f38, #0b1a30)", border: "1px solid #22d3ee44", borderRadius: 14, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, maxWidth: 1100, margin: "0 auto 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#22d3ee18", border: "1.5px solid #22d3ee44", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>?</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#22d3ee" }}>Your statement is processing</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Transactions will appear within a moment � no need to refresh.</div>
            </div>
          </div>
          <button onClick={() => setShowProcessingBanner(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>?</button>
        </div>
      )}
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-3">
          <div>
            {isStatementMode ? (
              <div>
                <button
                  onClick={() => { setStatementFilter('all'); setAccountFilter('all'); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px 0', letterSpacing: 0.2 }}
                >
                  ← All Transactions
                </button>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: '#e8ecf4', margin: 0, lineHeight: 1.2 }}>{activeStatementLabel}</h1>
                <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0', fontWeight: 500 }}>
                  {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                </p>
              </div>
            ) : (
              <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: '#e8ecf4', margin: 0 }}>Transactions</h1>
            )}
            <style>{`.acct-scroll::-webkit-scrollbar{display:none}`}</style>
            {!isStatementMode && <div
              className="acct-scroll mt-3"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: 12,
                paddingBottom: 4,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {(() => {
                const allSpent = accounts.reduce((s, a) => s + a.totalSpent, 0);
                const allIncome = accounts.reduce((s, a) => s + a.totalIncome, 0);
                const allStmts = accounts.reduce((s, a) => s + a.statementCount, 0);
                const allUncat = accounts.reduce((s, a) => s + a.uncategorizedCount, 0);
                const cards: Array<AccountCard | { id: 'all' | 'add'; kind: 'all' | 'add' }> = [
                  { id: 'all', kind: 'all' } as any,
                  ...accounts,
                  { id: 'add', kind: 'add' } as any,
                ];
                return cards.map((c) => {
                  const isAll = (c as any).kind === 'all';
                  const isAdd = (c as any).kind === 'add';
                  const active = accountFilter === (isAll ? 'all' : (c as AccountCard).id);
                  if (isAdd) {
                    return (
                      <button
                        key="add"
                        onClick={handleUpload}
                        className="rounded-xl border border-dashed text-left transition-colors"
                        style={{
                          flex: '0 0 180px',
                          width: 180,
                          flexShrink: 0,
                          padding: '12px 14px',
                          borderColor: '#334155',
                          background: 'rgba(15,23,42,0.4)',
                          color: '#94a3b8',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700 }}>+ Add account</div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>Upload a statement</div>
                      </button>
                    );
                  }
                  const a = isAll
                    ? { id: 'all', name: 'All accounts', type: '', statementCount: allStmts, totalSpent: allSpent, totalIncome: allIncome, uncategorizedCount: allUncat }
                    : (c as AccountCard);
                  const badge = a.uncategorizedCount > 0
                    ? { text: `${a.uncategorizedCount} to review`, bg: 'rgba(251,191,36,0.15)', fg: '#fbbf24' }
                    : { text: 'Books clean', bg: 'rgba(52,211,153,0.15)', fg: '#34d399' };
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setAccountFilter(a.id);
                        // Update URL so the filter is bookmarkable
                        const sp = new URLSearchParams(window.location.search);
                        if (a.id === 'all') { sp.delete('issuer'); }
                        else {
                          // Extract issuer name from account id (format: "BMO|Chequing")
                          const issuerName = a.id.split('|')[0] || '';
                          sp.set('issuer', issuerName);
                        }
                        sp.delete('import_id'); sp.delete('importId');
                        const qs = sp.toString();
                        window.history.replaceState({}, '', `${window.location.pathname}${qs ? '?' + qs : ''}`);
                      }}
                      className="rounded-xl text-left transition-colors"
                      style={{
                        flex: '0 0 180px',
                        width: 180,
                        flexShrink: 0,
                        padding: '12px 14px',
                        border: active ? '2px solid #22d3ee' : '1px solid rgba(148,163,184,0.2)',
                        background: 'rgba(15,23,42,0.6)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#e8ecf4', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                          {a.type && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}>{a.type}</div>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 999, background: badge.bg, color: badge.fg, whiteSpace: 'nowrap' }}>{badge.text}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-3" style={{ fontSize: 11 }}>
                        <div>
                          <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Spent</div>
                          <div style={{ color: '#f87171', fontWeight: 700 }}>${fmt(a.totalSpent)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#64748b', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Income</div>
                          <div style={{ color: '#34d399', fontWeight: 700 }}>${fmt(a.totalIncome)}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 6 }}>{a.statementCount} statement{a.statementCount !== 1 ? 's' : ''}</div>
                    </button>
                  );
                });
              })()}
            </div>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={isRefreshing} title="Refresh data" className={`flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg transition-colors ${isRefreshing ? 'opacity-60 cursor-wait' : 'hover:bg-slate-700/50'}`}>
              <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`} style={{ fontSize: 15, lineHeight: 1 }}>↻</span>
              {isRefreshing ? 'Refreshing' : 'Refresh'}
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"><Download className="h-4 w-4" />Export</button>
            <button onClick={handleUpload} className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-400 hover:to-orange-400 transition-colors"><Upload className="h-4 w-4" />Upload</button>
          </div>
        </div>

        {/* STAT CARDS — hidden in statement mode */}
        {!isStatementMode && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Spent', value: `$${fmt(totalSpent)}`, color: 'text-red-400', icon: <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />, tab: 'expenses' as const },
            { label: 'Total Income', value: `$${fmt(totalIncome)}`, color: 'text-emerald-400', icon: <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" />, tab: 'income' as const },
            { label: 'Net Flow', value: `${netFlow >= 0 ? '+' : '-'}$${fmt(Math.abs(netFlow))}`, color: netFlow >= 0 ? 'text-emerald-400' : 'text-amber-400', icon: <TrendingDown className="h-3.5 w-3.5 text-amber-400" />, tab: 'all' as const },
            { label: 'Transactions', value: String(filtered.length), color: 'text-white', icon: <Hash className="h-3.5 w-3.5 text-white" />, tab: 'all' as const },
          ].map(c => (
            <div key={c.label} onClick={() => { setFilter(c.tab); setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 hover:border-[#2d4a6e] hover:shadow-lg transition-all cursor-pointer" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-bold">{c.label}</span>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800/60">{c.icon}</div>
              </div>
              <div className={`text-[18px] md:text-[26px] font-extrabold ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>}

        {/* TWO COLUMN: Donut + AI Insights — hidden in statement mode */}
        {!isStatementMode && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {/* Donut */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Spending by category</div>
            <div className="flex items-center gap-4">
              <div className="relative w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={catData.length ? catData : [{ name: 'None', value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                    {(catData.length ? catData : [{ name: 'None', value: 1 }]).map((d, i) => <Cell key={i} fill={colorFor(d.name)} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[17px] font-extrabold text-white">${fmt(catTotal)}</span>
                  <span className="text-[9px] uppercase text-slate-500">total</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                {catData.slice(0, 6).map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: colorFor(d.name) }} />
                    <span className="text-[12px] text-slate-400 truncate flex-1">{d.name}</span>
                    <span className="text-[12px] font-bold text-slate-300">${fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* AI Insights */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15"><Star className="h-3 w-3 text-amber-400" /></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AI insights</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                  <div className="w-1 rounded-full shrink-0" style={{ background: ins.color }} />
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded mb-1" style={{ background: ins.color + '20', color: ins.color }}>{ins.agent}</span>
                    <div className="text-[13px] font-semibold text-slate-200">{ins.title}</div>
                    <div className="text-[11px] text-slate-500">{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>}

        {/* FILTER BAR */}
        <div ref={listRef} className="flex items-center justify-between mb-5">
          <div className="flex p-1 rounded-lg bg-slate-800/40 border border-slate-700/30">
            {(['all', 'expenses', 'income'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 text-[13px] font-bold rounded-md transition-colors ${filter === f ? 'bg-slate-700/60 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            {/* In statement mode hide the dropdown — the header already shows the name */}
            {!isStatementMode && <button
              onClick={() => setStmtDropdownOpen(v => !v)}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold rounded-lg border text-slate-400 bg-slate-800/40 border-slate-700/30 hover:text-slate-300 transition-colors"
            >
              <span className="truncate max-w-[200px]">All Statements</span>
              <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${stmtDropdownOpen ? 'rotate-180' : ''}`} />
            </button>}
            {stmtDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setStmtDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[260px] max-h-[320px] overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900 shadow-xl">
                  <button
                    onClick={() => { setStatementFilter('all'); setStmtDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-[13px] font-semibold border-b border-slate-800/60 transition-colors ${
                      statementFilter === 'all' ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    All Statements
                    <span className="ml-2 text-[11px] text-slate-500">{transactions.length} txns</span>
                  </button>
                  {stmtOptions.map(s => {
                    const count = transactions.filter(t => t.import_id === s.id).length;
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setStatementFilter(s.id); setStmtDropdownOpen(false); }}
                        className={`w-full text-left px-4 py-3 text-[13px] border-b border-slate-800/40 last:border-b-0 transition-colors ${
                          statementFilter === s.id ? 'text-indigo-300 bg-indigo-500/10 font-semibold' : 'text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="truncate">{s.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{count} transaction{count !== 1 ? 's' : ''}</div>
                      </button>
                    );
                  })}
                  {stmtOptions.length === 0 && (
                    <div className="px-4 py-3 text-[13px] text-slate-500">No committed statements</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/30">
          {/* Search */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60">
            <Search className="h-4 w-4 text-slate-500 shrink-0" />
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setTagFilterLabel(''); setTagCategoryFilter(''); setTagSubcategoryFilter(''); } }} placeholder="Search merchants, categories..." className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder:text-slate-600 outline-none" />
          </div>

          {/* Tag filter chip */}
          <div id="tx-list-anchor" />
          {tagFilterLabel && (searchQuery === tagFilterLabel || tagCategoryFilter || tagSubcategoryFilter) && (
            <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-800/60 bg-cyan-500/5">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                <span style={{ fontSize: 9, fontWeight: 700, color: '#22d3ee', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{tagSubcategoryFilter && !tagCategoryFilter ? '📊 TAX' : 'TAG'}</span>
                <span style={{ fontSize: 12, color: '#e8ecf4', fontWeight: 600 }}>{tagFilterLabel}</span>
                <button onClick={() => { setSearchQuery(''); setTagFilterLabel(''); setTagCategoryFilter(''); setTagSubcategoryFilter(''); }}
                  style={{ marginLeft: 2, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
              </div>
              <span style={{ fontSize: 11, color: '#475569' }}>{tagSubcategoryFilter && !tagCategoryFilter ? 'Filtered from Tax Summary' : 'Tag filtered your results'}</span>
            </div>
          )}

          {/* Review banner */}
          {uncategorizedCount > 0 && (
            <div className="mx-4 mt-4 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-amber-400" /></span>
                <span className="text-[13px] text-amber-200">Tag found <strong>{uncategorizedCount}</strong> transaction{uncategorizedCount !== 1 ? 's' : ''} that need review</span>
              </div>
              <button onClick={() => setFilter('all')} className="px-3 py-1.5 text-[12px] font-bold text-amber-900 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors">Review</button>
            </div>
          )}

          {/* Date groups */}
          {/* Loading spinner — shown when data is still loading regardless of filter */}
          {dateGroups.length === 0 && isLoading && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 40, height: 40 }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(34,211,238,0.1)' }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#22d3ee', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf4' }}>Loading transactions...</div>
              {statementFilter !== 'all' && (
                <div style={{ fontSize: 12, color: '#64748b' }}>Your statement was just processed — rows will appear in a moment.</div>
              )}
            </div>
          )}
          {/* Empty state for import_id filter — data loaded but 0 results */}
          {dateGroups.length === 0 && !isLoading && statementFilter !== 'all' && (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 32 }}>📭</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf4' }}>No transactions found for this import</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>The statement may still be processing, or transactions haven't been committed yet.</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                <button onClick={() => { void refetch(); }} style={{ fontSize: 12, color: '#22d3ee', background: 'none', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>Retry</button>
                <button onClick={() => setStatementFilter('all')} style={{ fontSize: 12, color: '#22d3ee', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>View all transactions instead</button>
              </div>
            </div>
          )}
          {dateGroups.length === 0 && statementFilter === 'all' && !isLoading && (
            <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 14, color: '#475569' }}>
              No transactions found. Upload a statement to get started.
            </div>
          )}
          {dateGroups.map(g => (
            <div key={g.date}>
              <div className="flex items-center gap-3 pt-6 pb-2 px-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 whitespace-nowrap">{g.label}</span>
                <div className="flex-1 h-px bg-slate-800/60" />
                <span className="text-[11px] text-slate-600">{g.txs.length}</span>
              </div>
              {g.txs.map(t => {
                const cat = t.category || 'Uncategorized';
                const isUncat = !t.category || t.category === 'Uncategorized';
                const isIncome = isIncomeTx(t);
                const isDupe = isDuplicate(t);
                const c = colorFor(cat);
                return (
                  <button key={t.id} onClick={() => { setSelectedTx(t); setTagInsight(null); void fetchTagInsight(t); }} className="w-full flex items-center gap-4 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-left" style={isDupe ? { background: 'rgba(248,113,113,0.08)', borderLeft: '3px solid rgba(248,113,113,0.55)' } : undefined}>
                    <div className="relative flex items-center justify-center h-[44px] w-[44px] rounded-xl shrink-0" style={{ background: c + '2e', border: `1px solid ${c}40` }}>
                      <span className="text-base">{iconFor(cat)}</span>
                      {isUncat && <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-amber-400" /></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-slate-100 truncate flex items-center gap-2">
                        <span className="truncate">{t.merchant_name || 'Unknown'}</span>
                        {isDupe && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', letterSpacing: 0.5, flexShrink: 0 }}>DUPE</span>}
                      </div>
                      {isUncat ? <div className="text-[12px] text-amber-400 flex items-center gap-1"><span className="relative flex h-1.5 w-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" /></span>Needs category</div>
                        : <div className="text-[12px] text-slate-500">{cat}{t.subcategory ? ` \u00b7 ${t.subcategory}` : ''}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[16px] font-bold tabular-nums ${isDupe ? 'text-red-400 line-through opacity-60' : isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>{isIncome ? '+' : '-'}${fmt(Math.abs(t.amount))}</div>
                      <div className="text-[11px] text-slate-500">{(t.date || t.posted_at || '').slice(0, 10)}</div>
                    </div>
                    {(t as any).category_source === 'user_chat' && (
                      <span title="Tag changed this category" style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', border: '1px solid rgba(34,211,153,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}

          {/* Load more */}
          {filtered.length > visibleCount && (
            <button onClick={() => setVisibleCount(v => v + 30)} className="w-full py-3 text-[13px] font-bold text-slate-400 border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors rounded-b-xl">Load more transactions</button>
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-[14px]">No transactions found</div>
          )}
        </div>
      </div>

      {/* Tag floating bubble */}
      {!tagPanelOpen && !selectedTx && location.pathname.includes('/transactions') && createPortal(
        <AgentFloatingBubble letter="T" color="#22d3ee" colorTo="#0891b2" onClick={() => setTagPanelOpen(true)} label="Open Tag Copilot" badgeCount={tagBadgeCount} pulse={badgePulse} />,
        document.body
      )}

      {/* Tag Activity Panel */}
      {tagActivityOpen && (
        <>
          <div onClick={() => setTagActivityOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 55 }} />
          <div style={{ position: "fixed", bottom: "calc(140px + env(safe-area-inset-bottom, 0px))", right: 20, width: 340, maxHeight: "65vh", overflowY: "auto", background: "#111a2e", border: "1px solid #1e2d4a", borderRadius: 16, zIndex: 56, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e2d4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>Tag Activity</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setTagActivityOpen(false)} style={{ fontSize: 11, fontWeight: 600, color: "#22d3ee", background: "none", border: "none", cursor: "pointer" }}>Close</button>
                <button onClick={() => setTagActivityOpen(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16 }}>{"\u2715"}</button>
              </div>
            </div>

            {tagInboxData?.unresolved?.length > 0 && (
              <div>
                <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em" }}>Needs Your Input</div>
                {tagInboxData.unresolved.slice(0, 8).map((item: any) => (
                  <div key={item.merchant_name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.merchant_name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.transaction_count} txns &middot; ${item.total_amount.toFixed(2)}</div>
                    </div>
                    <button onClick={() => { setTagActivityOpen(false); setSearchQuery(item.merchant_name); setTimeout(() => { const tx = transactions.find(t => (t.merchant_name || '').toLowerCase() === item.merchant_name.toLowerCase()); if (tx) { setSelectedTx(tx); void fetchTagInsight(tx); } }, 100); }} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.25)", color: "#22d3ee", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>Answer</button>
                  </div>
                ))}
              </div>
            )}

            {tagInboxData?.resolved?.length > 0 && (
              <div>
                <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.1em" }}>Recently Handled</div>
                {tagInboxData.resolved.map((rule: any, i: number) => (
                  <div key={i} style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#34d399" }}>{"\u2713"} {rule.match_value}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>Saved as {rule.category}</div>
                  </div>
                ))}
              </div>
            )}

            {tagInboxData?.imports?.length > 0 && (
              <div>
                <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Import History</div>
                {tagInboxData.imports.map((imp: any) => (
                  <div key={imp.id} style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{imp.filename}</div>
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{imp.total_count} transactions</div>
                  </div>
                ))}
              </div>
            )}

            {tagInboxData?.rule_suggestions?.length > 0 && (
              <div>
                <div style={{ padding: "10px 16px 6px", fontSize: 10, fontWeight: 700, color: "#c8a64e", textTransform: "uppercase", letterSpacing: "0.1em" }}>{"\uD83D\uDCA1"} Suggested Rules</div>
                {tagInboxData.rule_suggestions.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#c8d0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.merchant_name}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>{s.category} &middot; {s.count}x &middot; {s.consistency}%</div>
                    </div>
                    <button onClick={async () => { try { const sb = getSupabase(); if (!sb) return; const { data: { session } } = await sb.auth.getSession(); if (!session) return; await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'save_rule', matchValue: s.merchant_name, targetCategory: s.category, matchType: 'contains' }) }); void fetchTagInbox(); } catch {} }} style={{ padding: "4px 10px", borderRadius: 16, fontSize: 10, fontWeight: 700, background: "rgba(200,166,78,0.12)", border: "1px solid rgba(200,166,78,0.25)", color: "#c8a64e", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>Save</button>
                  </div>
                ))}
              </div>
            )}

            {tagInboxData?.badge_count === 0 && !tagInboxData?.rule_suggestions?.length && (
              <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 12 }}>All caught up {"\u2713"}</div>
            )}
          </div>
        </>
      )}
      {/* Sweep notification banner inside Tag panel */}
      {tagPanelOpen && pendingSweep && (() => {
        const p = pendingSweep.payload || {};
        const lines = (p.confident_groups ?? []).slice(0, 4).map((g: any) => `\u2713 ${g.merchant_name} \u00d7${g.count} \u2192 ${g.category}`);
        return (
          <div style={{ position: 'fixed', top: 0, right: 0, width: 380, zIndex: 72, padding: '12px 16px', background: '#0d1a2d', borderBottom: '1px solid rgba(34,211,238,0.2)', borderLeft: '1px solid rgba(34,211,153,0.15)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ flex: 1, fontSize: 12, color: '#c8d0e0', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Import scan complete</div>
                {lines.map((l: string, i: number) => <div key={i}>{l}</div>)}
                {(p.confident_groups ?? []).length > 4 && <div style={{ color: '#475569' }}>+ {p.confident_groups.length - 4} more</div>}
                {p.unsure_count > 0 && <div style={{ color: '#64748b', marginTop: 2 }}>{'\u26A0'} {p.unsure_count} need your input</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => void applySweepFromChat(p)} style={{ padding: '5px 14px', borderRadius: 16, fontSize: 11, fontWeight: 700, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', cursor: 'pointer' }}>Apply {p.confident_count} {'\u2192'}</button>
              <button onClick={() => void dismissSweep()} style={{ padding: '5px 14px', borderRadius: 16, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', cursor: 'pointer' }}>Skip</button>
            </div>
          </div>
        );
      })()}
      {/* Reclassify preview banner */}
      {tagPanelOpen && reclassifyPreview && (() => {
        const d = reclassifyPreview;
        const topGroups = (d.confident_groups ?? []).slice(0, 5);
        const more = (d.confident_groups?.length ?? 0) - 5;
        return (
          <div style={{ position: 'fixed', top: 0, right: 0, width: 380, zIndex: 72, padding: '12px 16px', background: '#0d1a2d', borderBottom: '1px solid rgba(34,211,238,0.2)', borderLeft: '1px solid rgba(34,211,153,0.15)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</div>
              <div style={{ flex: 1, fontSize: 12, color: '#c8d0e0', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Scanned {d.total_scanned} transactions</div>
                {topGroups.map((g: any, i: number) => <div key={i}>{'\u2022'} {g.merchant_name} \u00d7{g.count} \u2192 {g.category}</div>)}
                {more > 0 && <div style={{ color: '#475569' }}>...and {more} more</div>}
                <div style={{ marginTop: 4 }}><strong style={{ color: '#22d3ee' }}>{d.confident_count}</strong> confident, <strong style={{ color: '#64748b' }}>{d.needs_review_count}</strong> need your input</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={async () => {
                try {
                  const sb = getSupabase(); if (!sb) return;
                  const { data: { session } } = await sb.auth.getSession(); if (!session) return;
                  const res = await fetch('/.netlify/functions/tag-reclassify-other', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
                  const result = await res.json();
                  if (result.ok) {
                    setReclassifyPreview(null);
                    setTagInjectedMsg(`Done \u2713 \u2014 ${result.reclassified} transactions categorized.`);
                    void refetch(); void fetchTagInbox();
                    // Proactive followup for unsure merchants
                    if (result.needs_review > 0) {
                      setTimeout(async () => {
                        try {
                          const inboxRes = await fetch('/.netlify/functions/tag-inbox', { headers: { Authorization: `Bearer ${session.access_token}` } });
                          const inboxD = await inboxRes.json();
                          const topM = (inboxD.unresolved ?? []).slice(0, 5);
                          if (topM.length > 0) {
                            const lines = topM.map((m: any) => `\u2022 **${m.merchant_name}** \u00d7${m.transaction_count}`).join('\n');
                            setTagInjectedMsg(`I still have **${result.needs_review} transactions** that need your input. The biggest:\n\n${lines}\n\nWant to work through them now?`);
                            setTagFollowupMerchants(topM);
                          }
                        } catch { /* silent */ }
                      }, 1000);
                    }
                  }
                } catch { toast.error('Failed'); }
              }} style={{ padding: '5px 14px', borderRadius: 16, fontSize: 11, fontWeight: 700, background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', color: '#22d3ee', cursor: 'pointer' }}>Apply {d.confident_count} {'\u2192'}</button>
              <button onClick={() => setReclassifyPreview(null)} style={{ padding: '5px 14px', borderRadius: 16, fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569', cursor: 'pointer' }}>Skip</button>
            </div>
          </div>
        );
      })()}
      {tagPanelOpen && createPortal(<TagCopilotPanel transaction={tagPanelTx} selectedTransaction={selectedTx} totalCount={transactions.length} firstName={firstName} totalSpent={totalSpent} totalIncome={totalIncome} netFlow={netFlow} importId={isStatementMode ? statementFilter : undefined} importLabel={isStatementMode ? activeStatementLabel : undefined} importTxCount={isStatementMode ? filtered.length : undefined} injectedMessage={tagInjectedMsg} injectedFollowupMerchants={tagFollowupMerchants} onMerchantCategorize={async (merchantName, category) => {
        try {
          const sb = getSupabase(); if (!sb) return;
          const { data: { session } } = await sb.auth.getSession(); if (!session) return;
          const { data: matching } = await sb.from('transactions').select('id').ilike('merchant_name', `%${merchantName}%`).or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
          const ids = matching?.map(t => t.id) ?? [];
          if (ids.length > 0) {
            await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'bulk_apply', groups: [{ ids, category }] }) });
            await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'save_rule', matchValue: merchantName, targetCategory: category, matchType: 'contains' }) });
          }
          void refetch(); void fetchTagInbox();
        } catch { /* silent */ }
      }} onClose={() => { setTagPanelOpen(false); setTagPanelTx(null); setTagInjectedMsg(null); setTagFollowupMerchants(null); }} onCategoryUpdated={() => { void refetch(); void fetchTagInbox(); }} onToggleActivity={() => setTagActivityOpen(v => !v)} onTagAction={async (action) => {
        if (action.type === 'handoff') {
          const slugMap: Record<string, string> = {
            'prime-boss': 'prime-boss', 'prime': 'prime-boss',
            'byte-docs': 'byte-docs', 'byte': 'byte-docs',
            'goalie-goals': 'goalie-goals', 'goalie': 'goalie-goals',
            'finley-forecasts': 'finley-forecasts', 'finley': 'finley-forecasts',
            'crystal-analytics': 'crystal-analytics', 'crystal': 'crystal-analytics',
            'ledger-tax': 'ledger-tax', 'ledger': 'ledger-tax',
            'tag-ai': 'tag-ai', 'tag': 'tag-ai',
          };
          const targetSlug = slugMap[action.to || ''] || 'prime-boss';
          setTagPanelOpen(false);
          setTagPanelTx(null);
          setTimeout(() => {
            openChat({
              initialEmployeeSlug: targetSlug,
              initialQuestion: action.reason || undefined,
              force: true,
            });
          }, 300);
          return;
        }
        else if (action.type === 'filter') {
          console.log('[onTagAction] filter fired:', action);
          // Strip conversational noise from search term
          const rawQ = (action.search || '').trim();
          const cleanQ = rawQ.replace(/^(show me all of the|show me all of|show me all|show me|find me all|find all|all the|all)\s+/i, '').replace(/\s+(transactions?|purchases?|charges?)\s*$/i, '').trim();
          // Only apply if it looks like a real merchant/category (not a question/sentence)
          const questionWords = /^(how|can|what|where|when|why|who|is|are|do|does|show|find|get|them|there|all|my)\b/i;
          if (cleanQ.length > 40 || questionWords.test(cleanQ) || cleanQ.split(' ').length > 3) return;
          setStatementFilter('all');
          setFilter('all');
          const sp = new URLSearchParams(window.location.search);
          if (sp.has('importId') || sp.has('category') || sp.has('filter')) {
            sp.delete('importId'); sp.delete('category'); sp.delete('filter');
            const clean = sp.toString();
            window.history.replaceState({}, '', clean ? `?${clean}` : window.location.pathname);
          }
          setTimeout(() => setSearchQuery(cleanQ), 50);
          // Auto-close Tag panel then scroll to results
          setTimeout(() => { setTagPanelOpen(false); setTagPanelTx(null); }, 800);
          setTimeout(() => { document.getElementById('tx-list-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 1000);
          setTagCategoryFilter(action.category || '');
          setTagSubcategoryFilter(action.subcategory || '');
          const label = action.category || action.subcategory || cleanQ;
          setTagFilterLabel(label);
          setTimeout(() => { document.getElementById('tx-list-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
        }
        else if (action.type === 'update_transaction' && action.id && action.category) {
          try {
            const sb = getSupabase(); if (!sb) return;
            const { data: { session: s } } = await sb.auth.getSession(); if (!s) return;
            const payload: Record<string, unknown> = { category: action.category, category_source: 'user_chat', updated_at: new Date().toISOString() };
            if (action.subcategory) payload.subcategory = action.subcategory;
            if (action.merchant) { payload.merchant_name = action.merchant; payload.merchant = action.merchant; }
            await sb.from('transactions').update(payload).eq('id', action.id).eq('user_id', s.user.id);
            // Save rule if merchant is known
            if (action.saveRule && (action.merchant || selectedTx?.merchant_name)) {
              const pattern = (action.merchant || selectedTx?.merchant_name || '').toUpperCase();
              if (pattern) {
                await sb.from('category_rules').upsert({
                  user_id: s.user.id, match_value: pattern, merchant_pattern: pattern, match_type: 'contains',
                  category: action.category, subcategory: action.subcategory || null, is_active: true, updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,match_type,match_value' }).catch(() => {});
              }
            }
            // Flash the row briefly
            const el = document.getElementById(`tx-row-${action.id}`);
            if (el) { el.style.transition = 'background 0.3s'; el.style.background = 'rgba(34,211,238,0.12)'; setTimeout(() => { el.style.background = ''; }, 1500); }
            void refetch(); void fetchTagInbox();
            // Update selectedTx in drawer if it matches
            if (selectedTx?.id === action.id) {
              setSelectedTx(prev => prev ? { ...prev, category: action.category, subcategory: action.subcategory || prev.subcategory, merchant_name: action.merchant || prev.merchant_name } : null);
            }
          } catch { /* silent */ }
        }
        else if (action.type === 'bulk_change' && action.merchant && !action.confirm) {
          try {
            const sb = getSupabase(); if (!sb) return;
            const { data: { session } } = await sb.auth.getSession(); if (!session) return;
            const { data: matching } = await sb.from('transactions').select('id, category').eq('user_id', session.user.id).ilike('merchant_name', `%${action.merchant}%`);
            const ids = matching?.map(t => t.id) ?? [];
            const prevCat = matching?.[0]?.category ?? 'Needs Review';
            await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'bulk_apply', groups: [{ ids, category: action.category }] }) });
            setLastBulkAction({ ids, previousCategory: prevCat });
            void refetch(); void fetchTagInbox();
          } catch { /* silent */ }
        }
        else if (action.type === 'undo' && lastBulkAction) {
          try {
            const sb = getSupabase(); if (!sb) return;
            const { data: { session } } = await sb.auth.getSession(); if (!session) return;
            await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'undo', affectedIds: lastBulkAction.ids, previousCategory: lastBulkAction.previousCategory }) });
            setLastBulkAction(null); void refetch();
          } catch { /* silent */ }
        }
        else if (action.type === 'reclassify_preview') {
          try {
            const sb = getSupabase(); if (!sb) return;
            const { data: { session } } = await sb.auth.getSession(); if (!session) return;
            const res = await fetch('/.netlify/functions/tag-reclassify-other?preview=true', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } });
            const d = await res.json();
            if (d.ok) setReclassifyPreview(d);
          } catch { /* silent */ }
        }
        else if (action.type === 'categorize' && action.merchant && action.category) {
          try {
            const sb = getSupabase(); if (!sb) return;
            const { data: { session } } = await sb.auth.getSession(); if (!session) return;
            const { data: matching } = await sb.from('transactions').select('id').ilike('merchant_name', `%${action.merchant}%`).or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null');
            const ids = matching?.map(t => t.id) ?? [];
            if (ids.length > 0) {
              await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'bulk_apply', groups: [{ ids, category: action.category, subcategory: action.subcategory ?? null }] }) });
              await fetch('/.netlify/functions/tag-action', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ intent: 'save_rule', matchValue: action.merchant, targetCategory: action.category, targetSubcategory: action.subcategory ?? null, matchType: 'contains' }) });
            }
            void refetch(); void fetchTagInbox();
          } catch { /* silent */ }
        }
      }} />, document.body)}

      {/* Drawer � portalled to body to escape any stacking context from DashboardLayout */}
      {createPortal(
        <TransactionInsightDrawer
          open={!!selectedTx}
          row={selectedTx ? { kind: 'committed', transaction: selectedTx } : null}
          allCommittedTransactions={transactions}
          onClose={() => setSelectedTx(null)}
          onCommittedCategorySaved={(txId, category) => {
            // Update the selected transaction in-place - don't close the drawer
            // and don't refetch (which would trigger filter eviction).
            // Realtime subscription will sync the list in background.
            setSelectedTx(prev => prev && prev.id === txId ? { ...prev, category } as any : prev);
          }}
          tagInsight={tagInsight}
          tagInsightLoading={tagInsightLoading}
          onAskTag={(row) => {
            if (row.kind === 'committed') {
              const tx = row.transaction;
              setSelectedTx(null);
              openChat({
                initialEmployeeSlug: 'tag-ai',
                force: true,
                handoff: {
                  fromEmployeeSlug: 'prime-boss',
                  note: `I am looking at ${tx.merchant_name || 'a transaction'} ? $${Math.abs(tx.amount).toFixed(2)} ? currently tagged as ${tx.category || 'Uncategorized'}. Can you help me with this?`,
                },
                context: {
                  data: {
                    transactionId: tx.id,
                    merchant: tx.merchant_name,
                    amount: tx.amount,
                    category: tx.category,
                    source: 'transaction-drawer',
                  },
                },
                routeHint: '/dashboard/transactions',
              });
            }
          }}
        />,
        document.body
      )}
    </>
  );
}


