import { useEffect, useState } from 'react'

type Row = {
  employee_slug: string
  total_requests: number
  success_rate: number
  avg_latency_ms: number
  total_tokens_est: number
}

export default function MetricsCard() {
  const [rows, setRows] = useState<Row[]>([])
  const [range, setRange] = useState<'24h'|'7d'>('24h')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const res = await fetch(`/.netlify/functions/metrics-summary?range=${range}`)
        const json = await res.json()
        setRows(json.data || [])
      } catch (e) {
        console.error('Failed to load metrics:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [range])

  // Calculate totals
  const totalCalls = rows.reduce((sum, r) => sum + (r.total_requests || 0), 0)
  const avgSuccessRate = rows.length > 0 
    ? rows.reduce((sum, r) => sum + (r.success_rate || 0), 0) / rows.length 
    : 0
  const avgLatency = rows.length > 0
    ? rows.reduce((sum, r) => sum + (r.avg_latency_ms || 0), 0) / rows.length
    : 0
  const totalTokens = rows.reduce((sum, r) => sum + (r.total_tokens_est || 0), 0)

  return (
    <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">🤖 AI Chat Metrics</h3>
          <p className="text-sm text-white/60 mt-1">Performance and usage insights</p>
        </div>
        <select
          value={range}
          onChange={e => setRange(e.target.value as any)}
          className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          <option value="24h" className="bg-slate-800">Last 24 hours</option>
          <option value="7d" className="bg-slate-800">Last 7 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Total Calls</p>
          <p className="text-2xl font-bold text-white">{totalCalls}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Success Rate</p>
          <p className="text-2xl font-bold text-green-400">{avgSuccessRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Avg Latency</p>
          <p className="text-2xl font-bold text-blue-400">{Math.round(avgLatency)}ms</p>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Total Tokens</p>
          <p className="text-2xl font-bold text-purple-400">{(totalTokens / 1000).toFixed(1)}k</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-white/60 text-sm mt-2">Loading metrics...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/60 text-sm">No data yet. Start chatting to see metrics!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-white/60 border-b border-white/10">
                <th className="py-3 pr-4 font-medium">Employee</th>
                <th className="py-3 pr-4 font-medium">Requests</th>
                <th className="py-3 pr-4 font-medium">Success Rate</th>
                <th className="py-3 pr-4 font-medium">Avg Latency</th>
                <th className="py-3 pr-4 font-medium">Est. Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.employee_slug} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 font-medium text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {r.employee_slug === 'prime-boss' && '👑'}
                        {r.employee_slug === 'crystal-analytics' && '🔮'}
                        {r.employee_slug === 'ledger-tax' && '📊'}
                        {r.employee_slug === 'byte-docs' && '📄'}
                        {r.employee_slug === 'tag-categorize' && '🏷️'}
                        {r.employee_slug === 'goalie-goals' && '🎯'}
                      </span>
                      {r.employee_slug}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-white/80">{r.total_requests}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-medium ${
                      r.success_rate >= 95 ? 'text-green-400' : 
                      r.success_rate >= 80 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {r.success_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`font-medium ${
                      r.avg_latency_ms < 2000 ? 'text-green-400' : 
                      r.avg_latency_ms < 5000 ? 'text-yellow-400' : 
                      'text-red-400'
                    }`}>
                      {Math.round(r.avg_latency_ms)}ms
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-white/80">
                    {(r.total_tokens_est / 1000).toFixed(1)}k
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}




