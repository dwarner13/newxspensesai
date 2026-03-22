import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronRight, ArrowDownLeft, ArrowUpRight, TrendingDown, Hash, Upload, Download, Star } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { useImportList } from '@/hooks/useImportList';
import { TransactionInsightDrawer } from '@/components/transactions/TransactionInsightDrawer';
import type { CommittedTransaction } from '@/types/transactions';

const CAT_COLORS: Record<string, string> = {
  'Personal Care': '#ec4899', Subscriptions: '#818cf8', Shopping: '#a78bfa',
  Groceries: '#fbbf24', 'Food & Dining': '#fb923c', Transportation: '#38bdf8',
  Healthcare: '#f87171', 'Bank Fees': '#94a3b8', Income: '#34d399', Other: '#475569',
};
const CAT_ICONS: Record<string, string> = {
  'Personal Care': '\u2728', Subscriptions: '\ud83d\udd01', Shopping: '\ud83d\udecd\ufe0f',
  Groceries: '\ud83e\uded2', 'Food & Dining': '\ud83c\udf7d\ufe0f', Transportation: '\ud83d\ude97',
  Healthcare: '\ud83c\udfe5', 'Bank Fees': '\ud83c\udfe6', Income: '\ud83d\udcb0',
  Other: '\ud83d\udcc1', Uncategorized: '\u2753',
};
const colorFor = (c?: string) => CAT_COLORS[c || ''] || '#475569';
const iconFor = (c?: string) => CAT_ICONS[c || ''] || '\ud83d\udcc1';

const INCOME_PATTERNS = /^(PAYMENT|CREDIT|REFUND|DEPOSIT|CASHBACK|REWARD|REBATE|REIMBURSEMENT)$/;
function isIncomeTx(t: CommittedTransaction): boolean {
  const cat = (t.category || '').toLowerCase();
  const merchant = (t.merchant_name || '').toUpperCase().trim();
  const txType = ((t as Record<string, unknown>).type as string || '').toLowerCase();
  return t.amount < 0 || txType === 'income' || cat === 'income' || INCOME_PATTERNS.test(merchant);
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

export default function TransactionsPageV2() {
  const { transactions, isLoading, refetch } = useTransactions();
  const { imports } = useImportList();
  const [filter, setFilter] = useState<'all' | 'expenses' | 'income'>('all');
  const [statementFilter, setStatementFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<CommittedTransaction | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  // Filtering
  const filtered = useMemo(() => {
    let list = transactions;
    if (filter === 'expenses') list = list.filter(t => !isIncomeTx(t));
    else if (filter === 'income') list = list.filter(t => isIncomeTx(t));
    if (statementFilter !== 'all') list = list.filter(t => t.import_id === statementFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => (t.merchant_name || '').toLowerCase().includes(q)
        || (t.category || '').toLowerCase().includes(q)
        || String(t.amount).includes(q));
    }
    return [...list].sort((a, b) => (b.posted_at || '').localeCompare(a.posted_at || ''));
  }, [transactions, filter, statementFilter, searchQuery]);

  // Stats
  const totalSpent = useMemo(() => transactions.reduce((s, t) => !isIncomeTx(t) ? s + Math.abs(t.amount) : s, 0), [transactions]);
  const totalIncome = useMemo(() => transactions.reduce((s, t) => isIncomeTx(t) ? s + Math.abs(t.amount) : s, 0), [transactions]);
  const netFlow = totalIncome - totalSpent;

  // Category data for donut
  const catData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => { if (!isIncomeTx(t)) map[t.category || 'Other'] = (map[t.category || 'Other'] || 0) + Math.abs(t.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [transactions]);
  const catTotal = catData.reduce((s, d) => s + d.value, 0);

  // Statement pills
  const stmtPills = useMemo(() => {
    const seen = new Set<string>();
    return imports.filter(i => {
      let lbl = i.statementLabel || '';
      if (lbl.length > 30 || lbl.toLowerCase().includes('nsaction')) lbl = 'Unknown';
      if (seen.has(lbl)) return false;
      seen.add(lbl);
      return true;
    });
  }, [imports]);

  // AI insights
  const insights = useMemo(() => {
    const uncatCount = transactions.filter(t => !t.category || t.category === 'Uncategorized').length;
    const catCount = transactions.length - uncatCount;
    const topCat = catData[0];
    const topPct = topCat && catTotal > 0 ? ((topCat.value / catTotal) * 100).toFixed(0) : '0';
    const merchantCounts: Record<string, number> = {};
    transactions.forEach(t => { if (t.merchant_name) merchantCounts[t.merchant_name] = (merchantCounts[t.merchant_name] || 0) + 1; });
    const recurring = Object.entries(merchantCounts).find(([, c]) => c >= 2);
    return [
      { agent: 'Tag', color: '#34d399', title: `${catCount} categorized, ${uncatCount} need review`, detail: uncatCount > 0 ? 'Tap uncategorized rows to assign categories' : 'All transactions categorized' },
      { agent: 'Crystal', color: '#ec4899', title: `Top: ${topCat?.name || 'N/A'} at ${topPct}%`, detail: topCat ? `$${fmt(topCat.value)} spent in ${topCat.name}` : 'No spending data yet' },
      { agent: 'Chime', color: '#fbbf24', title: recurring ? `${recurring[0]} appears ${recurring[1]}x` : 'No recurring detected', detail: recurring ? 'Possible recurring charge detected' : 'Upload more statements for patterns' },
    ];
  }, [transactions, catData, catTotal]);

  // Date groups
  const dateGroups = useMemo(() => {
    const visible = filtered.slice(0, visibleCount);
    const groups: { date: string; label: string; txs: CommittedTransaction[] }[] = [];
    visible.forEach(t => {
      const d = (t.posted_at || '').slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === d) last.txs.push(t);
      else groups.push({ date: d, label: fmtDate(d), txs: [t] });
    });
    return groups;
  }, [filtered, visibleCount]);

  const uncategorizedCount = transactions.filter(t => !t.category || t.category === 'Uncategorized').length;

  if (isLoading) return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center gap-3 text-slate-400"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" /> Loading transactions...</div>
    </div>
  );

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div className="max-w-[1100px] mx-auto px-6 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            
            <p className="text-[12px] text-slate-400 mt-1">{imports.length} statement{imports.length !== 1 ? 's' : ''} &middot; {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"><Download className="h-4 w-4" />Export</button>
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-400 hover:to-orange-400 transition-colors"><Upload className="h-4 w-4" />Upload</button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Spent', value: `$${fmt(totalSpent)}`, color: 'text-red-400', icon: <ArrowUpRight className="h-3.5 w-3.5 text-red-400" /> },
            { label: 'Total Income', value: `$${fmt(totalIncome)}`, color: 'text-emerald-400', icon: <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400" /> },
            { label: 'Net Flow', value: `${netFlow >= 0 ? '+' : '-'}$${fmt(Math.abs(netFlow))}`, color: netFlow >= 0 ? 'text-emerald-400' : 'text-amber-400', icon: <TrendingDown className="h-3.5 w-3.5 text-amber-400" /> },
            { label: 'Transactions', value: String(transactions.length), color: 'text-white', icon: <Hash className="h-3.5 w-3.5 text-white" /> },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5 hover:border-slate-600/50 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-bold">{c.label}</span>
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800/60">{c.icon}</div>
              </div>
              <div className={`text-[26px] font-extrabold ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* TWO COLUMN: Donut + AI Insights */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {/* Donut */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-4">Spending by category</div>
            <div className="flex items-center gap-4">
              <div className="relative w-[140px] h-[140px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={catData.length ? catData : [{ name: 'None', value: 1 }]} dataKey="value" cx="50%" cy="50%" innerRadius={46} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                    {(catData.length ? catData : [{ name: 'None', value: 1 }]).map((d, i) => <Cell key={i} fill={colorFor(d.name)} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[17px] font-extrabold text-white">${fmt(catTotal)}</span>
                  <span className="text-[9px] uppercase text-slate-500">total</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                {catData.slice(0, 6).map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full shrink-0" style={{ background: colorFor(d.name) }} />
                    <span className="text-[12px] text-slate-400 truncate flex-1">{d.name}</span>
                    <span className="text-[12px] font-bold text-slate-300">${fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* AI Insights */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-6 w-6 rounded-md bg-amber-500/15"><Star className="h-3 w-3 text-amber-400" /></div>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">AI insights</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {insights.map((ins, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                  <div className="w-1 rounded-full shrink-0" style={{ background: ins.color }} />
                  <div className="min-w-0">
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded mb-1" style={{ background: ins.color + '20', color: ins.color }}>{ins.agent}</span>
                    <div className="text-[13px] font-semibold text-slate-200">{ins.title}</div>
                    <div className="text-[11px] text-slate-500">{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex p-1 rounded-lg bg-slate-800/40 border border-slate-700/30">
            {(['all', 'expenses', 'income'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-5 py-2 text-[13px] font-bold rounded-md transition-colors ${filter === f ? 'bg-slate-700/60 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button onClick={() => setStatementFilter('all')} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border transition-colors ${statementFilter === 'all' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'text-slate-600 border-transparent hover:text-slate-400'}`}>All</button>
            {stmtPills.map(p => {
              let lbl = p.statementLabel;
              if (lbl.length > 30 || lbl.toLowerCase().includes('nsaction')) lbl = 'Unknown';
              return (
                <button key={p.id} onClick={() => setStatementFilter(p.id)} className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-full border transition-colors ${statementFilter === p.id ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' : 'text-slate-600 border-transparent hover:text-slate-400'}`}>{lbl}</button>
              );
            })}
          </div>
        </div>

        {/* TRANSACTION LIST */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/30">
          {/* Search */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800/60">
            <Search className="h-4 w-4 text-slate-500 shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search merchants, categories, amounts..." className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder:text-slate-600 outline-none" />
          </div>

          {/* Review banner */}
          {uncategorizedCount > 0 && (
            <div className="mx-4 mt-4 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-amber-400" /></span>
                <span className="text-[13px] text-amber-200">Tag found <strong>{uncategorizedCount}</strong> transaction{uncategorizedCount !== 1 ? 's' : ''} that need review</span>
              </div>
              <button onClick={() => setFilter('all')} className="px-3 py-1.5 text-[12px] font-bold text-amber-900 bg-amber-400 rounded-md hover:bg-amber-300 transition-colors">Review</button>
            </div>
          )}

          {/* Date groups */}
          {dateGroups.map(g => (
            <div key={g.date}>
              <div className="flex items-center gap-3 pt-6 pb-2 px-5">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">{g.label}</span>
                <div className="flex-1 h-px bg-slate-800/60" />
                <span className="text-[11px] text-slate-600">{g.txs.length}</span>
              </div>
              {g.txs.map(t => {
                const cat = t.category || 'Uncategorized';
                const isUncat = !t.category || t.category === 'Uncategorized';
                const isIncome = isIncomeTx(t);
                const c = colorFor(cat);
                return (
                  <button key={t.id} onClick={() => setSelectedTx(t)} className="w-full flex items-center gap-4 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors text-left">
                    <div className="relative flex items-center justify-center h-[44px] w-[44px] rounded-xl shrink-0" style={{ background: c + '2e', border: `1px solid ${c}40` }}>
                      <span className="text-base">{iconFor(cat)}</span>
                      {isUncat && <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-amber-400" /></span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-slate-100 truncate">{t.merchant_name || 'Unknown'}</div>
                      {isUncat ? <div className="text-[12px] text-amber-400 flex items-center gap-1"><span className="relative flex h-1.5 w-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" /></span>Needs category</div>
                        : <div className="text-[12px] text-slate-500">{cat}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-[16px] font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>{isIncome ? '+' : '-'}${fmt(Math.abs(t.amount))}</div>
                      <div className="text-[11px] text-slate-600">{(t.posted_at || '').slice(0, 10)}</div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                  </button>
                );
              })}
            </div>
          ))}

          {/* Load more */}
          {filtered.length > visibleCount && (
            <button onClick={() => setVisibleCount(v => v + 30)} className="w-full py-3 text-[13px] font-bold text-slate-400 border-t border-slate-700/40 hover:bg-slate-800/30 transition-colors rounded-b-xl">Load more transactions</button>
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-[14px]">No transactions found</div>
          )}
        </div>
      </div>

      {/* Floating Prime bubble */}
      <div className="fixed bottom-6 right-6 z-40">
        <button className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg hover:shadow-xl transition-shadow">
          <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3"><span className="absolute inset-0 rounded-full bg-emerald-400" /><span className="absolute inset-[2px] rounded-full bg-emerald-400 ring-2 ring-[#0b1220]" /></span>
        </button>
      </div>

      {/* Drawer — portalled to body to escape any stacking context from DashboardLayout */}
      {createPortal(
        <TransactionInsightDrawer
          open={!!selectedTx}
          row={selectedTx ? { kind: 'committed', transaction: selectedTx } : null}
          allCommittedTransactions={transactions}
          onClose={() => setSelectedTx(null)}
          onCommittedCategorySaved={() => { setSelectedTx(null); void refetch(); }}
        />,
        document.body
      )}
    </>
  );
}
