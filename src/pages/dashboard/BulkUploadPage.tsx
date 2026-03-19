import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardPageShell } from '../../components/layout/DashboardPageShell';
import { useScrollToTop } from '../../hooks/useScrollToTop';
import { useAuth } from '../../contexts/AuthContext';
import { useSmartImport } from '../../hooks/useSmartImport';
import { useUnifiedChatLauncher } from '../../hooks/useUnifiedChatLauncher';

type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed';

type BatchRun = {
  id: string;
  index: number;
  total: number;
  fileCount: number;
  status: BatchStatus;
  importIds: string[];
  error?: string;
};

const BATCH_SIZE = 3;

function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

function fileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export default function BulkUploadPage() {
  useScrollToTop();
  const { user } = useAuth();
  const { openChat } = useUnifiedChatLauncher();
  const smartImport = useSmartImport(user?.id || undefined, 'upload');

  const [files, setFiles] = useState<File[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [batchRuns, setBatchRuns] = useState<BatchRun[]>([]);
  const [doneImportIds, setDoneImportIds] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const totalBatches = useMemo(() => Math.ceil(files.length / BATCH_SIZE), [files.length]);
  const completedBatches = useMemo(
    () => batchRuns.filter((b) => b.status === 'completed').length,
    [batchRuns]
  );
  const failedBatches = useMemo(
    () => batchRuns.filter((b) => b.status === 'failed').length,
    [batchRuns]
  );

  const addFiles = (incoming: FileList | File[]) => {
    const incomingList = Array.from(incoming || []);
    if (incomingList.length === 0) return;
    setFiles((prev) => {
      const byKey = new Map(prev.map((f) => [fileKey(f), f]));
      for (const f of incomingList) byKey.set(fileKey(f), f);
      return Array.from(byKey.values());
    });
  };

  const removeFile = (target: File) => {
    const key = fileKey(target);
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
  };

  const clearAll = () => {
    if (isRunning) return;
    setFiles([]);
    setBatchRuns([]);
    setDoneImportIds([]);
    setLastError(null);
  };

  const runBulkUpload = async () => {
    if (!user?.id) {
      setLastError('Please log in again before running bulk upload.');
      return;
    }
    if (files.length === 0) {
      setLastError('Add at least one file first.');
      return;
    }

    const batches = splitIntoBatches(files, BATCH_SIZE);
    const runRows: BatchRun[] = batches.map((batch, idx) => ({
      id: `bulk-batch-${Date.now()}-${idx + 1}`,
      index: idx + 1,
      total: batches.length,
      fileCount: batch.length,
      status: 'pending',
      importIds: [],
    }));

    setBatchRuns(runRows);
    setDoneImportIds([]);
    setLastError(null);
    setIsRunning(true);

    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      setBatchRuns((prev) =>
        prev.map((row, idx) => (idx === i ? { ...row, status: 'processing', error: undefined } : row))
      );

      try {
        const results = await smartImport.uploadFiles(user.id, batch, 'upload');
        const importIds = Array.from(
          new Set(
            (Array.isArray(results) ? results : [])
              .flatMap((result: any) => [
                ...(Array.isArray(result?.importIds) ? result.importIds : []),
                ...(result?.importId ? [result.importId] : []),
              ])
              .map((value: any) => String(value || '').trim())
              .filter(Boolean)
          )
        );
        setDoneImportIds((prev) => Array.from(new Set([...prev, ...importIds])));
        setBatchRuns((prev) =>
          prev.map((row, idx) =>
            idx === i ? { ...row, status: 'completed', importIds } : row
          )
        );
      } catch (err: any) {
        const message = String(err?.message || 'Batch failed');
        setBatchRuns((prev) =>
          prev.map((row, idx) =>
            idx === i ? { ...row, status: 'failed', error: message } : row
          )
        );
        setLastError(message);
      }
    }

    setIsRunning(false);
  };

  const openPrimeRecap = () => {
    openChat({
      initialEmployeeSlug: 'prime-boss',
      force: true,
      routeHint: '/dashboard/prime-chat',
      context: {
        data: {
          source: 'bulk-upload-page',
          intent: 'bulk_upload_recap',
          importIds: doneImportIds,
          uploadedFileCount: files.length,
          batchCount: totalBatches,
        },
      },
    });
  };

  return (
    <DashboardPageShell
      center={
        <div className="px-4">
          <div className="mx-auto max-w-5xl space-y-4">
            <div className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6 backdrop-blur-md">
              <h2 className="text-2xl font-bold tracking-tight text-white">Bulk Upload Statements</h2>
              <p className="mt-2 text-sm text-slate-400">
                Drop your full year of statements. The system auto-batches files in groups of 3 and runs them in sequence.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Recommended: up to 30 files per run for the most reliable processing.
              </p>

              <div
                className="mt-5 rounded-xl border border-dashed border-white/20 bg-slate-950/40 p-6"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <p className="text-sm text-slate-300">Drag and drop files here, or choose files manually.</p>
                <p className="mt-1 text-xs text-slate-500">Supports PDF, CSV, XLSX, XLS, JPG, PNG.</p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className="cursor-pointer rounded-lg border border-violet-500/40 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20">
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
                  <button
                    type="button"
                    onClick={runBulkUpload}
                    disabled={isRunning || files.length === 0}
                    className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 disabled:opacity-50"
                  >
                    {isRunning ? 'Processing batches...' : `Start bulk upload (${totalBatches || 0} batch${totalBatches === 1 ? '' : 'es'})`}
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={isRunning}
                    className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm text-slate-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-slate-200">
                  Files queued: {files.length}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-slate-200">
                  Batches: {totalBatches}
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  Completed: {completedBatches}
                </span>
                <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-rose-200">
                  Failed: {failedBatches}
                </span>
              </div>

              {lastError && (
                <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  Last error: {lastError}
                </div>
              )}

              <div className="mt-4 grid gap-2">
                {batchRuns.map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-slate-950/35 px-3 py-2"
                  >
                    <div className="text-sm text-slate-200">
                      Batch {batch.index}/{batch.total} - {batch.fileCount} file{batch.fileCount === 1 ? '' : 's'}
                    </div>
                    <div className="text-xs">
                      {batch.status === 'pending' && <span className="text-slate-400">Pending</span>}
                      {batch.status === 'processing' && <span className="text-cyan-300">Processing</span>}
                      {batch.status === 'completed' && <span className="text-emerald-300">Completed</span>}
                      {batch.status === 'failed' && <span className="text-rose-300">{batch.error || 'Failed'}</span>}
                    </div>
                  </div>
                ))}
                {batchRuns.length === 0 && (
                  <div className="text-sm text-slate-500">No batches started yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white">Queued files</h3>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                {files.map((f) => (
                  <div
                    key={fileKey(f)}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-slate-950/35 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{f.name}</div>
                      <div className="text-xs text-slate-500">{(f.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => removeFile(f)}
                      className="rounded-md border border-white/[0.12] px-2 py-1 text-xs text-slate-300 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {files.length === 0 && (
                  <div className="text-sm text-slate-500">No files selected.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5">
              <h3 className="text-sm font-semibold text-violet-100">Prime recap + next steps</h3>
              <p className="mt-1 text-sm text-violet-200/90">
                After batches finish, open Prime for a recap and jump directly into review flows.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openPrimeRecap}
                  className="rounded-lg border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100"
                >
                  Open Prime recap
                </button>
                <Link to="/dashboard/transactions" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Go to Transactions
                </Link>
                <Link to="/dashboard/smart-categories" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Go to Categories
                </Link>
                <Link to="/dashboard/ai-results" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Go to AI Results
                </Link>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

