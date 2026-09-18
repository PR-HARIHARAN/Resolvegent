import * as React from 'react'
import { fetchAuditEvents } from '@/api/client'
import type { AuditEvent } from '@/types'

export const AuditPage: React.FC = () => {
  const [events, setEvents] = React.useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadEvents = React.useCallback(async () => {
    try {
      const data = await fetchAuditEvents()
      setEvents(data)
    } catch (err) {
      console.error('Failed to load audit events:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 2000)
    return () => clearInterval(interval)
  }, [loadEvents])

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-zinc-400">
            Real cryptographically sequenced ledger of all autonomous agent and tool executions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">
            {events.length} records
          </span>
          <button
            onClick={loadEvents}
            className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Audit Timeline */}
      {events.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-2">
          <div className="text-xs font-mono text-zinc-400">
            {isLoading ? 'Loading audit ledger...' : 'No audit events recorded yet.'}
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Every action taken by the agent (detection, correlation, tool execution, diagnosis,
            remediation) is cryptographically logged in the audit ledger.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
          {events.map((event: AuditEvent) => {
            const isSuccess = event.status === 'SUCCESS'
            const actionText = event.details?.action || event.eventType
            const resultText = event.details?.result

            return (
              <div
                key={event.id}
                className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-zinc-900/30 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-zinc-500">{event.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                      {event.details?.node || event.eventType}
                    </span>
                    <span
                      className={`text-[11px] px-2 py-0.2 rounded font-mono ${
                        isSuccess
                          ? 'text-emerald-400 bg-emerald-950/30'
                          : 'text-zinc-400 bg-zinc-900'
                      }`}
                    >
                      {event.status}
                    </span>
                    {event.incidentId && (
                      <span className="font-mono text-xs text-zinc-500">
                        {event.incidentId}
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-zinc-200 font-medium">
                    {actionText}
                  </div>

                  {resultText && (
                    <div className="text-xs font-mono text-zinc-400 bg-black/50 p-2 rounded border border-zinc-900 break-words leading-relaxed">
                      {resultText}
                    </div>
                  )}

                  <div className="text-xs text-zinc-500">
                    Actor: <span className="font-mono text-zinc-300">{event.actor}</span>{' '}
                    <span className="text-zinc-600">({event.actorType})</span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 font-mono flex-shrink-0">
                  {event.timestamp ? event.timestamp.replace('T', ' ').slice(0, 19) + ' UTC' : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AuditPage
