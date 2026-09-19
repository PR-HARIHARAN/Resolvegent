import * as React from 'react'
import { Link } from 'react-router-dom'
import { fetchAlerts } from '@/api/client'
import type { Alert } from '@/types'

const ALERT_ENGINE_URL = import.meta.env.VITE_ALERT_ENGINE_URL || 'https://ecommerce-alerts-sse2.onrender.com'
const STOREFRONT_URL = import.meta.env.VITE_STOREFRONT_URL || 'https://ecommerce-alerts-sse2.onrender.com/'

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadAlerts = React.useCallback(async () => {
    try {
      const data = await fetchAlerts()
      setAlerts(data)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 2000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
            Raw Telemetry & Signals
          </h1>
          <p className="text-xs text-zinc-400">
            Real inbound metrics, logs, and alerts ingested from E-Commerce Alert Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">
            {alerts.length} ingested
          </span>
          <button
            onClick={loadAlerts}
            className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts Stream */}
      {alerts.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-3">
          <div className="text-xs font-mono text-zinc-400">
            {isLoading ? 'Loading alerts...' : 'No alerts currently in ingestion queue.'}
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            Trigger an incident from the{' '}
            <a
              href={ALERT_ENGINE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 underline hover:text-white"
            >
              Alert Engine
            </a>{' '}
            or the{' '}
            <a
              href={STOREFRONT_URL}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-300 underline hover:text-white"
            >
              Storefront
            </a>{' '}
            to push live telemetry signals.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL'
            const isResolved = alert.status === 'RESOLVED'

            return (
              <div
                key={alert.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-zinc-500">{alert.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isCritical
                          ? 'bg-red-950/50 text-red-400 border-red-800/40'
                          : 'bg-amber-950/50 text-amber-400 border-amber-800/40'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-mono">
                      {alert.source}
                    </span>
                    <span className="text-xs text-zinc-400">{alert.service}</span>
                    {alert.status && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                          isResolved
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30'
                            : 'bg-sky-950/40 text-sky-400 border-sky-800/30'
                        }`}
                      >
                        {alert.status}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-zinc-200 font-medium">{alert.title}</div>

                  <div className="text-xs text-zinc-500 leading-relaxed">{alert.summary}</div>

                  {alert.metricName && (
                    <div className="text-[11px] font-mono text-zinc-400">
                      Metric: <span className="text-zinc-200">{alert.metricName}</span> ={' '}
                      <span className="text-amber-400">{alert.metricValue}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:items-end gap-1 text-xs text-zinc-500 font-mono flex-shrink-0">
                  <span>{alert.timestamp?.slice(11, 19) || '12:00:00'} UTC</span>
                  {alert.incidentId ? (
                    <Link
                      to={`/incidents/${alert.incidentId}`}
                      className="text-zinc-400 hover:text-white underline underline-offset-2"
                    >
                      Correlated: {alert.incidentId} →
                    </Link>
                  ) : (
                    <span className="text-zinc-600 italic">Uncorrelated</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AlertsPage
