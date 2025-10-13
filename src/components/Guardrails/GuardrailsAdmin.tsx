/**
 * 🛡️ Guardrails Admin Panel
 * 
 * Allows admin/tenant-level configuration of guardrails presets:
 * - Strict (default for ingestion): Max PII types, block-on-fail, no originals
 * - Balanced (default for chat): Moderate + jailbreak, light PII mask
 * - Creative (optional): Relaxed checks, still keeps PII redaction
 * 
 * Note: Regular users should NOT see these settings - compliance is automatic.
 * This is for admin override only.
 */

import { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface GuardrailConfig {
  preset: 'strict' | 'balanced' | 'creative'
  pii_enabled: boolean
  moderation_enabled: boolean
  jailbreak_enabled: boolean
  hallucination_enabled: boolean
}

interface GuardrailsAdminProps {
  userId: string
}

const PRESET_DESCRIPTIONS = {
  strict: {
    title: 'Strict (Ingestion Default)',
    description: 'Maximum PII protection. Block on any violation. For emails, PDFs, bank statements.',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    features: [
      'All PII types detected (40+ patterns)',
      'Full redaction (no last-4)',
      'Block harmful content immediately',
      'Compliance: GDPR, CCPA, HIPAA',
      'No originals stored'
    ]
  },
  balanced: {
    title: 'Balanced (Chat Default)',
    description: 'Smart protection without over-sanitizing. For chat conversations and user input.',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    features: [
      'PII redaction (keep last-4 for UX)',
      'Moderation with context',
      'Jailbreak detection (70% threshold)',
      'Sanitize and continue',
      'Tool-first for financial claims'
    ]
  },
  creative: {
    title: 'Creative (Optional)',
    description: 'Relaxed checks for non-finance features. Still protects PII for compliance.',
    icon: Info,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    features: [
      'PII still redacted (compliance)',
      'No moderation filters',
      'No jailbreak checks',
      'More flexible responses',
      'For creative/exploratory use'
    ]
  }
}

export function GuardrailsAdmin({ userId }: GuardrailsAdminProps) {
  const [config, setConfig] = useState<GuardrailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load current config
  useEffect(() => {
    loadConfig()
  }, [userId])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/.netlify/functions/guardrail-config-get?userId=${userId}`)
      if (!response.ok) throw new Error('Failed to load config')
      const data = await response.json()
      setConfig(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (newPreset: 'strict' | 'balanced' | 'creative') => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const response = await fetch('/.netlify/functions/guardrail-config-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          preset: newPreset,
          // Keep other settings as is
          pii_enabled: config?.pii_enabled,
          moderation_enabled: config?.moderation_enabled,
          jailbreak_enabled: config?.jailbreak_enabled,
          hallucination_enabled: config?.hallucination_enabled
        })
      })

      if (!response.ok) throw new Error('Failed to save config')
      const data = await response.json()
      setConfig(data.config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🛡️ Guardrails Configuration
        </h1>
        <p className="text-gray-600">
          Configure security and compliance presets for your organization. These settings apply to all data processing.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800 font-medium">Configuration saved successfully!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Preset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {(Object.keys(PRESET_DESCRIPTIONS) as Array<'strict' | 'balanced' | 'creative'>).map((preset) => {
          const desc = PRESET_DESCRIPTIONS[preset]
          const Icon = desc.icon
          const isActive = config?.preset === preset

          return (
            <div
              key={preset}
              className={`
                relative border-2 rounded-xl p-6 cursor-pointer transition-all
                ${isActive
                  ? `${desc.borderColor} ${desc.bgColor} shadow-lg scale-105`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }
              `}
              onClick={() => saveConfig(preset)}
            >
              {/* Active Badge */}
              {isActive && (
                <div className="absolute top-4 right-4">
                  <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    ACTIVE
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`mb-4 ${desc.color}`}>
                <Icon className="w-10 h-10" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {desc.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">
                {desc.description}
              </p>

              {/* Features */}
              <ul className="space-y-2">
                {desc.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Select Button */}
              <button
                disabled={saving || isActive}
                className={`
                  mt-6 w-full py-2 px-4 rounded-lg font-medium transition-colors
                  ${isActive
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isActive ? 'Currently Active' : 'Select Preset'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex gap-4">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">
              Important Notes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• <strong>Ingestion (Gmail/OCR):</strong> Always uses Strict preset for compliance.</li>
              <li>• <strong>Chat:</strong> Uses the preset you select here (default: Balanced).</li>
              <li>• <strong>PII Redaction:</strong> Always enabled regardless of preset (legal requirement).</li>
              <li>• <strong>End Users:</strong> Should not see these settings - compliance is automatic.</li>
              <li>• <strong>Audit Trail:</strong> All guardrail events are logged for compliance reporting.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Settings (Future) */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
        <p className="text-sm">
          Advanced per-entity PII controls coming soon. Contact support for custom compliance requirements.
        </p>
      </div>
    </div>
  )
}

export default GuardrailsAdmin

