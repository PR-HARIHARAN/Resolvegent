import * as React from 'react'

export interface AgentAction {
  name: string
  role: string
  status: 'COMPLETED' | 'RUNNING' | 'WAITING'
  action: string
  detail?: string
}

export interface PhaseConfig {
  id: string
  name: string
  summary: string
  timestamp: string
  durationMs: number
  backgroundDetails: {
    overview: string
    agents: AgentAction[]
    telemetry?: { key: string; value: string }[]
    logSnippet?: string
  }
}

// Dedicated time gap after each process completes before the next one starts
export const TIME_GAP_AFTER_PROCESS_MS = 2000

export const PHASES: PhaseConfig[] = [
  {
    id: 'detecting',
    name: 'Detecting',
    summary: 'Ingested 3 high-volume telemetry signals from Datadog, Prometheus, and CloudWatch',
    timestamp: '11:38:05 UTC',
    durationMs: 4000,
    backgroundDetails: {
      overview:
        'Continuous signal ingestion engines detected simultaneous anomalous metric breaches across production checkout and payment infrastructure.',
      agents: [
        {
          name: 'Datadog Telemetry Agent',
          role: 'Metric Monitor',
          status: 'COMPLETED',
          action: 'Polled 45 database performance metrics; detected critical connection pool saturation',
          detail: 'pg.pool.active_connections_pct surged to 99.4% (Critical threshold: >85.0%) on payment-worker-v2',
        },
        {
          name: 'Prometheus Ingestion Agent',
          role: 'HTTP Health Prober',
          status: 'COMPLETED',
          action: 'Scanned ingress traffic; identified severe HTTP 5xx error rate spike on checkout endpoints',
          detail: 'checkout-api HTTP 500 error rate spiked to 14.8% (SLA ceiling: >1.0%) on /v1/checkout/process',
        },
        {
          name: 'CloudWatch Gateway Agent',
          role: 'External Services',
          status: 'COMPLETED',
          action: 'Monitored outbound payment gateway requests; detected downstream webhook latency timeout',
          detail: 'Stripe webhook timeout latency degraded to 4,820ms (Baseline SLA: <800ms)',
        },
      ],
      telemetry: [
        { key: 'Datadog Pool Saturation', value: 'pg.pool.active_connections_pct = 99.4% (Threshold: >85%)' },
        { key: 'Prometheus HTTP 500 Spike', value: 'checkout-api 5xx rate = 14.8% (Threshold: >1.0%)' },
        { key: 'CloudWatch Stripe Latency', value: 'payment-gateway webhook latency = 4,820ms (Threshold: >800ms)' },
      ],
      logSnippet:
        '[Datadog Agent] Alert ALR-9021 triggered: payment-worker-v2 pool connection exhaustion on k8s-prod-us-east-1.',
    },
  },
  {
    id: 'correlating',
    name: 'Correlating',
    summary: 'Correlated 3 distinct alerts into unified operational incident INC-8492',
    timestamp: '11:38:22 UTC',
    durationMs: 4000,
    backgroundDetails: {
      overview:
        'Temporal clusterer and service-mesh topology engine isolated a shared root cause node, consolidating multiple isolated alert pages into a single incident.',
      agents: [
        {
          name: 'Temporal Correlation Engine',
          role: 'Time-Series Clustering',
          status: 'COMPLETED',
          action: 'Grouped 3 asynchronous alerts across distinct monitoring systems into unified window',
          detail: 'Identified 33-second temporal delta between Datadog pool alert and Prometheus 5xx surge',
        },
        {
          name: 'Blast Radius Graph Linker',
          role: 'Service Topology',
          status: 'COMPLETED',
          action: 'Traversed microservice dependency graph; isolated shared upstream failure link',
          detail: 'Linked checkout-api thread congestion directly to payment-worker database bottleneck',
        },
        {
          name: 'Incident Scope Classifier',
          role: 'Deduplication & Scope',
          status: 'COMPLETED',
          action: 'Suppressed 18 duplicate downstream alert pages; generated incident scope INC-8492',
          detail: 'Cluster reduced alert noise by 86%; confirmed single-root operational incident INC-8492',
        },
      ],
      telemetry: [
        { key: 'Cluster Window', value: '33-second temporal delta between first and third alert' },
        { key: 'Blast Radius Link', value: 'checkout-api -> payment-worker -> postgres-primary-prod' },
        { key: 'Noise Reduction', value: '3 alert pages compressed to 1 incident scope (66% noise reduction)' },
      ],
      logSnippet:
        '[Correlator] Unified ALR-9021, ALR-9022, ALR-9023 into INC-8492. Primary blast origin: payment-worker.',
    },
  },
  {
    id: 'investigating',
    name: 'Investigating',
    summary: '5 specialized agents executed diagnostics across logs, git commits, topology, and memory',
    timestamp: '11:38:45 UTC',
    durationMs: 6500, // 5 agents streaming sequentially (~1.3s each)
    backgroundDetails: {
      overview:
        'Multi-agent investigative ensemble ran concurrent diagnostic inspections to determine root cause and measure blast radius.',
      agents: [
        {
          name: 'Log Analyzer',
          role: 'Diagnostic Logs',
          status: 'COMPLETED',
          action: 'Scanned 142,000 logs; isolated 842 fatal connection pool errors',
          detail: 'FATAL: remaining connection slots are reserved for non-replication superuser connections (error code 53300)',
        },
        {
          name: 'Git Correlator',
          role: 'Code & Release',
          status: 'COMPLETED',
          action: 'Identified commit 7a9f1b2 deployed 18m prior with unreleased pool.release() call',
          detail: 'Commit 7a9f1b2 introduced connection leak: catch block omitted client.release() in retry loop',
        },
        {
          name: 'Topology Mapper',
          role: 'Service Mesh',
          status: 'COMPLETED',
          action: 'Traced blast radius: checkout-api -> payment-worker -> postgres-primary',
          detail: 'Pool starvation cascaded upstream, filling checkout-api HTTP connection backlog queue',
        },
        {
          name: 'Memory Agent',
          role: 'Knowledge Retrieval',
          status: 'COMPLETED',
          action: 'Retrieved 96% matching past incident INC-7102 with verified restart remediation',
          detail: 'Historical resolution verified: Rolling restart freed zombie connection leases in 42 seconds',
        },
        {
          name: 'Impact Assessor',
          role: 'Business Assessment',
          status: 'COMPLETED',
          action: 'Estimated $42,000 revenue at risk across 128 affected checkout requests/min',
          detail: 'Tier 1 impact: Checkout conversion down 32% during pool lockup window',
        },
      ],
    },
  },
  {
    id: 'deciding',
    name: 'Deciding',
    summary: 'Root cause confirmed with 94% confidence; automated rolling restart selected',
    timestamp: '11:39:10 UTC',
    durationMs: 4000,
    backgroundDetails: {
      overview:
        'Decision engine scored candidate remediations against risk, blast radius, and historical success rates.',
      agents: [
        {
          name: 'Candidate Action Synthesizer',
          role: 'Options Evaluation',
          status: 'COMPLETED',
          action: 'Evaluated 3 automated recovery playbooks against service blast radius and latency impact',
          detail: 'Playbook A (Database reboot) rejected due to full cluster downtime risk',
        },
        {
          name: 'Risk & Confidence Evaluator',
          role: 'Safety Verification',
          status: 'COMPLETED',
          action: 'Computed safety score and historical success probability for zero-downtime rollout restart',
          detail: 'Confidence score: 94% · Assessed risk level: LOW · Estimated recovery time: 45 seconds',
        },
        {
          name: 'Execution Plan Generator',
          role: 'Playbook Assembly',
          status: 'COMPLETED',
          action: 'Assembled Kubernetes rolling restart specification with progressive canary health check',
          detail: 'Plan ready: kubectl rollout restart deployment/payment-worker-v2 -n production',
        },
      ],
      telemetry: [
        { key: 'Confidence Score', value: '94% (High certainty based on memory match INC-7102)' },
        { key: 'Selected Action', value: 'Rolling rollout restart of payment-worker-v2 deployment' },
        { key: 'Alternative Rejected', value: 'PostgreSQL instance restart (Rejected: High customer blast radius)' },
        { key: 'Downtime Impact', value: '0 seconds estimated downtime (Kubernetes rolling pod update)' },
      ],
      logSnippet:
        '[Decision Engine] Recommended action: kubectl rollout restart deployment/payment-worker-v2 (Risk: LOW).',
    },
  },
  {
    id: 'remediating',
    name: 'Remediating',
    summary: 'Executing rolling rollout restart on payment-worker deployment in us-east-1',
    timestamp: '11:39:35 UTC',
    durationMs: 4000,
    backgroundDetails: {
      overview:
        'Autonomous orchestration executor applied targeted Kubernetes rollout restart to terminate zombie database connection locks.',
      agents: [
        {
          name: 'Kubernetes Rollout Initiator',
          role: 'Cluster Orchestration',
          status: 'COMPLETED',
          action: 'Dispatched rolling restart command to k8s-prod-us-east-1 control plane',
          detail: 'Triggered rolling deployment update for payment-worker-v2; zero customer downtime guaranteed',
        },
        {
          name: 'Pod Lifecycle Supervisor',
          role: 'Container Watcher',
          status: 'COMPLETED',
          action: 'Monitored replacement of 6 worker pods; terminated zombie database client connections',
          detail: 'Terminated leaked connection sockets; 6/6 pods initialized with fresh connection pools',
        },
        {
          name: 'Traffic Router Controller',
          role: 'Load Balancing',
          status: 'COMPLETED',
          action: 'Re-enabled ingress routing across newly spun healthy worker pod replicas',
          detail: 'Traefik ingress confirmed all target backends responsive; request queue cleared',
        },
      ],
      telemetry: [
        { key: 'Command', value: 'kubectl rollout restart deployment/payment-worker-v2 -n production' },
        { key: 'Target Cluster', value: 'k8s-prod-us-east-1 (6 pod replicas)' },
        { key: 'Execution Status', value: 'Pods 1-6 restarted sequentially; stale TCP sockets terminated' },
      ],
      logSnippet:
        '[K8s Orchestrator] deployment.apps/payment-worker-v2 restarted successfully. All 6 pods healthy.',
    },
  },
  {
    id: 'verifying',
    name: 'Verifying',
    summary: 'Automated health probes confirmed connection pool capacity and HTTP 5xx return to baseline',
    timestamp: '11:39:55 UTC',
    durationMs: 4800,
    backgroundDetails: {
      overview:
        'Verification prober continuously evaluated real-time metrics against pre-incident operating baseline.',
      agents: [
        {
          name: 'Database Pool Prober',
          role: 'Capacity Assertion',
          status: 'COMPLETED',
          action: 'Queried active PostgreSQL connection count across all worker pods',
          detail: 'Active connection pool dropped to 28.4% (Threshold: <40.0%) - PASSED',
        },
        {
          name: 'HTTP Error Rate Validator',
          role: 'SLA Verification',
          status: 'COMPLETED',
          action: 'Sampled 10,000 checkout transactions for 5xx response codes',
          detail: 'HTTP 5xx error rate dropped to 0.04% (Baseline SLA: <0.10%) - PASSED',
        },
        {
          name: 'End-to-End Latency Inspector',
          role: 'User Experience',
          status: 'COMPLETED',
          action: 'Measured synthetic checkout purchase transaction duration',
          detail: 'P99 checkout latency restored to 210ms (Pre-incident baseline: 195ms) - PASSED',
        },
        {
          name: 'Postmortem Memory Archiver',
          role: 'Knowledge Ingestion',
          status: 'COMPLETED',
          action: 'Indexed incident telemetry and resolution pattern into neural memory vector index',
          detail: 'Stored resolution embedding for fast future matching; incident INC-8492 marked RESOLVED',
        },
      ],
      telemetry: [
        { key: 'Active Connection Pool', value: '28.4% (Threshold: <40%) - PASSED' },
        { key: 'Checkout HTTP 5xx Rate', value: '0.04% (Baseline: <0.10%) - PASSED' },
        { key: 'Stripe Webhook Latency', value: '184ms (Baseline: <300ms) - PASSED' },
      ],
      logSnippet:
        '[Verification] All 4 operational checks PASSED. Incident INC-8492 marked resolved.',
    },
  },
]

interface StreamingAgentRowProps {
  agent: AgentAction
  status: 'DONE' | 'STREAMING' | 'QUEUED' | 'WAITING'
}

export const StreamingAgentRow: React.FC<StreamingAgentRowProps> = ({ agent, status }) => {
  const [displayedAction, setDisplayedAction] = React.useState(
    status === 'DONE' ? agent.action : ''
  )
  const [displayedDetail, setDisplayedDetail] = React.useState(
    status === 'DONE' ? (agent.detail || '') : ''
  )
  const [actionDone, setActionDone] = React.useState(status === 'DONE')

  React.useEffect(() => {
    if (status === 'DONE') {
      setDisplayedAction(agent.action)
      setDisplayedDetail(agent.detail || '')
      setActionDone(true)
      return
    }

    if (status === 'QUEUED' || status === 'WAITING') {
      setDisplayedAction('')
      setDisplayedDetail('')
      setActionDone(false)
      return
    }

    if (status === 'STREAMING') {
      setDisplayedAction('')
      setDisplayedDetail('')
      setActionDone(false)

      let actionIdx = 0
      const actionInterval = setInterval(() => {
        actionIdx += 2
        if (actionIdx >= agent.action.length) {
          setDisplayedAction(agent.action)
          setActionDone(true)
          clearInterval(actionInterval)

          if (agent.detail) {
            let detailIdx = 0
            const detailInterval = setInterval(() => {
              detailIdx += 3
              if (detailIdx >= (agent.detail?.length || 0)) {
                setDisplayedDetail(agent.detail || '')
                clearInterval(detailInterval)
              } else {
                setDisplayedDetail(agent.detail?.slice(0, detailIdx) || '')
              }
            }, 12)
          }
        } else {
          setDisplayedAction(agent.action.slice(0, actionIdx))
        }
      }, 14)

      return () => {
        clearInterval(actionInterval)
      }
    }
  }, [status, agent.action, agent.detail])

  return (
    <div
      className={`rounded-lg border p-3.5 transition-all ${
        status === 'STREAMING'
          ? 'border-sky-500/50 bg-sky-950/20 shadow-sm'
          : status === 'DONE'
          ? 'border-zinc-800/60 bg-zinc-950/60'
          : 'border-zinc-900/80 bg-black/40 opacity-50'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-xs text-zinc-200">{agent.name}</span>
          <span className="text-[10px] font-mono text-zinc-500">({agent.role})</span>
        </div>

        {status === 'DONE' && (
          <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-mono">
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Done
          </span>
        )}

        {status === 'STREAMING' && (
          <span className="text-sky-400 text-[11px] flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            Streaming...
          </span>
        )}

        {(status === 'QUEUED' || status === 'WAITING') && (
          <span className="text-zinc-600 text-[11px] font-mono">
            Queued
          </span>
        )}
      </div>

      {/* Streaming Action Text */}
      <p className="text-xs text-zinc-300 leading-relaxed min-h-[1.25rem]">
        {status === 'QUEUED' || status === 'WAITING' ? (
          <span className="text-zinc-600 italic">Waiting for previous process to complete...</span>
        ) : (
          <>
            {displayedAction}
            {status === 'STREAMING' && !actionDone && (
              <span className="inline-block w-1.5 h-3 ml-0.5 bg-sky-400 animate-pulse align-middle" />
            )}
          </>
        )}
      </p>

      {/* Streaming Detail Box */}
      {displayedDetail && (
        <div className="mt-2 text-[11px] font-mono text-zinc-300 bg-black/80 rounded px-2.5 py-1.5 border border-zinc-800/60 break-all leading-relaxed">
          {displayedDetail}
          {status === 'STREAMING' && actionDone && (
            <span className="inline-block w-1.5 h-2.5 ml-0.5 bg-sky-400 animate-pulse align-middle" />
          )}
        </div>
      )}
    </div>
  )
}

interface AIActivityFlowProps {
  onSimulationStatusChange?: (status: 'IDLE' | 'RUNNING' | 'COMPLETED', currentPhaseIndex: number) => void
}

export const AIActivityFlow: React.FC<AIActivityFlowProps> = ({ onSimulationStatusChange }) => {
  const [simulationState, setSimulationState] = React.useState<'IDLE' | 'RUNNING' | 'COMPLETED'>('IDLE')
  const [visibleCount, setVisibleCount] = React.useState<number>(0)
  const [activeRunningIndex, setActiveRunningIndex] = React.useState<number>(-1)
  const [isWaitingGap, setIsWaitingGap] = React.useState<boolean>(false)
  const [expandedIds, setExpandedIds] = React.useState<string[]>([])

  // Map tracking the active streaming sub-process index for EACH phase
  const [activeSubMap, setActiveSubMap] = React.useState<Record<string, number>>({})
  const [replayTriggerMap, setReplayTriggerMap] = React.useState<Record<string, number>>({})

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const subIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (subIntervalRef.current) clearInterval(subIntervalRef.current)
    }
  }, [])

  const startSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (subIntervalRef.current) clearInterval(subIntervalRef.current)

    setSimulationState('RUNNING')
    setVisibleCount(1)
    setActiveRunningIndex(0)
    setIsWaitingGap(false)
    setActiveSubMap({})
    onSimulationStatusChange?.('RUNNING', 0)

    runStep(0)
  }

  const runStep = (stepIndex: number) => {
    const currentPhase = PHASES[stepIndex]
    const duration = currentPhase.durationMs
    const agentCount = currentPhase.backgroundDetails.agents.length

    // Start streaming the sub-processes of this active phase
    setActiveSubMap((prev) => ({ ...prev, [currentPhase.id]: 0 }))

    if (agentCount > 0) {
      let currentSub = 0
      const subIntervalTime = Math.floor((duration - 200) / agentCount)

      subIntervalRef.current = setInterval(() => {
        currentSub += 1
        if (currentSub >= agentCount) {
          setActiveSubMap((prev) => ({ ...prev, [currentPhase.id]: agentCount }))
          if (subIntervalRef.current) clearInterval(subIntervalRef.current)
        } else {
          setActiveSubMap((prev) => ({ ...prev, [currentPhase.id]: currentSub }))
        }
      }, subIntervalTime)
    }

    // Phase actively runs for `duration`
    timerRef.current = setTimeout(() => {
      if (subIntervalRef.current) clearInterval(subIntervalRef.current)
      // Ensure all sub-processes of this phase are marked completed
      setActiveSubMap((prev) => ({ ...prev, [currentPhase.id]: agentCount }))

      // 1. Current phase completes
      const nextIndex = stepIndex + 1

      if (nextIndex < PHASES.length) {
        setActiveRunningIndex(-1)
        setIsWaitingGap(true)

        // 2. Wait the dedicated 2-second time gap before starting next process
        timerRef.current = setTimeout(() => {
          setIsWaitingGap(false)
          setVisibleCount(nextIndex + 1)
          setActiveRunningIndex(nextIndex)
          onSimulationStatusChange?.('RUNNING', nextIndex)
          runStep(nextIndex)
        }, TIME_GAP_AFTER_PROCESS_MS)
      } else {
        // Finished all phases
        setActiveRunningIndex(-1)
        setIsWaitingGap(false)
        setSimulationState('COMPLETED')
        onSimulationStatusChange?.('COMPLETED', PHASES.length - 1)
      }
    }, duration)
  }

  const resetSimulation = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (subIntervalRef.current) clearInterval(subIntervalRef.current)
    setSimulationState('IDLE')
    setVisibleCount(0)
    setActiveRunningIndex(-1)
    setIsWaitingGap(false)
    setActiveSubMap({})
    setExpandedIds([])
    onSimulationStatusChange?.('IDLE', -1)
  }

  const toggleExpand = (phaseId: string) => {
    setExpandedIds((prev) =>
      prev.includes(phaseId) ? prev.filter((id) => id !== phaseId) : [...prev, phaseId]
    )
  }

  // Trigger manual stream replay for any phase
  const replayPhaseStreaming = (phaseId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const phase = PHASES.find((p) => p.id === phaseId)
    if (!phase) return

    const agentCount = phase.backgroundDetails.agents.length
    if (agentCount === 0) return

    setReplayTriggerMap((prev) => ({ ...prev, [phaseId]: (prev[phaseId] || 0) + 1 }))
    setActiveSubMap((prev) => ({ ...prev, [phaseId]: 0 }))

    let currentSub = 0
    const subIntervalTime = Math.floor((phase.durationMs - 200) / agentCount)

    const interval = setInterval(() => {
      currentSub += 1
      if (currentSub >= agentCount) {
        setActiveSubMap((prev) => ({ ...prev, [phaseId]: agentCount }))
        clearInterval(interval)
      } else {
        setActiveSubMap((prev) => ({ ...prev, [phaseId]: currentSub }))
      }
    }, subIntervalTime)
  }

  return (
    <div className="space-y-4">
      {/* Header bar with title and Run button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">
            AI Activity Pipeline
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {simulationState === 'IDLE' && 'Click Run to simulate live autonomous agent investigation and remediation'}
            {simulationState === 'RUNNING' && (
              isWaitingGap
                ? 'Process completed. Pausing 2s before next phase...'
                : 'Simulating live autonomous incident resolution pipeline...'
            )}
            {simulationState === 'COMPLETED' && 'Simulation complete. All phases verified and resolved.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {simulationState === 'IDLE' && (
            <button
              onClick={startSimulation}
              className="px-4 py-2 rounded-lg bg-zinc-100 text-black text-xs font-medium hover:bg-white transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Simulation
            </button>
          )}

          {simulationState === 'RUNNING' && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-sky-950/60 text-sky-400 border border-sky-800/60 text-xs font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                {isWaitingGap ? 'Next Phase in 2s...' : 'Simulating...'}
              </span>
              <button
                onClick={resetSimulation}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}

          {simulationState === 'COMPLETED' && (
            <div className="flex items-center gap-2">
              <button
                onClick={startSimulation}
                className="px-4 py-2 rounded-lg bg-zinc-100 text-black text-xs font-medium hover:bg-white transition-all flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.85 20 14.48 20 13c0-4.42-3.58-8-8-8zm-6 8c0-1.01.25-1.97.7-2.8L5.24 8.74C4.46 10.15 4 11.52 4 13c0 4.42 3.58 8 8 8v4l5-5-5-5v4c-3.31 0-6-2.69-6-6z" />
                </svg>
                Re-run Simulation
              </button>
              <button
                onClick={resetSimulation}
                className="px-3 py-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* When IDLE: clean serene prompt card */}
      {simulationState === 'IDLE' && (
        <div className="p-8 rounded-xl border border-zinc-800/60 bg-zinc-950/30 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-zinc-200">
            Pipeline Ready to Simulate
          </div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            Phases (<span className="text-zinc-400">Detecting → Correlating → Investigating → Deciding → Remediating → Verifying</span>) will appear sequentially with a 2s time gap. Click any phase while loading to watch live background agent streaming responses.
          </p>
          <div className="pt-2">
            <button
              onClick={startSimulation}
              className="px-5 py-2 rounded-lg bg-zinc-200 text-black text-xs font-medium hover:bg-white transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
            >
              <span>Start Simulation</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Sequential Phases List */}
      {visibleCount > 0 && (
        <div className="divide-y divide-zinc-900 border border-zinc-800/70 rounded-xl bg-zinc-950/40 overflow-hidden">
          {PHASES.slice(0, visibleCount).map((phase, index) => {
            const isCurrentlyRunning = index === activeRunningIndex
            const isCompleted = index < activeRunningIndex || activeRunningIndex === -1
            const isExpanded = expandedIds.includes(phase.id)

            // Current active sub-process index for this phase
            const phaseActiveSub = activeSubMap[phase.id] ?? (isCompleted ? 999 : -1)
            const replayKey = replayTriggerMap[phase.id] || 0

            return (
              <div key={phase.id} className="transition-all">
                {/* Clickable Phase Row */}
                <button
                  onClick={() => toggleExpand(phase.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors group cursor-pointer select-none"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-4 flex-1 pr-4">
                    {/* Status Dot */}
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                        isCurrentlyRunning
                          ? 'bg-sky-400 ring-4 ring-sky-400/20 animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-400'
                          : 'bg-zinc-700'
                      }`}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white transition-colors">
                          {phase.name}
                        </span>

                        {isCurrentlyRunning && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-400 border border-sky-800/60 font-mono flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                            Executing...
                          </span>
                        )}

                        {isCompleted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 font-mono">
                            ✓ Done
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-zinc-500 line-clamp-1 mt-0.5">
                        {phase.summary}
                      </div>
                    </div>
                  </div>

                  {/* Right side: timestamp & dropdown arrow */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                      {phase.timestamp}
                    </span>
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors flex items-center gap-1">
                      <span className="text-[11px] hidden sm:inline">
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-zinc-200' : ''
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </div>
                </button>

                {/* Inline Dropdown Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-zinc-900/20 border-t border-zinc-900/80 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Live status alert if currently running */}
                    {isCurrentlyRunning && (
                      <div className="p-3 rounded-lg bg-sky-950/40 border border-sky-800/50 flex items-center justify-between text-xs text-sky-300">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                          <span>Live: Agents actively executing tasks for {phase.name} in background...</span>
                        </div>
                        <span className="font-mono text-[11px] text-sky-400/80">In Progress</span>
                      </div>
                    )}

                    {/* Overview Paragraph */}
                    <div className="text-xs text-zinc-300 leading-relaxed bg-black/40 rounded-lg p-3.5 border border-zinc-800/50">
                      {phase.backgroundDetails.overview}
                    </div>

                    {/* Sub-Processes with Live Streaming Responses */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                          {phase.name} Sub-Processes (Live Streaming)
                        </div>
                        <button
                          onClick={(e) => replayPhaseStreaming(phase.id, e)}
                          className="text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 font-mono transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Replay live streaming responses for ${phase.name}`}
                        >
                          <span>↺ Replay Stream</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {phase.backgroundDetails.agents.map((agent, aIdx) => {
                          // Calculate streaming status for this sub-process
                          let rowStatus: 'DONE' | 'STREAMING' | 'QUEUED' | 'WAITING' = 'DONE'

                          if (isCurrentlyRunning) {
                            if (aIdx === phaseActiveSub) {
                              rowStatus = 'STREAMING'
                            } else if (aIdx < phaseActiveSub) {
                              rowStatus = 'DONE'
                            } else {
                              rowStatus = 'QUEUED'
                            }
                          } else if (isCompleted) {
                            // If replay was clicked on a completed phase
                            if (phaseActiveSub < phase.backgroundDetails.agents.length) {
                              if (aIdx === phaseActiveSub) {
                                rowStatus = 'STREAMING'
                              } else if (aIdx < phaseActiveSub) {
                                rowStatus = 'DONE'
                              } else {
                                rowStatus = 'QUEUED'
                              }
                            } else {
                              rowStatus = 'DONE'
                            }
                          } else {
                            rowStatus = 'WAITING'
                          }

                          return (
                            <StreamingAgentRow
                              key={`${phase.id}-${aIdx}-${replayKey}`}
                              agent={agent}
                              status={rowStatus}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* Telemetry Key-Value Grid */}
                    {phase.backgroundDetails.telemetry && (
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                          Background Telemetry & Invariants
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {phase.backgroundDetails.telemetry.map((item, tIdx) => (
                            <div
                              key={tIdx}
                              className="p-2.5 rounded bg-black/40 border border-zinc-800/50 flex flex-col justify-between"
                            >
                              <span className="text-[11px] text-zinc-500">{item.key}</span>
                              <span className="font-mono text-zinc-200 text-[11px] mt-0.5">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Log Snippet */}
                    {phase.backgroundDetails.logSnippet && (
                      <div className="space-y-1">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                          Background Event
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400 bg-black/80 rounded p-2.5 border border-zinc-800/60 break-all">
                          {phase.backgroundDetails.logSnippet}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default AIActivityFlow
