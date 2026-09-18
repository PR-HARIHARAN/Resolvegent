import * as React from 'react'
import { Link } from 'react-router-dom'
import { mockAlerts } from '@/api/mock/mockData'

export const AlertsPage: React.FC = () => {
  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
          Raw Telemetry & Signals
        </h1>
        <p className="text-xs text-zinc-400">
          Inbound metrics, logs, and alerts ingested from observability providers
        </p>
      </div>

      {/* Alerts Stream */}
      <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
        {mockAlerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL'

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
                </div>

                <div className="text-sm text-zinc-200 font-medium">
                  {alert.title}
                </div>

                <div className="text-xs text-zinc-500 leading-relaxed">
                  {alert.summary}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1 text-xs text-zinc-500 font-mono flex-shrink-0">
                <span>{alert.timestamp.slice(11, 19)} UTC</span>
                {alert.incidentId && (
                  <Link
                    to={`/incidents/${alert.incidentId}`}
                    className="text-zinc-400 hover:text-white underline underline-offset-2"
                  >
                    Correlated: {alert.incidentId} →
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AlertsPage
