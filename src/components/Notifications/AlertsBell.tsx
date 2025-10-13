import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'

type SyncEvent = {
  id: string
  kind: 'info' | 'warning' | 'success'
  title: string
  details: string
  created_at: string
  read: boolean
}

export default function AlertsBell({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<SyncEvent[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadAlerts = async () => {
    try {
      const res = await fetch(`/.netlify/functions/alerts?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.items || [])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markRead = async (alertId: string) => {
    try {
      const res = await fetch('/.netlify/functions/mark-alert-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, userId })
      })
      
      if (res.ok) {
        setAlerts(prev => 
          prev.map(a => a.id === alertId ? { ...a, read: true } : a)
        )
      }
    } catch (error) {
      console.error('Failed to mark alert read:', error)
    }
  }

  useEffect(() => {
    loadAlerts()
    // Refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const unreadCount = alerts.filter(a => !a.read).length

  const kindStyles = {
    success: 'border-green-500/20 bg-green-500/10 text-green-400',
    warning: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
    info: 'border-blue-500/20 bg-blue-500/10 text-blue-400'
  }

  const kindIcons = {
    success: '✓',
    warning: '⚠',
    info: 'ℹ'
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Alerts Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-12 w-80 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-white/60">
                    {unreadCount} unread
                  </span>
                )}
              </div>
            </div>

            {/* Alerts List */}
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                  <p className="text-white/60 text-sm mt-2">Loading...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-white/60 text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                        !alert.read ? 'bg-white/5' : ''
                      }`}
                      onClick={() => markRead(alert.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${kindStyles[alert.kind]}`}>
                          <span className="text-xs">{kindIcons[alert.kind]}</span>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-white text-sm font-medium">
                              {alert.title}
                            </p>
                            {!alert.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                            )}
                          </div>
                          
                          {alert.details && (
                            <p className="text-white/60 text-xs mt-1">
                              {alert.details}
                            </p>
                          )}
                          
                          <p className="text-white/40 text-xs mt-2">
                            {new Date(alert.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {alerts.length > 0 && (
              <div className="p-3 border-t border-white/10 text-center">
                <button
                  onClick={loadAlerts}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}




