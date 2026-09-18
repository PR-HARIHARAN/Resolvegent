# Resolvegent API Endpoints Specification

This document defines all REST and Server-Sent Events (SSE) streaming API endpoints connecting the **Frontend Command Center** (`Client/src/`) to the **Autonomous Incident Resolution Backend Engine** (`src/incident_engine/`).

---

## 🌐 Base Configuration

- **Development Backend Base URL**: `http://localhost:8000`
- **API Prefix**: `/api/v1`
- **Client Environment Variable**: `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- **Content-Type**: `application/json` (REST) / `text/event-stream` (Streaming)

---

## 📑 Summary of Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System & Health** | `GET` | `/health` | Backend & Ollama model connectivity check |
| **Incidents** | `GET` | `/incidents` | List all active and historical incidents |
| | `GET` | `/incidents/{id}` | Get detailed incident report, metrics, and blast radius |
| | `POST` | `/incidents` | Trigger a new operational incident |
| | `POST` | `/incidents/{id}/remediate` | Trigger automated remediation execution |
| | `POST` | `/incidents/{id}/approve` | Submit Human-in-the-Loop (HITL) approval |
| **Simulation & Agent Loop** | `POST` | `/simulation/start` | Start end-to-end incident simulation |
| | `POST` | `/simulation/reset` | Reset simulation state to idle |
| | `GET` | `/simulation/stream` | **SSE Stream**: Live phases and agent token streaming |
| | `POST` | `/simulation/phase/{id}/replay` | Replay stream for a specific phase |
| **Alerts & Ingestion** | `GET` | `/alerts` | Get raw inbound telemetry stream |
| | `POST` | `/alerts/ingest` | Ingest alert burst from monitoring tools |
| **Investigation Agents** | `GET` | `/incidents/{id}/agents` | Get sub-agent states and findings |
| | `GET` | `/incidents/{id}/agents/{agent_id}/stream` | **SSE Stream**: Live diagnostic agent trace |
| **Memory & Knowledge Base** | `GET` | `/memory/similar` | Vector similarity search for historical incidents |
| | `GET` | `/memory/records` | List all historical postmortems and runbooks |
| | `POST` | `/memory/records` | Add a new runbook or postmortem to the vector store |
| **Audit Trail** | `GET` | `/audit/events` | Retrieve immutable cryptographically sequenced ledger |

---

## 1. System & Health

### `GET /health`
Verifies backend service health, LangGraph state machine, and local Ollama model readiness (`qwen2.5:7b` and `bge-m3`).

#### Response: `200 OK`
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "ollama": {
    "connected": true,
    "llm_model": "qwen2.5:7b",
    "embedding_model": "bge-m3:latest"
  },
  "langgraph": {
    "initialized": true,
    "checkpoint_store": "MemorySaver"
  },
  "timestamp": "2026-09-18T23:09:44Z"
}
```

---

## 2. Incidents API

### `GET /incidents`
Lists system incidents with optional severity and status filtering.

#### Query Parameters:
- `severity` *(optional)*: `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`
- `status` *(optional)*: `RECEIVED` | `INVESTIGATING` | `AWAITING_APPROVAL` | `REMEDIATING` | `RESOLVED`
- `limit` *(optional, default: 50)*: Maximum items to return

#### Response: `200 OK`
```json
[
  {
    "id": "INC-8492",
    "title": "PostgreSQL Connection Starvation in Payment Worker",
    "status": "REMEDIATING",
    "severity": "CRITICAL",
    "service": "payment-worker",
    "environment": "production",
    "openedAt": "2026-09-18T11:38:05Z",
    "resolvedAt": null,
    "mttrSeconds": null,
    "correlatedAlertCount": 3,
    "rootCause": "Commit 7a9f1b2 introduced unreleased pool.release() in retry block",
    "rootCauseConfidence": 0.94,
    "businessImpact": {
      "affectedService": "checkout-api",
      "droppedTransactions": 1420,
      "estimatedRevenueAtRisk": 42000,
      "impactDescription": "Checkout 5xx rate surged to 14.8%; $42,000 revenue at risk"
    }
  }
]
```

---

### `GET /incidents/{id}`
Returns complete details of a specific incident including affected service, confidence, root cause analysis, blast radius, and decision.

#### Path Parameters:
- `id` *(required)*: Incident ID (e.g. `INC-8492`)

#### Response: `200 OK`
```json
{
  "id": "INC-8492",
  "title": "PostgreSQL Connection Starvation in Payment Worker",
  "status": "REMEDIATING",
  "severity": "CRITICAL",
  "service": "payment-worker",
  "environment": "production",
  "openedAt": "2026-09-18T11:38:05Z",
  "rootCause": "Commit 7a9f1b2 introduced unreleased pool.release() in retry block",
  "rootCauseConfidence": 0.94,
  "businessImpact": {
    "affectedService": "payment-worker",
    "droppedTransactions": 1420,
    "estimatedRevenueAtRisk": 42000,
    "impactDescription": "Checkout processing stalled for 14m across web and mobile flows."
  },
  "decision": {
    "recommendedAction": {
      "name": "Rolling Pod Rollout Restart",
      "command": "kubectl rollout restart deployment/payment-worker-v2 -n production",
      "targetService": "payment-worker",
      "riskLevel": "LOW",
      "estimatedDurationSec": 45,
      "rollbackPlan": "kubectl rollout undo deployment/payment-worker-v2 -n production"
    },
    "confidenceScore": 0.94,
    "riskAssessment": "LOW"
  }
}
```

---

### `POST /incidents/{id}/remediate`
Triggers execution of the recommended remediation action (e.g. Kubernetes rolling restart).

#### Path Parameters:
- `id` *(required)*: Incident ID

#### Request Body:
```json
{
  "action": "ROLLOUT_RESTART",
  "targetService": "payment-worker",
  "parameters": {
    "namespace": "production",
    "deployment": "payment-worker-v2"
  }
}
```

#### Response: `200 OK`
```json
{
  "success": true,
  "incidentId": "INC-8492",
  "status": "EXECUTING",
  "executedCommand": "kubectl rollout restart deployment/payment-worker-v2 -n production",
  "timestamp": "2026-09-18T11:40:02Z"
}
```

---

### `POST /incidents/{id}/approve`
Submits human operator approval to resume high-risk LangGraph checkpoint `interrupt()`.

#### Request Body:
```json
{
  "approvalStatus": "APPROVED",
  "approver": "sre-lead@company.com",
  "comments": "Approved rolling rollout restart of payment-worker pods"
}
```

#### Response: `200 OK`
```json
{
  "resumed": true,
  "incidentId": "INC-8492",
  "nextStage": "EXECUTING",
  "decidedAt": "2026-09-18T11:39:50Z"
}
```

---

## 3. Real-Time Simulation & Agent Streaming API

### `POST /simulation/start`
Starts the sequential autonomous incident lifecycle simulation from `Detecting` through `Verifying` for all currently ingested and pending alerts.

#### Request Body:
```json
{
  "scenarioId": "LIVE_ALERTS",
  "timeGapSeconds": 2.0,
  "autoRemediate": true
}
```

#### Response: `202 Accepted`
```json
{
  "status": "RUNNING",
  "sessionId": "sim-session-0918",
  "currentPhase": "detecting",
  "streamUrl": "/api/v1/simulation/stream?sessionId=sim-session-0918"
}
```

---

### `POST /simulation/reset`
Resets the simulator state back to clean idle.

#### Response: `200 OK`
```json
{
  "status": "IDLE",
  "message": "Simulation session reset successfully"
}
```

---

### `GET /simulation/stream` *(SSE - Server-Sent Events)*
Establishes a real-time event stream pushing phase changes, live typewriter tokens, and agent findings.

#### Query Parameters:
- `sessionId` *(optional)*: Current simulation session ID

#### SSE Event Format:
```text
event: phase_start
data: {"phase": "detecting", "timestamp": "11:38:05 UTC"}

event: agent_stream_token
data: {"phase": "detecting", "agentIndex": 0, "agentName": "Datadog Telemetry Agent", "token": "Polled 45 database performance metrics; detected critical connection pool saturation"}

event: agent_completed
data: {"phase": "detecting", "agentIndex": 0, "agentName": "Datadog Telemetry Agent", "status": "DONE"}

event: phase_completed
data: {"phase": "detecting", "nextPhaseIn": 2.0}

event: phase_start
data: {"phase": "correlating", "timestamp": "11:38:22 UTC"}

event: phase_start
data: {"phase": "investigating", "timestamp": "11:38:45 UTC"}

event: agent_stream_token
data: {"phase": "investigating", "agentIndex": 0, "agentName": "Log Analyzer", "token": "Scanned 142,000 logs; isolated 842 fatal connection pool errors"}

event: agent_stream_detail
data: {"phase": "investigating", "agentIndex": 0, "detail": "FATAL: remaining connection slots are reserved for non-replication superuser connections (error code 53300)"}

event: phase_completed
data: {"phase": "investigating", "nextPhaseIn": 2.0}

event: simulation_finished
data: {"status": "COMPLETED", "incidentId": "INC-8492", "verified": true}
```

---

### `POST /simulation/phase/{id}/replay`
Replays streaming tokens for a specific phase (e.g. `investigating`) on demand.

#### Path Parameters:
- `id`: `detecting` | `correlating` | `investigating` | `deciding` | `remediating` | `verifying`

#### Response: `200 OK`
```json
{
  "replaying": true,
  "phase": "investigating",
  "agentCount": 5
}
```

---

## 4. Alerts & Telemetry API

### `GET /alerts`
Fetches inbound telemetry signals and alerts ingested from external providers.

#### Response: `200 OK`
```json
[
  {
    "id": "ALR-9021",
    "incidentId": "INC-8492",
    "title": "PaymentService_Postgres_PoolExhausted",
    "source": "Datadog",
    "severity": "CRITICAL",
    "status": "CORRELATED",
    "service": "payment-worker",
    "metricName": "pg.pool.active_connections_pct",
    "metricValue": "99.4%",
    "threshold": "85.0%",
    "timestamp": "2026-09-18T11:38:05Z",
    "summary": "PostgreSQL connection pool saturated at 99.4% on payment-worker-v2 pod instances."
  },
  {
    "id": "ALR-9022",
    "incidentId": "INC-8492",
    "title": "Checkout_HTTP_500_Spike",
    "source": "Prometheus",
    "severity": "CRITICAL",
    "status": "CORRELATED",
    "service": "checkout-api",
    "metricName": "http_requests_5xx_rate",
    "metricValue": "14.8%",
    "threshold": "1.0%",
    "timestamp": "2026-09-18T11:38:18Z",
    "summary": "HTTP 500 error rate surged to 14.8% on POST /v1/checkout/process endpoint."
  }
]
```

---

### `POST /alerts/ingest`
Ingests an array of alert payloads from external providers, storing them in the SQLite database as `RECEIVED`. These will be processed upon triggering `/simulation/start`.

#### Request Body:
```json
[
  {
    "id": "ALR-9025",
    "title": "High Latency Detected",
    "source": "Datadog",
    "severity": "HIGH",
    "service": "payment-api",
    "metricName": "latency_p99_ms",
    "metricValue": "1450",
    "threshold": "500",
    "timestamp": "2026-09-18T11:42:00Z",
    "summary": "P99 latency breached 500ms threshold."
  }
]
```

#### Response: `200 OK`
```json
{
  "status": "success",
  "count": 1
}
```

## 5. Investigation Sub-Agents API

### `GET /incidents/{id}/agents`
Returns the status, duration, summary, and structured evidence gathered by each specialized investigation agent.

#### Path Parameters:
- `id`: Incident ID

#### Response: `200 OK`
```json
[
  {
    "name": "Log Analyzer",
    "role": "Diagnostic Logs",
    "status": "COMPLETED",
    "action": "Scanned 142,000 logs; isolated 842 fatal connection pool errors",
    "detail": "FATAL: remaining connection slots are reserved for non-replication superuser connections (error code 53300)"
  },
  {
    "name": "Git Correlator",
    "role": "Code & Release",
    "status": "COMPLETED",
    "action": "Identified commit 7a9f1b2 deployed 18m prior with unreleased pool.release() call",
    "detail": "Commit 7a9f1b2 introduced connection leak: catch block omitted client.release() in retry loop"
  },
  {
    "name": "Topology Mapper",
    "role": "Service Mesh",
    "status": "COMPLETED",
    "action": "Traced blast radius: checkout-api -> payment-worker -> postgres-primary",
    "detail": "Pool starvation cascaded upstream, filling checkout-api HTTP connection backlog queue"
  },
  {
    "name": "Memory Agent",
    "role": "Knowledge Retrieval",
    "status": "COMPLETED",
    "action": "Retrieved 96% matching past incident INC-7102 with verified restart remediation",
    "detail": "Historical resolution verified: Rolling restart freed zombie connection leases in 42 seconds"
  },
  {
    "name": "Impact Assessor",
    "role": "Business Assessment",
    "status": "COMPLETED",
    "action": "Estimated $42,000 revenue at risk across 128 affected checkout requests/min",
    "detail": "Tier 1 impact: Checkout conversion down 32% during pool lockup window"
  }
]
```

---

## 6. Historical Memory & Vector Store API

### `GET /memory/similar`
Performs vector similarity search against the historical postmortem knowledge base using BGE-M3 embeddings.

#### Query Parameters:
- `query` *(required)*: Error signature or description (e.g. `PostgreSQL connection pool exhausted`)
- `top_k` *(optional, default: 3)*: Number of nearest matches

#### Response: `200 OK`
```json
[
  {
    "historicalIncidentId": "INC-7102",
    "title": "Postgres Client Leaks Following Batch Worker Deployment",
    "similarityScore": 0.96,
    "mttrSeconds": 252,
    "rootCause": "Unclosed database client sockets in batch worker retry loop",
    "resolutionAction": "kubectl rollout restart deployment/payment-worker-v2",
    "resolvedAt": "2026-08-12T14:15:00Z",
    "postmortemSummary": "Rolling restart freed zombie connection leases in 42s with zero customer downtime."
  }
]
```

---

### `POST /memory/records`
Programmatically adds a new runbook or postmortem to the `InMemoryVectorStore` to act as RAG context for future incident investigations.

#### Request Body:
```json
{
  "doc_id": "RB-REDIS-01",
  "category": "runbook",
  "service": "payment-worker",
  "content": "Redis connection exhaustion typically requires restarting the worker pods..."
}
```

#### Response: `200 OK`
```json
{
  "status": "success",
  "doc_id": "RB-REDIS-01"
}
```

---

## 7. Audit Trail API

### `GET /audit/events`
Returns the append-only, chronologically ordered ledger of all system, AI agent, and human operator actions.

#### Response: `200 OK`
```json
[
  {
    "id": "AUD-1001",
    "incidentId": "INC-8492",
    "eventType": "ALERT_INGESTED",
    "actor": "IngestionEngine",
    "actorType": "SYSTEM",
    "timestamp": "2026-09-18T11:38:05Z",
    "status": "INFO",
    "details": { "alertId": "ALR-9021", "metric": "pg.pool.active_connections_pct" }
  },
  {
    "id": "AUD-1002",
    "incidentId": "INC-8492",
    "eventType": "AGENT_COMPLETED",
    "actor": "LogAnalyzerAgent",
    "actorType": "AGENT",
    "timestamp": "2026-09-18T11:39:18Z",
    "status": "SUCCESS",
    "details": { "findingsCount": 842, "error": "FATAL: remaining connection slots reserved" }
  },
  {
    "id": "AUD-1003",
    "incidentId": "INC-8492",
    "eventType": "ACTION_EXECUTED",
    "actor": "K8sRemediationExecutor",
    "actorType": "AGENT",
    "timestamp": "2026-09-18T11:40:02Z",
    "status": "SUCCESS",
    "details": { "command": "kubectl rollout restart deployment/payment-worker-v2" }
  },
  {
    "id": "AUD-1004",
    "incidentId": "INC-8492",
    "eventType": "VERIFICATION_PASSED",
    "actor": "HealthVerifierAgent",
    "actorType": "AGENT",
    "timestamp": "2026-09-18T11:40:48Z",
    "status": "SUCCESS",
    "details": { "poolUsage": "28.4%", "http5xxRate": "0.04%" }
  }
]
```

---

## 8. Frontend Integration Client Example

Here is the standard TypeScript client adapter (`Client/src/api/client.ts`) for connecting the UI to this backend:

```typescript
// Client/src/api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const api = {
  // Incidents
  getIncidents: () => fetch(`${API_BASE}/incidents`).then(r => r.json()),
  getIncidentById: (id: string) => fetch(`${API_BASE}/incidents/${id}`).then(r => r.json()),
  remediateIncident: (id: string) =>
    fetch(`${API_BASE}/incidents/${id}/remediate`, { method: 'POST' }).then(r => r.json()),

  // Alerts, Memory & Audit
  getAlerts: () => fetch(`${API_BASE}/alerts`).then(r => r.json()),
  getMemory: () => fetch(`${API_BASE}/memory/records`).then(r => r.json()),
  getAuditTrail: () => fetch(`${API_BASE}/audit/events`).then(r => r.json()),

  // Simulation SSE Stream
  startSimulation: () => fetch(`${API_BASE}/simulation/start`, { method: 'POST' }).then(r => r.json()),
  resetSimulation: () => fetch(`${API_BASE}/simulation/reset`, { method: 'POST' }).then(r => r.json()),
  createSimulationEventSource: (sessionId?: string) => {
    const url = sessionId
      ? `${API_BASE}/simulation/stream?sessionId=${sessionId}`
      : `${API_BASE}/simulation/stream`
    return new EventSource(url)
  },
}
```
