import * as React from 'react'
import { Link } from 'react-router-dom'
import { AIActivityFlow } from '@/components/AIActivityFlow'

export const OverviewPage: React.FC = () => {
  const [simulationPhaseIndex, setSimulationPhaseIndex] = React.useState<number>(-1)
  const [simulationStatus, setSimulationStatus] = React.useState<'IDLE' | 'RUNNING' | 'COMPLETED'>('IDLE')
  const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false)

  const handleSimulationStatusChange = (
    status: 'IDLE' | 'RUNNING' | 'COMPLETED',
    phaseIndex: number
  ) => {
    setSimulationStatus(status)
    setSimulationPhaseIndex(phaseIndex)
  }

  // Current incident status badge
  const incidentStatusLabel =
    simulationStatus === 'IDLE'
      ? 'Awaiting Simulation'
      : simulationStatus === 'COMPLETED'
      ? 'Resolved'
      : simulationPhaseIndex >= 4
      ? 'Remediating'
      : simulationPhaseIndex >= 2
      ? 'Investigating'
      : 'Detecting'

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-12">
      {/* 1. Active Incident Hero Block */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            Active Incident
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/50 text-red-400 border border-red-800/40">
            CRITICAL
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
              simulationStatus === 'COMPLETED'
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40'
                : simulationStatus === 'RUNNING'
                ? 'bg-sky-950/50 text-sky-400 border-sky-800/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            {incidentStatusLabel}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-white mb-2">
            PostgreSQL Connection Starvation in Payment Worker
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Connection pool saturation on <span className="text-zinc-200">payment-worker</span> has elevated checkout 5xx errors to 14.8%. Autonomous remediation pipeline correlates root cause to commit 7a9f1b2.
          </p>
        </div>

        <div className="flex items-center gap-6 pt-1 text-xs text-zinc-500">
          <div>
            Incident ID: <span className="text-zinc-300 font-mono">INC-8492</span>
          </div>
          <div>
            Service: <span className="text-zinc-300">payment-worker</span>
          </div>
          <div>
            Cluster: <span className="text-zinc-300">k8s-prod-us-east-1</span>
          </div>
          <Link
            to="/incidents/INC-8492"
            className="text-zinc-300 hover:text-white underline underline-offset-4 transition-colors"
          >
            Open detail view →
          </Link>
        </div>
      </section>

      {/* 2. Visual Resolution Flow */}
      <section className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Resolution Flow
        </div>
        <div className="p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            {/* Step 1: Detect */}
            <div className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  simulationPhaseIndex >= 0 ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simulationPhaseIndex >= 0 ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                />
                1. Detect
              </div>
              <span className="text-[11px] text-zinc-500">
                {simulationPhaseIndex >= 0 ? '3 Alerts ingested' : 'Waiting...'}
              </span>
            </div>

            {/* Step 2: Correlate */}
            <div className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  simulationPhaseIndex >= 1 ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simulationPhaseIndex >= 1 ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                />
                2. Correlate
              </div>
              <span className="text-[11px] text-zinc-500">
                {simulationPhaseIndex >= 1 ? 'Temporal link matched' : 'Waiting...'}
              </span>
            </div>

            {/* Step 3: Investigate */}
            <div className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  simulationPhaseIndex >= 2 ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simulationPhaseIndex >= 2 ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                />
                3. Investigate
              </div>
              <span className="text-[11px] text-zinc-500">
                {simulationPhaseIndex >= 2 ? '5 Agents confirmed root' : 'Waiting...'}
              </span>
            </div>

            {/* Step 4: Remediate */}
            <div className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  simulationPhaseIndex >= 4
                    ? simulationStatus === 'COMPLETED'
                      ? 'text-emerald-400'
                      : 'text-sky-400'
                    : 'text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simulationPhaseIndex >= 4
                      ? simulationStatus === 'COMPLETED'
                        ? 'bg-emerald-400'
                        : 'bg-sky-400 animate-pulse'
                      : 'bg-zinc-700'
                  }`}
                />
                4. Remediate
              </div>
              <span className="text-[11px] text-zinc-400">
                {simulationPhaseIndex >= 4
                  ? simulationStatus === 'COMPLETED'
                    ? 'Restart completed'
                    : 'Restarting pods'
                  : 'Waiting...'}
              </span>
            </div>

            {/* Step 5: Verify */}
            <div className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-1.5 font-medium transition-colors ${
                  simulationStatus === 'COMPLETED' ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    simulationStatus === 'COMPLETED' ? 'bg-emerald-400' : 'bg-zinc-700'
                  }`}
                />
                5. Verify
              </div>
              <span className="text-[11px] text-zinc-500">
                {simulationStatus === 'COMPLETED' ? 'Health verified' : 'Queued'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Activity Pipeline with Run Button & Inline Dropdowns */}
      <section>
        <AIActivityFlow onSimulationStatusChange={handleSimulationStatusChange} />
      </section>

      {/* 4. Expandable Details / Evidence / Audit */}
      <section className="pt-2">
        <button
          onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
          className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isEvidenceOpen ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{isEvidenceOpen ? 'Hide' : 'View'} Technical Evidence & Diagnostics</span>
        </button>

        {isEvidenceOpen && (
          <div className="mt-4 p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Diagnostic Correlated Evidence
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-black/60 border border-zinc-800/50">
                <div className="text-zinc-300 font-medium mb-1">
                  Commit 7a9f1b2 (Unreleased Connection in Catch Block)
                </div>
                <div className="font-mono text-zinc-400 text-[11px] leading-relaxed">
                  + const client = await pool.connect();<br />
                  + try &#123; await sync(); &#125;<br />
                  + catch(e) &#123; logger.error(e); /* MISSING client.release() */ &#125;
                </div>
              </div>

              <div className="p-3 rounded-lg bg-black/60 border border-zinc-800/50">
                <div className="text-zinc-300 font-medium mb-1">
                  PostgreSQL Connection Log Rejection
                </div>
                <div className="font-mono text-zinc-400 text-[11px]">
                  FATAL: remaining connection slots are reserved for non-replication superuser connections (error code 53300)
                </div>
              </div>

              <div className="flex gap-4 pt-1">
                <Link
                  to="/alerts"
                  className="text-zinc-400 hover:text-white underline underline-offset-4"
                >
                  View all 3 alerts →
                </Link>
                <Link
                  to="/memory"
                  className="text-zinc-400 hover:text-white underline underline-offset-4"
                >
                  View similar historical incidents →
                </Link>
                <Link
                  to="/audit"
                  className="text-zinc-400 hover:text-white underline underline-offset-4"
                >
                  View full immutable audit ledger →
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default OverviewPage
