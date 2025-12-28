import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserContext } from './protocol';

const supabase = getSupabase();

const BossCtx = createContext<UserContext | null>(null);

export function BossProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<UserContext | null>(null);
  const { userId, isDemoUser, ready } = useAuth();

  useEffect(() => {
    // Only fetch when auth is ready AND userId exists AND is NOT a demo user
    if (!ready || !userId || isDemoUser) {
      setCtx(null);
      return;
    }

    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) { 
        setCtx(null); 
        return; 
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, plan, email')
        .eq('id', user.id)
        .single();

      // OPTIONAL quick stats — ignore failures
      // NOTE: 'uploads' table doesn't exist - using 'user_documents' instead
      let recentUploads: number | undefined = undefined;
      try {
        const { count } = await supabase
          .from('user_documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        recentUploads = (count ?? 0);
      } catch (err) {
        // Silently ignore - this is optional stats
        if (import.meta.env.DEV) {
          console.warn('[BossProvider] Failed to fetch upload stats:', err);
        }
      }

      if (active) {
        setCtx({
          userId: user.id,
          name: profile?.full_name ?? undefined,
          plan: profile?.plan ?? undefined,
          email: profile?.email ?? undefined,
          recentUploads,
          nextBillDueDays: null,
          goalsCount: null,
        });
      }
    })();
    return () => { active = false; };
  }, [ready, userId, isDemoUser]);

  const value = useMemo(() => ctx, [ctx]);
  return <BossCtx.Provider value={value}>{children}</BossCtx.Provider>;
}

export function useBossContext() {
  return useContext(BossCtx);
}

export { supabase }; // export if employees need it directly
