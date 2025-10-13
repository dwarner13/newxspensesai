import React, { useState } from "react";
import { useSyncStatus } from "@/hooks/useSyncStatus";

type Props = { userId: string };

export default function SyncStatusPulse({ userId }: Props) {
  const { status, loading } = useSyncStatus(userId);
  const [busy, setBusy] = useState(false);

  const syncNow = async () => {
    setBusy(true);
    try {
      await fetch(`/.netlify/functions/gmail-sync?userId=${userId}`);
      await fetch(`/.netlify/functions/guardrails-process?userId=${userId}`);
      // Let hook re-fetch on next render cycle (or add a manual refresh)
      setTimeout(() => window.location.reload(), 500);
    } finally {
      setBusy(false);
    }
  };

  const color =
    status.score >= 80 ? "bg-green-500" :
    status.score >= 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center gap-4">
      <div className={`h-4 w-4 rounded-full ${color} animate-pulse`} />
      <div className="flex-1">
        <div className="text-slate-200 font-semibold">Sync Status</div>
        <div className="text-sm text-slate-400">
          {loading ? "Loading..." : (
            <>
              Score: <span className="font-semibold text-slate-200">{status.score}</span> ·
              Ready: {status.ready} · Pending: {status.pending} · Rejected: {status.rejected} ·
              Last sync: {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "—"}
            </>
          )}
        </div>
      </div>
      <button
        onClick={syncNow}
        disabled={busy}
        className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync Now"}
      </button>
    </div>
  );
}


