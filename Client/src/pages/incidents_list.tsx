import * as React from 'react'
import { Link } from 'react-router-dom'
import { fetchIncidents } from '@/api/client'
import type { Incident } from '@/types'

export const IncidentsListPage: React.FC = () => {
  const [incidents, setIncidents] = React.useState<Incident[]>([])
  const [filter, setFilter] = React.useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL')
  const [isLoading, setIsLoading] = React.useState(true)

  const loadIncidents = React.useCallback(async () => {
    try {
      const data = await fetchIncidents()
      setIncidents(data)
    } catch (err) {
      console.error('Failed to load incidents:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadIncidents()
    const interval = setInterval(loadIncidents, 2000)
    return () => clearInterval(interval)
  }, [loadIncidents])

  const filteredIncidents = incidents.filter((inc: Incident) => {
    if (filter === 'ALL') return true
    return inc.severity === filter
  })

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
            Incidents
          </h1>
          <p className="text-xs text-zinc-400">
            Real incident records generated and resolved by the autonomous agent
          </p>
        </div>

        {/* Minimal Filter */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80 text-xs">
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-zinc-800 text-white font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      {incidents.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-3">
          <div className="text-xs font-mono text-zinc-400">
            {isLoading ? 'Loading incident records...' : 'No incidents recorded.'}
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            When telemetry signals arrive from the Alert Engine, the agent correlates them into unified
            operational incidents automatically.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
          {filteredIncidents.map((inc: Incident) => {
            const isCritical = inc.severity === 'CRITICAL'
            const isResolved = inc.status === 'RESOLVED'

            return (
              <Link
                key={inc.id}
                to={`/incidents/${inc.id}`}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors group cursor-pointer block"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-zinc-500">{inc.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        isCritical
                          ? 'bg-red-950/50 text-red-400 border-red-800/40'
                          : 'bg-amber-950/50 text-amber-400 border-amber-800/40'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      {inc.service}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                    {inc.title}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      isResolved
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                        : 'bg-sky-950/40 text-sky-400 border border-sky-800/30'
                    }`}
                  >
                    {isResolved ? 'Resolved' : 'Active'}
                  </span>
                  <span className="font-mono">
                    {inc.openedAt ? inc.openedAt.slice(11, 16) : '12:00'} UTC
                  </span>
                  <svg
                    className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default IncidentsListPage
