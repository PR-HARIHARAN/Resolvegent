# Person 2 — Platform / Ingestion / Orchestration

You are **Person 2 of a 4-person engineering team** building the **Autonomous Enterprise Incident Resolution Engine** described in `MASTERPLAN.md`.

You own the **backend platform, event ingestion, incident lifecycle, orchestration, and integration API**.

Your work is the backbone of the entire system.

Person 1 is building the frontend.

Person 3 is building correlation and investigation.

Person 4 is building decision, policy, remediation, memory, and audit.

Your implementation must allow all four people to work in parallel.

---

# 1. First Read the Repository

Before writing code:

1. Read `MASTERPLAN.md` completely.
2. Read:

   * `docs/architecture.md`
   * `docs/contracts.md`
   * `docs/demo-scenarios.md`
3. Inspect the existing repository.
4. Determine what is already implemented.
5. Reuse good existing code where appropriate.
6. Remove only clearly dead or duplicate code within your ownership.
7. Do not rewrite another person's workstream.
8. Do not invent conflicting models or APIs.

Do not ask for clarification when the masterplan already provides enough information.

Make reasonable engineering decisions and document them.

---

# 2. Your Ownership

Your primary ownership is:

```text
backend/app/domain/
backend/app/api/
backend/app/ingestion/
backend/app/orchestration/
backend/app/config.py
```

You may create supporting tests under:

```text
backend/tests/
tests/integration/
```

Your responsibility is the platform layer that connects everything.

You are NOT the owner of:

```text
backend/app/correlation/
backend/app/investigation/
backend/app/decision/
backend/app/policy/
backend/app/remediation/
backend/app/memory/
backend/app/audit/
```

Those belong to Persons 3 and 4.

You should define the interfaces they implement and integrate those implementations through those interfaces.

---

# 3. Core Objective

Build the platform that turns asynchronous alerts into controlled incident workflows.

Your system must support:

```text
RAW ALERT
   ↓
NORMALIZATION
   ↓
EVENT
   ↓
CORRELATION
   ↓
INCIDENT
   ↓
ORCHESTRATION
   ↓
PARALLEL INVESTIGATION
   ↓
DECISION
   ↓
APPROVAL / EXECUTION
   ↓
VERIFICATION
   ↓
RESOLUTION
```

You own the lifecycle and coordination.

You do NOT own the intelligence inside every stage.

The other workstreams provide specialized capabilities.

Your job is to ensure they can operate reliably together.

---

# 4. Architecture Principle

The most important architectural requirement:

## The incident state machine is authoritative.

Do not allow individual agents to arbitrarily mutate incident state.

The orchestrator owns transitions.

Agents return structured results.

Example:

```python
InvestigationResult(
    agent="log-investigator",
    status="COMPLETED",
    confidence=0.87,
    evidence=[...],
)
```

The orchestrator consumes that result and determines the next state.

This prevents an uncontrolled agent swarm.

---

# 5. Recommended Backend Stack

Use the existing stack if one is already established.

Otherwise prefer:

```text
Python
FastAPI
Pydantic
asyncio
```

For the MVP:

```text
In-memory async event bus
SQLite or lightweight local persistence where needed
Mock data sources
```

Do NOT introduce:

```text
Kafka
RabbitMQ
Redis
Celery
Kubernetes
Temporal
AWS infrastructure
```

unless the repository already requires them or there is a concrete blocker.

The architecture must make those future substitutions possible without requiring them now.

---

# 6. Domain Model

Create strong typed models.

At minimum define:

```text
Alert
NormalizedAlert
Incident
IncidentEvent
IncidentState
Evidence
InvestigationResult
Decision
Action
Approval
VerificationResult
AuditEvent
MemoryRecord
```

Keep these models centralized.

Do not create duplicate versions in different modules.

Recommended location:

```text
backend/app/domain/models/
```

Enums should be centralized as well.

Example:

```python
class IncidentState(str, Enum):
    RECEIVED = "RECEIVED"
    NORMALIZED = "NORMALIZED"
    CORRELATING = "CORRELATING"
    INVESTIGATING = "INVESTIGATING"
    ASSESSING_IMPACT = "ASSESSING_IMPACT"
    DECIDING = "DECIDING"
    AWAITING_APPROVAL = "AWAITING_APPROVAL"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    RESOLVED = "RESOLVED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"
```

Use consistent serialization.

---

# 7. Alert Contract

Create a canonical alert model that can represent heterogeneous input.

Minimum fields:

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

Not every field needs to be populated.

The system must tolerate partial alerts.

Do not reject an otherwise valid alert merely because optional telemetry fields are missing.

Clearly separate:

```text
raw input
```

from:

```text
normalized internal representation
```

---

# 8. Alert Ingestion

Create an ingestion abstraction.

Example:

```python
class AlertSource(Protocol):
    async def stream(self) -> AsyncIterator[RawAlert]:
        ...
```

MVP implementation:

```text
MockAlertSource
```

The source should be capable of producing:

```text
single alert
burst of alerts
multiple services
different alert types
duplicate alerts
out-of-order timestamps
```

This is important because the architecture must actually test asynchronous behavior.

---

# 9. Alert API

Expose a REST endpoint:

```text
POST /alerts
```

The endpoint should:

1. validate the incoming payload;
2. assign metadata if required;
3. enqueue the event;
4. return quickly;
5. not synchronously run the entire incident-resolution pipeline.

Example response:

```json
{
  "alert_id": "alert-102",
  "status": "accepted"
}
```

The actual workflow happens asynchronously.

Do not make the POST request wait for AI investigation.

---

# 10. Event Bus

Implement a lightweight internal asynchronous event bus.

Example:

```text
AlertReceived
AlertNormalized
CorrelationRequested
IncidentCreated
IncidentUpdated
InvestigationStarted
InvestigationCompleted
DecisionCreated
ApprovalRequested
ActionStarted
ActionCompleted
VerificationStarted
VerificationCompleted
IncidentResolved
IncidentEscalated
MemoryUpdated
```

The event bus should decouple modules.

A simple implementation using `asyncio.Queue` is sufficient for the MVP.

Conceptually:

```text
POST /alerts
      ↓
Async Event Queue
      ↓
Workers
```

Do not introduce a distributed messaging system for the hackathon.

---

# 11. Event Contract

Every internal event should have common metadata.

Example:

```text
event_id
event_type
timestamp
incident_id
alert_id
correlation_id
source
payload
```

`incident_id` may be absent for events before incident creation.

Use typed event models where practical.

Do not pass arbitrary unstructured dictionaries everywhere.

---

# 12. Incident Manager

Create a central incident manager.

Responsibilities:

* create incidents
* retrieve incidents
* update incident state
* attach alerts
* attach evidence
* attach investigation results
* attach decisions
* attach actions
* track timestamps
* emit state-change events

The incident manager should NOT contain AI reasoning.

It should manage state and persistence.

---

# 13. State Transition Rules

Create explicit transition validation.

Example:

```text
RECEIVED
  → NORMALIZED

NORMALIZED
  → CORRELATING

CORRELATING
  → INVESTIGATING
  → INCIDENT_CREATED

INVESTIGATING
  → ASSESSING_IMPACT
  → FAILED

ASSESSING_IMPACT
  → DECIDING

DECIDING
  → AWAITING_APPROVAL
  → EXECUTING
  → ESCALATED

AWAITING_APPROVAL
  → EXECUTING
  → ESCALATED

EXECUTING
  → VERIFYING
  → FAILED

VERIFYING
  → RESOLVED
  → EXECUTING
  → ESCALATED
```

Do not allow invalid transitions silently.

Example:

```text
RESOLVED → EXECUTING
```

should be rejected unless an explicit retry/reopen operation exists.

---

# 14. Orchestrator

The orchestrator is the central workflow engine.

It should coordinate the lifecycle.

Conceptually:

```text
alert
 ↓
normalize
 ↓
correlate
 ↓
create/update incident
 ↓
start investigation
 ↓
fan-out agents
 ↓
fan-in results
 ↓
impact assessment
 ↓
decision
 ↓
policy
 ↓
approval/execution
 ↓
verification
 ↓
resolution
```

The orchestrator should be readable.

Avoid creating a 1,000-line orchestration function.

Break behavior into explicit workflow handlers.

For example:

```text
handle_alert()
handle_correlation_result()
start_investigation()
aggregate_investigation()
start_decision()
handle_decision()
handle_approval()
handle_action_result()
handle_verification()
```

---

# 15. Parallel Investigation

This is one of the most important platform responsibilities.

When an incident enters investigation, run independent investigation tasks concurrently.

Conceptually:

```python
results = await asyncio.gather(
    log_agent.investigate(context),
    topology_agent.investigate(context),
    change_agent.investigate(context),
    memory_agent.investigate(context),
    impact_agent.investigate(context),
    return_exceptions=True,
)
```

Prefer `asyncio.TaskGroup` when compatible with the chosen Python version.

Requirements:

* one agent failing must not cancel unrelated investigation;
* each agent must have a timeout;
* results must be individually represented;
* partial evidence must be preserved;
* investigation should have a bounded execution budget.

Do not run agents sequentially merely because it is simpler.

The frontend must be able to observe that these agents are operating in parallel.

---

# 16. Agent Interface

Define a stable interface for Person 3.

Example:

```python
class InvestigationAgent(Protocol):
    name: str

    async def investigate(
        self,
        context: InvestigationContext,
    ) -> InvestigationResult:
        ...
```

`InvestigationContext` should provide structured access to:

```text
incident
alerts
known evidence
service information
historical context
current state
```

Do not force agents to know about FastAPI, HTTP requests, or database internals.

---

# 17. Investigation Result

Define a common structured result.

Example:

```text
agent
status
summary
hypotheses
confidence
evidence[]
duration_ms
error
metadata
```

An agent may return:

```json
{
  "agent": "change-investigator",
  "status": "COMPLETED",
  "hypotheses": [
    {
      "name": "recent_deployment_regression",
      "confidence": 0.89
    }
  ],
  "evidence": [...]
}
```

Do not require all agents to produce identical internal reasoning.

Require a consistent output contract.

---

# 18. Correlation Integration

Person 3 owns the implementation of correlation.

Define an interface such as:

```python
class CorrelationEngine(Protocol):
    async def correlate(
        self,
        alert: NormalizedAlert,
        active_incidents: list[Incident],
    ) -> CorrelationResult:
        ...
```

The correlation result should indicate something like:

```text
matched_incident_id
new_incident
related_alert_ids
confidence
reasons
```

Your orchestration layer should consume this result.

Do not implement competing correlation logic in the platform layer.

---

# 19. Burst / Window Handling

The system should support alerts that arrive nearly simultaneously.

Maintain a configurable correlation window such as:

```text
30–60 seconds
```

Do NOT hard-code it deeply inside the code.

Use configuration.

Example:

```text
CORRELATION_WINDOW_SECONDS=45
```

The MVP does not need a sophisticated stream processor.

A lightweight active-incident/event-window mechanism is sufficient.

---

# 20. Idempotency

Alerts can be duplicated.

Do not create duplicate incidents because the same alert was received twice.

At minimum maintain:

```text
alert_id
event_id
```

deduplication.

The ingestion path should be safe against repeated submissions.

Example:

```text
POST alert-102
POST alert-102

→ one logical alert
```

Do not assume upstream systems will behave perfectly.

---

# 21. Out-of-Order Events

Do not assume alerts arrive perfectly ordered.

For example:

```text
09:31:05 database saturation
09:31:02 API latency
09:31:04 checkout failure
```

The system should preserve timestamps from the source and not overwrite them with ingestion order.

The incident timeline should support both:

```text
event timestamp
processing timestamp
```

where practical.

---

# 22. API Design

Expose the integration API required by Person 1.

At minimum:

```text
POST /alerts
GET  /alerts

GET  /incidents
GET  /incidents/{incident_id}

GET  /incidents/{incident_id}/timeline
GET  /incidents/{incident_id}/evidence
GET  /incidents/{incident_id}/decision
GET  /incidents/{incident_id}/audit

POST /incidents/{incident_id}/approve
POST /incidents/{incident_id}/reject

GET  /memory/incidents

POST /demo/scenarios/{scenario_id}/run
```

You do not own the business logic of:

```text
approval policy
remediation
memory ranking
```

You only route requests to the correct service/interface.

---

# 23. Realtime API

Person 1 needs live system updates.

Provide:

```text
WebSocket
```

or:

```text
SSE
```

Prefer whichever is simplest and reliable with the existing stack.

Suggested endpoint:

```text
GET /events/stream
```

or:

```text
WS /ws
```

Events should contain enough information for the UI to update.

Example:

```json
{
  "event_type": "AGENT_COMPLETED",
  "timestamp": "2026-09-18T09:31:07Z",
  "incident_id": "INC-1042",
  "payload": {
    "agent": "log-investigator",
    "status": "COMPLETED"
  }
}
```

Do not expose internal chain-of-thought.

Expose structured operational events.

---

# 24. Backend State vs Frontend State

The backend is the source of truth.

The frontend must never be required to infer lifecycle state.

Return explicit:

```text
incident.status
incident.phase
decision.status
action.status
approval.status
verification.status
```

Avoid making frontend developers inspect individual events and derive business state.

Events are for realtime updates.

API state is authoritative.

---

# 25. Decision Integration

Person 4 owns the decision engine.

Define an interface like:

```python
class DecisionEngine(Protocol):
    async def decide(
        self,
        context: DecisionContext,
    ) -> Decision:
        ...
```

The orchestrator should transition:

```text
INVESTIGATING
→ ASSESSING_IMPACT
→ DECIDING
```

Then consume the decision.

Example:

```text
approval_required = true
```

should transition to:

```text
AWAITING_APPROVAL
```

Whereas:

```text
approval_required = false
```

may transition toward:

```text
EXECUTING
```

Do not replicate Person 4's policy logic.

---

# 26. Approval API

Handle:

```text
POST /incidents/{incident_id}/approve
POST /incidents/{incident_id}/reject
```

Approval must result in an explicit state change.

Do not merely return:

```json
{"success": true}
```

Update the incident/action state and emit an event.

Example:

```text
AWAITING_APPROVAL
        ↓
APPROVED
        ↓
EXECUTING
```

Rejection should result in a safe outcome such as escalation/cancellation according to the defined contract.

---

# 27. Remediation Integration

Person 4 owns remediation.

Define an interface:

```python
class RemediationExecutor(Protocol):
    async def execute(
        self,
        action: Action,
        context: ExecutionContext,
    ) -> ExecutionResult:
        ...
```

Your platform must:

1. validate current incident state;
2. invoke executor;
3. persist result;
4. emit events;
5. transition state.

Never execute remediation directly inside an API endpoint.

---

# 28. Verification Integration

Person 4 owns verification.

The orchestrator should support:

```text
EXECUTING
 ↓
VERIFYING
 ↓
RESOLVED
```

or:

```text
VERIFYING
 ↓
EXECUTING
```

for a bounded retry.

Avoid infinite loops.

Use a retry counter:

```text
MAX_REMEDIATION_RETRIES
```

Example:

```text
attempt 1 → failed
attempt 2 → failed
→ ESCALATED
```

---

# 29. Memory Integration

Person 4 owns memory.

The platform should emit a final resolution event.

Example:

```text
INCIDENT_RESOLVED
```

which triggers:

```text
memory.update(incident)
```

The orchestrator should not decide how similarity search works.

Memory must remain a pluggable dependency.

---

# 30. Audit Integration

Every important state transition must produce an audit event.

At minimum:

```text
ALERT_RECEIVED
ALERT_NORMALIZED
CORRELATION_COMPLETED
INCIDENT_CREATED
INCIDENT_UPDATED
INVESTIGATION_STARTED
INVESTIGATION_COMPLETED
DECISION_CREATED
APPROVAL_REQUESTED
APPROVAL_GRANTED
APPROVAL_REJECTED
ACTION_STARTED
ACTION_COMPLETED
VERIFICATION_STARTED
VERIFICATION_COMPLETED
INCIDENT_RESOLVED
INCIDENT_ESCALATED
MEMORY_UPDATED
```

Person 4 owns the audit implementation.

You are responsible for ensuring state transitions and workflow events give the audit layer enough information.

---

# 31. Error Handling

Treat operational failures as expected.

Examples:

```text
LLM timeout
agent timeout
mock DB failure
correlation failure
malformed alert
remediation failure
verification failure
frontend disconnect
```

The backend should not crash because one AI component failed.

Use structured errors.

Avoid:

```python
except Exception:
    pass
```

Never silently swallow failures.

---

# 32. Agent Timeouts

Each AI/agent operation needs a configurable timeout.

Example:

```text
AGENT_TIMEOUT_SECONDS=15
```

A timed-out agent should return a structured failure:

```json
{
  "status": "TIMEOUT",
  "error": "investigation timed out"
}
```

Other agents continue.

This is critical for demonstrating resilience.

---

# 33. Concurrency Safety

Multiple alerts may arrive simultaneously.

The system must avoid races such as:

```text
Alert A
Alert B

both conclude:
"no incident exists"

both create:
INC-1042
INC-1043
```

Use appropriate locking or serialization around incident creation/correlation state.

The MVP can use a process-local lock.

Document that production deployment would require distributed coordination.

---

# 34. Persistence Strategy

For the MVP, use the simplest reliable strategy.

Possible:

```text
SQLite
```

for durable incident/audit state.

Use in-memory structures for transient event coordination if appropriate.

Separate:

```text
working state
```

from:

```text
persistent state
```

Do not build a custom database layer with dozens of abstractions.

---

# 35. Configuration

Centralize configuration.

Examples:

```text
API_HOST
API_PORT
LOG_LEVEL
CORRELATION_WINDOW_SECONDS
AGENT_TIMEOUT_SECONDS
MAX_INVESTIGATION_RETRIES
MAX_REMEDIATION_RETRIES
DATABASE_URL
LLM_PROVIDER
LLM_MODEL
```

Use environment variables.

Provide:

```text
.env.example
```

Never commit secrets.

---

# 36. Demo Scenario API

Provide deterministic endpoints for the hackathon demo.

Example:

```text
POST /demo/scenarios/payment-db-failure/run
POST /demo/scenarios/deployment-regression/run
POST /demo/scenarios/historical-memory/run
```

Or a generic:

```text
POST /demo/scenarios/{scenario_id}/run
```

The scenario should produce events over time rather than creating the final incident state instantly.

Example:

```text
t+0s  alert 1
t+1s  alert 2
t+2s  alert 3
t+3s  correlation
t+4s  investigation begins
t+5s  agent result
...
```

This is critical for the live demo.

---

# 37. Demo Event Simulator

Build a clean simulator that can replay deterministic scenarios.

It should:

* emit alerts asynchronously;
* preserve timestamps;
* simulate realistic delays;
* support reset;
* support repeatability.

Do not hard-code scenario behavior inside React.

The backend should own scenario execution.

---

# 38. Health and Operational Endpoints

Provide:

```text
GET /health
GET /ready
```

Optionally:

```text
GET /metrics
```

Keep these simple.

The frontend should be able to determine whether the backend is operational.

---

# 39. Testing Strategy

Write tests around platform guarantees.

## Unit tests

Test:

```text
state transitions
alert normalization
deduplication
event creation
incident creation
incident retrieval
API validation
```

## Concurrency tests

Test:

```text
multiple simultaneous alerts
duplicate alerts
parallel agent completion
agent failure while others succeed
```

## Integration tests

Test at least one complete workflow:

```text
POST alerts
→ correlation
→ incident
→ investigation
→ decision
→ remediation
→ verification
→ resolved
```

Do not chase 100% coverage.

Test the critical paths.

---

# 40. Frontend Contract

Person 1 must be able to consume your API without understanding orchestration internals.

Ensure the frontend can retrieve:

```text
active incidents
incident state
timeline
evidence
decision
action
approval state
verification
audit
```

Provide stable JSON responses.

Avoid returning internal Python objects or inconsistent shapes.

Document the API in:

```text
docs/contracts.md
```

FastAPI's OpenAPI generation should also describe the API correctly.

---

# 41. Person 3 Contract

Person 3 must be able to work independently.

Provide interfaces for:

```text
CorrelationEngine
InvestigationAgent
EvidenceAggregator
```

Use dependency injection or a registry.

Do not hard-code specific implementation imports throughout the orchestrator.

Ideal architecture:

```text
Orchestrator
   ↓
Interface
   ↓
Person 3 implementation
```

not:

```text
Orchestrator
   ↓
hard-coded specific agent implementation everywhere
```

---

# 42. Person 4 Contract

Person 4 must be able to work independently.

Provide interfaces for:

```text
DecisionEngine
PolicyEngine
RemediationExecutor
VerificationEngine
MemoryStore
AuditStore
```

The platform should depend on contracts.

Person 4 can then replace the mock implementations without changing the orchestration architecture.

---

# 43. Dependency Injection

Use simple dependency injection.

Do not create an elaborate dependency injection framework.

A composition/root module can wire:

```text
event bus
incident store
correlation engine
investigation registry
decision engine
policy engine
remediation executor
verification engine
memory store
audit store
```

Keep wiring in one understandable location.

---

# 44. Logging

Every workflow stage should generate structured logs.

At minimum:

```text
timestamp
level
event
incident_id
alert_id
correlation_id
component
duration_ms
status
```

Example:

```text
INFO investigation_started incident_id=INC-1042
INFO agent_completed agent=log-investigator duration_ms=842
INFO decision_created incident_id=INC-1042
```

Do not log secrets.

Do not dump giant prompts or hidden reasoning into logs.

---

# 45. Observability of Async Workflow

The system must make asynchronous execution observable.

A judge should be able to see:

```text
Alert received
      ↓
Correlation started
      ↓
Investigation started
      ├── Log Agent
      ├── Change Agent
      ├── Topology Agent
      ├── Memory Agent
      └── Impact Agent
```

Your event model must support that.

---

# 46. Failure Semantics

Define what happens when something fails.

Example:

### Correlation failure

```text
→ create safe standalone incident
→ mark correlation result unavailable
→ continue investigation
```

### One investigation agent fails

```text
→ preserve failure
→ continue other agents
→ aggregate partial evidence
```

### Decision fails

```text
→ ESCALATED
```

### Remediation fails

```text
→ VERIFYING or retry
→ eventually ESCALATED
```

### Verification fails

```text
→ bounded remediation retry
→ eventually ESCALATED
```

Do not leave incidents stuck indefinitely.

---

# 47. State Recovery

The MVP should tolerate process restarts reasonably.

On startup:

1. load persisted non-terminal incidents;
2. identify incomplete workflows;
3. mark recoverable work appropriately;
4. avoid blindly executing a remediation again.

For the hackathon, basic recovery is sufficient.

Do not build a full distributed workflow engine.

---

# 48. Security

Never allow API input to become arbitrary executable operations.

Do not accept:

```text
shell command
Python code
arbitrary SQL
arbitrary URL
```

through an alert or action payload and execute it.

All actions originate from the structured decision/policy layer.

---

# 49. Code Quality

Follow these rules:

```text
small modules
typed interfaces
clear naming
explicit state transitions
minimal global state
centralized configuration
structured errors
no dead code
no duplicated models
no giant files
no magic constants
```

Avoid premature abstractions.

A simple 50-line interface is better than a framework of 10 classes for something used once.

---

# 50. Repository Structure

Maintain approximately:

```text
backend/
└── app/
    ├── main.py
    │
    ├── api/
    │   ├── alerts.py
    │   ├── incidents.py
    │   ├── approvals.py
    │   ├── memory.py
    │   ├── demos.py
    │   └── events.py
    │
    ├── domain/
    │   ├── models/
    │   ├── enums.py
    │   └── protocols.py
    │
    ├── ingestion/
    │   ├── sources.py
    │   ├── normalizer.py
    │   └── service.py
    │
    ├── orchestration/
    │   ├── orchestrator.py
    │   ├── state_machine.py
    │   ├── event_bus.py
    │   └── workflow.py
    │
    ├── config.py
    └── dependencies.py
```

Adapt to the existing repository when appropriate.

---

# 51. What NOT To Build

Do not:

* build the frontend;
* implement a chatbot;
* implement complex correlation algorithms owned by Person 3;
* implement detailed root-cause agents owned by Person 3;
* implement remediation logic owned by Person 4;
* create a second memory system;
* create a second orchestration framework;
* introduce Kafka just to claim "event-driven";
* create hundreds of tiny files without purpose;
* build infrastructure that cannot be demonstrated;
* hard-code the whole workflow into one demo script;
* make API calls synchronously wait for the entire incident lifecycle;
* allow agents to arbitrarily mutate global state.

---

# 52. Definition of Done

Your workstream is complete when:

```text
✓ FastAPI application runs
✓ Typed domain models exist
✓ Alert ingestion works
✓ Raw alerts are normalized
✓ Async event bus works
✓ Duplicate alerts are handled
✓ Incident lifecycle exists
✓ State transition validation works
✓ Correlation interface exists
✓ Investigation interface exists
✓ Parallel investigation execution works
✓ Agent timeout/failure isolation works
✓ Decision interface exists
✓ Approval routing works
✓ Remediation interface exists
✓ Verification interface exists
✓ Memory interface exists
✓ Audit events are emitted
✓ Live event stream works
✓ Demo scenarios run asynchronously
✓ API is documented
✓ Frontend can consume stable contracts
✓ Tests cover critical workflow behavior
✓ Configuration is centralized
✓ No secrets are committed
✓ No unnecessary infrastructure dependencies exist
```

---

# 53. Integration Test That Must Work

Before declaring your work finished, prove this flow:

```text
POST /alerts
      ↓
event accepted immediately
      ↓
alert normalized
      ↓
correlation invoked
      ↓
incident created
      ↓
parallel investigation launched
      ↓
partial/complete results collected
      ↓
decision invoked
      ↓
policy determines approval/execution path
      ↓
action invoked
      ↓
verification invoked
      ↓
incident resolved/escalated
      ↓
audit events generated
      ↓
frontend receives realtime events
```

The backend must demonstrate asynchronous execution rather than merely simulate it with sequential function calls.

---

# 54. Final Engineering Standard

Work as a **senior backend/platform engineer designing an incident automation control plane under a 24-hour constraint**.

Prioritize:

```text
correctness
reliability
clear contracts
concurrency
observability
safe state transitions
integration simplicity
```

Do not optimize for the number of classes, agents, dependencies, or lines of code.

A small reliable orchestration engine is better than a large fragile agent framework.

The system must feel like:

```text
an operational platform
```

not:

```text
a collection of Python scripts calling an LLM.
```

---

# 55. Final Instructions

After implementation:

1. Start the FastAPI server.
2. Run the unit tests.
3. Run the integration workflow.
4. Run at least one deterministic demo scenario.
5. Verify asynchronous behavior.
6. Verify multiple investigation tasks run concurrently.
7. Verify one failed agent does not kill the incident workflow.
8. Verify state transitions.
9. Verify realtime events.
10. Verify API responses against `docs/contracts.md`.
11. Remove dead code.
12. Document any assumptions or integration requirements.
13. Do not modify Git identity or Git email.
14. Do not commit unless explicitly instructed.

Do not rewrite `MASTERPLAN.md`.

Your job is to create the **stable platform layer that lets the other three engineers build independently while producing one coherent autonomous incident-resolution system**.
