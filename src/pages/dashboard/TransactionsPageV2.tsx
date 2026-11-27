import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useSetAtom } from 'jotai';
import { Search, ChevronRight, ChevronDown, Upload, Download } from 'lucide-react';
import { useTransactions, readTransactionsPaged } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { PAGED_SELECT_MAX_ROWS } from '@/shared/paged-select';
import { fetchRowsExport, saveBlob } from '@/lib/financialExport';
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
import { useIsMobile } from '@/hooks/useIsMobile';
import { loadChatReturnContext, clearChatReturnContext } from '@/lib/chatReturnContext';
import type { ChatReturnContext } from '@/lib/chatReturnContext';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { allTimeRange, yearRange, type SummaryRequest } from '@/lib/financialSummary';
import { FinancialStateNotice, hasFigures, formatMoney } from '@/components/finance/FinancialState';
import { FINANCIAL_LABELS } from '@/lib/financialLabels';
import { classifyCashFlow } from '@/shared/financial-taxonomy';

const CAT_COLORS: Record<string, string> = {
  'Personal Care': '#ec4899', Subscriptions: '#818cf8', Shopping: '#a78bfa',
  Groceries: '#fbbf24', 'Food & Dining': '#fb923c', Transportation: '#38bdf8',
  Healthcare: '#f87171', 'Bank Fees': '#94a3b8', Income: '#34d399', Other: '#475569',
};
const colorFor = (c?: string) => CAT_COLORS[c || ''] || '#475569';

// UX-FST2-4b (AR-1b R1): rows are classified by the shared engine (classifyCashFlow), the same
// rule the totals use, so a row never reads "Income" while the strip counts it as a refund or a
// card payment. Direction comes from the transaction type; when the type is missing the stored
// amount's sign is used (never merchant patterns). Switch to the AR-1c direction module when it lands.
function classifyRow(t: CommittedTransaction) {
  return classifyCashFlow({ type: (t as { type?: string | null }).type, category: t.category, subcategory: t.subcategory, amount: t.amount });
}
function isInflowRow(t: CommittedTransaction): boolean {
  const c = classifyRow(t);
  if (c.direction === 'inflow') return true;
  if (c.direction === 'outflow') return false;
  return Number(t.amount) > 0;
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
  const { transactions, isLoading, refetch, isComplete: listReadComplete, isTruncated: listReadTruncated } = useTransactions();
  const { userId } = useAuth();
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
  // M-TX: on phones the secondary filters fold behind one "Filters" button.
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // TAG-BUBBLE-1: on phones the floating Tag bubble covered the amount column; Tag opens from
  // the toolbar instead (same action and review count). Desktop keeps the bubble.
  const isPhone = useIsMobile();
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

  // TX-FIRST: the optional compact summary under the summary strip. Closed by default on
  // every width so the transaction list is the first thing on the page; the last choice is
  // remembered (new key — the old 'xai.overview.open' opened the dashboard-style overview).
  const [overviewOpen, setOverviewOpen] = useState(() => {
    try { return window.localStorage.getItem('xai.tx.summary.open') === '1'; }
    catch { return false; }
  });
  useEffect(() => {
    try { window.localStorage.setItem('xai.tx.summary.open', overviewOpen ? '1' : '0'); }
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
  const [tagInboxData, setTagInboxData] = useState<any>(null);
  const [tagActivityOpen, setTagActivityOpen] = useState(false);
  const [pendingSweep, setPendingSweep] = useState<any>(null);
  const [badgePulse, setBadgePulse] = useState(false);
  const [reclassifyPreview, setReclassifyPreview] = useState<any>(null);
  const [tagInjectedMsg, setTagInjectedMsg] = useState<string | null>(null);
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
      if (res.ok) { const d = await res.json(); setTagInboxData(d); }
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
          setTagInjectedMsg(sweepNotif.message);
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
    uncategorizedCount: number;
  };
  const accounts: AccountCard[] = useMemo(() => {
    // K-d: grouping moved unchanged to lib/accountGroups.ts so Categories uses the same accounts.
    const groups = new Map<string, AccountCard>();
    for (const a of groupImportsIntoAccounts(imports)) {
      groups.set(a.id, { ...a, statementCount: 0, uncategorizedCount: 0 });
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

  // Rows in the server scope (date / statement / account): compared with the server's count to
  // tell when the loaded list is incomplete (AR-1b R4, interim until list paging).
  const scoped = useMemo(() => {
    let list = transactions;
    const range = (rangeFrom || rangeTo) && !(rangeFrom && rangeTo && rangeFrom > rangeTo) ? { from: rangeFrom || undefined, to: rangeTo || undefined } : null;
    if (isRangeActive(range)) {
      // X-1: an active custom range replaces the year filter (calendar days, as in Categories).
      list = list.filter(t => inDateRange(calendarDayOfTx(t), range));
    } else if (yearFilter !== 'all' && statementFilter === 'all') {
      // LA-2: a selected statement is its own scope; the year filter does not cut it.
      const y = String(yearFilter);
      list = list.filter(t => {
        const d = (t.date || t.posted_at || (t as any).transaction_date || (t as any).txn_date || '').slice(0, 4);
        return d === y;
      });
    }
    if (statementFilter !== 'all') list = list.filter(t => t.import_id === statementFilter);
    if (accountFilter !== 'all') {
      const acct = accounts.find(a => a.id === accountFilter);
      if (acct) {
        const ids = new Set(acct.importIds);
        list = list.filter(t => ids.has(t.import_id || ''));
      }
    }
    return list;
  }, [transactions, statementFilter, accountFilter, accounts, yearFilter, rangeFrom, rangeTo]);

  const applyClientFilters = useCallback((input: CommittedTransaction[]) => {
    let list = input;
    // Same purposes as the engine's Actual Spending / Actual Income.
    if (filter === 'expenses') list = list.filter(t => classifyRow(t).purpose === 'spending');
    else if (filter === 'income') list = list.filter(t => classifyRow(t).purpose === 'income');
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
  }, [filter, searchQuery, tagCategoryFilter, tagSubcategoryFilter, needsCategoryOnly]);
  const filtered = useMemo(() => applyClientFilters(scoped), [applyClientFilters, scoped]);


  // Duplicate detector — any tx flagged by the drawer's "Mark Duplicate"
  const isDuplicate = (t: CommittedTransaction): boolean =>
    ((t as any).is_duplicate === true) || (t.category === 'Duplicate');

  // UX-FST2-4 (owner 2026-11-26; AR-1b FR-008): the strip shows the shared engine's totals for
  // the date + account/statement scope (server filters). Possible duplicates stay in the totals
  // and are disclosed (owner). Client-only filters (type, review, category, search) show
  // "N of M transactions shown" and NO money. No totals are computed in the browser.
  const summaryReq: SummaryRequest | null = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const customRange = (rangeFrom || rangeTo) && !(rangeFrom && rangeTo && rangeFrom > rangeTo);
    const dates = customRange
      ? { startDate: rangeFrom || '2000-01-01', endDate: rangeTo || today }
      : yearFilter === 'all' || statementFilter !== 'all' ? allTimeRange() : yearRange(Number(yearFilter));
    if (statementFilter !== 'all') return { ...dates, importIds: [statementFilter] };
    if (accountFilter !== 'all') {
      const acct = accounts.find(a => a.id === accountFilter);
      if (!acct || acct.importIds.length === 0) return null;
      return { ...dates, importIds: acct.importIds };
    }
    return dates;
  }, [rangeFrom, rangeTo, yearFilter, statementFilter, accountFilter, accounts]);
  const financial = useFinancialSummary(summaryReq);
  const sum = hasFigures(financial) ? financial.summary : null;
  const clientOnlyFilter = filter !== 'all' || needsCategoryOnly || !!tagCategoryFilter || !!tagSubcategoryFilter || !!searchQuery;
  const dupes = sum?.signals?.possibleDuplicates?.count ?? 0;
  // The list holds fewer rows in scope than the server counted: older rows were not loaded.
  const listIncomplete = !listReadComplete || (!!sum && scoped.length < sum.transactionCount);
  // TX-EXPORT (owner 2026-11-26: no silent transaction limits; no incomplete export presented as
  // complete). A view without client-only filters is exported by the SERVER (financial-export,
  // kind 'rows'): every row in the date / account / statement scope, count-verified, or a refusal
  // in the server's own words. Dates are sent only for a real date range, so an all-time statement
  // export keeps undated rows. A filtered view (search, type, category, Needs category) is built
  // from the complete paged list with the same columns, and refuses while the list is incomplete.
  const handleExport = useCallback(async () => {
    const allTime = !summaryReq || summaryReq.startDate === allTimeRange().startDate;
    if (!clientOnlyFilter && summaryReq) {
      const r = await fetchRowsExport({ importIds: summaryReq.importIds, ...(allTime ? {} : { startDate: summaryReq.startDate, endDate: summaryReq.endDate }) });
      if (r.status === 'ok') {
        saveBlob(r.blob, r.filename);
        toast.success(r.count !== null ? `Exported ${r.count.toLocaleString('en-CA')} transaction${r.count === 1 ? '' : 's'}` : 'Export ready');
      } else if (r.status === 'no_data') {
        toast(r.message);
      } else {
        toast.error(r.message);
      }
      return;
    }
    let exportRows = filtered;
    if (listIncomplete) {
      if (!listReadTruncated) {
        toast.error("Export stopped: not every transaction has loaded, so the file would be incomplete. Please try again.");
        return;
      }
      // The account is over the read ceiling: read just this view's scope, completely, or refuse.
      const ceiling = PAGED_SELECT_MAX_ROWS.toLocaleString('en-CA');
      const narrow = summaryReq && (summaryReq.importIds || !allTime);
      const tooBig = `Your account has more than ${ceiling} transactions, so this filtered view can't be exported yet. Clear the search or filters to export the full period, or choose a year, date range, account or statement.`;
      if (!narrow || !userId || !summaryReq) { toast.error(tooBig); return; }
      const res = await readTransactionsPaged({ userId, importIds: summaryReq.importIds, ...(allTime ? {} : { startDate: summaryReq.startDate, endDate: summaryReq.endDate }) });
      if (!res.complete) { toast.error(res.truncated ? tooBig : "Export stopped: this period couldn't be read completely. Please try again."); return; }
      exportRows = applyClientFilters(res.rows);
    }
    // Same columns as the server file (Date, Merchant, Amount, Category, Subcategory, Statement).
    const accountByImport = new Map<string, string>();
    for (const acct of accounts) for (const id of acct.importIds) accountByImport.set(id, acct.name);
    const cell = (v: string) => {
      const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; // CSV-injection guard, as the server does
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = exportRows.map(t => [
      t.date || t.posted_at?.slice(0, 10) || '',
      cell(t.merchant_name || 'Unknown'),
      (isInflowRow(t) ? '' : '-') + Math.abs(t.amount).toFixed(2),
      cell(t.category || 'Uncategorized'),
      cell(t.subcategory || ''),
      cell(t.import_id ? accountByImport.get(t.import_id) || '' : ''),
    ].join(','));
    const csv = ['Date,Merchant,Amount,Category,Subcategory,Statement', ...rows].join('\r\n');
    saveBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `xspensesai-transactions-filtered-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [filtered, listIncomplete, listReadTruncated, clientOnlyFilter, summaryReq, userId, applyClientFilters, accounts]);

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
  const activeFilterCount =
    (rangeFrom || rangeTo ? 1 : 0) + (yearFilter !== new Date().getFullYear() && !(rangeFrom || rangeTo) ? 1 : 0) +
    (accountFilter !== 'all' ? 1 : 0) + (statementFilter !== 'all' ? 1 : 0) + (tagCategoryFilter ? 1 : 0);
  // X-1: categories present in the loaded transactions, for the toolbar filter.
  const categoryOptions = useMemo(() => Array.from(new Set(transactions.map(t => t.category || 'Uncategorized'))).sort((a, b) => a.localeCompare(b)), [transactions]);

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
  // TX-FIRST: a brand-new account (nothing loaded at all) shows the getting-started card.
  const hasNoTransactions = !isLoading && transactions.length === 0;
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
          {/* M-TX: on phones the title has its own row (actions wrap below it, never over it). */}
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
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
          <button type="button" className="md:hidden flex items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-semibold"
            aria-expanded={mobileFiltersOpen} aria-controls="tx-filters"
            onClick={() => setMobileFiltersOpen(v => !v)}
            style={{ minHeight: 44, background: '#111a2e', borderColor: '#24365a', color: '#e8ecf4' }}>
            Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" className="md:hidden flex items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-semibold"
            onClick={() => setTagPanelOpen(true)}
            aria-label={uncategorizedCount > 0 ? `Ask Tag — ${uncategorizedCount} need review` : 'Ask Tag'}
            style={{ minHeight: 44, background: 'rgba(34,211,238,0.10)', borderColor: 'rgba(34,211,238,0.35)', color: '#67e8f9' }}>
            Ask Tag
            {uncategorizedCount > 0 && <span aria-hidden="true" className="rounded-full px-1.5 text-[12px] font-bold" style={{ background: '#ef4444', color: '#fff', lineHeight: '18px' }}>{uncategorizedCount}</span>}
          </button>
          <div id="tx-filters" className={mobileFiltersOpen ? 'grid grid-cols-2 gap-2 w-full md:contents [&>*]:min-w-0 [&_select]:w-full md:[&_select]:w-auto' : 'hidden md:contents'}>
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
          </div>
          <button type="button" aria-pressed={needsCategoryOnly} onClick={() => setNeedsCategoryOnly(v => !v)}
            className="flex items-center gap-1.5 rounded-[10px] border px-3 text-[14px] font-semibold transition-colors"
            style={{ minHeight: 44, background: needsCategoryOnly ? 'rgba(251,191,36,0.12)' : '#111a2e', borderColor: needsCategoryOnly ? 'rgba(251,191,36,0.45)' : '#24365a', color: needsCategoryOnly ? '#fcd34d' : '#e8ecf4' }}>
            Needs category
          </button>
          <div role="group" aria-label="Transaction type" className="flex p-1 rounded-[10px] bg-slate-800/40 border border-slate-700/30">
            {(['all', 'expenses', 'income'] as const).map(f => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`px-3.5 text-[13px] font-bold rounded-md transition-colors ${filter === f ? 'bg-slate-700/60 text-white' : 'text-slate-400 hover:text-slate-200'}`} style={{ minHeight: 36 }}>
                {f === 'all' ? 'All' : f === 'expenses' ? FINANCIAL_LABELS.actualSpending : FINANCIAL_LABELS.actualIncome}
              </button>
            ))}
          </div>
        </div>

        {/* TX-FIRST: a genuine transaction-first page. One summary strip; an optional compact
            summary opens under it (the dashboard-style account, KPI, chart and insight cards are gone from above the
            list). An account with no transactions gets one getting-started card instead. */}
        {/* LA-2: a single statement shows the same server strip, scoped to that statement. */}
        {!hasNoTransactions && (
          <button
            type="button"
            onClick={() => setOverviewOpen(v => !v)}
            className="w-full flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 py-2.5 mb-3 text-left hover:border-[#2d4a6e] transition-colors"
            style={{ minHeight: 52 }}
            aria-expanded={overviewOpen}
            aria-controls="tx-overview-content"
          >
            {clientOnlyFilter ? (
              <span className="text-[14px] text-slate-300" data-testid="tx-strip-filtered">
                <strong className="text-white tabular-nums">{filtered.length}</strong>{sum ? <> of <strong className="text-white tabular-nums">{sum.transactionCount}</strong></> : null} transaction{(sum ? sum.transactionCount : filtered.length) !== 1 ? 's' : ''} shown
                {listIncomplete && <span className="text-amber-200" data-testid="tx-strip-loaded"> ({scoped.length} loaded)</span>}
                <span className="text-slate-400"> · totals hidden while filters are on</span>
              </span>
            ) : sum ? (
              <>
                <span className="text-[14px] text-slate-300"><strong className="text-white tabular-nums">{sum.transactionCount}</strong> transaction{sum.transactionCount !== 1 ? 's' : ''}</span>
                <span className="text-[14px] text-slate-300">{FINANCIAL_LABELS.withdrawals} <strong className="text-white tabular-nums">{formatMoney(sum.labels.withdrawals.amount, sum.scope.currency)}</strong></span>
                <span className="text-[14px] text-slate-300">{FINANCIAL_LABELS.deposits} <strong className="text-emerald-300 tabular-nums">{formatMoney(sum.labels.deposits.amount, sum.scope.currency)}</strong></span>
                {listIncomplete && <span className="text-[14px] text-amber-200" data-testid="tx-strip-loaded">list shows the latest {scoped.length} loaded</span>}
                {dupes > 0 && <span className="text-[14px] text-amber-200" data-testid="tx-strip-dupes">includes <strong className="tabular-nums">{dupes}</strong> possible duplicate{dupes !== 1 ? 's' : ''}</span>}
              </>
            ) : (
              <span className="text-[14px] text-slate-300"><strong className="text-white tabular-nums">{filtered.length}</strong> transaction{filtered.length !== 1 ? 's' : ''}{financial.status === 'loading' ? '' : ' · figures unavailable'}</span>
            )}
            {uncategorizedCount > 0 && <span className="text-[14px] text-amber-200"><strong className="tabular-nums">{uncategorizedCount}</strong> need review</span>}
            <span className="ml-auto flex items-center gap-1 text-[13px] font-semibold text-slate-400">
              {overviewOpen ? 'Hide summary' : 'Summary'}
              <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${overviewOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
        )}

        {!hasNoTransactions && overviewOpen && (
          <div id="tx-overview-content" className="mb-3 rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3 flex flex-col gap-3">
            {clientOnlyFilter ? (
              <p className="text-[14px] text-slate-400">Clear the filters to see totals for this period.</p>
            ) : !sum ? (
              <FinancialStateNotice state={financial} compact onRetry={financial.status !== 'loading' ? financial.refetch : undefined} />
            ) : (
              <>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-slate-300">
                  <span>{FINANCIAL_LABELS.netCashFlow} <strong className={`tabular-nums ${sum.labels.netCashFlow.amount >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{sum.labels.netCashFlow.amount > 0 ? '+' : ''}{formatMoney(sum.labels.netCashFlow.amount, sum.scope.currency)}</strong></span>
                  <span>{FINANCIAL_LABELS.actualIncome} <strong className="text-white tabular-nums">{formatMoney(sum.labels.actualIncome.amount, sum.scope.currency)}</strong></span>
                  <span>{FINANCIAL_LABELS.actualSpending} <strong className="text-white tabular-nums">{formatMoney(sum.labels.actualSpending.amount, sum.scope.currency)}</strong></span>
                </div>
                {sum.spendingByCategory.length > 0 && (
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-[14px] text-slate-300">
                    {sum.spendingByCategory.slice(0, 4).map(d => (
                      <span key={d.category} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: colorFor(d.category) }} />
                        {d.category} <strong className="text-white tabular-nums">{formatMoney(d.amount, sum.scope.currency)}</strong>
                        <span className="text-slate-500 tabular-nums">{d.share}%</span>
                      </span>
                    ))}
                  </div>
                )}
                {sum.dataQuality && sum.dataQuality.statementCoverage !== 'complete' && (
                  <p className="text-[13px] text-slate-400" data-testid="totals-label">{sum.dataQuality.totalsLabel}</p>
                )}
                {dupes > 0 && (
                  <p className="text-[13px] text-amber-200">These totals include {dupes} possible duplicate{dupes !== 1 ? 's' : ''} (the same transaction imported from two statements). Review them in the list.</p>
                )}
              </>
            )}
            {accounts.length > 1 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Account">
                {[{ id: 'all', name: 'All accounts' }, ...accounts].map(a => (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={accountFilter === a.id}
                    onClick={() => setAccountFilter(a.id)}
                    className={`min-h-[36px] px-3 rounded-full text-[13px] font-semibold border transition-colors ${accountFilter === a.id ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-200' : 'border-slate-700/60 text-slate-300 hover:border-slate-500'}`}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasNoTransactions && (
          <section aria-labelledby="tx-getting-started" className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 px-6 py-8 text-center">
            <h2 id="tx-getting-started" className="text-[20px] font-bold text-white">No transactions yet</h2>
            <p className="mt-2 text-[15px] text-slate-300 max-w-md mx-auto">
              Upload a bank or credit card statement. Byte reads it, Tag categorizes each transaction, and they appear here.
            </p>
            <button type="button" onClick={handleUpload}
              className="mt-5 inline-flex items-center gap-2 px-5 min-h-[44px] text-[14px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-400 hover:to-orange-400 transition-colors">
              <Upload className="h-4 w-4" aria-hidden="true" /> Upload a statement
            </button>
            <p className="mt-3 text-[13px] text-slate-400">PDF, CSV or a photo of a statement.</p>
          </section>
        )}

        {/* TRANSACTION LIST */}
        {!hasNoTransactions && <div className="rounded-xl border border-slate-700/50 bg-slate-900/30">
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
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
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
                const inflow = isInflowRow(t);
                const isDupe = isDuplicate(t);
                const accountName = t.import_id ? accountNameByImport.get(t.import_id) || null : null;
                const dayText = formatCalendarDate(calendarDayOfTx(t), 'medium') || '';
                const amountText = `${inflow ? '+' : '-'}$${fmt(Math.abs(t.amount))}`;
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
                      {/* Category colour dot (the emoji icons rendered as empty boxes on Windows 10). */}
                      {!isUncat && <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colorFor(cat) }} />}
                      <span className="truncate">{categoryText}</span>
                    </span>
                    {/* Amount */}
                    <span aria-hidden="true" className={`shrink-0 text-right text-[16px] md:text-[15px] font-bold tabular-nums ${isDupe ? 'text-red-400 line-through opacity-60' : inflow ? 'text-emerald-400' : 'text-slate-100'}`}>{amountText}</span>
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

          {filtered.length === 0 && !isLoading && (
            <div className="py-12 text-center text-slate-400 text-[14px]">No transactions match these filters.</div>
          )}
        </div>}
      </div>

      {/* Tag floating bubble */}
      {!isPhone && !tagPanelOpen && !selectedTx && location.pathname.includes('/transactions') && createPortal(
        <AgentFloatingBubble letter="T" color="#22d3ee" colorTo="#0891b2" onClick={() => setTagPanelOpen(true)} label="Open Tag Copilot" badgeCount={uncategorizedCount} pulse={badgePulse} />,
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
        // Reliability round 2: these are SUGGESTIONS (nothing saved yet) \u2014 no "done" checkmark.
        const lines = (p.confident_groups ?? []).slice(0, 4).map((g: any) => `Suggested: ${g.merchant_name} \u00d7${g.count} \u2192 ${g.category}`);
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
      {tagPanelOpen && createPortal(<TagCopilotPanel focusedTransaction={tagPanelTx as any} totalCount={transactions.length} categorizedCount={transactions.filter(t => t.category && t.category !== 'Uncategorized' && t.category !== 'Other').length} flaggedCount={uncategorizedCount} avgConfidence={0} rulesCount={0} firstName={firstName} importId={isStatementMode ? statementFilter : undefined} importLabel={isStatementMode ? activeStatementLabel : undefined} importTxCount={isStatementMode ? filtered.length : undefined} injectedMessage={tagInjectedMsg} onBackToPrime={tagFromPrime ? handleBackToPrime : undefined} focusedAccountLabel={tagPanelTx ? tagPanelAccountLabel : null} onBackToTransaction={tagPanelTx ? () => { const tx = tagPanelTx as CommittedTransaction; setTagPanelOpen(false); setTagPanelTx(null); setTagPanelAccountLabel(null); setTagInjectedMsg(null); setTagFromPrime(false); setHighlightTxId(null); setSelectedTx(tx); setTagInsight(null); void fetchTagInsight(tx); } : undefined} onClose={() => { setTagPanelOpen(false); setTagPanelTx(null); setTagPanelAccountLabel(null); setTagInjectedMsg(null); setTagFromPrime(false); setHighlightTxId(null); }} />, document.body)}

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


