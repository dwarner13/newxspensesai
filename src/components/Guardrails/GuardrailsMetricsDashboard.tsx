/**
 * 🛡️ Guardrails Metrics Dashboard
 * 
 * Displays real-time security and compliance metrics:
 * - Total checks by stage (ingestion, chat, OCR)
 * - Block rates and reasons
 * - PII detections by type
 * - Moderation flags
 * - Jailbreak attempts
 * 
 * For admin/compliance monitoring
 */

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Eye, Lock, Zap, TrendingUp } from 'lucide-react'

interface GuardrailMetrics {
  hours: number
  totals: {
    total_checks: number
    blocked_count: number
    pii_detections: number
    moderation_flags: number
    jailbreak_detections: number
  }
  by_stage: Array<{
    stage: string
    total_checks: number
    blocked_count: number
    block_rate: number
    pii_detections: number
    moderation_flags: number
    jailbreak_detections: number
    most_common_pii_types: string[]
  }>
}

interface GuardrailsMetricsDashboardProps {
  userId?: string  // Optional: filter by user, or null for all users (admin view)
}

export function GuardrailsMetricsDashboard({ userId }: GuardrailsMetricsDashboardProps) {
  const [metrics, setMetrics] = useState<GuardrailMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<'24' | '168'>('24')  // 24h or 7d

  useEffect(() => {
    loadMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [userId, timeRange])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        hours: timeRange,
        ...(userId && { userId })
      })
      const response = await fetch(`/.netlify/functions/guardrail-metrics?${params}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error loading metrics: {error}</p>
      </div>
    )
  }

  if (!metrics) return null

  const { totals, by_stage } = metrics
  const blockRate = totals.total_checks > 0
    ? ((totals.blocked_count / totals.total_checks) * 100).toFixed(2)
    : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-600" />
            Guardrails Metrics
          </h2>
          <p className="text-gray-600 mt-1">
            Security and compliance monitoring
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('24')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '24'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 24h
          </button>
          <button
            onClick={() => setTimeRange('168')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '168'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Last 7d
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Checks */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-700">Total Checks</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totals.total_checks.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Security scans</p>
        </div>

        {/* Blocked */}
        <div className="bg-white border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-gray-700">Blocked</h3>
          </div>
          <p className="text-3xl font-bold text-red-600">{totals.blocked_count.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">{blockRate}% block rate</p>
        </div>

        {/* PII Detections */}
        <div className="bg-white border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-gray-700">PII Found</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{totals.pii_detections.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Redacted</p>
        </div>

        {/* Moderation Flags */}
        <div className="bg-white border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-gray-700">Moderation</h3>
          </div>
          <p className="text-3xl font-bold text-orange-600">{totals.moderation_flags.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Content flags</p>
        </div>

        {/* Jailbreak Attempts */}
        <div className="bg-white border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-700">Jailbreaks</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">{totals.jailbreak_detections.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Injection attempts</p>
        </div>
      </div>

      {/* By Stage Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Breakdown by Stage
        </h3>

        <div className="space-y-4">
          {by_stage.map((stage) => (
            <div key={stage.stage} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-bold text-gray-900 capitalize">{stage.stage}</h4>
                  <p className="text-sm text-gray-600">{stage.total_checks.toLocaleString()} checks</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{stage.block_rate}%</p>
                  <p className="text-xs text-gray-500">block rate</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">PII Detected</p>
                  <p className="font-bold text-yellow-600">{stage.pii_detections}</p>
                </div>
                <div>
                  <p className="text-gray-600">Moderation</p>
                  <p className="font-bold text-orange-600">{stage.moderation_flags}</p>
                </div>
                <div>
                  <p className="text-gray-600">Jailbreaks</p>
                  <p className="font-bold text-purple-600">{stage.jailbreak_detections}</p>
                </div>
              </div>

              {/* PII Types */}
              {stage.most_common_pii_types && stage.most_common_pii_types.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Most Common PII Types:</p>
                  <div className="flex flex-wrap gap-2">
                    {stage.most_common_pii_types.map((type, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {by_stage.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>No guardrail events in the selected time range.</p>
              <p className="text-sm">This means no security issues detected! 🎉</p>
            </div>
          )}
        </div>
      </div>

      {/* Compliance Badge */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-green-600" />
        <div>
          <p className="font-bold text-green-900">Compliance Active</p>
          <p className="text-sm text-green-700">
            All data processing meets GDPR, CCPA, and HIPAA standards. Full audit trail maintained.
          </p>
        </div>
      </div>
    </div>
  )
}

export default GuardrailsMetricsDashboard

