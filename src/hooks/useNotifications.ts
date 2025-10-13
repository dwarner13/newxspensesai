import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export function useNotifications(supabase: ReturnType<typeof createClient>, userId?: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Load initial notifications
    supabase
      .from('user_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .eq('user_id', userId)
      .then(({ data }) => {
        if (mounted && data) {
          setItems(data);
        }
        setLoading(false);
      });

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notif')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setItems(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  return { items, loading };
}

