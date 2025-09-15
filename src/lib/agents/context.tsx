import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { UserContext } from './protocol';

const supabase = getSupabase();

const BossCtx = createContext<UserContext | null>(null);

export function BossProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = useState<UserContext | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setCtx(null); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, plan, email')
        .eq('id', user.id)
        .single();

      // OPTIONAL quick stats — ignore failures
      let recentUploads: number | undefined = undefined;
      try {
        const { count } = await supabase
          .from('uploads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        recentUploads = (count ?? 0);
      } catch {}

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
  }, []);

  const value = useMemo(() => ctx, [ctx]);
  return <BossCtx.Provider value={value}>{children}</BossCtx.Provider>;
}

export function useBossContext() {
  return useContext(BossCtx);
}

export { supabase }; // export if employees need it directly
