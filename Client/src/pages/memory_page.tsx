import * as React from 'react'
import { mockMemoryRecords } from '@/api/mock/mockData'
import type { MemoryRecord } from '@/types'

export const MemoryPage: React.FC = () => {
  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
          Historical Incident Memory
        </h1>
        <p className="text-xs text-zinc-400">
          Neural vector similarity matches from past verified postmortems
        </p>
      </div>

      {/* Memory Records */}
      <div className="space-y-4">
        {mockMemoryRecords.map((mem: MemoryRecord) => {
          const matchPct = Math.round(mem.similarityScore * 100)

          return (
            <div
              key={mem.id}
              className="p-6 rounded-xl border border-zinc-800/70 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs text-zinc-500">
                    {mem.historicalIncidentId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                    {matchPct}% Match
                  </span>
                </div>
                <span className="text-xs text-zinc-500 font-mono">
                  MTTR: {Math.round(mem.mttrSeconds / 60)} mins · Resolved {mem.resolvedAt.slice(0, 10)}
                </span>
              </div>

              <div>
                <h3 className="text-base font-medium text-white mb-1">
                  {mem.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {mem.postmortemSummary}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-3 rounded-lg bg-black/40 border border-zinc-900">
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Previous Root Cause
                  </div>
                  <div className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                    {mem.rootCause}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-black/40 border border-zinc-900">
                  <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                    Applied Resolution Action
                  </div>
                  <div className="text-zinc-300 leading-relaxed font-mono text-[11px]">
                    {mem.resolutionAction}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MemoryPage
