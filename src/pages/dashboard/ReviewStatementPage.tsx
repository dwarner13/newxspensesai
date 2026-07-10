/**
 * ReviewStatementPage — /dashboard/review?import_id=...
 *
 * Split-pane review surface for held (parsed_unreconciled) statements.
 * Left: inline PDF viewer. Right: staging rows + edit card + Custodian explanation.
 * Amount edits POST to tx-update-amount which re-runs the reconciliation gate.
 * When gate passes (reconciled: true), the Import button unlocks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { StatementPdfViewer } from '@/components/transactions/StatementPdfViewer';
import type { PendingTransaction } from '@/types/transactions';

const T = {
  bg: '#0b1220', surface: '#111a2e', border: '#1e2d4a',
  text: '#f0f4ff', muted: '#dde4f0', dim: '#b8c4d8',
  accent: '#c8a64e', green: '#34d399', cyan: '#22d3ee',
  red: '#f87171', amber: '#fbbf24',
};

// ── Helpers ──

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function formatAmount(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '+';
  return `${sign}$${abs.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Custodian explanation prompt (inline, not from DB) ──

const CUSTODIAN_REVIEW_PROMPT = `# STATEMENT REVIEW MODE
A "held" statement is one where the parser could not make the transactions add up to
the totals the bank printed. This is a PRODUCT/SYSTEM issue — you explain what the app
read versus what the document says. This is IN SCOPE, NOT bookkeeping or financial
advice. Do not decline it.
You have: the bank's printed totals (totalDeducted, totalAdded), the sum of the parsed
rows, the dollar gap, and confidence flags on rows the parser was unsure of.
HOW TO EXPLAIN: 1) State the gap in plain dollars and which side. 2) Give the likely
cause in one sentence from the confidence flags. 3) Point them at the PDF section to check.
HARD RULE: You may PROPOSE a specific fix but NEVER apply it or write a dollar amount
yourself. Propose \u2192 user verifies against PDF \u2192 user applies. Never skip the middle step.
QUALITY BAR: Explain clearly enough that a non-accountant can fix it in under 2 minutes.`;

// ── Main component ──

export default function ReviewStatementPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { userId, session } = useAuth();
  const importId = params.get('import_id') || '';

  // Staging rows
  const { pendingTransactions: rows, isLoading, refetch } = usePendingTransactions({ importId: importId || null });

  // PDF URL
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLabel, setPdfLabel] = useState('Statement');

  // Gate state
  const [bankTotals, setBankTotals] = useState<{ deducted: number; added: number } | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  // Edit state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Custodian explanation
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Row list filter/expand
  const [rowFilter, setRowFilter] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Responsive: wide (split) vs narrow (tabbed)
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' ? window.innerWidth >= 900 : true);
  const [narrowTab, setNarrowTab] = useState<'statement' | 'transactions'>('transactions');
  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Resolve PDF signed URL (independent of usePendingTransactions) ──
  const [pdfLoading, setPdfLoading] = useState(true);
  useEffect(() => {
    if (!importId || !userId) return;
    setPdfLoading(true);
    const supabase = getSupabase();
    if (!supabase) { setPdfLoading(false); return; }
    (async () => {
      try {
        const { data: imp } = await supabase
          .from('imports')
          .select('file_url, document:user_documents!inner(storage_path, original_name)')
          .eq('id', importId)
          .eq('user_id', userId)
          .single();
        const doc = (imp as any)?.document;
        const storagePath = doc?.storage_path;
        const docName = doc?.original_name || 'Statement';
        setPdfLabel(docName.replace(/\.[^.]+$/, ''));
        if (storagePath) {
          const { data: signed } = await supabase.storage.from('docs').createSignedUrl(storagePath, 3600);
          if (signed?.signedUrl) setPdfUrl(signed.signedUrl);
        }
      } catch (err) {
        console.error('[ReviewStatementPage] PDF resolve failed:', err);
      } finally {
        setPdfLoading(false);
      }
    })();
  }, [importId, userId]);

  // ── Load bank totals from imports.statement_breakdown_json ──
  useEffect(() => {
    if (!importId || !userId) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from('imports')
      .select('statement_breakdown_json, status')
      .eq('id', importId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setImportStatus(data?.status ?? null);
        const sbd = data?.statement_breakdown_json;
        const totals = sbd && typeof sbd === 'object' ? (sbd as any).statementTotals : null;
        if (totals) {
          setBankTotals({
            deducted: Number(totals.totalDeducted) || 0,
            added: Number(totals.totalAdded) || 0,
          });
        }
      });
  }, [importId, userId]);

  // ── Compute row sums (mirrors gate sign convention) ──
  const rowTotals = useMemo(() => {
    let deducted = 0;
    let added = 0;
    for (const r of rows) {
      const amt = Number(r.data_json?.amount);
      if (!Number.isFinite(amt)) continue;
      if (amt < 0) deducted += Math.abs(amt);
      else if (amt > 0) added += amt;
    }
    return { deducted: round2(deducted), added: round2(added) };
  }, [rows]);

  const delta = bankTotals ? {
    deducted: round2(Math.abs(rowTotals.deducted - bankTotals.deducted)),
    added: round2(Math.abs(rowTotals.added - bankTotals.added)),
  } : null;

  const isReconciled = delta ? delta.deducted <= 0.05 && delta.added <= 0.05 : false;

  // ── Save amount edit ──
  const handleSaveAmount = useCallback(async (rowId: string) => {
    if (!session?.access_token || !rowId) return;
    const newAmount = Number(editAmount);
    if (!Number.isFinite(newAmount)) return;
    setSaving(true);
    try {
      const res = await fetch('/.netlify/functions/tx-update-amount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: rowId, amount: newAmount }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportStatus(data.status);
        if (data.bankTotals) setBankTotals(data.bankTotals);
        setEditingRowId(null);
        setEditAmount('');
        await refetch();
      }
    } catch (err) {
      console.error('[ReviewStatementPage] save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [editAmount, session, refetch]);

  // ── Commit (trigger commit-import) ──
  const handleCommit = useCallback(async () => {
    if (!session?.access_token || !importId || committing) return;
    setCommitting(true);
    try {
      // First approve
      await fetch('/.netlify/functions/approve-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ importId }),
      });
      // Then commit
      const res = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ importId }),
      });
      const data = await res.json();
      if (data.ok || data.committed || data.insertedCount) {
        setCommitted(true);
        setTimeout(() => navigate(`/dashboard/transactions?import_id=${importId}`), 2000);
      }
    } catch (err) {
      console.error('[ReviewStatementPage] commit failed:', err);
    } finally {
      setCommitting(false);
    }
  }, [session, importId, userId, committing, navigate]);

  // ── Ask Custodian for explanation ──
  const askCustodian = useCallback(async () => {
    if (!session?.access_token || explaining) return;
    setExplaining(true);
    try {
      const flaggedRows = rows.filter(r => r.data_json?.confidence_flags?.length).map(r => ({
        merchant: r.data_json?.merchant,
        amount: r.data_json?.amount,
        flags: r.data_json?.confidence_flags,
        date: r.data_json?.date,
      }));
      const context = JSON.stringify({
        bankTotals, rowTotals, delta,
        flaggedRows: flaggedRows.slice(0, 10),
        totalRows: rows.length,
      });
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          employeeSlug: 'custodian',
          messages: [{ role: 'user', content: `Review this held statement. Context: ${context}` }],
          systemPromptOverride: CUSTODIAN_REVIEW_PROMPT,
          stream: false,
        }),
      });
      const data = await res.json();
      setExplanation(data?.reply || data?.content || data?.message || 'No explanation available.');
    } catch {
      setExplanation('Could not reach Custodian. Try again.');
    } finally {
      setExplaining(false);
    }
  }, [session, explaining, rows, bankTotals, rowTotals, delta]);

  // ── No import_id ──
  if (!importId) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.dim }}>
        No import_id specified. Navigate here from the Upload page.
      </div>
    );
  }

  // ── Committed success state ──
  if (committed) {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{'\u2705'}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.green, marginBottom: 8 }}>
          Imported {rows.length} transactions
        </div>
        <div style={{ fontSize: 13, color: T.dim }}>Redirecting to transactions{'\u2026'}</div>
      </div>
    );
  }

  // ── Extracted sub-sections for reuse in both layouts ──

  const pdfPane = (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {pdfUrl ? (
        <StatementPdfViewer url={pdfUrl} label={pdfLabel} onClose={() => {}} inline />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.dim, fontSize: 13, gap: 10 }}>
          {pdfLoading ? (
            <>
              <div style={{ width: 20, height: 20, border: '2px solid #22d3ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              Loading PDF{'\u2026'}
            </>
          ) : 'No PDF available for this statement'}
        </div>
      )}
    </div>
  );

  const discrepancyBanner = bankTotals && delta ? (
    <div style={{
      padding: isWide ? '16px 20px' : '12px 14px', borderRadius: 14, marginBottom: isWide ? 20 : 12,
      background: isReconciled ? `${T.green}08` : `${T.amber}08`,
      border: `1px solid ${isReconciled ? T.green : T.amber}22`,
    }}>
      <div style={{ fontSize: isWide ? 14 : 13, fontWeight: 700, color: isReconciled ? T.green : T.amber, marginBottom: 8 }}>
        {isReconciled ? '\u2705 Reconciled — ready to import' : '\u26A0 Statement held — totals don\u2019t match'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr 1fr 1fr' : '1fr 1fr', gap: isWide ? 12 : 8, fontSize: 11 }}>
        <div>
          <div style={{ color: T.dim, marginBottom: 3 }}>Bank printed</div>
          <div style={{ color: T.text }}>Ded: ${bankTotals.deducted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
          <div style={{ color: T.text }}>Add: ${bankTotals.added.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div style={{ color: T.dim, marginBottom: 3 }}>Staged</div>
          <div style={{ color: T.text }}>Ded: ${rowTotals.deducted.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
          <div style={{ color: T.text }}>Add: ${rowTotals.added.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</div>
        </div>
        {isWide && (
          <div>
            <div style={{ color: T.dim, marginBottom: 3 }}>Delta</div>
            <div style={{ color: delta.deducted > 0.05 ? T.red : T.green }}>{'\u0394'} Ded: ${delta.deducted.toFixed(2)}</div>
            <div style={{ color: delta.added > 0.05 ? T.red : T.green }}>{'\u0394'} Add: ${delta.added.toFixed(2)}</div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: T.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Narrow: pinned banner + tab toggle ── */}
      {!isWide && (
        <div style={{ flexShrink: 0, padding: '12px 16px 0', borderBottom: `1px solid ${T.border}` }}>
          {discrepancyBanner}
          <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
            {(['statement', 'transactions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setNarrowTab(tab)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700,
                  textTransform: 'capitalize', cursor: 'pointer',
                  background: 'none', border: 'none',
                  color: narrowTab === tab ? T.accent : T.dim,
                  borderBottom: `2px solid ${narrowTab === tab ? T.accent : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'statement' ? '\uD83D\uDCC4 Statement' : `\uD83D\uDCCB Transactions (${rows.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Narrow: single pane ── */}
      {!isWide && narrowTab === 'statement' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>{pdfPane}</div>
      )}

      {/* ── Wide: side-by-side ── */}
      {isWide && (
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Left: PDF */}
          <div style={{ flex: '0 0 50%', maxWidth: '50%', height: '100%', overflow: 'hidden', borderRight: `1px solid ${T.border}` }}>
            {pdfPane}
          </div>
          {/* Right: review pane */}
          <div style={{ flex: 1, height: '100%', overflow: 'auto', padding: '20px 24px' }}>
            {discrepancyBanner}

        {/* Import button */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={handleCommit}
            disabled={!isReconciled || committing}
            style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: isReconciled ? `linear-gradient(135deg, ${T.green}, #059669)` : T.surface,
              border: isReconciled ? 'none' : `1px solid ${T.border}`,
              color: isReconciled ? '#0b1220' : T.dim,
              cursor: isReconciled ? 'pointer' : 'not-allowed',
              opacity: committing ? 0.6 : 1,
            }}
          >
            {committing ? 'Importing\u2026' : isReconciled ? `\u2705 Import ${rows.length} transactions` : `\u26A0 Fix discrepancy to import`}
          </button>
          <button
            onClick={askCustodian}
            disabled={explaining}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: T.surface, border: `1px solid ${T.border}`,
              color: T.cyan, cursor: 'pointer',
              opacity: explaining ? 0.6 : 1,
            }}
          >
            {explaining ? 'Thinking\u2026' : '\uD83D\uDD27 Ask Custodian'}
          </button>
          <button
            onClick={() => navigate('/dashboard/upload')}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 500,
              background: 'none', border: `1px solid ${T.border}`,
              color: T.dim, cursor: 'pointer',
            }}
          >
            {'\u2190'} Back to Upload
          </button>
        </div>

        {/* Custodian explanation */}
        {explanation && (
          <div style={{
            padding: '16px 20px', borderRadius: 14, marginBottom: 20,
            background: `${T.cyan}06`, border: `1px solid ${T.cyan}18`,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.cyan, marginBottom: 8 }}>
              Custodian {'\u00b7'} Review Assistant
            </div>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {explanation}
            </div>
          </div>
        )}

        {/* Staging rows — sorted: flagged first, then by date */}
        {(() => {
          // Sort: flagged rows first, then by date descending
          const sorted = [...rows].sort((a, b) => {
            const aFlags = (a.data_json as any)?.confidence_flags?.length || 0;
            const bFlags = (b.data_json as any)?.confidence_flags?.length || 0;
            if (aFlags && !bFlags) return -1;
            if (!aFlags && bFlags) return 1;
            return ((b.data_json?.date || '') > (a.data_json?.date || '') ? 1 : -1);
          });
          // Filter by search
          const filterLower = rowFilter.trim().toLowerCase();
          const filtered = filterLower
            ? sorted.filter(r => {
                const dj = r.data_json || {} as any;
                const merchant = String(dj.merchant || dj.description || '').toLowerCase();
                const amtStr = String(dj.amount || '');
                return merchant.includes(filterLower) || amtStr.includes(filterLower);
              })
            : sorted;
          const flaggedCount = filtered.filter(r => (r.data_json as any)?.confidence_flags?.length).length;
          // Default: show flagged rows only (or first 15 if none flagged), unless expanded
          const defaultVisible = flaggedCount > 0
            ? filtered.filter(r => (r.data_json as any)?.confidence_flags?.length)
            : filtered.slice(0, 15);
          const visible = showAll || filterLower ? filtered : defaultVisible;
          const hiddenCount = filtered.length - visible.length;

          return (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {rows.length} staged {flaggedCount > 0 && <span style={{ color: T.amber }}>({flaggedCount} flagged)</span>}
          </div>
          <div style={{ flex: 1 }} />
          <input
            type="text"
            value={rowFilter}
            onChange={e => setRowFilter(e.target.value)}
            placeholder="Filter by merchant or amount\u2026"
            style={{
              width: 200, padding: '5px 10px', fontSize: 11,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.text, outline: 'none',
            }}
          />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: T.dim }}>Loading rows{'\u2026'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visible.map((row: PendingTransaction) => {
              const dj = row.data_json || {} as any;
              const amt = Number(dj.amount) || 0;
              const flags = dj.confidence_flags as string[] | undefined;
              const isEditing = editingRowId === row.id;

              return (
                <div
                  key={row.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px', borderRadius: 10,
                    background: flags?.length ? `${T.amber}06` : T.surface,
                    border: `1px solid ${flags?.length ? T.amber + '18' : T.border}`,
                  }}
                >
                  {/* Date */}
                  <div style={{ width: 70, fontSize: 11, color: T.dim, flexShrink: 0 }}>
                    {dj.date || '\u2014'}
                  </div>

                  {/* Merchant */}
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {dj.merchant || dj.description || 'Unknown'}
                    {flags?.length ? (
                      <span style={{ fontSize: 9, color: T.amber, marginLeft: 6, fontWeight: 400 }}>
                        {flags.join(', ')}
                      </span>
                    ) : null}
                  </div>

                  {/* Amount (editable) */}
                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                      <input
                        type="number"
                        step="0.01"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        autoFocus
                        style={{
                          width: 100, padding: '4px 8px', fontSize: 12,
                          background: T.bg, border: `1px solid ${T.accent}`,
                          borderRadius: 6, color: T.text, outline: 'none',
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveAmount(row.id); if (e.key === 'Escape') { setEditingRowId(null); setEditAmount(''); } }}
                      />
                      <button
                        onClick={() => handleSaveAmount(row.id)}
                        disabled={saving}
                        style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: T.accent, border: 'none', color: '#0b1220', cursor: 'pointer' }}
                      >
                        {saving ? '\u2026' : '\u2713'}
                      </button>
                      <button
                        onClick={() => { setEditingRowId(null); setEditAmount(''); }}
                        style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, background: 'none', border: `1px solid ${T.border}`, color: T.dim, cursor: 'pointer' }}
                      >
                        {'\u2717'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingRowId(row.id); setEditAmount(String(amt)); }}
                      title="Click to edit amount"
                      style={{
                        fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: amt < 0 ? T.text : T.green,
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '2px 6px', borderRadius: 4,
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${T.accent}15`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      {formatAmount(amt)}
                    </button>
                  )}
                </div>
              );
            })}
            {hiddenCount > 0 && !showAll && (
              <button
                onClick={() => setShowAll(true)}
                style={{
                  marginTop: 8, padding: '8px 16px', borderRadius: 8,
                  fontSize: 11, fontWeight: 600, color: T.accent,
                  background: T.surface, border: `1px solid ${T.border}`,
                  cursor: 'pointer', width: '100%', textAlign: 'center',
                }}
              >
                Show all {filtered.length} transactions ({hiddenCount} more)
              </button>
            )}
            {showAll && filtered.length > 15 && (
              <button
                onClick={() => setShowAll(false)}
                style={{
                  marginTop: 8, padding: '6px 12px', borderRadius: 8,
                  fontSize: 11, color: T.dim,
                  background: 'none', border: `1px solid ${T.border}`,
                  cursor: 'pointer', width: '100%', textAlign: 'center',
                }}
              >
                Collapse to flagged only
              </button>
            )}
          </div>
        )}
          </>);
        })()}
          </div>
        </div>
      )}

      {/* ── Narrow: transactions tab ── */}
      {!isWide && narrowTab === 'transactions' && (
        <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px' }}>
          {/* Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <button
              onClick={handleCommit}
              disabled={!isReconciled || committing}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                background: isReconciled ? `linear-gradient(135deg, ${T.green}, #059669)` : T.surface,
                border: isReconciled ? 'none' : `1px solid ${T.border}`,
                color: isReconciled ? '#0b1220' : T.dim,
                cursor: isReconciled ? 'pointer' : 'not-allowed',
                opacity: committing ? 0.6 : 1, flex: 1,
              }}
            >
              {committing ? 'Importing\u2026' : isReconciled ? `\u2705 Import ${rows.length} tx` : '\u26A0 Fix to import'}
            </button>
            <button
              onClick={askCustodian}
              disabled={explaining}
              style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: T.surface, border: `1px solid ${T.border}`,
                color: T.cyan, cursor: 'pointer', opacity: explaining ? 0.6 : 1,
              }}
            >
              {explaining ? '\u2026' : '\uD83D\uDD27'}
            </button>
          </div>
          {/* Custodian (narrow) */}
          {explanation && (
            <div style={{
              padding: '14px 16px', borderRadius: 14, marginBottom: 16,
              background: `${T.cyan}06`, border: `1px solid ${T.cyan}18`,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: T.cyan, marginBottom: 6 }}>
                Custodian
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {explanation}
              </div>
            </div>
          )}
          {/* Rows (narrow) — reuse the same IIFE pattern */}
          {(() => {
            const sorted = [...rows].sort((a, b) => {
              const aF = (a.data_json as any)?.confidence_flags?.length || 0;
              const bF = (b.data_json as any)?.confidence_flags?.length || 0;
              if (aF && !bF) return -1;
              if (!aF && bF) return 1;
              return ((b.data_json?.date || '') > (a.data_json?.date || '') ? 1 : -1);
            });
            const fl = rowFilter.trim().toLowerCase();
            const filtered = fl
              ? sorted.filter(r => { const d = r.data_json || {} as any; return String(d.merchant || d.description || '').toLowerCase().includes(fl) || String(d.amount || '').includes(fl); })
              : sorted;
            const fc = filtered.filter(r => (r.data_json as any)?.confidence_flags?.length).length;
            const dv = fc > 0 ? filtered.filter(r => (r.data_json as any)?.confidence_flags?.length) : filtered.slice(0, 15);
            const vis = showAll || fl ? filtered : dv;
            const hc = filtered.length - vis.length;
            return (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.dim }}>
                  {rows.length} rows {fc > 0 && <span style={{ color: T.amber }}>({fc} flagged)</span>}
                </div>
                <div style={{ flex: 1 }} />
                <input type="text" value={rowFilter} onChange={e => setRowFilter(e.target.value)} placeholder="Filter\u2026"
                  style={{ width: 140, padding: '4px 8px', fontSize: 11, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, outline: 'none' }} />
              </div>
              {vis.map((row: PendingTransaction) => {
                const dj = row.data_json || {} as any;
                const amt = Number(dj.amount) || 0;
                const flags = dj.confidence_flags as string[] | undefined;
                const isEd = editingRowId === row.id;
                return (
                  <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 2, background: flags?.length ? `${T.amber}06` : T.surface, border: `1px solid ${flags?.length ? T.amber + '18' : T.border}` }}>
                    <div style={{ width: 58, fontSize: 10, color: T.dim, flexShrink: 0 }}>{dj.date || '\u2014'}</div>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dj.merchant || dj.description || '?'}</div>
                    {isEd ? (
                      <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                        <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} autoFocus
                          style={{ width: 80, padding: '3px 6px', fontSize: 11, background: T.bg, border: `1px solid ${T.accent}`, borderRadius: 6, color: T.text, outline: 'none' }}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveAmount(row.id); if (e.key === 'Escape') { setEditingRowId(null); setEditAmount(''); } }} />
                        <button onClick={() => handleSaveAmount(row.id)} disabled={saving} style={{ padding: '3px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: T.accent, border: 'none', color: '#0b1220', cursor: 'pointer' }}>{saving ? '\u2026' : '\u2713'}</button>
                        <button onClick={() => { setEditingRowId(null); setEditAmount(''); }} style={{ padding: '3px 6px', borderRadius: 6, fontSize: 10, background: 'none', border: `1px solid ${T.border}`, color: T.dim, cursor: 'pointer' }}>{'\u2717'}</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingRowId(row.id); setEditAmount(String(amt)); }} style={{ fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: amt < 0 ? T.text : T.green, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                        {formatAmount(amt)}
                      </button>
                    )}
                  </div>
                );
              })}
              {hc > 0 && !showAll && (
                <button onClick={() => setShowAll(true)} style={{ marginTop: 6, padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, color: T.accent, background: T.surface, border: `1px solid ${T.border}`, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
                  Show all {filtered.length} ({hc} more)
                </button>
              )}
            </>);
          })()}
        </div>
      )}
    </div>
  );
}
