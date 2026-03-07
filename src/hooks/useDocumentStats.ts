import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface DocumentStats {
  queue: { pending: number; processing: number; completed: number };
  monthly: { totalThisMonth: number; totalLastMonth: number; deltaPercent: number };
  health: { status: 'good' | 'degraded' | 'down'; lastProcessedAt?: string };
}

export function useDocumentStats() {
  const { user } = useAuth();
  const [data, setData] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!user?.id) { setData(null); setIsLoading(false); return; }
    let mounted = true;

    const fetchStats = async () => {
      try {
        setIsLoading(true); setIsError(false);
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 3600000);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const { data: docs, error } = await supabase
          .from('user_documents')
          .select('id, created_at, ocr_completed_at, status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!mounted) return;

        const recentlyCompleted = docs?.filter(d => d.ocr_completed_at && new Date(d.ocr_completed_at) > oneHourAgo).length || 0;
        const thisMonth = docs?.filter(d => new Date(d.created_at) >= thisMonthStart).length || 0;
        const lastMonth = docs?.filter(d => { const c = new Date(d.created_at); return c >= lastMonthStart && c < thisMonthStart; }).length || 0;
        const processing = docs?.filter(d => !d.ocr_completed_at && d.status !== 'rejected').length || 0;
        const lastDoc = docs?.[0];
        const lastProcessedAt = lastDoc?.ocr_completed_at || lastDoc?.created_at;

        const stuckProcessing = docs?.filter(d => !d.ocr_completed_at && d.status !== 'rejected' && new Date(d.created_at) < new Date(now.getTime() - 300000)).length || 0;
        setData({
          queue: { pending: 0, processing, completed: recentlyCompleted },
          monthly: { totalThisMonth: thisMonth, totalLastMonth: lastMonth, deltaPercent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0 },
          health: { status: stuckProcessing > 0 ? 'degraded' : 'good', lastProcessedAt }
        });
      } catch (error) {
        console.error('[useDocumentStats]', error);
        if (mounted) setIsError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [user?.id]);

  return { data, isLoading, isError };
}
