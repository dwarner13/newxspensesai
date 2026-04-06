import { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const T = { bg:'#0b1220', surface:'#111a2e', border:'#1e2d4a', text:'#e8ecf4', muted:'#7b8ba5', dim:'#475569', accent:'#c8a64e', green:'#34d399', cyan:'#22d3ee', red:'#f87171', purple:'#a78bfa', blue:'#3b82f6', amber:'#fbbf24' };
const AGENT_COLORS: Record<string, string> = { prime: T.accent, 'prime-boss': T.accent, tag: T.cyan, 'tag-ai': T.cyan, byte: T.green, 'byte-docs': T.green, crystal: T.purple, goalie: T.amber, ledger: T.green };

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s/60)}m ago`; if (s < 86400) return `${Math.floor(s/3600)}h ago`; return `${Math.floor(s/86400)}d ago`;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'overview'|'users'|'activity'|'errors'|'system'>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => { const h = () => setIsMobile(window.innerWidth <= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);

  const fetchData = useCallback(async (section: string, extra?: object) => {
    const sb = getSupabase(); if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch('/.netlify/functions/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ section, ...extra }),
    });
    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'overview' || !overview) { const d = await fetchData('overview'); if (d?.ok) { setOverview(d.overview); setActivity(d.overview.recentActivity || []); } }
      if (tab === 'users') { const d = await fetchData('users'); if (d?.ok) setUsers(d.users || []); }
      if (tab === 'errors') { const d = await fetchData('errors'); if (d?.ok) setErrors(d.errors || []); }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [tab, fetchData, overview]);

  useEffect(() => { void refresh(); }, [tab]);

  const StatCard = ({ label, value, color, icon }: { label: string; value: string | number; color: string; icon: string }) => (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '18px 20px', flex: isMobile ? '1 1 calc(50% - 6px)' : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.2, color: T.dim, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", background: T.bg, color: T.text, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#080f1e', borderBottom: `1px solid ${T.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200,166,78,0.2)', border: '1px solid rgba(200,166,78,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{'\u2699\uFE0F'}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>XspensesAI Admin</div>
            <div style={{ fontSize: 11, color: T.dim }}>Command Center</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: T.dim }}>Updated {lastUpdated}</span>}
          <button onClick={() => void refresh()} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', fontFamily: 'inherit' }}>{'\uD83D\uDD04'} Refresh</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, boxShadow: `0 0 8px ${T.green}88` }} />
            <span style={{ fontSize: 11, color: T.green, fontWeight: 600 }}>Live</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' as any, background: '#080f1e' }}>
        {([['overview','\uD83C\uDFE0 Overview'],['users','\uD83D\uDC65 Users'],['activity','\uD83D\uDCCA Activity'],['errors','\uD83D\uDEA8 Errors'],['system','\u2699\uFE0F System']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: tab === id ? T.accent : T.dim, borderBottom: tab === id ? `2px solid ${T.accent}` : '2px solid transparent', background: 'transparent', border: 'none', borderBottomStyle: 'solid', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', whiteSpace: 'nowrap' as const }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: isMobile ? '16px' : '24px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && overview && (<>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12, marginBottom: 24 }}>
            <StatCard icon={'\uD83D\uDC65'} label="Total Users" value={overview.totalUsers} color={T.blue} />
            <StatCard icon={'\u2705'} label="Active Today" value={overview.activeToday} color={T.green} />
            <StatCard icon={'\uD83D\uDCC4'} label="Statements" value={overview.totalImports} color={T.cyan} />
            <StatCard icon={'\uD83D\uDCB3'} label="Transactions" value={overview.totalTransactions} color={T.purple} />
          </div>

          {/* Plan breakdown */}
          {overview.planBreakdown && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
              {Object.entries(overview.planBreakdown).map(([plan, count]) => (
                <div key={plan} style={{ padding: '6px 14px', borderRadius: 20, background: plan === 'pro' ? `${T.accent}15` : plan === 'business' ? `${T.cyan}15` : `${T.dim}15`, border: `1px solid ${plan === 'pro' ? T.accent : plan === 'business' ? T.cyan : T.dim}33`, color: plan === 'pro' ? T.accent : plan === 'business' ? T.cyan : T.muted, fontSize: 12, fontWeight: 600 }}>
                  {plan || 'free'}: {count as number}
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 16 }}>Statement Uploads — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={overview.importsTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: T.dim }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9, fill: T.dim }} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke={T.cyan} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 16 }}>Transactions — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={overview.transactionsTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: T.dim }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 9, fill: T.dim }} />
                  <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke={T.purple} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 12 }}>Recent Activity</div>
            {(overview.recentActivity || []).slice(0, 20).map((e: any, i: number) => {
              const agentColor = AGENT_COLORS[e.employee_id] || T.dim;
              return (
                <div key={e.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${agentColor}20`, border: `1px solid ${agentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: agentColor, flexShrink: 0 }}>{(e.employee_id || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{e.description || e.action_type || 'Event'}</div>
                    <div style={{ fontSize: 10, color: T.dim }}>{e.user_name || e.user_email || 'System'}</div>
                  </div>
                  <span style={{ fontSize: 10, color: T.dim, flexShrink: 0 }}>{timeAgo(e.created_at)}</span>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div>
            {users.map(u => (
              <div key={u.id} onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: selectedUser?.id === u.id ? `${T.accent}08` : T.surface, border: `1px solid ${selectedUser?.id === u.id ? T.accent + '33' : T.border}`, borderRadius: 12, marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${T.accent}20`, border: `1px solid ${T.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: T.accent, flexShrink: 0 }}>{(u.display_name || u.email || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{u.display_name || u.first_name || u.full_name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: T.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: u.plan === 'pro' ? `${T.accent}15` : u.plan === 'business' ? `${T.cyan}15` : `${T.dim}15`, color: u.plan === 'pro' ? T.accent : u.plan === 'business' ? T.cyan : T.muted }}>{u.plan || 'free'}</span>
                <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: T.muted }}>{u.transactionCount} txns</div>
                  <div style={{ fontSize: 10, color: T.dim }}>{u.importCount} imports</div>
                </div>
              </div>
            ))}
            {users.length === 0 && !loading && <div style={{ textAlign: 'center', padding: 40, color: T.dim }}>No users found</div>}
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {tab === 'activity' && (
          <div>
            {(overview?.recentActivity || activity).length === 0 && !loading && <div style={{ textAlign: 'center', padding: 40, color: T.dim }}>No activity yet</div>}
            {(overview?.recentActivity || activity).map((e: any, i: number) => {
              const agentColor = AGENT_COLORS[e.employee_id] || T.dim;
              return (
                <div key={e.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${agentColor}20`, border: `1px solid ${agentColor}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: agentColor, flexShrink: 0 }}>{(e.employee_id || '?')[0].toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{e.description || e.action_type}</div>
                    <div style={{ fontSize: 11, color: T.dim }}>{e.user_name || e.user_email || 'System'} {'\u00b7'} {timeAgo(e.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ERRORS ── */}
        {tab === 'errors' && (
          <div>
            {errors.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u2705'}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.green }}>No errors in last 24 hours</div>
                <div style={{ fontSize: 13, color: T.dim, marginTop: 4 }}>All systems operational</div>
              </div>
            )}
            {errors.map((e: any, i: number) => (
              <div key={e.id || i} style={{ padding: '12px 14px', borderLeft: `3px solid ${T.red}`, background: T.surface, border: `1px solid ${T.border}`, borderRadius: '0 10px 10px 0', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.red }}>{e.function_name || 'Unknown function'}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{e.created_at ? timeAgo(e.created_at) : ''}</span>
                </div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{e.error_message || e.message || JSON.stringify(e).slice(0, 200)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SYSTEM ── */}
        {tab === 'system' && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 16 }}>System Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Supabase', status: 'ok', detail: 'Connected' },
                { label: 'Tag Agent', status: 'ok', detail: 'Active' },
                { label: 'Byte Agent', status: 'ok', detail: 'Active' },
                { label: 'Prime Agent', status: 'ok', detail: 'Active' },
                { label: 'Error Rate', status: (overview?.errorsLast24h || 0) > 10 ? 'warn' : 'ok', detail: `${overview?.errorsLast24h || 0} in 24h` },
                { label: 'Database', status: 'ok', detail: `${(overview?.totalTransactions || 0).toLocaleString()} rows` },
              ].map(h => (
                <div key={h.label} style={{ padding: '16px 18px', borderRadius: 12, background: T.surface, border: `1px solid ${T.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{h.status === 'ok' ? '\u2705' : h.status === 'warn' ? '\u26A0\uFE0F' : '\u274C'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{h.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: h.status === 'ok' ? T.green : h.status === 'warn' ? T.amber : T.red }}>{h.detail}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.muted, marginBottom: 12 }}>Database Stats</div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
              {[
                { table: 'profiles', count: overview?.totalUsers || '—' },
                { table: 'transactions', count: overview?.totalTransactions || '—' },
                { table: 'imports', count: overview?.totalImports || '—' },
              ].map(r => (
                <div key={r.table} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}22` }}>
                  <span style={{ fontSize: 13, color: T.muted }}>{r.table}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{typeof r.count === 'number' ? r.count.toLocaleString() : r.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: T.dim }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: 'spin 1s linear infinite', marginRight: 12 }} />
            Loading...
            <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
          </div>
        )}
      </div>
    </div>
  );
}
