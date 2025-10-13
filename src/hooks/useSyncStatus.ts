import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Status = {
  lastSyncAt?: string;
  pending: number;
  ready: number;
  rejected: number;
  score: number; // 0–100
};

export function useSyncStatus(userId: string | null) {
  const [status, setStatus] = useState<Status>({
    lastSyncAt: undefined,
    pending: 0,
    ready: 0,
    rejected: 0,
    score: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const [{ data: sync }, { data: ready }, { data: pending }, { data: rej }] =
        await Promise.all([
          supabase.from("gmail_sync_state").select("last_sync_at").eq("user_id", userId).maybeSingle(),
          supabase.from("user_documents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "ready"),
          supabase.from("user_documents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending"),
          supabase.from("user_documents").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "rejected"),
        ]);

      const readyCount = (ready as any)?.count || 0;
      const pendingCount = (pending as any)?.count || 0;
      const rejectedCount = (rej as any)?.count || 0;

      // Simple score: (ready weight 3, pending 1, reject -1), clamp 0..100
      const raw = readyCount * 3 + pendingCount * 1 - rejectedCount * 1;
      const score = Math.max(0, Math.min(100, Math.round(Math.log10(1 + raw) * 40)));

      setStatus({
        lastSyncAt: (sync as any)?.last_sync_at,
        pending: pendingCount,
        ready: readyCount,
        rejected: rejectedCount,
        score,
      });
      setLoading(false);
    })();
  }, [userId]);

  return { status, loading };
}
