import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { AIActivityFlow } from '@/components/AIActivityFlow'

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const incidentId = id || 'INC-8492'

  const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false)
  const [remediationStatus, setRemediationStatus] = React.useState<'RUNNING' | 'COMPLETED'>('RUNNING')

  const handleExecuteRemediation = () => {
    setRemediationStatus('COMPLETED')
  }

  return (
    <div className="min-h-full w-full py-10 px-6 max-w-4xl mx-auto space-y-12">
      {/* Back Link */}
      <div>
        <Link
          to="/incidents"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
        >
          ← All Incidents
        </Link>
      </div>

      {/* Incident Header */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
            {incidentId}
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-950/50 text-red-400 border border-red-800/40">
            CRITICAL
          </span>
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
            {remediationStatus === 'RUNNING' ? 'Remediating' : 'Resolved'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-white mb-2">
            PostgreSQL Connection Starvation in Payment Worker
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            Saturated database connection slots in payment-worker pod replicas caused upstream request queuing and HTTP 500 error spikes on checkout APIs.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Affected Service</div>
            <div className="text-sm text-zinc-200 mt-0.5">payment-worker</div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Root Cause Confidence</div>
            <div className="text-sm text-zinc-200 mt-0.5">94% (Verified)</div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Business Impact</div>
            <div className="text-sm text-zinc-200 mt-0.5">~$42,000 / hr at risk</div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Blast Radius</div>
            <div className="text-sm text-zinc-200 mt-0.5">6 pods · 3 services</div>
          </div>
        </div>
      </section>

      {/* Autonomous Action */}
      <section className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Remediation Plan
        </div>

        <div className="p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-white flex items-center gap-2">
              <span>Rolling Pod Rollout Restart</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-normal">
                Zero Downtime
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              kubectl rollout restart deployment/payment-worker-v2 -n production
            </p>
          </div>

          <div>
            {remediationStatus === 'RUNNING' ? (
              <button
                onClick={handleExecuteRemediation}
                className="px-4 py-2 rounded-lg bg-zinc-100 text-black text-xs font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Complete Remediation
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Rollout Verified Successfully
              </div>
            )}
          </div>
        </div>
      </section>

      {/* AI Activity Section */}
      <section>
        <AIActivityFlow />
      </section>

      {/* Expandable Technical Evidence & Audit */}
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
          <span>{isEvidenceOpen ? 'Hide' : 'View'} Evidence & Audit Details</span>
        </button>

        {isEvidenceOpen && (
          <div className="mt-4 p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Diagnostic Evidence Log
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
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default IncidentDetailPage
