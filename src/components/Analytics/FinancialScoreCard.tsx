import { useEffect, useState } from 'react'

type FinancialScore = {
  score: number
  breakdown: {
    hasNewData: boolean
    categorizeRate: number
    budgetScore: number
    goalsScore: number
    streak: number
    activity?: {
      receipts: number
      transactions: number
      chatMessages: number
    }
  }
  calculated_at: string
}

type SyncEvent = {
  id: string
  kind: 'info' | 'warning' | 'success'
  title: string
  details: string
  created_at: string
  read: boolean
}

export default function FinancialScoreCard({ userId }: { userId: string }) {
  const [score, setScore] = useState<FinancialScore | null>(null)
  const [events, setEvents] = useState<SyncEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const loadScore = async () => {
    try {
      // In a real app, you'd query Supabase directly or use an endpoint
      // For now, we'll trigger a sync to get the score
      const res = await fetch(`/.netlify/functions/weekly-sync?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      
      if (res.ok) {
        const data = await res.json()
        setScore(data)
      }
    } catch (error) {
      console.error('Failed to load score:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async () => {
    setSyncing(true)
    await loadScore()
    setSyncing(false)
  }

  useEffect(() => {
    loadScore()
  }, [userId])

  const getScoreColor = (score: number) => {
    if (score >= 700) return 'text-green-400'
    if (score >= 500) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreGrade = (score: number) => {
    if (score >= 800) return 'Excellent'
    if (score >= 700) return 'Great'
    if (score >= 600) return 'Good'
    if (score >= 500) return 'Fair'
    return 'Needs Work'
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          <p className="text-white/60 text-sm mt-2">Loading financial score...</p>
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">No financial score yet</p>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
          >
            {syncing ? 'Calculating...' : 'Calculate Score'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 p-6 bg-gradient-to-br from-slate-900/90 to-slate-800/90 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">💰 Financial Health Score</h3>
          <p className="text-sm text-white/60 mt-1">Your overall financial wellness</p>
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="px-3 py-1.5 text-sm bg-white/10 text-white/80 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-colors"
        >
          {syncing ? 'Syncing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Score Display */}
      <div className="mb-6 text-center">
        <div className={`text-6xl font-bold ${getScoreColor(score.score)}`}>
          {score.score}
        </div>
        <div className="text-white/60 text-sm mt-2">
          out of 900 · {getScoreGrade(score.score)}
        </div>
        
        {/* Score Bar */}
        <div className="w-full bg-white/10 rounded-full h-3 mt-4 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              score.score >= 700 ? 'bg-green-500' :
              score.score >= 500 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${(score.score / 900) * 100}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">Activity (30%)</span>
            <span className={`text-sm font-semibold ${score.breakdown.hasNewData ? 'text-green-400' : 'text-red-400'}`}>
              {score.breakdown.hasNewData ? '✓' : '✗'}
            </span>
          </div>
          <div className="text-white/40 text-xs">
            {score.breakdown.activity ? (
              `${score.breakdown.activity.chatMessages} chats this week`
            ) : 'No activity'}
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">Organization (25%)</span>
            <span className="text-sm font-semibold text-white">
              {Math.round(score.breakdown.categorizeRate * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${score.breakdown.categorizeRate * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">Budget (20%)</span>
            <span className="text-sm font-semibold text-white">
              {Math.round(score.breakdown.budgetScore * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-purple-500 h-full rounded-full"
              style={{ width: `${score.breakdown.budgetScore * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-3 border border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">Goals (15%)</span>
            <span className="text-sm font-semibold text-white">
              {Math.round(score.breakdown.goalsScore * 100)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-pink-500 h-full rounded-full"
              style={{ width: `${score.breakdown.goalsScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-xs">🔥 Consistency Streak (10%)</span>
          <span className="text-sm font-semibold text-orange-400">
            {Math.round(score.breakdown.streak * 6)}/6 weeks
          </span>
        </div>
        <div className="flex gap-1 mt-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${
                i < Math.round(score.breakdown.streak * 6)
                  ? 'bg-orange-500'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Tips */}
      {score.score < 700 && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-400 text-xs font-semibold mb-1">💡 Tips to Improve</p>
          <ul className="text-yellow-400/80 text-xs space-y-1">
            {!score.breakdown.hasNewData && (
              <li>• Chat with your AI team or upload receipts this week</li>
            )}
            {score.breakdown.categorizeRate < 0.8 && (
              <li>• Ask Tag to help categorize your expenses</li>
            )}
            {score.breakdown.streak < 0.5 && (
              <li>• Stay consistent - check in weekly for better results</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}




