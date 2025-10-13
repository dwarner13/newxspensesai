import { useEffect, useState } from 'react'

type Insights = {
  total_messages: number
  user_messages: number
  assistant_messages: number
  active_days: number
  facts_learned: number
  top_employees: Array<{ employee: string; message_count: number }>
  conversations: number
  avg_messages_per_day: number
}

const EMPLOYEE_ICONS: Record<string, string> = {
  'prime-boss': '👑',
  'crystal-analytics': '🔮',
  'ledger-tax': '📊',
  'byte-docs': '📄',
  'tag-categorize': '🏷️',
  'goalie-goals': '🎯'
}

export default function InsightsCard({ userId }: { userId: string }) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/.netlify/functions/insights?userId=${userId}`)
        if (!res.ok) throw new Error('Failed to load insights')
        const data = await res.json()
        setInsights(data)
      } catch (e) {
        console.error('Failed to load insights:', e)
        setError('Failed to load insights')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-white/60 text-sm mt-2">Loading insights...</p>
        </div>
      </div>
    )
  }

  if (error || !insights) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
        <p className="text-red-400 text-center">{error || 'No insights available'}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white">📊 Your 7-Day Insights</h3>
        <p className="text-sm text-white/60 mt-1">Activity summary from the last week</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Total Messages</p>
          <p className="text-2xl font-bold text-white">{insights.total_messages}</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Active Days</p>
          <p className="text-2xl font-bold text-green-400">{insights.active_days}/7</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Conversations</p>
          <p className="text-2xl font-bold text-blue-400">{insights.conversations}</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-1">Facts Learned</p>
          <p className="text-2xl font-bold text-purple-400">{insights.facts_learned}</p>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-2">Messages per Day</p>
          <p className="text-3xl font-bold text-white">{insights.avg_messages_per_day}</p>
          <p className="text-white/40 text-xs mt-1">Average</p>
        </div>
        
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/60 text-xs mb-2">Your Messages</p>
          <p className="text-3xl font-bold text-white">{insights.user_messages}</p>
          <p className="text-white/40 text-xs mt-1">
            {insights.assistant_messages} responses
          </p>
        </div>
      </div>

      {/* Top Employees */}
      {insights.top_employees && insights.top_employees.length > 0 && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <p className="text-white/80 text-sm font-semibold mb-3">Most Active AI Employees</p>
          <div className="space-y-2">
            {insights.top_employees.map((emp, idx) => (
              <div key={emp.employee} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {EMPLOYEE_ICONS[emp.employee] || '🤖'}
                  </span>
                  <span className="text-white/90 text-sm">
                    {emp.employee}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full"
                      style={{ 
                        width: `${(emp.message_count / insights.assistant_messages) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-white/60 text-xs w-8 text-right">
                    {emp.message_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}




