/**
 * useTeamActivitySummary
 *
 * Queries recent chat_messages grouped by employee slug to build
 * a team activity summary that Prime can reference.
 */

import { useState, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentActivity {
  agent: string;
  slug: string;
  lastMessage: string;
  timestamp: string;
}

export interface TeamActivitySummary {
  activities: AgentActivity[];
  summaryText: string;
  loading: boolean;
}

const AGENT_DISPLAY: Record<string, string> = {
  prime: 'Prime',
  byte: 'Byte',
  tag: 'Tag',
  crystal: 'Crystal',
  goalie: 'Goalie',
  ledger: 'Ledger',
};

export function useTeamActivitySummary(): TeamActivitySummary {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const supabase = getSupabase();
    if (!supabase) { setLoading(false); return; }

    (async () => {
      try {
        // Get recent assistant messages grouped by employee key
        // Using a single query ordered by created_at desc, then deduplicating client-side
        const { data, error } = await supabase
          .from('chat_messages')
          .select('content, role, created_at, meta')
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          // Table might not exist or RLS blocks — gracefully handle
          setLoading(false);
          return;
        }

        const seen = new Set<string>();
        const results: AgentActivity[] = [];

        for (const row of (data || [])) {
          const meta = (row.meta && typeof row.meta === 'object') ? row.meta as Record<string, unknown> : {};
          const slug = String(meta.employee_key || meta.employee_slug || 'prime');
          const key = slug.split('-')[0]; // 'prime-boss' → 'prime'

          if (seen.has(key)) continue;
          seen.add(key);

          const content = String(row.content || '').slice(0, 120);
          if (!content.trim()) continue;

          results.push({
            agent: AGENT_DISPLAY[key] || key,
            slug,
            lastMessage: content + (String(row.content || '').length > 120 ? '...' : ''),
            timestamp: String(row.created_at || ''),
          });

          if (results.length >= 6) break; // Max 6 agents
        }

        setActivities(results);
      } catch {
        // Silently fail — not critical
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // Build summary text for Prime's context
  const summaryText = activities.length > 0
    ? 'Recent AI Team Activity:\n' + activities.map(a =>
        `- ${a.agent}: ${a.lastMessage}`
      ).join('\n')
    : '';

  return { activities, summaryText, loading };
}
