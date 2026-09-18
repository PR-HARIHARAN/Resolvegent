import * as React from 'react'
import { useParams, Link } from 'react-router-dom'
import { AIActivityFlow } from '@/components/AIActivityFlow'
import { fetchIncidentById, fetchAlerts, fetchAuditEvents } from '@/api/client'
import type { Incident, Alert, AuditEvent } from '@/types'

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const incidentId = id || ''

  const [incident, setIncident] = React.useState<Incident | null>(null)
  const [alerts, setAlerts] = React.useState<Alert[]>([])
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(false)

  const loadData = React.useCallback(async () => {
    if (!incidentId) return
    try {
      const [incData, allAlerts, events] = await Promise.all([
        fetchIncidentById(incidentId),
        fetchAlerts(),
        fetchAuditEvents(incidentId),
      ])
      setIncident(incData)
      setAlerts(allAlerts.filter((a) => a.incidentId === incidentId))
      setAuditEvents(events)
    } catch (err) {
      console.error('Failed to load incident detail:', err)
    } finally {
      setIsLoading(false)
    }
  }, [incidentId])

  React.useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 2000)
    return () => clearInterval(interval)
  }, [loadData])

  if (isLoading) {
    return (
      <div className="min-h-full w-full py-16 px-6 max-w-4xl mx-auto text-center font-mono text-xs text-zinc-500">
        Loading incident {incidentId}...
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="min-h-full w-full py-16 px-6 max-w-4xl mx-auto space-y-4 text-center">
        <div className="text-zinc-300 font-medium">Incident {incidentId} not found</div>
        <p className="text-xs text-zinc-500">
          This incident record does not exist or has not been triggered yet.
        </p>
        <Link
          to="/incidents"
          className="inline-block px-4 py-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white"
        >
          ← Back to All Incidents
        </Link>
      </div>
    )
  }

  const isCritical = incident.severity === 'CRITICAL'
  const isResolved = incident.status === 'RESOLVED'
  const decision = incident.decision as Record<string, any> | undefined

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
            {incident.id}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              isCritical
                ? 'bg-red-950/50 text-red-400 border-red-800/40'
                : 'bg-amber-950/50 text-amber-400 border-amber-800/40'
            }`}
          >
            {incident.severity}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              isResolved
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30'
                : 'bg-sky-950/40 text-sky-400 border-sky-800/30'
            }`}
          >
            {isResolved ? 'Resolved' : 'Remediating'}
          </span>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-white mb-2">
            {incident.title}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
            {incident.rootCause ||
              `Autonomous LangGraph state machine is actively correlating signals across ${incident.service}.`}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Primary Service</div>
            <div className="text-sm text-zinc-200 mt-0.5 font-mono">{incident.service}</div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Root Cause Confidence</div>
            <div className="text-sm text-zinc-200 mt-0.5 font-mono">
              {incident.rootCauseConfidence
                ? `${Math.round(incident.rootCauseConfidence * 100)}% (Verified)`
                : 'Evaluating...'}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Correlated Alerts</div>
            <div className="text-sm text-zinc-200 mt-0.5 font-mono">
              {alerts.length} signals
            </div>
          </div>
          <div className="p-3 rounded-lg border border-zinc-800/60 bg-zinc-950/40">
            <div className="text-[11px] text-zinc-500 font-mono uppercase">Status</div>
            <div className="text-sm text-zinc-200 mt-0.5 font-mono">
              {isResolved ? 'Resolved & Verified' : 'In Progress'}
            </div>
          </div>
        </div>
      </section>

      {/* Autonomous Action */}
      <section className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          Autonomous Remediation Action
        </div>

        <div className="p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-white flex items-center gap-2">
              <span>
                {decision?.action_type
                  ? decision.action_type.replace(/_/g, ' ').toUpperCase()
                  : 'Automated Service Remediation'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-normal font-mono">
                Autonomous
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              {decision?.rationale ||
                `Targeted fix executed on ${incident.service} to restore latency baseline and clear error rate.`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium font-mono flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            {isResolved ? 'Remediation Verified' : 'Executing Fix'}
          </div>
        </div>
      </section>

      {/* Live AI Activity Section */}
      <section>
        <AIActivityFlow activeIncidentId={incident.id} />
      </section>

      {/* Correlated Signals & Evidence */}
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
          <span>{isEvidenceOpen ? 'Hide' : 'View'} Correlated Alerts & Audit Ledger</span>
        </button>

        {isEvidenceOpen && (
          <div className="mt-4 p-5 rounded-xl border border-zinc-800/70 bg-zinc-950/40 space-y-4 animate-in fade-in duration-150">
            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Correlated Raw Telemetry Alerts ({alerts.length})
            </div>

            <div className="space-y-2">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="p-3 rounded-lg bg-black/60 border border-zinc-800/50 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs text-zinc-200 font-medium">{al.title}</div>
                    <div className="text-[11px] text-zinc-500">{al.summary}</div>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 flex-shrink-0">
                    {al.severity}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider pt-2">
              Audit Events ({auditEvents.length})
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {auditEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="text-xs p-2 rounded bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-between font-mono"
                >
                  <span className="text-zinc-300">{ev.details?.action || ev.eventType}</span>
                  <span className="text-zinc-500 text-[11px]">{ev.timestamp.slice(11, 19)} UTC</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default IncidentDetailPage
