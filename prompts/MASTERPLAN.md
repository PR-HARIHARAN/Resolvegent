# Master Plan — Autonomous Enterprise Incident Resolution Engine

## Role

Act as the **lead software architect and senior AI systems engineer** for a 24-hour hackathon.

We are a team of 4 building an **AI-driven Autonomous Enterprise Incident Resolution Engine**.

The goal is not to build another alert dashboard or chatbot.

The system must demonstrate an end-to-end operational workflow:

**Detection → Correlation → Investigation → Impact Assessment → Decision → Approval/Autonomous Execution → Verification → Learning → Audit**

The final demo must make it obvious that the system can move from raw heterogeneous alerts to an operational decision and, where permitted, execute the remediation.

Build this as a serious engineering system that could evolve into a production system, while keeping the MVP realistic for a 24-hour hackathon.

Do not over-engineer infrastructure we do not need for the MVP.

---

# 1. Problem We Are Solving

Organizations receive large numbers of operational alerts from:

* applications
* infrastructure
* databases
* APIs
* services
* queues
* deployments
* security systems
* business systems

Multiple alerts can be symptoms of the same underlying incident.

The engine must:

1. ingest heterogeneous alerts asynchronously
2. normalize them into a common event model
3. detect and group related alerts
4. distinguish separate incidents from the same incident
5. investigate incidents using multiple parallel agents
6. identify probable root causes with evidence
7. assess technical and business impact
8. determine incident severity
9. select a remediation action
10. automatically execute safe actions
11. require human approval for risky actions
12. verify whether the remediation worked
13. store the incident outcome as operational memory
14. maintain an immutable audit trail

The system should behave like an **AI operations control plane**, not a conversational assistant.

---

# 2. Core Architectural Principle

Do NOT implement this as an uncontrolled swarm of agents.

Use:

**Event-driven ingestion + Incident state machine + Parallel investigation + Policy-controlled execution**

The architecture should have one authoritative incident state.

Every incident follows a controlled lifecycle:

```text
ALERT RECEIVED
      ↓
NORMALIZE
      ↓
DETECT / DEDUPLICATE
      ↓
CORRELATE
      ↓
INCIDENT CREATED OR UPDATED
      ↓
PARALLEL INVESTIGATION
      ├── Log Investigation
      ├── Service/Topology Investigation
      ├── Recent Change Investigation
      ├── Historical Memory Investigation
      └── Impact Investigation
      ↓
EVIDENCE AGGREGATION
      ↓
ROOT CAUSE + IMPACT + CONFIDENCE
      ↓
DECISION ENGINE
      ↓
┌───────────────────────────────┐
│ Safe action                   │
│ → Autonomous execution        │
├───────────────────────────────┤
│ Risky action                  │
│ → Human approval required     │
├───────────────────────────────┤
│ Low confidence / unknown      │
│ → Escalate to human           │
└───────────────────────────────┘
      ↓
REMEDIATION EXECUTION
      ↓
VERIFICATION
      ↓
RESOLVED / FAILED / ESCALATED
      ↓
MEMORY UPDATE
      ↓
AUDIT COMPLETE
```

---

# 3. Two Types of Correlation

Correlation is a critical differentiator.

The engine must support two complementary forms of correlation.

## A. Real-time / burst correlation

When several alerts arrive close together, determine whether they belong to the same incident.

Signals can include:

* time proximity
* service
* service dependency
* environment
* host
* database
* API
* error type
* resource
* deployment
* trace/request identifiers
* semantic similarity
* shared infrastructure dependency

Example:

```text
09:31:02 Payment API latency ↑
09:31:03 Payment API 5xx ↑
09:31:04 DB connection pool saturation
09:31:05 Checkout failures ↑
```

These should become:

```text
INC-1042
Probable incident:
Payment database connection exhaustion
```

rather than four independent incidents.

The correlation system should combine deterministic signals and AI-assisted semantic reasoning.

---

# 4. Historical Correlation / Memory

A new alert should also be compared against previously resolved incidents.

Example:

```text
New incident:
Payment API timeout spike

Historical memory:
INC-0911
Same service
Same error pattern
Root cause:
Database connection pool exhaustion

Previous remediation:
Increase DB pool + restart payment worker

Previous outcome:
Successful
```

The new investigation should retrieve that information as supporting evidence.

Important:

**Historical memory is evidence, not truth.**

The agent must never blindly reuse an old remediation.

It must evaluate:

```text
Current evidence
+
Historical evidence
+
Current service state
+
Current impact
```

before deciding.

---

# 5. Memory Architecture

Do not create one giant "AI memory".

Use distinct memory categories.

## Incident Working Memory

Short-lived state for the active incident.

Contains:

* alert IDs
* correlated alerts
* affected services
* evidence
* hypotheses
* investigation results
* root-cause candidates
* impact
* decision
* actions
* verification

## Operational / Historical Memory

Long-lived knowledge extracted from resolved incidents.

Contains:

```text
incident
service
symptoms
root cause
evidence
remediation
risk
outcome
confidence
timestamp
```

Later this can become vector search + structured database.

For MVP it may be a seeded in-memory/SQLite/mock store.

## Runbook Memory

Stores available remediation procedures.

Example:

```text
restart_service
risk: medium
preconditions:
  service exists
  service is stateless
validation:
  health_check == healthy
approval_required: true
```

## Immutable Audit Log

Every important transition must be recorded.

Example:

```text
14:21:03 ALERT_RECEIVED
14:21:03 ALERT_NORMALIZED
14:21:04 INCIDENT_CORRELATED
14:21:05 INVESTIGATION_STARTED
14:21:07 ROOT_CAUSE_IDENTIFIED
14:21:08 DECISION_CREATED
14:21:08 APPROVAL_REQUIRED
14:21:15 HUMAN_APPROVED
14:21:16 REMEDIATION_STARTED
14:21:20 REMEDIATION_SUCCEEDED
14:21:22 INCIDENT_RESOLVED
14:21:23 MEMORY_UPDATED
```

The audit record must answer:

**What happened, when, why, based on what evidence, which agent/action caused it, and who approved it?**

---

# 6. Incident State Machine

The backend must use an explicit state machine.

Recommended states:

```text
RECEIVED
NORMALIZED
CORRELATING
INVESTIGATING
ASSESSING_IMPACT
DECIDING
AWAITING_APPROVAL
EXECUTING
VERIFYING
RESOLVED
FAILED
ESCALATED
```

Do not let random agents modify incident state directly.

Only the orchestrator/state manager can perform state transitions.

Agents should return structured results.

Example:

```python
InvestigationResult(
    agent="deployment-investigator",
    hypothesis="recent deployment introduced DB connection leak",
    confidence=0.87,
    evidence=[...]
)
```

The orchestrator decides what happens next.

---

# 7. Parallel Agent Architecture

Investigation should be fan-out/fan-in.

When an incident enters investigation:

```text
                INCIDENT
                    │
          ┌─────────┼─────────┐
          ↓         ↓         ↓
       LOG AGENT  CHANGE    TOPOLOGY
                    AGENT      AGENT
          ↓         ↓         ↓
       MEMORY    IMPACT      SERVICE
        AGENT     AGENT      AGENT
          └─────────┼─────────┘
                    ↓
            EVIDENCE AGGREGATOR
                    ↓
             ROOT CAUSE ENGINE
```

These investigation tasks should execute concurrently.

For the MVP use Python async concurrency such as `asyncio.TaskGroup` or equivalent.

Do not use threads/processes unnecessarily.

The architecture must make it possible to replace the mock agents with real integrations later.

---

# 8. Agent Responsibilities

Agents must have narrow responsibilities.

Do NOT create one giant agent responsible for everything.

Recommended agents:

### Detection Agent

Responsibilities:

* parse incoming alert
* normalize fields
* detect duplicate/noisy events
* determine whether immediate incident creation is necessary

### Correlation Agent

Responsibilities:

* compare incoming alert with active incidents
* compare related alerts in the correlation window
* identify candidate incident clusters
* retrieve historical incident similarity

### Log Investigation Agent

Responsibilities:

* inspect mock logs
* identify error patterns
* identify spikes/anomalies
* return evidence

### Change Investigation Agent

Responsibilities:

* inspect mock deployment/change events
* identify recently changed systems
* determine whether changes correlate with incident timing

### Topology Investigation Agent

Responsibilities:

* inspect service dependency relationships
* identify upstream/downstream dependencies
* determine likely cascading failures

### Memory Investigation Agent

Responsibilities:

* search historical incidents
* retrieve relevant previous resolutions
* return historical evidence

### Impact Agent

Responsibilities:

* estimate blast radius
* determine affected services
* estimate affected users/transactions
* assess business criticality

### Decision Agent

Responsibilities:

* combine investigation evidence
* generate root-cause candidates
* determine confidence
* recommend remediation
* explain why the remediation is appropriate

### Policy / Safety Engine

Responsibilities:

* classify remediation risk
* determine whether approval is required
* enforce allowed actions
* prevent unsafe actions
* reject malformed actions

### Remediation Executor

Responsibilities:

* execute approved/mock remediation
* generate execution result
* support dry-run
* be idempotent where possible

### Verification Agent

Responsibilities:

* check whether service health recovered
* verify expected metrics/log conditions
* determine success/failure
* trigger escalation if remediation failed

---

# 9. LLM Design

LLMs are reasoning components, not authorities.

Never allow an LLM to directly execute arbitrary commands.

Use this pattern:

```text
LLM
 ↓
Structured Action Proposal
 ↓
Policy Validation
 ↓
Approval Gate
 ↓
Tool/Runbook Executor
 ↓
Execution Result
 ↓
Verification
```

For example, the LLM may propose:

```json
{
  "action": "restart_service",
  "target": "payment-worker",
  "reason": "connection pool exhaustion",
  "confidence": 0.91
}
```

The policy engine determines whether that action is actually permitted.

The LLM must never produce raw shell commands and have them executed automatically.

---

# 10. Autonomy Levels

Use explicit autonomy levels.

```text
READ_ONLY
LOW_RISK_AUTO
APPROVAL_REQUIRED
FORBIDDEN
```

Example:

| Action                     | Risk      | MVP Behavior |
| -------------------------- | --------- | ------------ |
| Fetch logs                 | READ_ONLY | Automatic    |
| Health check               | READ_ONLY | Automatic    |
| Inspect recent deployment  | READ_ONLY | Automatic    |
| Restart mock service       | MEDIUM    | Approval     |
| Rollback deployment        | HIGH      | Approval     |
| Modify production database | HIGH      | Block        |
| Delete data                | FORBIDDEN | Block        |

This is important because the system should demonstrate **autonomy with boundaries**, not uncontrolled automation.

---

# 11. Alert Data Model

Define a canonical normalized alert model.

At minimum:

```text
alert_id
timestamp
source
alert_type
severity
service
service_instance
environment
host
region
message
metric_name
metric_value
threshold
error_type
trace_id
deployment_id
metadata
```

The schema should be extensible.

Design it so different mock sources can produce different raw payloads while the rest of the platform works on the canonical model.

Use strongly typed models.

Prefer Pydantic models on the backend.

Avoid passing untyped dictionaries throughout the application.

---

# 12. Evidence Model

Every major AI conclusion must reference evidence.

Example:

```text
Root Cause:
Database connection pool exhaustion

Confidence:
0.91

Evidence:
- alert-102
- alert-104
- log-883
- deployment-22
- historical-incident-17
```

Never display unsupported claims such as:

```text
"Database definitely caused the outage."
```

Prefer:

```text
"Database connection exhaustion is the leading hypothesis
with 0.91 confidence, supported by 4 current signals
and 2 historical incidents."
```

The UI should display evidence and agent actions, not hidden chain-of-thought.

---

# 13. Decision Model

A decision should contain:

```text
incident_id
root_cause
root_cause_confidence
severity
business_impact
blast_radius
recommended_action
action_risk
approval_required
reason
evidence[]
preconditions[]
expected_result
rollback_strategy
```

The recommendation must be machine-readable.

---

# 14. Verification Loop

Remediation is not complete when an action succeeds.

The system must verify the outcome.

Example:

```text
Restart service
      ↓
Wait
      ↓
Health check
      ↓
Error rate check
      ↓
Latency check
      ↓
Success?
 ┌────┴────┐
 YES       NO
 ↓         ↓
RESOLVE   ESCALATE
```

The demo must visibly show this distinction.

---

# 15. Learning Loop

After incident resolution:

```text
Incident
+
Root cause
+
Evidence
+
Action
+
Approval
+
Execution result
+
Verification result
      ↓
Memory Record
```

The next incident can retrieve that memory.

This creates a simple learning flywheel:

```text
Incident
   ↓
Investigation
   ↓
Resolution
   ↓
Memory
   ↓
Future Investigation
   ↓
Better Decision
```

Do not claim that the model itself has been "trained".

The MVP is performing **operational memory retrieval and reuse**.

---

# 16. MVP Technology Direction

Use technology that maximizes reliability and implementation speed.

Recommended backend:

```text
Python
FastAPI
Pydantic
asyncio
```

Use an LLM provider abstraction so the project can work with:

```text
Ollama
OpenAI-compatible endpoint
other providers
```

Do not hard-code the entire architecture to one LLM provider.

For MVP data:

```text
Mock alert generator
Mock log store
Mock deployment store
Mock topology store
Mock memory store
Mock remediation executor
```

Use simple local persistence where useful.

SQLite is acceptable for audit/memory if persistence is needed.

Do not introduce Kafka, Kubernetes, Redis, Neo4j, vector databases, or cloud infrastructure unless there is a concrete MVP need.

The architecture should have interfaces that allow them later.

For example:

```text
AlertSource
MemoryStore
InvestigationTool
RemediationExecutor
AuditStore
LLMProvider
```

Implement lightweight MVP adapters now.

---

# 17. Repository Structure

Create a clean monorepo with strict ownership boundaries.

Recommended structure:

```text
incident-resolution-engine/
│
├── README.md
├── MASTERPLAN.md
├── .env.example
├── .gitignore
├── docker-compose.yml
│
├── docs/
│   ├── architecture.md
│   ├── contracts.md
│   ├── demo-scenarios.md
│   └── decisions.md
│
├── contracts/
│   ├── alert.schema.json
│   ├── incident.schema.json
│   ├── investigation.schema.json
│   ├── decision.schema.json
│   └── action.schema.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   ├── enums.py
│   │   │   └── protocols.py
│   │   │
│   │   ├── ingestion/
│   │   │
│   │   ├── orchestration/
│   │   │
│   │   ├── correlation/
│   │   │
│   │   ├── investigation/
│   │   │   ├── log_agent.py
│   │   │   ├── topology_agent.py
│   │   │   ├── change_agent.py
│   │   │   ├── memory_agent.py
│   │   │   └── impact_agent.py
│   │   │
│   │   ├── decision/
│   │   │
│   │   ├── policy/
│   │   │
│   │   ├── remediation/
│   │   │
│   │   ├── memory/
│   │   │
│   │   ├── audit/
│   │   │
│   │   ├── llm/
│   │   │
│   │   └── config.py
│   │
│   ├── tests/
│   └── mock_data/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── ...
│
├── scripts/
│   ├── seed_demo.py
│   └── run_demo.py
│
└── tests/
    └── integration/
```

The structure must make parallel development easy.

---

# 18. Four-Person Development Model

Design the repository around four independent workstreams.

## Person 1 — Frontend / Incident Command Center

Owns:

```text
frontend/
```

Focus:

* live alert stream
* active incident dashboard
* incident detail view
* investigation timeline
* evidence visualization
* root cause view
* business impact
* recommended remediation
* approval UI
* remediation status
* audit timeline
* memory/previous incident context

The frontend must look like an operational control center, not a generic chatbot.

---

## Person 2 — Platform / Ingestion / Orchestration

Owns:

```text
backend/app/api/
backend/app/ingestion/
backend/app/orchestration/
backend/app/domain/
```

Responsible for:

* canonical schemas
* alert ingestion
* async event flow
* incident lifecycle
* state transitions
* API
* WebSocket/SSE live updates
* integration contracts

This person creates the stable interfaces used by everyone else.

---

## Person 3 — Correlation / Investigation

Owns:

```text
backend/app/correlation/
backend/app/investigation/
```

Responsible for:

* alert correlation
* burst grouping
* historical correlation
* parallel investigation
* evidence aggregation
* root-cause hypotheses
* impact investigation

This is the main AI investigation workstream.

---

## Person 4 — Decision / Remediation / Memory / Audit

Owns:

```text
backend/app/decision/
backend/app/policy/
backend/app/remediation/
backend/app/memory/
backend/app/audit/
```

Responsible for:

* decision engine
* risk classification
* approval workflow
* remediation execution
* verification
* operational memory
* audit records

This person owns the autonomy and safety layer.

---

# 19. Parallel Development Rules

The four developers must be able to work simultaneously.

Rules:

1. Do not create a giant shared utility file that everyone edits.
2. Keep modules small and isolated.
3. Define interfaces before implementation.
4. Use typed domain models.
5. Do not modify another person's owned directory without a clear integration reason.
6. Shared contracts must remain stable once established.
7. Avoid speculative abstractions.
8. Do not duplicate models in multiple modules.
9. Every external boundary must have an explicit interface.
10. Write tests for module boundaries.
11. Keep commits feature-based and small.
12. Do not rewrite another person's implementation merely for style.

The project must support this workflow:

```text
Person 1 starts frontend work
Person 2 starts platform work
Person 3 starts investigation work
Person 4 starts decision/remediation work
```

without blocking each other.

---

# 20. Demo Scenarios

The MVP must include deterministic scenarios.

Do not rely on random data during the judging demo.

At minimum create three scenarios.

## Scenario A — Autonomous Low-Risk Resolution

Example:

```text
Multiple API timeout alerts
+
service health degradation
+
historical matching incident
```

The system:

```text
correlates
→ investigates
→ identifies root cause
→ recommends safe remediation
→ executes automatically
→ verifies recovery
→ resolves incident
→ writes memory
```

This demonstrates autonomy.

---

## Scenario B — Human Approval

Example:

```text
Deployment
+
5xx spike
+
latency increase
+
checkout failures
```

The engine recommends:

```text
rollback deployment
```

but the action requires approval.

Demo:

```text
AI decision
→ evidence
→ risk
→ approval requested
→ human clicks approve
→ rollback executed
→ verification
→ incident resolved
```

This demonstrates controlled autonomy.

---

## Scenario C — Historical Memory Improves Investigation

First incident:

```text
Root cause:
DB connection exhaustion

Action:
increase pool / restart worker

Outcome:
successful
```

Later incident:

```text
Similar symptoms
```

The engine retrieves the previous incident and uses it as historical evidence.

The UI should visibly show:

```text
Similar previous incident found
Similarity: high

Previous root cause:
DB connection exhaustion

Previous remediation:
...

Previous outcome:
Resolved successfully
```

This demonstrates the learning loop.

---

# 21. Evaluation / Judge Mode

Do not only make the system visually impressive.

Create a deterministic evaluation mode.

Measure:

```text
Alert → incident correlation accuracy
Root-cause identification accuracy
Top-k root cause candidates
Decision latency
Remediation success rate
Verification success rate
Approval rate
Audit completeness
```

For mock scenarios, maintain expected ground truth.

Example:

```json
{
  "scenario": "payment_db_pool_exhaustion",
  "expected_incident_count": 1,
  "expected_root_cause": "db_connection_pool_exhaustion",
  "expected_action": "restart_payment_worker"
}
```

This lets us demonstrate that the system is not merely producing convincing text.

---

# 22. API Requirements

The backend should expose APIs for:

```text
POST /alerts
GET  /alerts
GET  /incidents
GET  /incidents/{incident_id}
GET  /incidents/{incident_id}/timeline
GET  /incidents/{incident_id}/evidence
GET  /incidents/{incident_id}/decision
POST /incidents/{incident_id}/approve
POST /incidents/{incident_id}/reject
POST /incidents/{incident_id}/retry
GET  /incidents/{incident_id}/audit
GET  /memory/incidents
POST /demo/scenarios/{scenario_id}/run
```

Add WebSocket or Server-Sent Events for live incident updates.

The frontend must never poll unnecessarily when a streaming mechanism is practical.

---

# 23. Observability of Our Own System

The engine itself must be observable.

Log:

```text
request
alert
incident
agent
tool
decision
action
approval
verification
memory
```

Every operation should have:

```text
correlation_id
incident_id
timestamp
component
status
duration
```

The system should be able to answer:

```text
Why did the agent make this decision?
What evidence did it use?
What action did it execute?
Who approved it?
Did it work?
What did we learn?
```

---

# 24. Reliability Rules

Even though this is an MVP, implement these principles:

### Timeouts

Every agent/tool call must have a timeout.

### Retry limits

Do not retry indefinitely.

### Agent budget

Prevent infinite agent loops.

### Idempotency

Remediation should not accidentally execute twice.

### Failure isolation

One failed investigation agent should not crash the entire incident.

Example:

```text
Topology Agent FAILED
        ↓
Other investigations continue
        ↓
Incident can still be assessed
```

### Fail-safe behavior

Unknown or high-risk actions must not execute automatically.

### Dry-run support

Every remediation should be executable in dry-run mode.

---

# 25. Security Principles

Never allow an LLM to:

* execute arbitrary shell commands
* access arbitrary files
* call arbitrary URLs
* modify infrastructure without policy validation
* bypass approval requirements

Use allowlisted tools/actions.

All high-risk operations must pass through:

```text
Action Proposal
→ Policy Validation
→ Approval
→ Executor
```

Secrets must come from environment variables.

Never commit API keys.

---

# 26. Production Evolution Path

The MVP should remain simple, but the architecture must clearly show how it could evolve.

Current MVP:

```text
Mock Alert Sources
↓
Async In-Memory Event Bus
↓
FastAPI
↓
Parallel Agents
↓
Mock Memory
↓
Mock Remediation
```

Future production:

```text
OpenTelemetry / CloudWatch / Datadog / Prometheus / PagerDuty
↓
Kafka / Event Streaming
↓
Durable Workflow Engine
↓
Parallel AI Investigation
↓
Postgres + Vector DB
↓
Real Runbooks / Kubernetes / Cloud APIs
↓
Policy + RBAC
↓
Enterprise Audit
```

Do not build the future stack during the hackathon.

Build interfaces that allow the future stack.

---

# 27. UX Principle

The system should tell the story visually.

The main screen should answer:

```text
What is happening?
What is affected?
Why is it happening?
What evidence supports that?
What is the AI doing?
What will it do next?
Does it need me?
Did the remediation work?
What did the system learn?
```

The primary UX should be an **Incident Command Center**.

Avoid building the application around a chatbot interface.

A chatbot can be an optional secondary interface.

---

# 28. What NOT To Build

Do not waste hackathon time on:

* authentication systems
* multi-tenant enterprise IAM
* complex cloud deployment
* Kubernetes operators
* custom vector databases
* elaborate agent frameworks
* dozens of agents with overlapping responsibilities
* generic RAG chatbot functionality
* arbitrary shell execution
* beautiful dashboards without functional backend behavior
* fake AI outputs that are not connected to actual system state

The judging demo must be real from input to action.

---

# 29. Definition of Done

The MVP is considered complete only when this works end-to-end:

```text
Mock alerts arrive asynchronously
        ↓
Alerts are normalized
        ↓
Related alerts are correlated
        ↓
Incident is created
        ↓
Multiple agents investigate in parallel
        ↓
Evidence is aggregated
        ↓
Root cause is proposed
        ↓
Impact/severity is assessed
        ↓
Decision is generated
        ↓
Risk policy is evaluated
        ↓
Either:
    autonomous remediation
OR:
    human approval
        ↓
Remediation executes
        ↓
System verifies recovery
        ↓
Incident resolves/escalates
        ↓
Audit trail is complete
        ↓
Incident memory is updated
        ↓
Future incidents can retrieve that memory
```

If only the dashboard works, the project is NOT done.

If only the agents work but no remediation occurs, the project is NOT done.

If remediation happens without safety controls and auditability, the project is NOT done.

The full loop is the product.

---

# 30. Immediate Task For This Master Plan

Before implementing the full application:

1. Inspect the existing repository.
2. Identify what already exists and what should be retained.
3. Remove only genuinely dead/duplicate/unnecessary code.
4. Establish the repository structure defined above.
5. Define canonical domain models and contracts.
6. Define module ownership for all four people.
7. Define API contracts.
8. Define the incident state machine.
9. Define the interfaces for:

   * AlertSource
   * CorrelationEngine
   * InvestigationAgent
   * EvidenceAggregator
   * DecisionEngine
   * PolicyEngine
   * RemediationExecutor
   * VerificationEngine
   * MemoryStore
   * AuditStore
   * LLMProvider
10. Create deterministic demo scenarios.
11. Create the initial test strategy.
12. Document integration points between the four workstreams.

Do NOT prematurely implement every feature.

The purpose of this stage is to establish a **clean foundation that four developers can build on simultaneously**.

---

# 31. Required Deliverables From This Planning Stage

Produce:

```text
MASTERPLAN.md
docs/architecture.md
docs/contracts.md
docs/demo-scenarios.md
docs/decisions.md
```

Also create the clean directory structure and minimal scaffolding required for parallel development.

Do not fill the repository with placeholder classes, fake agents, duplicated utilities, or unnecessary abstractions just to make the tree look large.

Every file must have a reason to exist.

---

# 32. Engineering Standard

Use these principles throughout the project:

```text
Simple over clever
Typed over implicit
Deterministic over magical
Evidence over unsupported claims
Interfaces over tight coupling
Async where concurrency matters
Policy before execution
Approval before risk
Verification after action
Audit everything important
Memory as evidence, not truth
```

The final implementation must look like something a strong engineering team intentionally designed, not a collection of hackathon scripts.

---

# Final Objective

The final judging experience should demonstrate this single idea:

> **An alert enters the system. The system autonomously figures out what is happening, correlates the evidence, investigates the cause in parallel, understands the business impact, decides what should happen, executes safe remediation or requests human approval for risky actions, verifies the result, and remembers the outcome for the next incident.**

That end-to-end loop is the product.

Do not optimize for the number of agents.

Optimize for **observable autonomous incident resolution with controlled execution, evidence, memory, and auditability.**

folder-structure

kpr/
├── MASTERPLAN.md                     # Root copy of the system masterplan
├── README.md                         # Architecture overview, quickstart & dev commands
├── .env.example                      # Centralized environment variable template
├── .gitignore                        # Git ignore for Python, Node, Vite, SQLite, logs
├── docker-compose.yml                # Optional local container orchestration
│
├── docs/                             # Authoritative system documentation
│   ├── architecture.md               # End-to-end event-driven architecture & state machine
│   ├── contracts.md                  # REST APIs, SSE/WS schemas, and inter-service contracts
│   ├── demo-scenarios.md             # Deterministic walkthroughs for judging/demo
│   └── decisions.md                  # Architectural Decision Records (ADRs)
│
├── contracts/                        # Canonical JSON Schemas (Language-agnostic source of truth)
│   ├── alert.schema.json             # Raw and Normalized Alert schema
│   ├── incident.schema.json          # Authoritative Incident state schema
│   ├── investigation.schema.json     # Investigation context, result, and evidence schema
│   ├── decision.schema.json          # Decision, policy evaluation, and action proposal schema
│   └── action.schema.json            # Action execution and verification result schema
│
├── backend/                          # Python / FastAPI Backend Engine
│   ├── pyproject.toml                # Dependencies & package config (FastAPI, Pydantic v2, Uvicorn, etc.)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entrypoint, lifespan, CORS, and router registration
│   │   ├── config.py                 # Pydantic BaseSettings (timeouts, window seconds, DB path)
│   │   ├── dependencies.py           # Dependency injection container / composition root
│   │   │
│   │   ├── api/                      # REST & Realtime API Routes (Person 2)
│   │   │   ├── __init__.py
│   │   │   ├── alerts.py             # POST /alerts, GET /alerts
│   │   │   ├── incidents.py          # GET /incidents, GET /incidents/{id}, sub-resource timeline/evidence
│   │   │   ├── approvals.py          # POST /incidents/{id}/approve, POST /incidents/{id}/reject
│   │   │   ├── memory.py             # GET /memory/incidents
│   │   │   ├── demos.py              # POST /demo/scenarios/{scenario_id}/run, POST /demo/reset
│   │   │   ├── events.py             # GET /events/stream (SSE) and /ws (WebSocket)
│   │   │   └── health.py             # GET /health, GET /ready
│   │   │
│   │   ├── domain/                   # Centralized Shared Types & Interfaces (Person 2)
│   │   │   ├── __init__.py
│   │   │   ├── enums.py              # IncidentState, AutonomyLevel, Severity, ActionType, etc.
│   │   │   ├── protocols.py          # Structural protocols for Correlation, Investigation, Decision, etc.
│   │   │   └── models/               # Strongly-typed Pydantic Models
│   │   │       ├── __init__.py
│   │   │       ├── alert.py          # Alert, NormalizedAlert
│   │   │       ├── incident.py       # Incident, IncidentEvent
│   │   │       ├── evidence.py       # EvidenceItem
│   │   │       ├── investigation.py  # InvestigationContext, InvestigationResult, Hypothesis
│   │   │       ├── decision.py       # Decision, PolicyDecision
│   │   │       ├── action.py         # Action, ExecutionResult, VerificationResult
│   │   │       ├── memory.py         # MemoryRecord, MemoryQuery
│   │   │       └── audit.py          # AuditEvent
│   │   │
│   │   ├── ingestion/                # Alert Ingestion & Normalization (Person 2)
│   │   │   ├── __init__.py
│   │   │   ├── sources.py            # AlertSource protocol & MockAlertSource generator
│   │   │   ├── normalizer.py         # Normalizer converting heterogeneous payloads to NormalizedAlert
│   │   │   └── service.py            # Ingestion service with deduplication
│   │   │
│   │   ├── orchestration/            # Lifecycle & Orchestrator (Person 2)
│   │   │   ├── __init__.py
│   │   │   ├── state_machine.py      # Authoritative IncidentStateMachine with transition guards
│   │   │   ├── event_bus.py          # Lightweight async queue-based bus decoupling workflow stages
│   │   │   ├── orchestrator.py       # Workflow orchestrator coordinating the end-to-end loop
│   │   │   └── workflow.py           # Individual stage handlers (investigation, decision, execution)
│   │   │
│   │   ├── correlation/              # Hybrid Alert Correlation Engine (Person 3)
│   │   │   ├── __init__.py
│   │   │   ├── engine.py             # CorrelationEngine implementation
│   │   │   ├── signals.py            # Temporal, topological, service, and error signal extractors
│   │   │   ├── scorer.py             # Hybrid deterministic + semantic correlation scorer
│   │   │   ├── dedup.py              # Alert fingerprinting & duplicate handling
│   │   │   └── models.py             # CorrelationResult, CorrelationCluster
│   │   │
│   │   ├── investigation/            # Parallel Investigation Layer (Person 3)
│   │   │   ├── __init__.py
│   │   │   ├── orchestrator.py       # Parallel fan-out runner with TaskGroup / gather and timeouts
│   │   │   ├── aggregator.py         # Evidence aggregator & hypothesis ranker
│   │   │   ├── context.py            # Investigation context builder
│   │   │   └── agents/               # 5 Specialized Investigation Agents
│   │   │       ├── __init__.py
│   │   │       ├── log.py            # LogInvestigator (analyzes error logs, exceptions)
│   │   │       ├── change.py         # ChangeInvestigator (analyzes deployments, config changes)
│   │   │       ├── topology.py       # TopologyInvestigator (inspects service dependency graphs)
│   │   │       ├── memory.py         # HistoricalInvestigator (queries past incidents for evidence)
│   │   │       └── impact.py         # ImpactInvestigator (computes blast radius, failed tx, affected users)
│   │   │
│   │   ├── decision/                 # Decision Intelligence (Person 4)
│   │   │   ├── __init__.py
│   │   │   ├── engine.py             # DecisionEngine combining evidence, hypotheses, and runbooks
│   │   │   ├── models.py             # DecisionContext, ActionProposal
│   │   │   └── prompts.py            # Structured system prompts and Pydantic output parsers
│   │   │
│   │   ├── policy/                   # Policy Boundaries & Autonomy Gates (Person 4)
│   │   │   ├── __init__.py
│   │   │   ├── engine.py             # PolicyEngine evaluating actions against rules
│   │   │   ├── rules.py              # Autonomy level evaluation logic (LOW_RISK_AUTO vs APPROVAL_REQUIRED)
│   │   │   └── registry.py           # Action allowlist (health_check, restart_service, rollback_deployment)
│   │   │
│   │   ├── remediation/              # Remediation Execution & Verification (Person 4)
│   │   │   ├── __init__.py
│   │   │   ├── executor.py           # RemediationExecutor with idempotency and dry-run support
│   │   │   ├── mock_environment.py   # Simulated stateful infrastructure (services, DB pool, deployments)
│   │   │   ├── verifier.py           # Independent VerificationEngine checking health/error-rates
│   │   │   └── actions/              # Concrete action handlers (restart, rollback, scale, flush)
│   │   │       ├── __init__.py
│   │   │       ├── restart.py
│   │   │       └── rollback.py
│   │   │
│   │   ├── memory/                   # Operational Historical Memory (Person 4)
│   │   │   ├── __init__.py
│   │   │   ├── store.py              # SQLite / JSON-backed MemoryStore (save & find_similar)
│   │   │   └── similarity.py         # Semantic/keyword similarity matcher for historical evidence
│   │   │
│   │   ├── audit/                    # Immutable Append-Only Audit Trail (Person 4)
│   │   │   ├── __init__.py
│   │   │   ├── store.py              # SQLite / File-backed AuditStore
│   │   │   └── models.py             # Audit query & formatting models
│   │   │
│   │   └── llm/                      # Pluggable LLM Abstraction Layer
│   │       ├── __init__.py
│   │       ├── provider.py           # LLMProvider protocol
│   │       ├── client.py             # Provider implementation (Ollama, OpenAI-compatible, Mock fallback)
│   │       └── mock.py               # Deterministic mock LLM for offline judging demo
│   │
│   ├── mock_data/                    # Deterministic Datasets for the 4 Scenarios
│   │   ├── scenarios.json            # Scenario definitions (A: DB Exhaustion, B: Rollback, C: Memory, D: Escalate)
│   │   ├── logs.json                 # Simulated log lines with timestamps
│   │   ├── deployments.json          # Deployment history & git commit metadata
│   │   ├── topology.json             # Service dependency graph
│   │   └── historical_incidents.json # Seeded historical resolved incidents
│   │
│   └── tests/                        # Backend Unit Tests
│       ├── __init__.py
│       ├── test_state_machine.py
│       ├── test_correlation.py
│       ├── test_investigation.py
│       ├── test_policy.py
│       └── test_remediation.py
│
├── frontend/                         # React + TypeScript + Vite SRE Command Center (Person 1)
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx
│       ├── app/
│       │   ├── app.tsx               # Main layout and top navigation
│       │   ├── routes.tsx            # View routing (Overview, Incidents, Alerts, Memory, Audit)
│       │   └── providers.tsx         # Realtime and state providers
│       ├── components/
│       │   ├── layout/               # Header, Sidebar, MetricBadges, StatusBar
│       │   ├── alerts/               # LiveAlertStream, AlertGroupingAnimation
│       │   ├── incidents/            # IncidentCard, IncidentList, IncidentDetailHeader
│       │   ├── timeline/             # VisualLifecycleStepper (Received -> Investigating -> Resolved)
│       │   ├── investigation/        # ParallelInvestigationMatrix (5 agents status/output)
│       │   ├── evidence/             # TraceableEvidencePanel, EvidenceItemModal
│       │   ├── decisions/            # DecisionCard, RootCauseVisualizer, BlastRadiusGraph
│       │   ├── approval/             # ApprovalModal, RejectDialog, ApprovalBanner
│       │   ├── remediation/          # AutonomousActionBanner, ExecutionStatus, VerificationBadge
│       │   ├── memory/               # HistoricalMemoryComparisonCard
│       │   ├── audit/                # AppendOnlyAuditTimeline
│       │   └── demo/                 # ScenarioSwitcherControls (1-click trigger for demo)
│       ├── pages/
│       │   ├── overview.tsx
│       │   ├── incident_detail.tsx
│       │   ├── alerts_page.tsx
│       │   ├── memory_page.tsx
│       │   └── audit_page.tsx
│       ├── api/
│       │   ├── client.ts             # Axios / Fetch client with baseURL config
│       │   ├── incidents.ts          # Incident API calls
│       │   ├── alerts.ts             # Alerts API calls
│       │   ├── memory.ts             # Historical memory API calls
│       │   └── mock/                 # Mock adapter for fully standalone frontend testing
│       ├── realtime/
│       │   └── event_client.ts       # SSE and WebSocket listener managing live event subscriptions
│       ├── types/
│       │   └── index.ts              # TypeScript interfaces matching backend models & JSON schemas
│       ├── utils/
│       │   ├── formatters.ts
│       │   └── severity.ts
│       └── styles/
│           └── index.css             # Enterprise dark mode design tokens & styles
│
├── scripts/
│   ├── seed_demo.py                  # Seed initial database and mock scenario state
│   └── run_demo.py                   # Automated CLI runner to trigger scenarios and verify output
│
└── tests/
    └── integration/
        └── test_end_to_end.py        # Complete end-to-end integration test
