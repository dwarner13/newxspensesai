import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useSetAtom } from 'jotai';
import { Search, ChevronRight, ChevronDown, ArrowDownLeft, ArrowUpRight, TrendingDown, Hash, Upload, Download, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useImportList } from '@/hooks/useImportList';
import { groupImportsIntoAccounts } from '@/lib/accountGroups';
import { needsCategory, countNeedsCategory } from '@/lib/needsCategory';
import { calendarDayOfTx, inDateRange, isRangeActive } from '@/lib/categoryPeriod';
import { readTxToolbarParams, writeTxToolbarParams } from '@/lib/txToolbar';
import { TX_LIST_POSITION_KEY, parsePosition, serializePosition, scrollContainer } from '@/lib/txListPosition';
import { useUnifiedChatLauncher } from '@/hooks/useUnifiedChatLauncher';
import { isPrimeBriefingOpenAtom } from '@/lib/uiStore';
import { TAG_REVIEW_PARAM, isTransactionUuid, type TxListFilters } from '@/lib/tagReview';
import { useRevealReviewedTransaction } from '@/hooks/useRevealReviewedTransaction';
import { TransactionInsightDrawer } from '@/components/transactions/TransactionInsightDrawer';
import type { CommittedTransaction } from '@/types/transactions';
import { formatCalendarDate } from '@/lib/calendarDate';
import { getSupabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { newClientMessageId } from '@/lib/tagConversation';
import { TagCopilotPanel } from '@/components/transactions/TagCopilotPanel';
import { AgentFloatingBubble } from '@/components/ui/AgentFloatingBubble';
import { useProfile } from '@/hooks/useProfile';
import { loadChatReturnContext, clearChatReturnContext } from '@/lib/chatReturnContext';
import type { ChatReturnContext } from '@/lib/chatReturnContext';

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
  const navigate = useNavigate();
  const { fullName } = useProfile();
  const firstName = fullName?.split(' ')[0] || '';

  // Chat return context: detect if opened from Action Receipt in Prime chat.
  // Primary: React Router state. Fallback: sessionStorage (survives refresh).
  const [chatReturnCtx, setChatReturnCtx] = useState<ChatReturnContext | null>(() => {
    const fromState = (location.state as any)?.chatReturn;
    if (fromState?.source === 'chat' && typeof fromState.timestamp === 'number') {
      return fromState as ChatReturnContext;
    }
    return loadChatReturnContext();
  });
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
  const [filter, setFilter] = useState<'all' | 'expenses' | 'income'>(() => { try { return readTxToolbarParams(window.location.search).type; } catch { return 'all'; } });
  const listRef = useRef<HTMLDivElement>(null);
  const [statementFilter, setStatementFilter] = useState<string>(initialParams.importId || 'all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>(initialParams.issuer || '');
  const [yearFilter, setYearFilter] = useState<number | 'all'>(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const param = sp.get('year');
      if (param === 'all') return 'all';
      const n = Number(param);
      return Number.isFinite(n) && n >= 2000 ? n : new Date().getFullYear();
    } catch { return new Date().getFullYear(); }
  });
  const [searchQuery, setSearchQuery] = useState('');
  // X-1: custom date range and type kept in the URL (same calendar-day rule as Categories).
  const [initialToolbar] = useState(() => { try { return readTxToolbarParams(window.location.search); } catch { return readTxToolbarParams(''); } });
  const [rangeFrom, setRangeFrom] = useState<string>(initialToolbar.from);
  const [rangeTo, setRangeTo] = useState<string>(initialToolbar.to);
  // X-3: 'Needs category' quick filter (same check as the page's existing review count).
  const [needsCategoryOnly, setNeedsCategoryOnly] = useState<boolean>(!!initialToolbar.needsCategory);
  const [tagFilterLabel, setTagFilterLabel] = useState('');
  const [tagCategoryFilter, setTagCategoryFilter] = useState('');
  const [tagSubcategoryFilter, setTagSubcategoryFilter] = useState('');
  const txListRef = (typeof window !== 'undefined') ? { current: null } : { current: null };
  const [selectedTx, setSelectedTx] = useState<CommittedTransaction | null>(null);
  const selectedTxRef = useRef<CommittedTransaction | null>(null);
  selectedTxRef.current = selectedTx;
  const [tagInsight, setTagInsight] = useState<{ category?: string; categorySource?: string; confidence?: number; message?: string; accountLabel?: string | null } | null>(null);
  // D-6: display-only account label ("Issuer •••• 1234") for Tag's context card, captured from the
  // owner-scoped tag-explain result of the transaction handed to Tag. Never sent to Tag.
  const [tagPanelAccountLabel, setTagPanelAccountLabel] = useState<string | null>(null);
  const [tagInsightLoading, setTagInsightLoading] = useState(false);
  const [tagPanelOpen, setTagPanelOpen] = useState(() => {
    // URL param (upload handoff) forces Tag open on mount. Otherwise defer
    // to the auto-open effect below, which decides based on session
    // dismissal — matching the Categories page behavior for consistency.
    return initialParams.openTag;
  });

  // Mark auto-open as dismissed for this session whenever Tag becomes open,
  // regardless of cause (URL param, auto-open timer, bubble tap, upload
  // handoff). This is how "auto-open once per session" is enforced — once
  // Tag has been open in this session, don't re-auto-open even after close.
  // sessionStorage clears on hard refresh / new tab, so next session gets
  // a fresh auto-open.
  useEffect(() => {
    if (tagPanelOpen) {
      try { sessionStorage.setItem('tag_autopen_dismissed', '1'); } catch { /* noop */ }
    }
  }, [tagPanelOpen]);

  // UX-C2: Tag no longer auto-opens on Transactions. It opens only from explicit
  // actions: the ?openTag handoff (initial state above), Review with Tag, Ask Tag about
  // this, and the floating Tag bubble.

  // Overview section (stat cards + donut + AI insights) open/closed.
  // First visit default: expanded on desktop (md+), collapsed on mobile —
  // so mobile users see the transaction list above the fold immediately.
  // Subsequent visits: respect the user's last choice via localStorage.
  const [overviewOpen, setOverviewOpen] = useState(() => {
    try {
      const stored = window.localStorage.getItem('xai.overview.open');
      if (stored !== null) return stored === '1';
      return window.matchMedia('(min-width: 768px)').matches;
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem('xai.overview.open', overviewOpen ? '1' : '0'); }
    catch { /* non-fatal */ }
  }, [overviewOpen]);

  const [tagPanelTx, setTagPanelTx] = useState<CommittedTransaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(100);
  // X-3: remember how far down the list the customer was (rows loaded + scroll) for this
  // session, and restore it on return to the same filters within 30 minutes.
  const positionRestoredRef = useRef(false);
  const visibleCountRef = useRef(visibleCount);
  visibleCountRef.current = visibleCount;
  useEffect(() => {
    return () => {
      try {
        sessionStorage.setItem(TX_LIST_POSITION_KEY, serializePosition(window.location.search, visibleCountRef.current, scrollContainer().get(), Date.now()));
      } catch { /* per-viewer convenience only */ }
    };
  }, []);
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

  // X-1: date range and type <-> URL (other params kept)
  useEffect(() => {
    try {
      const qs = writeTxToolbarParams(window.location.search, { from: rangeFrom, to: rangeTo, type: filter, needsCategory: needsCategoryOnly });
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? '?' + qs : ''}`);
    } catch { /* non-fatal */ }
  }, [rangeFrom, rangeTo, filter, needsCategoryOnly]);

  // Year filter <-> URL sync
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (yearFilter === 'all') sp.delete('year');
    else sp.set('year', String(yearFilter));
    setSearchParams(sp, { replace: true });
  }, [yearFilter, setSearchParams]);
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
      setSearchParams(p => { p.delete("import_id"); p.delete("importId"); return p; }, { replace: true });
    } else {
      console.log('[TxPage] [DIAG] NO import_id in URL — staying on global view');
    }
    // Strip ?openTag=1 from URL after consumption (state was set synchronously in
    // the useState initializer above, so we just need to clean the URL).
    if (searchParams.get("openTag")) {
      setSearchParams(p => { p.delete("openTag"); return p; }, { replace: true });
    }
    // Legacy: auto-open drawer from tag-inbox Answer button
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
  // Owner GO 2026-11-25 (Tag HQ): applying Tag's import suggestions is a bulk change, so it is a
  // SERVER proposal (computed by the server, never the browser's id list) that the customer confirms;
  // the change is tag-action commit_proposal. (It used to apply the browser's id list immediately.)
  const applySweepFromChat = useCallback(async (payload: any) => {
    try {
      const sb = getSupabase(); if (!sb) return;
      const { data: { session } } = await sb.auth.getSession(); if (!session) return;
      const importId = typeof payload?.import_id === 'string' ? payload.import_id : '';
      if (!importId) { toast.error('Could not apply'); return; }
      const post = async (body: Record<string, unknown>) => {
        const res = await fetch('/.netlify/functions/tag-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(body),
        });
        return res.json();
      };
      const prop = await post({
        intent: 'propose_import_suggestions', importId,
        conversation: { customerText: "Apply Tag's suggestions for this statement", clientMessageId: newClientMessageId() },
      });
      const reply = String(prop?.conversation?.reply || "Tag couldn't check those suggestions, so nothing has changed.").replace(/\*\*/g, '');
      if (!prop?.proposal || prop?.conversation?.receipt?.state !== 'proposed') { toast(reply); return; }
      const sessionId = prop?.conversation?.sessionId;
      toast((t) => (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>{reply}</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  const d = await post({
                    intent: 'commit_proposal', action: prop.proposal.action, subject: prop.proposal.subject,
                    conversation: { customerText: 'yes', clientMessageId: newClientMessageId(), ...(sessionId ? { sessionId } : {}) },
                  });
                  const msg = String(d?.conversation?.reply || '').replace(/\*\*/g, '');
                  if (d?.conversation?.receipt?.state === 'completed') {
                    toast.success(msg || 'Done');
                    void dismissSweep(); void refetch(); void fetchTagInbox();
                  } else {
                    toast.error(msg || 'Nothing was changed');
                  }
                } catch { toast.error("Couldn't confirm whether that went through - check your transactions before trying again"); }
              }}
              style={{ padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}
            >Confirm</button>
            <button onClick={() => toast.dismiss(t.id)} style={{ padding: '4px 10px', borderRadius: 8 }}>Cancel</button>
          </span>
        </span>
      ), { duration: 30000 });
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

  // Back to Conversation: navigate to dashboard and reopen chat panel.
  // We cannot call setIsPrimeBriefingOpen(true) synchronously here because
  // DashboardLayout's route-change effect resets it to false when the path
  // changes. Instead, set a one-shot sessionStorage intent that the layout
  // consumes after the route-change effect fires.
  const handleBackToChat = useCallback(() => {
    clearChatReturnContext();
    setChatReturnCtx(null);
    setSelectedTx(null);
    try { sessionStorage.setItem('returnToConversation', '1'); } catch { /* noop */ }
    navigate('/dashboard');
  }, [navigate]);

  // Close drawer: clear chat return context so Back to Conversation disappears
  const handleDrawerClose = useCallback(() => {
    clearChatReturnContext();
    setChatReturnCtx(null);
    // X-3: return keyboard focus (and view) to the row that was open, like "Done" does.
    const id = selectedTxRef.current?.id;
    setSelectedTx(null);
    if (id) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-tx-id="${CSS.escape(id)}"]`);
        if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); }
      });
    }
  }, []);

  // D-3: "Done" after a confirmed correction — close the drawer and return to the same row:
  // focus it, keep it in view and mark it briefly. Filters, search and the loaded list are
  // untouched (the list stays mounted under the drawer, so scroll is preserved).
  const [lastEditedTxId, setLastEditedTxId] = useState<string | null>(null);
  const handleDrawerDone = useCallback((txId: string) => {
    handleDrawerClose();
    setLastEditedTxId(txId);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-tx-id="${CSS.escape(txId)}"]`);
      if (el) { el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); }
    });
    window.setTimeout(() => setLastEditedTxId(prev => (prev === txId ? null : prev)), 4000);
  }, [handleDrawerClose]);

  const fetchTagInsight = useCallback(async (tx: CommittedTransaction) => {
    setTagInsight(null);
    setTagInsightLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // S0 Batch 2: tag-explain requires the verified session token, read at call time.
      // No token means no request (x-user-id alone is not identity).
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch(`/.netlify/functions/tag-explain`, {
        method: `POST`,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${accessToken}`, 'x-user-id': user.id },
        body: JSON.stringify({ transactionId: tx.id }),
      });
      if (res.ok) setTagInsight(await res.json());
    } catch { /* silent */ } finally { setTagInsightLoading(false); }
  }, []);

  // ── txId deep-link: open exact transaction from Action Receipt ──
  // Reacts to data readiness (not a fixed timer). Searches the FULL
  // transactions collection (pre-filter) so it works regardless of
  // active year/category/search filters. Falls back to a single-row
  // Supabase fetch if the UUID is valid but outside the loaded 5000.
  // IMPORTANT: Must be declared AFTER fetchTagInsight to avoid TDZ crash.
  const txIdConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    const txId = searchParams.get('txId');
    if (!txId) return;
    // Validate UUID format before doing anything
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(txId)) {
      setSearchParams(p => { p.delete('txId'); return p; }, { replace: true });
      return;
    }
    // Prevent repeated consumption on rerenders
    if (txIdConsumedRef.current === txId) return;
    // Wait for transactions to finish loading
    if (isLoading) return;

    // Search full (pre-filter) transactions array
    const tx = transactions.find(t => t.id === txId);
    if (tx) {
      txIdConsumedRef.current = txId;
      setSelectedTx(tx);
      setTagInsight(null);
      void fetchTagInsight(tx);
      setSearchParams(p => { p.delete('txId'); return p; }, { replace: true });
      return;
    }

    // UUID valid but not in loaded collection — fetch single row via RLS
    txIdConsumedRef.current = txId;
    (async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) return;
        const { data, error } = await supabase
          .from('transactions')
          .select('id,user_id,posted_at,merchant_name,merchant,description,amount,category,subcategory,subcategory_source,category_source,date,type,import_id,document_id,created_at,updated_at')
          .eq('id', txId)
          .maybeSingle();
        if (error || !data) {
          // Not found or inaccessible — clean URL silently
          setSearchParams(p => { p.delete('txId'); return p; }, { replace: true });
          return;
        }
        setSelectedTx(data as CommittedTransaction);
        setTagInsight(null);
        void fetchTagInsight(data as CommittedTransaction);
      } catch {
        // Network error — clean URL silently
      }
      setSearchParams(p => { p.delete('txId'); return p; }, { replace: true });
    })();
  }, [searchParams, transactions, isLoading, fetchTagInsight, setSearchParams]);

  // C2-E2A: Prime "Review with Tag" deep link (?tagTx=<uuid>). Opens the existing Tag panel
  // focused on the user's own transaction and offers "Back to Prime". Only the ID travels;
  // it is resolved against the user's loaded rows or one user-filtered RLS read, and Tag
  // re-reads it server-side. Missing/stale/foreign IDs open Tag without a focus.
  const [tagFromPrime, setTagFromPrime] = useState(false);
  // C2-E2A-F1: the transaction Prime asked to review — brought into view and highlighted.
  const [highlightTxId, setHighlightTxId] = useState<string | null>(null);
  const tagTxConsumedRef = useRef<string | null>(null);
  useEffect(() => {
    const requested = searchParams.get(TAG_REVIEW_PARAM);
    // Param consumed/removed → allow the same transaction to be reviewed again later.
    if (!requested) { tagTxConsumedRef.current = null; return; }
    const strip = () => setSearchParams(p => { p.delete(TAG_REVIEW_PARAM); return p; }, { replace: true });
    if (!isTransactionUuid(requested)) { strip(); return; }
    if (tagTxConsumedRef.current === requested || isLoading) return;
    tagTxConsumedRef.current = requested;
    setIsPrimeBriefingOpen(false); // one panel at a time; Prime's session is kept
    setTagFromPrime(true);
    const openTagWith = (tx: CommittedTransaction | null) => {
      setHighlightTxId(tx ? tx.id : null); // only a resolved, owned row is ever highlighted
      setSelectedTx(null);
      setTagPanelTx(tx);
      setTagPanelAccountLabel(null); // D-6: no stale label from another transaction
      setTagInjectedMsg(null);
      setTagFollowupMerchants(null);
      setTagPanelOpen(true);
    };
    const loaded = transactions.find(t => t.id === requested);
    if (loaded) { openTagWith(loaded); strip(); return; }
    (async () => {
      let found: CommittedTransaction | null = null;
      try {
        const supabase = getSupabase();
        const uid = supabase ? (await supabase.auth.getUser()).data.user?.id : undefined;
        if (supabase && uid) {
          const { data } = await supabase
            .from('transactions')
            .select('id,user_id,posted_at,merchant_name,merchant,description,amount,category,subcategory,subcategory_source,category_source,date,type,import_id,document_id,created_at,updated_at')
            .eq('id', requested)
            .eq('user_id', uid)
            .maybeSingle();
          found = (data as CommittedTransaction | null) ?? null;
        }
      } catch { /* network error — open Tag without a focus */ }
      openTagWith(found);
      strip();
    })();
  }, [searchParams, transactions, isLoading, setSearchParams, setIsPrimeBriefingOpen]);

  // C2-E2A: return path from Tag to Prime — close Tag (its history stays in localStorage)
  // and reopen the existing Prime panel over this page (same Prime session).
  const handleBackToPrime = useCallback(() => {
    setTagPanelOpen(false);
    setTagPanelTx(null);
    setTagFromPrime(false);
    setHighlightTxId(null);
    setIsPrimeBriefingOpen(true);
  }, [setIsPrimeBriefingOpen]);

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
    // K-d: grouping moved unchanged to lib/accountGroups.ts so Categories uses the same accounts.
    const groups = new Map<string, AccountCard>();
    for (const a of groupImportsIntoAccounts(imports)) {
      groups.set(a.id, { ...a, statementCount: 0, totalSpent: 0, totalIncome: 0, uncategorizedCount: 0 });
    }
    const byImportId = new Map<string, AccountCard>();
    for (const a of groups.values()) {
      for (const tid of a.importIds) byImportId.set(tid, a);
    }
    // Year-filter pass: skip transactions outside the selected year, and track
    // which import_ids have any in-year activity (for accurate per-card
    // statementCount). yearFilter='all' falls through and counts everything.
    const yearStr = yearFilter === 'all' ? null : String(yearFilter);
    const importsWithActivity = new Set<string>();
    transactions.forEach(t => {
      if (yearStr && !String(t.date || '').startsWith(yearStr)) return;
      const a = byImportId.get(t.import_id || '');
      if (!a) return;
      if (t.import_id) importsWithActivity.add(t.import_id);
      if (isIncomeTx(t)) a.totalIncome += Math.abs(t.amount);
      else a.totalSpent += Math.abs(t.amount);
      if (needsCategory(t.category)) {
        a.uncategorizedCount += 1;
      }
    });
    // statementCount: filtered to in-year imports when a year is selected
    for (const a of groups.values()) {
      a.statementCount = yearStr
        ? a.importIds.filter(id => importsWithActivity.has(id)).length
        : a.importIds.length;
    }
    return Array.from(groups.values()).sort((a, b) => b.statementCount - a.statementCount);
  }, [imports, transactions, yearFilter]);

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
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    if (typeof yearFilter === 'number') years.add(yearFilter);
    transactions.forEach(t => {
      const s = (t.date || t.posted_at || (t as any).transaction_date || (t as any).txn_date || '').slice(0, 4);
      const n = Number(s);
      if (Number.isFinite(n) && n >= 2000) years.add(n);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, yearFilter]);

  const filtered = useMemo(() => {
    let list = transactions;
    const range = (rangeFrom || rangeTo) && !(rangeFrom && rangeTo && rangeFrom > rangeTo) ? { from: rangeFrom || undefined, to: rangeTo || undefined } : null;
    if (isRangeActive(range)) {
      // X-1: an active custom range replaces the year filter (calendar days, as in Categories).
      list = list.filter(t => inDateRange(calendarDayOfTx(t), range));
    } else if (yearFilter !== 'all') {
      const y = String(yearFilter);
      list = list.filter(t => {
        const d = (t.date || t.posted_at || (t as any).transaction_date || (t as any).txn_date || '').slice(0, 4);
        return d === y;
      });
    }
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
    if (needsCategoryOnly) list = list.filter(t => needsCategory(t.category));
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
  }, [transactions, filter, statementFilter, accountFilter, accounts, searchQuery, tagCategoryFilter, tagSubcategoryFilter, yearFilter, rangeFrom, rangeTo, needsCategoryOnly]);

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
          label = `Statement — ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return { id: i.id, label };
      });
  }, [imports]);
  const [stmtDropdownOpen, setStmtDropdownOpen] = useState(false);
  // X-1: categories present in the loaded transactions, for the toolbar filter.
  const categoryOptions = useMemo(() => Array.from(new Set(transactions.map(t => t.category || 'Uncategorized'))).sort((a, b) => a.localeCompare(b)), [transactions]);

  // AI insights — from filtered
  const insights = useMemo(() => {
    const uncatCount = countNeedsCategory(filtered);
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

  // X-2: account name for each row, from the same account grouping as the toolbar and cards.
  const accountNameByImport = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accounts) for (const id of a.importIds) m.set(id, a.name);
    return m;
  }, [accounts]);

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

  useEffect(() => {
    if (positionRestoredRef.current || isLoading || transactions.length === 0) return;
    positionRestoredRef.current = true;
    let saved = null;
    try { saved = parsePosition(sessionStorage.getItem(TX_LIST_POSITION_KEY), window.location.search, Date.now()); } catch { saved = null; }
    // A deep link to a specific transaction (txId / tagTx) takes precedence over the saved place.
    if (!saved || /[?&](txId|tagTx)=/.test(window.location.search)) return;
    if (saved.visibleCount > visibleCount) setVisibleCount(saved.visibleCount);
    const y = saved.scrollTop;
    requestAnimationFrame(() => requestAnimationFrame(() => scrollContainer().set(y)));
  }, [isLoading, transactions.length, visibleCount]);

  // C2-E2A-F1: bring the reviewed transaction into view (filters, load-more, scroll).
  const applyRevealFilters = useCallback((f: TxListFilters) => {
    setYearFilter(f.year); setFilter(f.type); setStatementFilter(f.statement); setAccountFilter(f.account);
    setTagCategoryFilter(f.category); setTagSubcategoryFilter(f.subcategory); setSearchQuery(f.search);
    setRangeFrom(''); setRangeTo(''); setNeedsCategoryOnly(false);
  }, []);
  useRevealReviewedTransaction({ highlightTxId, transactions, filtered, visibleCount, setVisibleCount, applyFilters: applyRevealFilters });

  // Owner rule: one shared predicate for the strip, banner, toolbar filter and rows.
  const uncategorizedCount = countNeedsCategory(filtered);
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
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Transactions will appear within a moment — no need to refresh.</div>
            </div>
          </div>
          <button onClick={() => setShowProcessingBanner(false)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}>?</button>
        </div>
      )}
      <div className="max-w-[1100px] mx-auto px-4 md:px-6 py-6 md:py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* X-1: header — title and page actions */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="min-w-0 flex-1">
            {isStatementMode && (
              <button
                onClick={() => { setStatementFilter('all'); setAccountFilter('all'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 32, fontSize: 13, fontWeight: 600, color: '#9ba8bc', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                ← All Transactions
              </button>
            )}
            <h1 style={{ fontSize: isStatementMode ? 22 : 28, fontWeight: 800, letterSpacing: -0.5, color: '#e8ecf4', margin: 0, lineHeight: 1.2 }}>
              {isStatementMode ? activeStatementLabel : 'Transactions'}
            </h1>
          </div>
              {/* C2-E1: Ask Prime — opens the existing Prime panel; this page stays visible underneath */}
              <button
                type="button"
                onClick={handleOpenPrime}
                aria-label="Ask Prime about your transactions"
                data-testid="ask-prime-transactions"
                className="flex items-center gap-1.5 px-3 text-[13px] font-bold rounded-lg border min-h-[44px]"
                style={{ background: 'rgba(200,166,78,0.12)', border: '1px solid rgba(200,166,78,0.35)', color: '#e8cf86', cursor: 'pointer' }}
              >
                <span aria-hidden="true">{"♕"}</span> Ask Prime
              </button>
          <button onClick={handleRefresh} disabled={isRefreshing} title="Refresh data" aria-label="Refresh transactions" className={`flex items-center gap-2 px-3 min-h-[44px] text-[13px] font-bold text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg transition-colors ${isRefreshing ? 'opacity-60 cursor-wait' : 'hover:bg-slate-700/50'}`}>
            <span aria-hidden="true" className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`} style={{ fontSize: 15, lineHeight: 1 }}>↻</span>
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
          <button onClick={handleExport} aria-label="Export transactions as CSV" className="flex items-center gap-2 px-3 min-h-[44px] text-[13px] font-bold text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></button>
          <button onClick={handleUpload} className="flex items-center gap-2 px-4 min-h-[44px] text-[13px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-400 hover:to-orange-400 transition-colors"><Upload className="h-4 w-4" />Upload</button>
        </div>

        {/* X-1: one toolbar — search, year, dates, account, statement, category, type */}
        <div ref={listRef} className="flex flex-wrap items-center gap-2 mb-3">
          <label className="flex items-center gap-2 flex-[1_1_240px] min-w-0 rounded-[10px] border border-[#24365a] bg-[#111a2e] px-3" style={{ minHeight: 44 }}>
            <Search aria-hidden="true" className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="sr-only">Search transactions</span>
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) { setTagFilterLabel(''); setTagCategoryFilter(''); setTagSubcategoryFilter(''); } }} placeholder="Search merchant, category or amount" className="flex-1 min-w-0 bg-transparent text-[16px] md:text-[14px] text-slate-200 placeholder:text-slate-500 outline-none" />
          </label>
          <select aria-label="Year" value={yearFilter === 'all' ? 'all' : String(yearFilter)} disabled={!!(rangeFrom || rangeTo)}
            onChange={(e) => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            style={{ minHeight: 44, padding: '0 12px', background: '#111a2e', border: '1px solid #24365a', borderRadius: 10, color: '#e8ecf4', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            <option value="all">All years</option>
          </select>
          <details className="relative">
            <summary className="list-none cursor-pointer flex items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-semibold" style={{ minHeight: 44, background: (rangeFrom || rangeTo) ? 'rgba(34,211,238,0.08)' : '#111a2e', borderColor: (rangeFrom || rangeTo) ? 'rgba(34,211,238,0.4)' : '#24365a', color: '#e8ecf4' }}>
              {(rangeFrom || rangeTo) ? `${rangeFrom || '…'} – ${rangeTo || '…'}` : 'All dates'} <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
            </summary>
            <div role="group" aria-label="Date range" className="absolute left-0 top-full z-40 mt-1 flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-900 p-3 shadow-xl" style={{ minWidth: 240 }}>
              <label className="flex items-center justify-between gap-2 text-[13px] text-slate-400">From
                <input type="date" value={rangeFrom} max={rangeTo || undefined} onChange={(e) => setRangeFrom(e.target.value)} style={{ minHeight: 44, padding: '0 12px', background: '#111a2e', border: '1px solid #24365a', borderRadius: 10, color: '#e8ecf4', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }} />
              </label>
              <label className="flex items-center justify-between gap-2 text-[13px] text-slate-400">To
                <input type="date" value={rangeTo} min={rangeFrom || undefined} onChange={(e) => setRangeTo(e.target.value)} style={{ minHeight: 44, padding: '0 12px', background: '#111a2e', border: '1px solid #24365a', borderRadius: 10, color: '#e8ecf4', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }} />
              </label>
              <span role="status" className="text-[12px]" style={{ color: rangeFrom && rangeTo && rangeFrom > rangeTo ? '#f87171' : '#9ba8bc' }}>
                {rangeFrom && rangeTo && rangeFrom > rangeTo ? 'The start date is after the end date.' : (rangeFrom || rangeTo) ? 'The year is ignored while dates are set.' : 'Choose a start date, an end date or both.'}
              </span>
              {(rangeFrom || rangeTo) && (
                <button type="button" onClick={() => { setRangeFrom(''); setRangeTo(''); }} className="self-start text-[13px] font-semibold text-cyan-300" style={{ minHeight: 36 }}>Clear dates</button>
              )}
            </div>
          </details>
          {accounts.length > 0 && (
            <select aria-label="Account" value={accountFilter} onChange={(e) => {
              const id = e.target.value;
              setAccountFilter(id);
              // Same URL handling as the account cards (bookmarkable; survives reload).
              const sp = new URLSearchParams(window.location.search);
              if (id === 'all') sp.delete('issuer'); else sp.set('issuer', id.split('|')[0] || '');
              sp.delete('import_id'); sp.delete('importId');
              const qs = sp.toString();
              window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? '?' + qs : ''}`);
            }} style={{ minHeight: 44, padding: '0 12px', background: '#111a2e', border: '1px solid #24365a', borderRadius: 10, color: '#e8ecf4', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
              <option value="all">All accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
              <div className="relative">
                <button
                  onClick={() => setStmtDropdownOpen(v => !v)}
                  className="flex items-center gap-2 px-3 min-h-[44px] text-[14px] font-semibold rounded-[10px] border transition-colors"
                  style={{
                    background: isStatementMode ? 'rgba(99,102,241,0.1)' : '#111a2e',
                    border: isStatementMode ? '1px solid rgba(99,102,241,0.3)' : '1px solid #1e2d4a',
                    color: isStatementMode ? '#a5b4fc' : '#e8ecf4',
                    cursor: 'pointer',
                  }}
                >
                  <span className="truncate max-w-[200px]">{isStatementMode ? activeStatementLabel : 'All Statements'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${stmtDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {stmtDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setStmtDropdownOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 z-50 min-w-[260px] max-h-[320px] overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900 shadow-xl">
                      <button
                        onClick={() => { setStatementFilter('all'); setAccountFilter('all'); setStmtDropdownOpen(false); }}
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
          <select aria-label="Category" value={tagCategoryFilter} onChange={(e) => { setTagCategoryFilter(e.target.value); setTagFilterLabel(''); }} style={{ minHeight: 44, padding: '0 12px', background: '#111a2e', border: '1px solid #24365a', borderRadius: 10, color: '#e8ecf4', fontSize: 14, fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" aria-pressed={needsCategoryOnly} onClick={() => setNeedsCategoryOnly(v => !v)}
            className="flex items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-semibold transition-colors"
            style={{ minHeight: 44, background: needsCategoryOnly ? 'rgba(251,191,36,0.12)' : '#111a2e', borderColor: needsCategoryOnly ? 'rgba(251,191,36,0.45)' : '#24365a', color: needsCategoryOnly ? '#fcd34d' : '#e8ecf4' }}>
            Needs category
          </button>
          <div role="group" aria-label="Transaction type" className="flex p-1 rounded-[10px] bg-slate-800/40 border border-slate-700/30">
            {(['all', 'expenses', 'income'] as const).map(f => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`px-3.5 text-[13px] font-bold rounded-md transition-colors ${filter === f ? 'bg-slate-700/60 text-white' : 'text-slate-400 hover:text-slate-200'}`} style={{ minHeight: 36 }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* X-1: one summary strip; the overview (accounts, totals, donut, insights) opens on request */}
        {!isStatementMode && (
          <button
            type="button"
            onClick={() => setOverviewOpen(v => !v)}
            className="w-full flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 mb-3 text-left hover:border-[#2d4a6e] transition-colors"
            style={{ minHeight: 52 }}
            aria-expanded={overviewOpen}
            aria-controls="tx-overview-content"
          >
            <span className="text-[14px] text-slate-300"><strong className="text-white tabular-nums">{filtered.length}</strong> transaction{filtered.length !== 1 ? 's' : ''}</span>
            <span className="text-[14px] text-slate-300">Spent <strong className="text-white tabular-nums">${fmt(totalSpent)}</strong></span>
            <span className="text-[14px] text-slate-300">Income <strong className="text-emerald-300 tabular-nums">${fmt(totalIncome)}</strong></span>
            {uncategorizedCount > 0 && <span className="text-[14px] text-amber-200"><strong className="tabular-nums">{uncategorizedCount}</strong> need review</span>}
            <span className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-slate-400">
              {overviewOpen ? 'Hide overview' : 'Show overview'}
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${overviewOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
        )}
        {isStatementMode && (
          <p style={{ fontSize: 13, color: '#9ba8bc', margin: '0 0 12px', fontWeight: 500 }}>
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </p>
        )}

            <style>{`.acct-scroll::-webkit-scrollbar{height:6px}.acct-scroll::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:3px}.acct-scroll::-webkit-scrollbar-track{background:transparent}`}</style>
            {!isStatementMode && overviewOpen && <div
              className="acct-scroll mb-3"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: 12,
                paddingBottom: 4,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148,163,184,0.3) transparent',
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

        {/* STAT CARDS — hidden in statement mode; collapsible on mobile via
            overviewOpen. On md+ always visible regardless of state (md:grid
            overrides mobile hidden). */}
        {!isStatementMode && <div id="tx-overview-content" className={`grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 ${overviewOpen ? '' : 'hidden'}`}>
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

        {/* TWO COLUMN: Donut + AI Insights — hidden in statement mode;
            collapsible on mobile via overviewOpen (same rules as stat cards). */}
        {!isStatementMode && <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 ${overviewOpen ? '' : 'hidden'}`}>
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

        {/* TRANSACTION LIST */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/30">
          {/* X-1: search moved to the toolbar above */}

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
              <button type="button" onClick={() => { setNeedsCategoryOnly(true); listRef.current?.scrollIntoView({ block: 'start' }); }} className="px-3 min-h-[40px] text-[13px] font-bold text-amber-900 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors">Review</button>
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
          {/* X-2: desktop column header (rows keep their date groups on phones) */}
          {dateGroups.length > 0 && (
            <div aria-hidden="true" className="hidden md:grid grid-cols-[108px_minmax(0,1fr)_150px_190px_120px_16px] gap-4 px-5 py-2.5 border-b border-slate-800/60 text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
              <span>Date</span><span>Merchant</span><span>Account</span><span>Category</span><span className="text-right">Amount</span><span />
            </div>
          )}
          {dateGroups.map(g => (
            <div key={g.date}>
              <div className="md:hidden flex items-center gap-3 pt-5 pb-2 px-4">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-slate-400 whitespace-nowrap">{g.label}</span>
                <div className="flex-1 h-px bg-slate-800/60" />
                <span className="text-[12px] text-slate-500">{g.txs.length}</span>
              </div>
              {g.txs.map(t => {
                const cat = t.category || 'Uncategorized';
                const isUncat = needsCategory(t.category);
                const isIncome = isIncomeTx(t);
                const isDupe = isDuplicate(t);
                const accountName = t.import_id ? accountNameByImport.get(t.import_id) || null : null;
                const dayText = formatCalendarDate(calendarDayOfTx(t), 'medium') || '';
                const amountText = `${isIncome ? '+' : '-'}$${fmt(Math.abs(t.amount))}`;
                const categoryText = isUncat ? 'Needs a category' : `${cat}${t.subcategory ? ` \u00b7 ${t.subcategory}` : ''}`;
                return (
                  <button key={t.id} data-tx-id={t.id} aria-current={highlightTxId === t.id ? 'true' : undefined}
                    aria-label={`${t.merchant_name || 'Unknown'}, ${amountText}, ${dayText}${accountName ? `, ${accountName}` : ''}, ${categoryText}${isDupe ? ', marked duplicate' : ''}. Open details`}
                    onClick={() => { setSelectedTx(t); setTagInsight(null); void fetchTagInsight(t); }}
                    className="w-full flex items-center gap-3 px-4 py-3 min-h-[64px] md:grid md:grid-cols-[108px_minmax(0,1fr)_150px_190px_120px_16px] md:gap-4 md:px-5 md:py-2.5 md:min-h-[52px] border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-left"
                    style={highlightTxId === t.id ? { background: 'rgba(34,211,238,0.12)', boxShadow: 'inset 3px 0 0 #22d3ee', outline: '1px solid rgba(34,211,238,0.45)', outlineOffset: -1 } : lastEditedTxId === t.id ? { background: 'rgba(52,211,153,0.10)', boxShadow: 'inset 3px 0 0 #34d399' } : isDupe ? { background: 'rgba(248,113,113,0.08)', borderLeft: '3px solid rgba(248,113,113,0.55)' } : undefined}>
                    {highlightTxId === t.id && <span className="sr-only">Selected for review with Tag. </span>}
                    {/* Date (desktop column) */}
                    <span aria-hidden="true" className="hidden md:block text-[14px] text-slate-300 tabular-nums">{dayText}</span>
                    {/* Merchant; on phones the second line carries category and account */}
                    <span aria-hidden="true" className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 text-[16px] md:text-[15px] font-semibold text-slate-100">
                        <span className="truncate">{t.merchant_name || 'Unknown'}</span>
                        {isDupe && <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5', letterSpacing: 0.5, flexShrink: 0 }}>DUPLICATE</span>}
                        {(t as any).category_source === 'user_chat' && (
                          <span title="Tag changed this category" style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(34,211,153,0.15)', border: '1px solid rgba(34,211,153,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#22d3ee', flexShrink: 0 }}>T</span>
                        )}
                      </span>
                      <span className={`md:hidden block truncate text-[13px] ${isUncat ? 'text-amber-300 font-semibold' : 'text-slate-400'}`}>
                        {categoryText}{accountName ? ` \u00b7 ${accountName}` : ''}
                      </span>
                    </span>
                    {/* Account (desktop column) */}
                    <span aria-hidden="true" className="hidden md:block truncate text-[14px] text-slate-300">{accountName || '\u2014'}</span>
                    {/* Category (desktop column) */}
                    <span aria-hidden="true" className={`hidden md:flex items-center gap-2 min-w-0 text-[14px] ${isUncat ? 'text-amber-300 font-semibold' : 'text-slate-200'}`}>
                      {!isUncat && <span className="text-[13px] shrink-0">{iconFor(cat)}</span>}
                      <span className="truncate">{categoryText}</span>
                    </span>
                    {/* Amount */}
                    <span aria-hidden="true" className={`shrink-0 text-right text-[16px] md:text-[15px] font-bold tabular-nums ${isDupe ? 'text-red-400 line-through opacity-60' : isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>{amountText}</span>
                    <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-500 shrink-0" />
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
      {tagPanelOpen && createPortal(<TagCopilotPanel focusedTransaction={tagPanelTx as any} totalCount={transactions.length} categorizedCount={transactions.filter(t => t.category && t.category !== 'Uncategorized' && t.category !== 'Other').length} flaggedCount={uncategorizedCount} avgConfidence={0} rulesCount={0} firstName={firstName} totalSpent={totalSpent} totalIncome={totalIncome} netFlow={netFlow} importId={isStatementMode ? statementFilter : undefined} importLabel={isStatementMode ? activeStatementLabel : undefined} importTxCount={isStatementMode ? filtered.length : undefined} injectedMessage={tagInjectedMsg} injectedFollowupMerchants={tagFollowupMerchants} onMerchantCategorize={async (merchantName, category) => {
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
      }} onBackToPrime={tagFromPrime ? handleBackToPrime : undefined} focusedAccountLabel={tagPanelTx ? tagPanelAccountLabel : null} onBackToTransaction={tagPanelTx ? () => { const tx = tagPanelTx as CommittedTransaction; setTagPanelOpen(false); setTagPanelTx(null); setTagPanelAccountLabel(null); setTagInjectedMsg(null); setTagFollowupMerchants(null); setTagFromPrime(false); setHighlightTxId(null); setSelectedTx(tx); setTagInsight(null); void fetchTagInsight(tx); } : undefined} onClose={() => { setTagPanelOpen(false); setTagPanelTx(null); setTagPanelAccountLabel(null); setTagInjectedMsg(null); setTagFollowupMerchants(null); setTagFromPrime(false); setHighlightTxId(null); }} onCategoryUpdated={() => { void refetch(); void fetchTagInbox(); }} onToggleActivity={() => setTagActivityOpen(v => !v)} onTagAction={async (action) => {
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
                // Query builders have no .catch(): the old `.upsert(...).catch(...)` threw AFTER the
                // category update succeeded, so the rule was never saved and the row flash / refresh /
                // drawer update below were silently skipped (customer saw the old category).
                const { error: ruleErr } = await sb.from('category_rules').upsert({
                  user_id: s.user.id, match_value: pattern, merchant_pattern: pattern, match_type: 'contains',
                  category: action.category, subcategory: action.subcategory || null, is_active: true, updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id,merchant_pattern' });
                if (ruleErr) console.error('[update_transaction] save rule failed');
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

      {/* Drawer — portalled to body to escape any stacking context from DashboardLayout */}
      {createPortal(
        <TransactionInsightDrawer
          open={!!selectedTx}
          row={selectedTx ? { kind: 'committed', transaction: selectedTx } : null}
          allCommittedTransactions={transactions}
          onClose={handleDrawerClose}
          onDone={handleDrawerDone}
          onBackToChat={chatReturnCtx ? handleBackToChat : undefined}
          onCommittedCategorySaved={(txId, category) => {
            // Update the selected transaction in-place - don't close the drawer
            // and don't refetch (which would trigger filter eviction).
            // Realtime subscription will sync the list in background.
            setSelectedTx(prev => prev && prev.id === txId ? { ...prev, category } as any : prev);
          }}
          tagInsight={tagInsight}
          tagInsightLoading={tagInsightLoading}
          onAskTag={(row) => {
            if (row.kind !== 'committed') return;
            const tx = row.transaction;
            const merchant = tx.merchant_name || 'this transaction';
            const amt = Math.abs(Number(tx.amount || 0)).toFixed(2);
            const cat = tx.category || 'Uncategorized';
            // D-4: calendar date ("Jun 16, 2025"), not the raw UTC timestamp.
            const date = formatCalendarDate((tx as any).posted_at || (tx as any).date, 'medium') || '';
            const injected = `I'm looking at ${merchant} — $${amt}${date ? ' on ' + date : ''} — currently tagged as ${cat}. Can you help me with this?`;
            // Close the drawer, open main Tag, inject the question — Tag's
            // existing auto-send effect will fire handleSend for us.
            setSelectedTx(null);
            // Populate tagPanelTx so the panel can pass focusedTransaction
            // through to the server. Without this, Tag has no structured
            // handle on the row and falls back to merchant-level rule flow.
            setTagPanelTx(tx);
            setTagPanelAccountLabel(typeof tagInsight?.accountLabel === 'string' ? tagInsight.accountLabel : null);
            setTagInjectedMsg(injected);
            setTagPanelOpen(true);
          }}
        />,
        document.body
      )}
    </>
  );
}


