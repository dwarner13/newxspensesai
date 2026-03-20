import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useAuth } from '../../contexts/AuthContext';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';
import { runSmartImportPipeline, type SmartImportPipelineResult } from '../../lib/smartImport/runSmartImportPipeline';
import { Upload, CheckCircle, XCircle, Loader2, Clock, Trash2, FolderUp } from 'lucide-react';

type FileStatus = 'queued' | 'processing' | 'complete' | 'error';

type FileEntry = {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  result?: SmartImportPipelineResult;
};

function fileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

const MAX_CONCURRENT_DESKTOP = 2;
const MAX_CONCURRENT_MOBILE = 1;

export default function BulkUploadPage() {
  useScrollToTop();
  const { user, session } = useAuth();
  const { openChat } = useUnifiedChatLauncher();

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const abortRef = useRef(false);

  const stats = useMemo(() => {
    const queued = entries.filter((e) => e.status === 'queued').length;
    const processing = entries.filter((e) => e.status === 'processing').length;
    const complete = entries.filter((e) => e.status === 'complete').length;
    const error = entries.filter((e) => e.status === 'error').length;
    const totalTx = entries.reduce((sum, e) => sum + (e.result?.transactionCount || 0), 0);
    return { queued, processing, complete, error, total: entries.length, totalTx };
  }, [entries]);

  const doneImportIds = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'complete' && e.result)
        .flatMap((e) => {
          const r = e.result!;
          return [
            ...(Array.isArray(r.importIds) ? r.importIds : []),
            ...(r.importId ? [r.importId] : []),
          ];
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    [entries]
  );

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming || []);
    if (list.length === 0) return;
    setEntries((prev) => {
      const byKey = new Map(prev.map((e) => [fileKey(e.file), e]));
      for (const f of list) {
        const key = fileKey(f);
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: `${f.name}-${f.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file: f,
            status: 'queued',
            progress: 0,
          });
        }
      }
      return Array.from(byKey.values());
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id || e.status === 'processing'));
  }, []);

  const clearAll = useCallback(() => {
    if (isRunning) return;
    setEntries([]);
    abortRef.current = false;
  }, [isRunning]);

  const updateEntry = useCallback((id: string, patch: Partial<FileEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const processFile = useCallback(
    async (entry: FileEntry) => {
      if (!user?.id) return;
      updateEntry(entry.id, { status: 'processing', progress: 5 });
      try {
        const result = await runSmartImportPipeline({
          userId: user.id,
          source: 'upload',
          file: entry.file,
          fileName: entry.file.name,
          mimeType: entry.file.type,
          fileSize: entry.file.size,
          lastModified: entry.file.lastModified || 0,
          authToken: session?.access_token,
          onProgress: (p) => updateEntry(entry.id, { progress: p }),
        });
        if (result.rejected) {
          updateEntry(entry.id, {
            status: 'error',
            progress: 100,
            error: result.reason || 'File rejected by OCR',
            result,
          });
        } else {
          updateEntry(entry.id, { status: 'complete', progress: 100, result });
        }
      } catch (err: any) {
        updateEntry(entry.id, {
          status: 'error',
          progress: 0,
          error: err?.message || 'Upload failed',
        });
      }
    },
    [user?.id, session?.access_token, updateEntry]
  );

  const runBulkUpload = useCallback(async () => {
    if (!user?.id || isRunning) return;
    const queued = entries.filter((e) => e.status === 'queued' || e.status === 'error');
    if (queued.length === 0) return;

    // Reset errored entries back to queued
    setEntries((prev) =>
      prev.map((e) => (e.status === 'error' ? { ...e, status: 'queued' as const, progress: 0, error: undefined } : e))
    );

    setIsRunning(true);
    abortRef.current = false;

    const maxConcurrent = isMobile() ? MAX_CONCURRENT_MOBILE : MAX_CONCURRENT_DESKTOP;
    const pending = [...queued];
    const active = new Set<string>();

    const startNext = (): Promise<void> | null => {
      if (abortRef.current || pending.length === 0) return null;
      const entry = pending.shift()!;
      active.add(entry.id);
      return processFile(entry).finally(() => {
        active.delete(entry.id);
      });
    };

    // Process with concurrency limit
    while (pending.length > 0 || active.size > 0) {
      if (abortRef.current) break;
      // Fill up to max concurrent
      const promises: Promise<void>[] = [];
      while (active.size < maxConcurrent && pending.length > 0 && !abortRef.current) {
        const p = startNext();
        if (p) promises.push(p);
      }
      if (promises.length > 0) {
        await Promise.race(promises);
        // Small yield to let state updates propagate
        await new Promise((r) => setTimeout(r, 50));
      } else if (active.size > 0) {
        // Wait for any active to finish
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    setIsRunning(false);
  }, [user?.id, isRunning, entries, processFile]);

  const stopUpload = useCallback(() => {
    abortRef.current = true;
  }, []);

  const openPrimeRecap = useCallback(() => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      routeHint: '/dashboard/prime-chat',
      context: {
        data: {
          source: 'bulk-upload-page',
          intent: 'bulk_upload_recap',
          importIds: doneImportIds,
          uploadedFileCount: stats.complete,
          batchCount: stats.total,
        },
      },
    });
  }, [openChat, doneImportIds, stats]);

  const statusIcon = (status: FileStatus) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <DashboardPageShell
      center={
        <div className="px-4 pb-8">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* Drop zone */}
            <div
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-cyan-400/60 bg-cyan-500/10'
                  : 'border-white/15 bg-white/[0.02] hover:border-white/25'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                addFiles(e.dataTransfer.files);
              }}
            >
              <FolderUp className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 text-lg font-semibold text-white">
                Bulk Upload Statements
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Drop PDFs here or choose files. Processes {isMobile() ? '1' : '2'} at a time.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <label className="cursor-pointer rounded-lg border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 transition-colors">
                  <Upload className="mr-1.5 inline-block h-4 w-4" />
                  Choose files
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.csv,.xlsx,.xls,image/*"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                {!isRunning && entries.length > 0 && (
                  <button
                    type="button"
                    onClick={runBulkUpload}
                    disabled={stats.queued === 0 && stats.error === 0}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40 transition-colors"
                  >
                    Start upload ({stats.queued + stats.error} file{stats.queued + stats.error === 1 ? '' : 's'})
                  </button>
                )}
                {isRunning && (
                  <button
                    type="button"
                    onClick={stopUpload}
                    className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/25 transition-colors"
                  >
                    Stop
                  </button>
                )}
                {!isRunning && entries.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Stats bar */}
            {entries.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-slate-300">
                  {stats.total} file{stats.total === 1 ? '' : 's'}
                </span>
                {stats.processing > 0 && (
                  <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-200">
                    {stats.processing} processing
                  </span>
                )}
                {stats.complete > 0 && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                    {stats.complete} done
                  </span>
                )}
                {stats.error > 0 && (
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-rose-200">
                    {stats.error} failed
                  </span>
                )}
                {stats.totalTx > 0 && (
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-violet-200">
                    {stats.totalTx} transactions
                  </span>
                )}
              </div>
            )}

            {/* File list */}
            {entries.length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="max-h-[28rem] overflow-y-auto divide-y divide-white/[0.06]">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="shrink-0">{statusIcon(entry.status)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-sm text-slate-200">
                            {entry.file.name}
                          </span>
                          <span className="shrink-0 text-[11px] text-slate-500">
                            {(entry.file.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        {entry.status === 'processing' && (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
                              style={{ width: `${entry.progress}%` }}
                            />
                          </div>
                        )}
                        {entry.status === 'error' && entry.error && (
                          <div className="mt-1 text-xs text-rose-400 truncate">
                            {entry.error}
                          </div>
                        )}
                        {entry.status === 'complete' && entry.result?.transactionCount != null && (
                          <div className="mt-0.5 text-xs text-emerald-400/80">
                            {entry.result.transactionCount} transactions imported
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        {entry.status === 'processing' && (
                          <span className="text-[11px] text-cyan-300 tabular-nums">
                            {entry.progress}%
                          </span>
                        )}
                        {(entry.status === 'queued' || entry.status === 'error') && !isRunning && (
                          <button
                            type="button"
                            onClick={() => removeFile(entry.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prime recap + navigation */}
            {stats.complete > 0 && !isRunning && (
              <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5">
                <h3 className="text-sm font-semibold text-violet-100">
                  {stats.complete} statement{stats.complete === 1 ? '' : 's'} processed
                  {stats.totalTx > 0 && ` — ${stats.totalTx} transactions`}
                </h3>
                <p className="mt-1 text-sm text-violet-200/80">
                  Open Prime for a recap, or jump to transactions.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={openPrimeRecap}
                    className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/30 transition-colors"
                  >
                    Open Prime recap
                  </button>
                  <Link
                    to="/dashboard/transactions"
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Transactions
                  </Link>
                  <Link
                    to="/dashboard/smart-categories"
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Categories
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      }
    />
  );
}
