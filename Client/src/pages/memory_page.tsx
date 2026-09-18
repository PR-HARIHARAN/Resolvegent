import * as React from 'react'
import { fetchMemoryRecords, deleteMemoryRecord, clearAllMemoryRecords } from '@/api/client'
import type { MemoryRecord } from '@/types'

export const MemoryPage: React.FC = () => {
  const [records, setRecords] = React.useState<MemoryRecord[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [isClearing, setIsClearing] = React.useState(false)

  const loadMemory = React.useCallback(async () => {
    try {
      const data = await fetchMemoryRecords()
      setRecords(data)
    } catch (err) {
      console.error('Failed to load memory records:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadMemory()
  }, [loadMemory])

  const handleDelete = async (recordId: string, historicalId?: string) => {
    setDeletingId(recordId)
    // Optimistic UI update
    setRecords((prev) =>
      prev.filter((r) => r.id !== recordId && r.historicalIncidentId !== (historicalId || recordId))
    )

    try {
      const ok = await deleteMemoryRecord(recordId)
      if (!ok && historicalId) {
        await deleteMemoryRecord(historicalId)
      }
    } catch (err) {
      console.error(`Failed to delete record ${recordId}:`, err)
      // Rollback if failure
      loadMemory()
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all memory playbooks from the vector store?')) {
      return
    }
    setIsClearing(true)
    setRecords([])
    try {
      await clearAllMemoryRecords()
    } catch (err) {
      console.error('Failed to clear all memory:', err)
      loadMemory()
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-8">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal tracking-tight text-white mb-1">
            Historical Incident Memory & Playbooks
          </h1>
          <p className="text-xs text-zinc-400">
            Neural vector embeddings indexed by the autonomous agent from postmortems and playbooks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">
            {records.length} records
          </span>
          {records.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isClearing}
              className="px-3 py-1 rounded bg-red-950/30 border border-red-900/40 text-xs text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isClearing ? 'Clearing...' : 'Clear All Memory'}
            </button>
          )}
          <button
            onClick={loadMemory}
            className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Memory Records List */}
      {records.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/30 text-center space-y-2">
          <div className="text-xs font-mono text-zinc-400">
            {isLoading ? 'Querying vector store...' : 'No memory records found.'}
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            When the agent verifies and resolves incidents, it indexes resolution vectors into the
            memory store automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((mem: MemoryRecord) => {
            const matchPct = Math.round(mem.similarityScore * 100)
            const isDeleting = deletingId === mem.id

            return (
              <div
                key={mem.id}
                className={`p-6 rounded-xl border border-zinc-800/70 bg-zinc-950/40 space-y-4 hover:border-zinc-700/60 transition-all ${
                  isDeleting ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs text-zinc-400 font-medium">
                      {mem.historicalIncidentId}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
                      {matchPct}% Match
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">
                      Indexed {mem.resolvedAt ? mem.resolvedAt.slice(0, 10) : 'Recent'}
                    </span>
                  </div>

                  {/* Per-card Delete Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(mem.id, mem.historicalIncidentId)}
                      disabled={isDeleting}
                      className="px-2.5 py-1 rounded-md bg-zinc-900/80 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-900/50 text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      title={`Delete ${mem.historicalIncidentId} from vector store`}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-medium text-white mb-1">{mem.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                    {mem.postmortemSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-black/40 border border-zinc-900">
                    <div className="text-[11px] text-zinc-500 font-mono uppercase mb-1">
                      Target Vector Profile
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
      )}
    </div>
  )
}

export default MemoryPage
