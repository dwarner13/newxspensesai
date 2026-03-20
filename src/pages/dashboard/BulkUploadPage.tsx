import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { runSmartImportPipeline, type SmartImportPipelineResult } from '../../lib/smartImport/runSmartImportPipeline';
import {
  Upload, CheckCircle, XCircle, Loader2, Clock, Trash2, FolderUp,
  AlertTriangle, FileText, RotateCcw, StopCircle, Sparkles, MessageCircle,
} from 'lucide-react';

/* ── constants ── */
const MAX_FILES = 12;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'application/pdf', 'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg', 'image/png', 'image/webp',
]);
const ACCEPTED_EXT = /\.(pdf|csv|xlsx|xls|jpg|jpeg|png|webp)$/i;
const MAX_CONCURRENT = 1;
const TOAST_MS = 8000;

type FileStatus = 'queued' | 'processing' | 'complete' | 'error' | 'rejected';

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  result?: SmartImportPipelineResult;
};

type Toast = { id: string; message: string };

function fkey(f: File) { return `${f.name}::${f.size}::${f.lastModified}`; }
function isMobile() { return typeof window !== 'undefined' && window.innerWidth < 768; }
function isAccepted(f: File) { return ACCEPTED_TYPES.has(f.type) || ACCEPTED_EXT.test(f.name); }
function fmtBytes(b: number) { return b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`; }
function fmtElapsed(ms: number) { const s = Math.floor(ms / 1000); return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`; }

function getImportIds(r: SmartImportPipelineResult): string[] {
  return [
    ...(Array.isArray(r.importIds) ? r.importIds : []),
    ...(r.importId ? [r.importId] : []),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export default function BulkUploadPage() {
  useScrollToTop();
  const { user, session } = useAuth();
  const { openChat } = useUnifiedChatLauncher();

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const entriesRef = useRef<FileEntry[]>([]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const abortRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToasts((p) => [...p, { id, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), TOAST_MS);
  }, []);

  const stats = useMemo(() => {
    const queued = entries.filter((e) => e.status === 'queued').length;
    const processing = entries.filter((e) => e.status === 'processing').length;
    const complete = entries.filter((e) => e.status === 'complete').length;
    const error = entries.filter((e) => e.status === 'error').length;
    const rejected = entries.filter((e) => e.status === 'rejected').length;
    const totalTx = entries.reduce((s, e) => s + (e.result?.transactionCount || 0), 0);
    return { queued, processing, complete, error, rejected, total: entries.length, totalTx };
  }, [entries]);

  const slotsUsed = entries.filter((e) => e.status !== 'rejected').length;

  const overallProgress = useMemo(() => {
    const act = entries.filter((e) => e.status !== 'rejected');
    if (act.length === 0) return 0;
    const sum = act.reduce((a, e) => a + (e.status === 'complete' || e.status === 'error' ? 100 : e.progress), 0);
    return Math.round(sum / act.length);
  }, [entries]);

  /* ── file management ── */
  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;
    setEntries((prev) => {
      const byKey = new Map(prev.map((e) => [fkey(e.file), e]));
      let slots = Array.from(byKey.values()).filter((e) => e.status !== 'rejected').length;
      let added = 0;
      for (const f of list) {
        const k = fkey(f);
        if (byKey.has(k)) continue;
        if (!f.size) { addToast(`Skipped "${f.name}" — empty file`); continue; }
        if (f.size > MAX_FILE_SIZE) { addToast(`Skipped "${f.name}" — exceeds 25 MB (${fmtBytes(f.size)})`); continue; }
        if (!isAccepted(f)) { addToast(`Skipped "${f.name}" — unsupported type`); continue; }
        if (slots + added >= MAX_FILES) { addToast(`Batch limit (${MAX_FILES}) reached. Extra files skipped.`); break; }
        byKey.set(k, { id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, file: f, status: 'queued', progress: 0 });
        added++;
      }
      return Array.from(byKey.values());
    });
  }, [addToast]);

  const removeFile = useCallback((id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id || e.status === 'processing'));
  }, []);

  const clearAll = useCallback(() => {
    if (isRunning) return;
    setEntries([]); abortRef.current = false; setElapsedMs(0);
  }, [isRunning]);

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  /* ── processing ── */
  const processFile = useCallback(async (entry: FileEntry) => {
    if (!user?.id) return;
    updateEntry(entry.id, { status: 'processing', progress: 5 });
    try {
      const result = await runSmartImportPipeline({
        userId: user.id, source: 'upload', file: entry.file,
        fileName: entry.file.name, mimeType: entry.file.type,
        fileSize: entry.file.size, lastModified: entry.file.lastModified || 0,
        authToken: session?.access_token,
        onProgress: (p) => updateEntry(entry.id, { progress: p }),
      });
      if (result.rejected) {
        updateEntry(entry.id, { status: 'rejected', progress: 100, error: result.reason || 'Rejected by OCR', result });
      } else {
        updateEntry(entry.id, { status: 'complete', progress: 100, result });
      }
    } catch (err: any) {
      updateEntry(entry.id, { status: 'error', progress: 0, error: err?.message || 'Upload failed' });
    }
  }, [user?.id, session?.access_token, updateEntry]);

  const runBulkUpload = useCallback(async () => {
    if (!user?.id || isRunning) return;
    const currentEntries = entriesRef.current;
    const actionable = currentEntries.filter((e) => e.status === 'queued' || e.status === 'error');
    if (!actionable.length) return;
    setEntries((p) => p.map((e) => e.status === 'error' ? { ...e, status: 'queued' as const, progress: 0, error: undefined } : e));
    setIsRunning(true); abortRef.current = false;
    startTimeRef.current = Date.now(); setElapsedMs(0);
    timerRef.current = setInterval(() => { if (startTimeRef.current) setElapsedMs(Date.now() - startTimeRef.current); }, 1000);

    const pending = [...actionable];
    const active = new Set<Promise<void>>();
    while ((pending.length > 0 || active.size > 0) && !abortRef.current) {
      while (active.size < MAX_CONCURRENT && pending.length > 0 && !abortRef.current) {
        const e = pending.shift()!;
        const p = processFile(e).then(() => { active.delete(p); });
        active.add(p);
      }
      if (active.size > 0) await Promise.race(active);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null; setIsRunning(false);
  }, [user?.id, isRunning, processFile]);

  const stopUpload = useCallback(() => { abortRef.current = true; }, []);

  const retryFailed = useCallback(() => {
    setEntries((p) => p.map((e) => e.status === 'error' ? { ...e, status: 'queued' as const, progress: 0, error: undefined } : e));
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* ── per-file Ask Prime ── */
  const askPrime = useCallback((entry: FileEntry) => {
    if (!entry.result) return;
    const ids = getImportIds(entry.result);
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      context: {
        data: {
          source: 'bulk-upload-page',
          intent: 'single_import_review',
          importIds: ids,
          fileName: entry.file.name,
          transactionCount: entry.result.transactionCount ?? null,
        },
      },
    });
  }, [openChat]);

  /* ── icons ── */
  const statusIcon = (s: FileStatus) => {
    if (s === 'queued') return <Clock className="w-4 h-4 text-slate-400" />;
    if (s === 'processing') return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
    if (s === 'complete') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (s === 'error') return <XCircle className="w-4 h-4 text-rose-400" />;
    return <AlertTriangle className="w-4 h-4 text-amber-400" />;
  };

  const statusLabel = (s: FileStatus) =>
    s === 'queued' ? 'Queued' : s === 'processing' ? 'Processing' : s === 'complete' ? 'Complete' : s === 'error' ? 'Error' : 'Rejected';

  return (
    <DashboardPageShell
      center={
        <div className="px-4 pb-8">
          <div className="mx-auto max-w-4xl space-y-4">

            {/* Toasts */}
            {toasts.length > 0 && (
              <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
                {toasts.map((t) => (
                  <div key={t.id} className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-sm text-amber-200 shadow-lg backdrop-blur-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{t.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${isDragOver ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-white/15 bg-white/[0.02] hover:border-white/25'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files); }}
            >
              <FolderUp className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-semibold text-white">Bulk Upload Statements</h2>
              <p className="mt-1 text-sm text-slate-400">Drop PDFs here or choose files. Processes 1 file at a time.</p>
              <p className="mt-1 text-xs text-slate-500">{slotsUsed} / {MAX_FILES} slots used &middot; Max {fmtBytes(MAX_FILE_SIZE)} per file</p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer rounded-lg border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition-colors">
                  <Upload className="mr-1.5 inline-block h-4 w-4" />Choose files
                  <input type="file" className="hidden" multiple accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.currentTarget.value = ''; }} />
                </label>

                {!isRunning && entries.length > 0 && (stats.queued + stats.error) > 0 && (
                  <button type="button" onClick={runBulkUpload}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25 transition-colors">
                    <FileText className="mr-1.5 inline-block h-4 w-4" />Start upload ({stats.queued + stats.error})
                  </button>
                )}

                {isRunning && (
                  <button type="button" onClick={stopUpload}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/25 transition-colors">
                    <StopCircle className="mr-1.5 inline-block h-4 w-4" />Stop
                  </button>
                )}

                {!isRunning && stats.error > 0 && (
                  <button type="button" onClick={retryFailed}
                    className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/25 transition-colors">
                    <RotateCcw className="mr-1.5 inline-block h-4 w-4" />Retry failed ({stats.error})
                  </button>
                )}

                {!isRunning && entries.length > 0 && (
                  <button type="button" onClick={clearAll}
                    className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Overall progress */}
            {entries.length > 0 && (isRunning || stats.complete > 0 || stats.error > 0) && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {stats.complete > 0 && <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">{stats.complete} done</span>}
                    {stats.processing > 0 && <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">{stats.processing} processing</span>}
                    {stats.error > 0 && <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-200">{stats.error} failed</span>}
                    {stats.rejected > 0 && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">{stats.rejected} rejected</span>}
                    {stats.totalTx > 0 && <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-violet-200">{stats.totalTx} transactions</span>}
                  </div>
                  {isRunning && elapsedMs > 0 && <span className="text-xs text-slate-500 tabular-nums">{fmtElapsed(elapsedMs)}</span>}
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            )}

            {/* File list */}
            {entries.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="max-h-[32rem] overflow-y-auto divide-y divide-white/[0.06]">
                  {entries.map((entry) => (
                    <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${entry.status === 'rejected' ? 'opacity-50' : 'hover:bg-white/[0.02]'}`}>
                      <div className="shrink-0">{statusIcon(entry.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm text-slate-200">{entry.file.name}</span>
                          <span className="shrink-0 text-[11px] text-slate-500">{fmtBytes(entry.file.size)}</span>
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${
                            entry.status === 'complete' ? 'bg-emerald-500/10 text-emerald-300' :
                            entry.status === 'error' ? 'bg-rose-500/10 text-rose-300' :
                            entry.status === 'rejected' ? 'bg-amber-500/10 text-amber-300' :
                            entry.status === 'processing' ? 'bg-cyan-500/10 text-cyan-300' :
                            'bg-slate-800 text-slate-400'
                          }`}>{statusLabel(entry.status)}</span>
                        </div>
                        {entry.status === 'processing' && (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300" style={{ width: `${entry.progress}%` }} />
                          </div>
                        )}
                        {(entry.status === 'error' || entry.status === 'rejected') && entry.error && (
                          <div className="mt-1 text-xs text-rose-400/80 truncate">{entry.error}</div>
                        )}
                        {entry.status === 'complete' && entry.result?.transactionCount != null && (
                          <div className="mt-0.5 text-xs text-emerald-400/80">{entry.result.transactionCount} transactions imported</div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {entry.status === 'processing' && (
                          <span className="text-[11px] text-cyan-300 tabular-nums">{entry.progress}%</span>
                        )}
                        {entry.status === 'complete' && entry.result && (
                          <button type="button" onClick={() => askPrime(entry)}
                            className="inline-flex items-center gap-1 rounded-md border border-violet-500/40 bg-violet-500/15 px-2 py-1 text-[11px] font-medium text-violet-200 hover:bg-violet-500/25 transition-colors"
                            title="Ask Prime about this statement">
                            <MessageCircle className="h-3 w-3" />Ask Prime
                          </button>
                        )}
                        {(entry.status === 'queued' || entry.status === 'error' || entry.status === 'rejected') && !isRunning && (
                          <button type="button" onClick={() => removeFile(entry.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors" title="Remove">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion summary */}
            {stats.complete > 0 && !isRunning && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-300 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-100">
                      {stats.complete} statement{stats.complete === 1 ? '' : 's'} processed
                      {stats.totalTx > 0 && ` — ${stats.totalTx} transactions`}
                    </h3>
                    <p className="mt-1 text-sm text-emerald-200/80">
                      Click "Ask Prime" on any file above for a focused summary. Tag categorization runs automatically — give it 30-60s.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Link to="/dashboard/transactions" className="text-sm text-cyan-300 hover:text-cyan-200">View Transactions</Link>
                      <Link to="/dashboard/smart-categories" className="text-sm text-cyan-300 hover:text-cyan-200">Categories</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
