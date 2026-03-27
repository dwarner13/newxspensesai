import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

const T = {
  bg: '#0b1220',
  surface: '#111a2e',
  border: '#1e2d4a',
  text: '#e8ecf4',
  muted: '#7a8fa6',
  dim: '#4a5568',
  accent: '#c8a64e',
  green: '#34d399',
  red: '#f87171',
  cyan: '#22d3ee',
  amber: '#fbbf24',
};

type StatementRow = {
  id: string;
  filename: string;
  status: string;
  txn_count: number;
  earliest: string | null;
  latest: string | null;
  uploaded_at: string;
};

function statusColor(status: string) {
  if (status === 'committed') return T.green;
  if (status === 'normalizing' || status === 'parsing') return T.amber;
  if (status === 'failed' || status === 'error') return T.red;
  return T.cyan;
}

function statusLabel(status: string) {
  if (status === 'committed') return '✅ Committed';
  if (status === 'normalizing') return '⏳ Processing';
  if (status === 'parsing') return '⏳ Parsing';
  if (status === 'failed' || status === 'error') return '❌ Failed';
  return status;
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export function StatementHistory() {
  const [rows, setRows] = useState<StatementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const sb = getSupabase();
        if (!sb) return;
        const { data: imports } = await sb
          .from('imports')
          .select('id, file_url, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!imports || imports.length === 0) { setLoading(false); return; }

        const results: StatementRow[] = await Promise.all(
          imports.map(async (imp: any) => {
            const filename = (imp.file_url || '').split('/').pop() || 'Unknown';
            const { count, data: txData } = await sb
              .from('transactions')
              .select('date', { count: 'exact' })
              .eq('import_id', imp.id)
              .order('date', { ascending: true });

            const dates = (txData || []).map((t: any) => t.date).filter(Boolean).sort();
            return {
              id: imp.id,
              filename: decodeURIComponent(filename),
              status: imp.status || 'unknown',
              txn_count: count || 0,
              earliest: dates[0] || null,
              latest: dates[dates.length - 1] || null,
              uploaded_at: imp.created_at,
            };
          })
        );

        setRows(results);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 14, background: T.surface, border: `1px solid ${T.border}`, color: T.dim, fontSize: 12 }}>
      Loading statement history...
    </div>
  );

  if (rows.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>
        Statement History
      </div>
      <div style={{ borderRadius: 14, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          {['File', 'Status', 'Transactions', 'Date Range'].map(h => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
          ))}
        </div>
        {/* Rows */}
        {rows.map((row, i) => (
          <div key={row.id} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            padding: '12px 16px',
            borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : 'none',
            background: i % 2 === 0 ? T.bg : `${T.surface}80`,
            alignItems: 'center',
          }}>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
              {row.filename}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: statusColor(row.status) }}>
              {statusLabel(row.status)}
            </div>
            <div style={{ fontSize: 12, color: row.txn_count > 0 ? T.text : T.dim }}>
              {row.txn_count > 0 ? `${row.txn_count} txns` : '—'}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>
              {row.earliest ? `${formatDate(row.earliest)} → ${formatDate(row.latest)}` : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
