import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { emitBus, onBus } from '@/lib/bus';
import { toast } from '@/lib/toast';
import type { CommitImportResponse, ImportSummary, FixableIssues } from '@/types/smartImport';
import ImportList from '@/components/smart-import/ImportList';
import StatementUpload from '@/ui/components/Upload/StatementUpload';

type PreviewRow = {
  posted_at: string;
  merchant: string;
  category?: string | null;
  category_confidence?: number | null;
  amount: number;
};

const ACCEPT = {
  ANY: '.pdf,.csv,image/*',
  PDF: '.pdf',
  CSV: '.csv',
  IMG: 'image/*',
};

export default function SmartImportAI() {
  const { userId } = useAuthContext();
  const [searchParams] = useSearchParams();
  const uploadRef = useRef<{ open: (accept?: string[]) => void }>(null);

  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [advisory, setAdvisory] = useState<any | null>(null);
  const [commitResult, setCommitResult] = useState<CommitImportResponse | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [fastMode, setFastMode] = useState(false);
  const isMobile = useMemo(() => /iPhone|Android|iPad/i.test(navigator.userAgent), []);

  // --- Tile handlers --------------------------------------------------------

  const openAny = () => emitBus("UPLOAD_REQUESTED", { source: "tile", accept: [ACCEPT.ANY] });
  const openScan = () => emitBus("UPLOAD_REQUESTED", { source: "tile", accept: [ACCEPT.IMG] });
  const openPdf = () => emitBus("UPLOAD_REQUESTED", { source: "tile", accept: [ACCEPT.PDF] });
  const openCsv = () => emitBus("UPLOAD_REQUESTED", { source: "tile", accept: [ACCEPT.CSV] });
  const enableFast = () => {
    setFastMode(true);
    emitBus("FAST_MODE_TOGGLED", { enabled: true });
    toast.success('Fast Processing enabled for this session');
  };
  const openAiTeam = () => emitBus("WATCH_ME_WORK", { enabled: true });

  // Listen for UPLOAD_REQUESTED events and trigger file picker
  useEffect(() => {
    const unsubscribe = onBus("UPLOAD_REQUESTED", ({ accept }) => {
      if (uploadRef.current) {
        uploadRef.current.open(accept);
      }
    });
    return unsubscribe;
  }, []);

  // Auto-open upload when navigated from dashboard CTA (desktop only)
  useEffect(() => {
    if (searchParams.get('auto') === 'upload' && !isMobile) {
      emitBus("UPLOAD_REQUESTED", { source: "prime", accept: [ACCEPT.ANY] });
    }
  }, [searchParams, isMobile]);

  // When a new import is created by the hidden global uploader:
  useEffect(() => {
    const off = onBus('PARSE_COMPLETED', async ({ importId, previewCount }) => {
      setActiveImportId(importId);
      setAdvisory(null);
      toast.success(`Preview ready — ${previewCount} rows`);
      
      // Fetch actual preview rows for table display
      try {
        const res = await fetch('/.netlify/functions/byte-ocr-parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(fastMode ? { 'x-fast-mode': '1' } : {}),
          },
          body: JSON.stringify({ userId, importId, preview: true }),
        }).then(r => r.json()).catch(() => ({} as any));
        setPreviewRows(res?.preview || []);
      } catch (e: any) {
        emitBus("ERROR", { where: "PREVIEW_FETCH", message: "Failed to fetch preview", detail: e });
      }
    });
    return () => off();
  }, [userId, fastMode]);

  // Commit only (without Prime/Crystal analysis)
  const commitImport = async () => {
    if (!activeImportId) return;
    if (!previewRows?.length) {
      toast.error('Preview is empty — cannot commit.');
      return;
    }
    setIsCommitting(true);
    setCommitError(null);
    setCommitResult(null);
    
    try {
      emitBus("IMPORT_COMMIT_REQUESTED", { importId: activeImportId });

      // Commit staging -> final
      const response = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ userId, importId: activeImportId }),
      });

      const commit: CommitImportResponse = await response.json();
      
      if (!commit.success && !commit.ok && !commit.committed) {
        throw new Error(commit.error || commit.message || 'Commit failed');
      }
      
      setCommitResult(commit);
      emitBus("IMPORT_COMMITTED", { importId: activeImportId, transactionCount: commit.committed || 0 });
      toast.success(`Committed ${commit.committed || 0} transaction${commit.committed !== 1 ? 's' : ''}`);
      
      // Dispatch event to refresh transactions page
      window.dispatchEvent(new CustomEvent('transactionsImported', { 
        detail: { count: commit.committed || 0, documentId: commit.documentId } 
      }));
      
      // Clear preview after successful commit
      setPreviewRows([]);
      setActiveImportId(null);
    } catch (e: any) {
      const errorMsg = e?.message || 'Failed to commit import';
      setCommitError(errorMsg);
      emitBus("ERROR", { where: "COMMIT", message: errorMsg, detail: e });
      toast.error(errorMsg);
    } finally {
      setIsCommitting(false);
    }
  };

  // Approve → Commit → Prime → Crystal
  const approveAndAnalyze = async () => {
    if (!activeImportId) return;
    if (!previewRows?.length) {
      toast.error('Preview is empty — cannot approve.');
      return;
    }
    setIsProcessing(true);
    setCommitError(null);
    setCommitResult(null);
    
    try {
      emitBus("IMPORT_COMMIT_REQUESTED", { importId: activeImportId });

      // 1) Commit staging -> final
      const response = await fetch('/.netlify/functions/commit-import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ userId, importId: activeImportId }),
      });

      const commit: CommitImportResponse = await response.json();
      if (!commit.success && !commit.ok && !commit.committed) {
        throw new Error(commit.error || commit.message || 'Commit failed');
      }
      
      setCommitResult(commit);
      emitBus("IMPORT_COMMITTED", { importId: activeImportId, transactionCount: commit.committed || 0 });
      toast.success(`Committed ${commit.committed || 0} transaction${commit.committed !== 1 ? 's' : ''}`);
      
      // Dispatch event to refresh transactions page
      window.dispatchEvent(new CustomEvent('transactionsImported', { 
        detail: { count: commit.committed || 0, documentId: commit.documentId } 
      }));

      // 1.5) Categorize via Tag (rule-based + normalization)
      emitBus("CATEGORIZATION_REQUESTED", { importId: activeImportId });
      const catResult = await fetch('/.netlify/functions/categorize-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId: activeImportId }),
      }).then(r => r.json()).catch(() => ({ updated: 0 }));
      emitBus("CATEGORIZATION_COMPLETE", { importId: activeImportId, categorized: catResult.updated || 0 });
      
      emitBus("PRIME_HANDOFF_REQUESTED", { importId: activeImportId });

      // 2) Prime handoff
      const hand = await fetch('/.netlify/functions/prime-handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, importId: activeImportId }),
      }).then(r => r.json());
      if (!hand?.handoffId) throw new Error(hand?.error || 'Prime handoff failed');

      emitBus("PRIME_HANDOFF_SENT", { handoffId: hand.handoffId, importId: activeImportId });

      emitBus("CRYSTAL_ANALYZE_REQUESTED", { importId: activeImportId });

      // 3) Crystal analysis
      const c = await fetch('/.netlify/functions/crystal-analyze-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, handoffId: hand.handoffId }),
      }).then(r => r.json());
      if (!c?.summary) throw new Error(c?.error || 'Crystal analysis failed');

      emitBus("CRYSTAL_ADVICE_READY", { importId: activeImportId, adviceId: c.id || hand.handoffId });
      setAdvisory(c);
      toast.success('Crystal's advisory is ready');
    } catch (e: any) {
      emitBus("ERROR", { where: "ORCHESTRATION", message: e?.message || 'Failed to process import', detail: e });
      toast.error(e?.message || 'Failed to process import');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-5 sm:mb-7">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Smart Import AI
          </h1>
          <p className="text-slate-600 mt-1">
            Automatically import and categorize your financial data.
          </p>
        </div>

        {/* Tiles Grid (mobile first) */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            Welcome to Byte's Document Lab
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Tile label="Document Upload" caption="Upload and process files" onClick={() => {
              window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
              openAny();
            }} icon="⬆️" />
            <Tile label="Scan Receipt" caption="Camera-based scanning" onClick={() => {
              window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
              openScan();
            }} icon="📷" />
            <Tile label="Bank Statement" caption="Import bank data" onClick={() => {
              window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
              openPdf();
            }} icon="🏦" />
            <Tile label="CSV Import" caption="Bulk data processing" onClick={() => {
              window.dispatchEvent(new CustomEvent('prime:open', { detail: { intent: 'insights' } }));
              openCsv();
            }} icon="📊" />
            <Tile
              label="Fast Processing"
              caption={fastMode ? 'Fast mode ON' : 'Avg 2–3s preview'}
              onClick={enableFast}
              icon="⚡"
              active={fastMode}
            />
            <Tile label="Watch Me Work" caption="See AI team in action" onClick={openAiTeam} icon="🎯" />
                  </div>
        </section>

        {/* Preview Card */}
        {previewRows?.length > 0 && (
          <section className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                Preview ({previewRows.length} rows)
              </h3>
              {activeImportId && (
                <span className="text-xs text-slate-500">Import ID: {activeImportId.slice(0, 8)}…</span>
              )}
            </div>
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm text-slate-700">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Date</Th>
                    <Th>Merchant</Th>
                    <Th>Category</Th>
                    <Th className="text-right">Amount</Th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                      <Td>{r.posted_at}</Td>
                      <Td>{r.merchant}</Td>
                      <Td>
                        {r.category ? (
                          <div className="inline-flex items-center gap-1 text-sm">
                            <span>{r.category}</span>
                            {r.category_confidence !== undefined && r.category_confidence !== null && (
                              <span className="text-xs opacity-60">
                                ({Math.round(r.category_confidence)}%)
                              </span>
                            )}
          </div>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td className="text-right font-medium">
                        ${Math.abs(Number(r.amount || 0)).toFixed(2)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={commitImport}
                disabled={isCommitting || isProcessing || previewRows.length === 0}
                className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isCommitting ? 'Committing…' : 'Import All'}
              </button>
              <button
                onClick={approveAndAnalyze}
                disabled={isProcessing || isCommitting || previewRows.length === 0}
                className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing…' : 'Approve & Send to Prime & Crystal'}
              </button>
              <button
                onClick={() => {
                  setPreviewRows([]);
                  setCommitResult(null);
                  setCommitError(null);
                }}
                disabled={isProcessing || isCommitting}
                className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-50"
              >
                Clear Preview
              </button>
            </div>
          </section>
        )}

        {/* Commit Error */}
        {commitError && (
          <section className="mb-6 bg-red-50 rounded-xl shadow-sm border-l-4 border-red-500 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-red-800 mb-2">
              Commit Failed
            </h3>
            <p className="text-red-700">{commitError}</p>
          </section>
        )}

        {/* Commit Summary */}
        {commitResult?.summary && (
          <section className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
              Import Summary
            </h3>
            
            {commitResult.summary.dateRange && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="text-xs text-blue-600 mb-1">Date Range</div>
                <div className="text-sm font-medium text-blue-900">
                  {new Date(commitResult.summary.dateRange.startDate).toLocaleDateString()} - {new Date(commitResult.summary.dateRange.endDate).toLocaleDateString()}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-600 mb-1">Total Transactions</div>
                <div className="text-xl font-bold text-slate-900">{commitResult.summary.totalTransactions}</div>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <div className="text-xs text-green-600 mb-1">Total Credits</div>
                <div className="text-xl font-bold text-green-700">${commitResult.summary.totalCredits.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <div className="text-xs text-red-600 mb-1">Total Debits</div>
                <div className="text-xl font-bold text-red-700">${commitResult.summary.totalDebits.toFixed(2)}</div>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <div className="text-xs text-yellow-600 mb-1">Uncategorized</div>
                <div className="text-xl font-bold text-yellow-700">{commitResult.summary.uncategorizedCount}</div>
              </div>
            </div>
            
            {commitResult.summary.topCategories.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Top Categories</h4>
                <div className="space-y-2">
                  {commitResult.summary.topCategories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-slate-50">
                      <span className="text-sm text-slate-700">{cat.category}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">${cat.total.toFixed(2)}</div>
                        <div className="text-xs text-slate-500">{cat.count} transaction{cat.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Fixable Issues */}
        {commitResult?.issues && (
          <section className="mb-6 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
              Fixable Issues
            </h3>
            
            {commitResult.issues.unassignedCategories.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-yellow-700 mb-2">
                  Unassigned Categories ({commitResult.issues.unassignedCategories.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {commitResult.issues.unassignedCategories.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-yellow-50 border border-yellow-200">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-800">{item.merchant}</div>
                        <div className="text-xs text-slate-500">{item.date}</div>
                      </div>
                      <div className="text-sm font-medium text-slate-900">${item.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {commitResult.issues.possibleDuplicates.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-700 mb-2">
                  Possible Duplicates ({commitResult.issues.possibleDuplicates.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {commitResult.issues.possibleDuplicates.map((dup, i) => (
                    <div key={i} className="p-2 rounded bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-slate-800">{dup.description}</div>
                        <div className="text-xs text-orange-600">{(dup.similarity * 100).toFixed(0)}% similar</div>
                      </div>
                      <div className="text-xs text-slate-600">
                        {dup.date} • ${dup.amount.toFixed(2)} • {dup.transactionIds.length} transaction{dup.transactionIds.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {commitResult.issues.unassignedCategories.length === 0 && commitResult.issues.possibleDuplicates.length === 0 && (
              <div className="text-sm text-slate-600 text-center py-4">
                ✅ No issues detected! All transactions are properly categorized and unique.
              </div>
            )}
          </section>
        )}

        {/* Advisory Result */}
        {advisory && (
          <section className="mb-10 bg-white rounded-xl shadow-sm border-l-4 border-green-500 p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">
              Crystal's Advisory
            </h3>
            <p className="text-slate-700">{advisory.summary}</p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {advisory.budgetImpact && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-slate-800">
                  <strong>Budget Impact:</strong> {advisory.budgetImpact}
                </div>
              )}
              {advisory.forecastDelta && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-slate-800">
                  <strong>Forecast Delta:</strong> {advisory.forecastDelta}
                </div>
              )}
                </div>

            <div className="mt-4 flex gap-4">
              <a href="/transactions" className="text-blue-600 hover:underline">→ View Transactions</a>
              <a href="/insights" className="text-blue-600 hover:underline">→ View Insights</a>
            </div>
          </section>
        )}

        {/* Import History Section */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            Import History
          </h2>
          <ImportList 
            onImportSelected={(importId) => {
              // Optionally handle import selection (e.g., show details)
              console.log('Import selected:', importId);
            }}
          />
        </section>

        {/* Hidden StatementUpload component - handles file picker via event bus */}
        <div className="hidden">
          <StatementUpload ref={uploadRef} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Small presentational helpers ---------- */

function Tile({
  label,
  caption,
  onClick,
  icon,
  active,
}: {
  label: string;
  caption: string;
  icon?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'rounded-2xl p-4 text-left shadow-sm border transition',
        active
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white border-slate-200 hover:border-slate-300',
      ].join(' ')}
    >
      <div className="text-2xl mb-2">{icon || '📄'}</div>
      <div className="font-semibold">{label}</div>
      <div className={active ? 'text-blue-100 text-sm' : 'text-slate-500 text-sm'}>
        {caption}
      </div>
    </button>
  );
}

function Th({ children, className = '' }: any) {
  return <th className={`px-3 sm:px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: any) {
  return <td className={`px-3 sm:px-4 py-2 align-middle ${className}`}>{children}</td>;
}
