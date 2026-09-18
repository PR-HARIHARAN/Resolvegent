import * as React from 'react'
import { mockAuditTrail } from '@/api/mock/mockData'
import type { AuditEvent } from '@/types'

export const AuditPage: React.FC = () => {
  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
          Immutable Audit Trail
        </h1>
        <p className="text-xs text-zinc-400">
          Cryptographically signed sequential ledger of all agent and operator actions
        </p>
      </div>

      {/* Audit Timeline */}
      <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
        {mockAuditTrail.map((event: AuditEvent) => {
          const isSuccess = event.status === 'SUCCESS'

          return (
            <div
              key={event.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/30 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-zinc-500">{event.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                    {event.eventType}
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
                </div>

                <div className="text-sm text-zinc-300">
                  <span className="text-zinc-500 text-xs">Actor:</span>{' '}
                  <span className="font-mono text-xs text-zinc-200">{event.actor}</span>
                  <span className="text-zinc-500 text-xs ml-1">({event.actorType})</span>
                </div>
              </div>

              <div className="text-xs text-zinc-500 font-mono flex-shrink-0">
                {event.timestamp.replace('T', ' ').replace('Z', ' UTC')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AuditPage
