# Person 4 — Decision / Policy / Remediation / Verification / Memory / Audit

You are **Person 4 of a 4-person engineering team** building the **Autonomous Enterprise Incident Resolution Engine** described in `MASTERPLAN.md`.

You own the layer that turns investigation results into **controlled operational decisions and actions**.

Your work is the final link in:

```text
INVESTIGATION
      ↓
DECISION
      ↓
POLICY
      ↓
APPROVAL / AUTONOMOUS EXECUTION
      ↓
REMEDIATION
      ↓
VERIFICATION
      ↓
RESOLUTION / ESCALATION
      ↓
MEMORY
      ↓
AUDIT
```

Person 1 owns the frontend.

Person 2 owns platform, ingestion, orchestration, state machine, and APIs.

Person 3 owns alert correlation, parallel investigation, evidence aggregation, and root-cause analysis.

You own **decision intelligence, safety boundaries, controlled execution, verification, operational memory, and auditability**.

Your implementation must plug into Person 2's interfaces without redesigning the rest of the system.

---

# 1. Read Before Coding

Before writing code:

1. Read `MASTERPLAN.md` completely.
2. Read:

   * `docs/architecture.md`
   * `docs/contracts.md`
   * `docs/demo-scenarios.md`
3. Inspect the existing repository.
4. Inspect the domain models and protocols created by Person 2.
5. Inspect Person 3's investigation result contract.
6. Reuse existing contracts.
7. Do not create competing models.
8. Do not modify another developer's workstream unnecessarily.

Do not ask for clarification when the repository already contains the required contract.

Make the smallest reasonable implementation and document important assumptions.

---

# 2. Your Ownership

Primary ownership:

```text id="f0x7qz"
backend/app/decision/
backend/app/policy/
backend/app/remediation/
backend/app/memory/
backend/app/audit/
```

You may create tests under:

```text id="8b9w4r"
backend/tests/
tests/integration/
```

You may create deterministic mock data under the existing mock-data directory.

You may READ:

```text id="9c3z8v"
backend/app/domain/
backend/app/orchestration/
backend/app/correlation/
backend/app/investigation/
```

but do not redesign those modules.

---

# 3. Core Objective

Your system must answer:

> Given the investigation evidence, what should the system do, is that action allowed, does it require human approval, how should it execute, did it work, and what should be remembered?

The result must be structured.

Never make the final output simply:

```text
"The service should probably be restarted."
```

Instead produce something equivalent to:

```json id="c2t4pu"
{
  "root_cause": "database_connection_pool_exhaustion",
  "confidence": 0.91,
  "severity": "HIGH",
  "business_impact": "CHECKOUT_DEGRADATION",
  "recommended_action": {
    "type": "restart_service",
    "target": "payment-worker"
  },
  "risk": "MEDIUM",
  "approval_required": true,
  "reason": "..."
}
```

---

# 4. Critical Architecture Principle

The LLM proposes.

The policy engine decides whether the proposal is allowed.

The executor performs only an allowed action.

The verifier checks the result.

The memory layer stores the outcome.

The audit layer records the lifecycle.

The flow must be:

```text id="8b0i87"
Evidence
  ↓
Decision Engine
  ↓
Structured Action Proposal
  ↓
Policy Engine
  ↓
Approval Gate if required
  ↓
Remediation Executor
  ↓
Verification
  ↓
Memory + Audit
```

Never:

```text id="jcmic6"
LLM
 ↓
arbitrary command
 ↓
execute
```

---

# 5. Decision Engine

Implement a decision engine that consumes Person 3's structured investigation output.

Interface concept:

```python id="z8z9bg"
class DecisionEngine(Protocol):
    async def decide(
        self,
        context: DecisionContext,
    ) -> Decision:
        ...
```

The decision context should include:

```text id="7r4v3i"
incident
alerts
investigation results
root-cause candidates
evidence
affected services
business impact
historical evidence
```

The decision engine should generate:

```text id="7u8y1i"
root cause
root cause confidence
severity
business impact
recommended action
action risk
approval requirement
reason
expected result
preconditions
rollback strategy
```

---

# 6. Decision Philosophy

Do not confuse:

```text id="2q5j05"
root-cause confidence
```

with:

```text id="n9x9nz"
action confidence
```

A system may have:

```text id="m7xrh8"
Root cause confidence = high
```

but still require approval because:

```text id="95di1f"
Action risk = high
```

Similarly, the system may identify a likely root cause but have insufficient evidence for automatic remediation.

The decision engine must account for both.

---

# 7. Severity

Use explicit severity levels:

```text id="jbt2o2"
CRITICAL
HIGH
MEDIUM
LOW
```

Severity should consider:

```text id="q2m97s"
technical severity
affected services
business criticality
affected users
transaction failure
blast radius
duration
```

Do not base severity entirely on a single alert field.

For the MVP, use deterministic scoring rules plus investigation data.

---

# 8. Business Impact

Business impact should be explicit in the decision model.

Example:

```text id="0g9jmy"
business_impact:
  affected_users: 4820
  failed_transactions_percent: 18
  critical_service: true
  blast_radius:
    - payment
    - checkout
    - order
```

Do not invent financial estimates unless the demo scenario explicitly contains them.

Use the mock scenario data.

---

# 9. Action Model

Every action must be structured.

Example:

```json id="b2f3xr"
{
  "action_id": "act-102",
  "type": "restart_service",
  "target": "payment-worker",
  "parameters": {},
  "risk": "MEDIUM",
  "approval_required": true,
  "reason": "..."
}
```

Allowed action types should come from a fixed registry.

For MVP:

```text id="jt2rt8"
health_check
restart_service
rollback_deployment
scale_service
clear_connection_pool
```

Only implement actions that can be safely mocked.

---

# 10. Policy Engine

Create a dedicated policy engine.

Interface:

```python id="u9v9f3"
class PolicyEngine(Protocol):
    async def evaluate(
        self,
        action: Action,
        context: PolicyContext,
    ) -> PolicyDecision:
        ...
```

The policy engine must determine:

```text id="jsh3o5"
allowed
blocked
approval_required
```

It should also return:

```text id="3cav9m"
policy_rule
reason
risk
```

Example:

```json id="8hz9ms"
{
  "allowed": true,
  "approval_required": true,
  "risk": "HIGH",
  "policy_rule": "HIGH_RISK_REQUIRES_APPROVAL",
  "reason": "Production rollback requires human approval."
}
```

---

# 11. Autonomy Levels

Implement explicit autonomy policies.

At minimum:

```text id="95l1p8"
READ_ONLY
LOW_RISK_AUTO
APPROVAL_REQUIRED
FORBIDDEN
```

Example policy:

```text id="tx2u5e"
health_check
→ READ_ONLY

restart_service
→ APPROVAL_REQUIRED

rollback_deployment
→ APPROVAL_REQUIRED

scale_service
→ APPROVAL_REQUIRED

clear_connection_pool
→ LOW_RISK_AUTO

delete_database
→ FORBIDDEN
```

The exact mapping can be configured.

The important point is that autonomy is **policy-controlled**.

---

# 12. Policy Must Override the LLM

If the model says:

```text id="f3y6fg"
"Rollback immediately."
```

but policy says:

```text id="03g4ym"
approval required
```

the system must require approval.

If policy says:

```text id="b7xq1v"
forbidden
```

the action must not execute.

The model cannot bypass policy.

---

# 13. Action Allowlist

Create an explicit action registry.

For example:

```python id="9qpg0k"
ACTION_REGISTRY = {
    "health_check": ...,
    "restart_service": ...,
    "rollback_deployment": ...,
    "scale_service": ...,
}
```

Avoid arbitrary action names coming from the LLM.

An unknown action should be rejected.

Example:

```text id="x1l5lz"
Action:
drop_database

→ BLOCKED
```

---

# 14. Remediation Executor

Implement:

```python id="qx4s8j"
class RemediationExecutor(Protocol):
    async def execute(
        self,
        action: Action,
        context: ExecutionContext,
    ) -> ExecutionResult:
        ...
```

For MVP, use a mock executor.

Example:

```text id="s56hwp"
restart_service(payment-worker)
```

should update a simulated service state:

```text id="6o1ndx"
payment-worker:
UNHEALTHY → RESTARTING → HEALTHY
```

Do not execute real infrastructure commands.

---

# 15. Dry Run

Every remediation should support dry-run.

Example:

```text id="4qnt4g"
DRY RUN

Action:
rollback payment-api:v42 → v41

Policy:
APPROVED

Would execute:
rollback_deployment

No infrastructure modified.
```

This is important for safe demonstrations.

---

# 16. Idempotency

Remediation must not execute twice accidentally.

Maintain an action identity:

```text id="zqvmjt"
action_id
incident_id
```

If the same action is submitted again:

```text id="rl8n3h"
return existing execution result
```

rather than performing it twice.

---

# 17. Preconditions

Actions may have preconditions.

Example:

```text id="ukz2is"
restart_service

preconditions:
- service exists
- service is unhealthy
- service is restartable
```

The executor or policy layer should validate them.

If a precondition fails:

```text id="0lbz9k"
do not execute
return BLOCKED/PRECONDITION_FAILED
```

Do not force execution through a failed precondition.

---

# 18. Verification Engine

Implement a verification component.

Interface:

```python id="r09qye"
class VerificationEngine(Protocol):
    async def verify(
        self,
        action: Action,
        result: ExecutionResult,
        context: VerificationContext,
    ) -> VerificationResult:
        ...
```

Verification must inspect expected recovery signals.

For example:

```text id="hw4iyl"
service health
error rate
latency
transaction success
```

---

# 19. Verification Must Be Independent

Do not report:

```text id="a6bq0r"
action.status == success
```

as proof that the incident is resolved.

Action success and incident recovery are different concepts.

Example:

```text id="kgv3ns"
Restart command:
SUCCESS

Service health:
FAIL

Error rate:
HIGH

→ Verification:
FAILED
```

This should trigger retry or escalation according to policy.

---

# 20. Verification Success

Example:

```json id="f1mk4r"
{
  "status": "RECOVERED",
  "checks": [
    {
      "name": "service_health",
      "status": "PASS"
    },
    {
      "name": "error_rate",
      "status": "PASS"
    },
    {
      "name": "latency",
      "status": "PASS"
    }
  ]
}
```

Do not return a success merely because the mock executor completed.

---

# 21. Verification Failure

If remediation succeeds but verification fails:

```text id="8pntx6"
EXECUTING
    ↓
VERIFYING
    ↓
FAILED
```

Then decide:

```text id="wnsu9i"
retry
```

or:

```text id="v3t6e4"
escalate
```

based on configured limits.

Never create an infinite retry loop.

---

# 22. Retry Policy

Use bounded retries.

Example:

```text id="34h8a8"
MAX_REMEDIATION_RETRIES=2
```

Workflow:

```text id="88z9pe"
Attempt 1 → verification failed
Attempt 2 → verification failed
→ ESCALATED
```

Track:

```text id="h8c7l5"
attempt_number
action_id
result
verification
```

---

# 23. Human Approval

Implement approval state support.

Person 2 owns the API/state transition layer.

Your module provides the action decision.

Approval-required actions should expose structured information:

```text id="q2r4lw"
action
risk
reason
evidence
expected result
rollback strategy
```

Example:

```text id="wq8jyr"
HIGH-RISK ACTION

Rollback payment-api:v42

Reason:
Deployment occurred 5 seconds before 5xx spike.

Evidence:
5 related alerts
deployment event
application exceptions

Expected:
Return API to stable version.

Rollback:
v41
```

---

# 24. Approval Must Be Explicit

Do not treat:

```text id="0e57p9"
HTTP request received
```

as approval.

Only the explicit approval operation should authorize execution.

Approval should produce an audit event.

Rejection should prevent execution.

---

# 25. Decision Confidence

Produce a decision confidence that reflects the available evidence.

Do not claim calibrated probability.

Use wording/UI metadata like:

```text id="4v8lq7"
HIGH CONFIDENCE
0.91
```

only when appropriate.

The frontend will render this.

---

# 26. Historical Memory

Implement a lightweight operational memory system.

MVP can use:

```text id="g0q59k"
SQLite
JSON
in-memory store
```

Do not build a complex vector database unless already available and immediately useful.

Memory records should contain:

```text id="fw0z6e"
incident_id
timestamp
services
symptoms
root_cause
root_cause_confidence
evidence_summary
action
risk
approval_required
execution_result
verification_result
outcome
```

---

# 27. Memory Is Not Truth

This rule is critical.

Historical memory must be treated as **supporting evidence**.

Example:

```text id="6rlx8y"
Previous incident:
DB connection pool exhaustion

Current incident:
similar symptoms
```

Do not automatically execute the old remediation.

Instead:

```text id="4q9pi4"
retrieve memory
→ compare current evidence
→ decision engine evaluates
→ policy evaluates action
→ approval/execution
```

---

# 28. Memory Retrieval

Provide an interface such as:

```python id="u4g3yb"
class MemoryStore(Protocol):
    async def find_similar(
        self,
        context: MemoryQuery,
    ) -> list[MemoryRecord]:
        ...

    async def save(
        self,
        record: MemoryRecord,
    ) -> None:
        ...
```

For MVP similarity can be based on:

```text id="0q1wme"
service overlap
error type
root cause keywords
alert type
symptoms
```

You may add embeddings if they are already available and stable.

Do not spend hackathon time building a complex semantic search system.

---

# 29. Memory Write

After successful or failed resolution:

```text id="y1t8l2"
incident
+
root cause
+
evidence
+
action
+
approval
+
execution
+
verification
→ memory record
```

Save enough information so future incidents can use it.

Do not store hidden chain-of-thought.

Store concise operational facts and outcomes.

---

# 30. Memory Quality

Only save resolved/meaningful incidents.

Avoid polluting memory with:

```text id="f0dr1m"
incomplete investigation
malformed alert
irrelevant noise
failed random demo state
```

Mark memory quality where useful.

Example:

```text id="41j1dj"
outcome:
SUCCESS

confidence:
HIGH
```

---

# 31. Audit System

Implement an audit store.

Interface:

```python id="rxu7wr"
class AuditStore(Protocol):
    async def append(
        self,
        event: AuditEvent,
    ) -> None:
        ...

    async def list_for_incident(
        self,
        incident_id: str,
    ) -> list[AuditEvent]:
        ...
```

The audit log must be append-oriented.

Avoid silently overwriting history.

---

# 32. Audit Event Model

Each event should contain:

```text id="pl3we3"
event_id
timestamp
event_type
incident_id
actor
component
action_id
status
reason
metadata
```

Example:

```json id="c8h1sd"
{
  "event_type": "ACTION_APPROVED",
  "incident_id": "INC-1042",
  "actor": "human",
  "action_id": "act-102",
  "timestamp": "..."
}
```

---

# 33. Audit Requirements

The audit trail should make it possible to answer:

```text id="xu5f4v"
What decision was made?
Why?
What evidence supported it?
What action was proposed?
What risk level?
Who approved it?
When?
What actually executed?
Did it work?
What happened afterwards?
What was stored in memory?
```

Every significant state-changing operation should be auditable.

---

# 34. Audit Event Sequence

At minimum support:

```text id="c5ge0z"
DECISION_CREATED
POLICY_EVALUATED
APPROVAL_REQUESTED
APPROVAL_GRANTED
APPROVAL_REJECTED
ACTION_BLOCKED
ACTION_STARTED
ACTION_COMPLETED
ACTION_FAILED
VERIFICATION_STARTED
VERIFICATION_COMPLETED
REMEDIATION_RETRY
INCIDENT_RESOLVED
INCIDENT_ESCALATED
MEMORY_UPDATED
```

Person 2 may also emit broader lifecycle events.

Do not duplicate identical events unnecessarily.

---

# 35. Audit Immutability

For MVP:

* append-only API;
* no normal edit operation;
* preserve event timestamp and identity.

A future production architecture may use stronger tamper-evident storage.

Do not over-engineer cryptographic audit logging during the hackathon.

---

# 36. LLM Decisioning

The LLM may help generate a structured recommendation.

For example:

```text id="fuyw4d"
Given:
- investigation findings
- evidence
- business impact
- runbook options

Generate:
- root cause interpretation
- recommended action
- reason
- expected result
```

The output must be validated.

The model must NEVER directly invoke the remediation executor.

---

# 37. Structured Output Validation

Use Pydantic validation.

If the LLM returns malformed output:

```text id="x1o7zh"
retry once
```

then:

```text id="g4r2bq"
return decision failure/escalation
```

Never execute malformed output.

---

# 38. Decision Guardrails

Before returning a final action:

Check:

```text id="2n1lhf"
Is action known?
Is target valid?
Is required evidence present?
Is confidence sufficient?
Is action permitted?
Does it require approval?
Are preconditions satisfied?
```

If any critical requirement fails:

```text id="7k0s0p"
do not execute
```

Escalate or request more information according to the workflow.

---

# 39. Example Autonomous Action

Scenario:

```text id="czapg4"
Payment worker is unhealthy.

Evidence:
- DB pool exhausted
- worker connection errors
- previous identical incident resolved by restart

Action:
restart_payment_worker

Risk:
LOW_RISK_AUTO
```

Flow:

```text id="o3e2jk"
Decision
 ↓
Policy ALLOW
 ↓
No approval
 ↓
Execute
 ↓
Verify
 ↓
Resolved
 ↓
Memory update
 ↓
Audit
```

The frontend should be able to visualize this.

---

# 40. Example Human Approval Action

Scenario:

```text id="80rpw6"
Recent deployment
+
5xx spike
+
checkout failure
```

Decision:

```text id="7r1fsv"
Action:
rollback_deployment

Risk:
HIGH

Approval:
REQUIRED
```

Flow:

```text id="0tpj8u"
Decision
 ↓
Policy
 ↓
AWAITING_APPROVAL
 ↓
Human approval
 ↓
Execute rollback
 ↓
Verify
 ↓
Resolved
```

---

# 41. Example Forbidden Action

Suppose an agent proposes:

```text id="8t8q8v"
delete_database
```

Policy:

```text id="s6x8bc"
FORBIDDEN
```

Expected behavior:

```text id="m8z1zi"
Policy:
BLOCKED

Execution:
NOT PERFORMED

Audit:
ACTION_BLOCKED

Incident:
ESCALATED or continues investigation
```

The executor must never receive the forbidden action.

---

# 42. Safety Against Arbitrary Commands

Never execute:

```text id="4b9x8m"
shell commands
Python expressions
SQL strings
arbitrary URLs
arbitrary infrastructure API calls
```

received from the model.

Only registered action handlers can execute.

For example:

```python id="dz1kwo"
ACTION_REGISTRY["restart_service"]
```

is valid.

An arbitrary string such as:

```text id="9a5c0a"
"ssh prod && rm -rf ..."
```

must never be executed.

---

# 43. Mock Infrastructure State

Create a deterministic mock environment.

Example:

```json id="f3n2tb"
{
  "services": {
    "payment-worker": {
      "health": "UNHEALTHY"
    },
    "payment-api": {
      "health": "DEGRADED"
    }
  }
}
```

The remediation executor changes this state.

Verification reads the state.

This creates a real closed-loop demo.

---

# 44. Mock Remediation Lifecycle

For example:

```text id="l7e8m2"
restart_service
```

should simulate:

```text id="4gph5s"
UNHEALTHY
   ↓
RESTARTING
   ↓
HEALTHY
```

with realistic async delay if needed.

Do not instantly return success without state change.

---

# 45. Failure Simulation

Support at least one remediation failure scenario.

Example:

```text id="y02wzc"
restart service
→ execution succeeds
→ verification fails
```

or:

```text id="6ar0bb"
rollback
→ execution fails
```

This allows the judges to see escalation behavior.

---

# 46. Integration With Person 2

Person 2's orchestrator should be able to call:

```text id="s6s6br"
decision_engine.decide(...)
policy_engine.evaluate(...)
remediation_executor.execute(...)
verification_engine.verify(...)
memory_store.save(...)
audit_store.append(...)
```

Your implementation must honor these interfaces.

Do not directly manipulate Person 2's incident state machine.

Return results.

Let the orchestrator transition state.

---

# 47. Integration With Person 3

Consume:

```text id="n5efq3"
InvestigationResult
Evidence
Hypothesis
Impact
AffectedServices
HistoricalSignals
```

Do not require raw logs or internal investigator implementation details.

Your decision engine should work against structured investigation context.

---

# 48. Integration With Person 1

The frontend needs structured data for:

```text id="4i8g72"
decision
risk
approval_required
action
execution_status
verification
memory
audit
```

Do not return frontend-formatted strings.

Return structured JSON-compatible models.

Person 1 owns presentation.

You own semantics.

---

# 49. Decision Explanation

Every decision must contain concise operational reasoning.

Example:

```text id="j6wgtu"
"DB connection exhaustion is the leading root-cause hypothesis.
The proposed worker restart is allowed by policy and is expected
to restore service health without modifying persistent data."
```

This is an operational explanation.

Do not expose hidden chain-of-thought.

---

# 50. Business-Aware Decisions

Do not select actions based only on technical severity.

For example:

```text id="8r5y5m"
service criticality = CRITICAL
checkout failures = 18%
```

may warrant faster escalation than:

```text id="9w4k7b"
internal analytics service
2% latency increase
```

Use business-impact fields from Person 3.

---

# 51. Decision Determinism

For the hackathon demo, prefer deterministic behavior when evidence clearly maps to a known scenario.

The LLM may add reasoning and semantic interpretation.

However, final policy and execution should remain deterministic.

This prevents a model variation from breaking the live demo.

---

# 52. Demo Scenario Requirements

Make sure your layer supports:

## Scenario A — Autonomous Resolution

```text id="4v0zj1"
Root cause:
DB connection exhaustion

Action:
restart payment worker

Policy:
LOW_RISK_AUTO

Outcome:
verified recovery
```

## Scenario B — Approval

```text id="zngdvv"
Root cause:
deployment regression

Action:
rollback deployment

Policy:
APPROVAL_REQUIRED

Outcome:
human approval → execution → verification
```

## Scenario C — Failure / Escalation

```text id="w2f0hc"
Action:
restart service

Execution:
success

Verification:
failure

Retry:
bounded

Final:
ESCALATED
```

---

# 53. Memory Demo

After Scenario A resolves:

```text id="0gy6it"
save:
INC-1042

root cause:
DB connection exhaustion

action:
restart worker

outcome:
success
```

Then when a similar alert arrives:

```text id="60w0dg"
Memory Investigator
→ finds INC-1042
→ returns historical evidence
→ Person 3 includes it in investigation
→ Person 4 evaluates current evidence
```

The system demonstrates a learning loop without pretending to retrain the model.

---

# 54. Audit Demo

The final incident should have a complete timeline such as:

```text id="cg4cuy"
DECISION_CREATED
      ↓
POLICY_EVALUATED
      ↓
APPROVAL_REQUESTED
      ↓
APPROVAL_GRANTED
      ↓
ACTION_STARTED
      ↓
ACTION_COMPLETED
      ↓
VERIFICATION_STARTED
      ↓
VERIFICATION_COMPLETED
      ↓
INCIDENT_RESOLVED
      ↓
MEMORY_UPDATED
```

Ensure timestamps and IDs are available.

---

# 55. Testing

Write tests for:

### Decision

```text id="s8vcrp"
strong evidence
weak evidence
conflicting evidence
unknown action
```

### Policy

```text id="i5kftj"
low-risk auto
approval required
forbidden action
```

### Remediation

```text id="oqmy76"
success
failure
duplicate execution
precondition failure
```

### Verification

```text id="73wk2v"
healthy
unhealthy
partial recovery
```

### Retry

```text id="n2ivf0"
failure
retry
failure
escalation
```

### Memory

```text id="9ccz3j"
save
retrieve
no match
```

### Audit

```text id="4rn3kn"
append
retrieve by incident
event order
```

---

# 56. Safety Tests

Explicitly test that:

```text id="7j2p3n"
LLM proposes forbidden action
→ policy blocks
```

and:

```text id="j8p6ay"
LLM proposes arbitrary command
→ validation rejects
```

and:

```text id="m1s1ex"
approval required
→ executor is NOT called before approval
```

These are important tests for the project's autonomy story.

---

# 57. Reliability

Handle:

```text id="lw6e72"
LLM timeout
malformed LLM output
policy failure
executor failure
verification failure
memory failure
audit failure
```

Do not make a secondary subsystem failure silently destroy the primary incident state.

Critical action failures must be surfaced explicitly.

Audit or memory failures should be handled according to a documented policy rather than silently ignored.

---

# 58. Avoid Overengineering

Do not build:

```text id="xg1g0f"
distributed workflow engine
complex vector database
real Kubernetes operator
real cloud remediation
enterprise IAM
RBAC platform
secrets manager
```

The MVP is about proving the operational loop.

Use interfaces so those systems can replace mocks later.

---

# 59. Suggested Structure

Use approximately:

```text id="f6q0v4"
backend/app/
├── decision/
│   ├── engine.py
│   ├── models.py
│   └── prompts.py
│
├── policy/
│   ├── engine.py
│   ├── rules.py
│   └── registry.py
│
├── remediation/
│   ├── executor.py
│   ├── registry.py
│   ├── mock_environment.py
│   └── actions/
│
├── memory/
│   ├── store.py
│   ├── models.py
│   └── similarity.py
│
└── audit/
    ├── store.py
    └── models.py
```

Adapt this to the existing project.

Do not blindly create every file in the example.

---

# 60. Definition of Done

Your workstream is complete when:

```text id="hhs0m4"
✓ Decision engine exists
✓ Decision output is structured
✓ Risk classification exists
✓ Approval requirement is explicit
✓ Policy engine exists
✓ Action allowlist exists
✓ Forbidden actions are blocked
✓ Remediation interface exists
✓ Mock remediation environment exists
✓ Dry-run works
✓ Action idempotency works
✓ Preconditions are checked
✓ Verification engine exists
✓ Verification checks actual simulated state
✓ Retry policy is bounded
✓ Escalation works
✓ Memory store exists
✓ Historical incidents can be retrieved
✓ Memory is treated as evidence
✓ Audit store exists
✓ Important actions are auditable
✓ LLM output is validated
✓ Arbitrary commands cannot execute
✓ Approval prevents unauthorized execution
✓ Integration with Person 2 works
✓ Structured results work with Person 1
✓ Person 3 investigation output is consumed
✓ Demo scenarios work
✓ Failure scenarios work
✓ Tests cover critical paths
```

---

# 61. Final End-to-End Test

Prove these three workflows.

### Autonomous

```text id="7j1m8m"
Investigation
 ↓
Decision
 ↓
Policy: LOW_RISK_AUTO
 ↓
Execute
 ↓
Verify
 ↓
RESOLVED
 ↓
Memory
 ↓
Audit
```

### Approval

```text id="xvv6t9"
Investigation
 ↓
Decision
 ↓
Policy: APPROVAL_REQUIRED
 ↓
AWAITING_APPROVAL
 ↓
Approve
 ↓
Execute
 ↓
Verify
 ↓
RESOLVED
```

### Escalation

```text id="v28y90"
Investigation
 ↓
Decision
 ↓
Policy
 ↓
Execute
 ↓
Verification FAILED
 ↓
Retry
 ↓
Verification FAILED
 ↓
ESCALATED
 ↓
Audit
```

All three must be deterministic enough to reproduce during the hackathon.

---

# 62. Engineering Principles

Work like a **senior production AI/platform engineer responsible for putting guardrails around autonomous operations**.

Prioritize:

```text id="v65ag8"
controlled autonomy
structured decisions
policy enforcement
idempotent execution
verification
failure handling
auditability
operational memory
```

The system should demonstrate:

```text id="62ytc9"
AI can recommend.
Policy controls.
Humans approve when required.
Tools execute.
Verification proves.
Memory learns.
Audit records.
```

That is the core value of this workstream.

---

# 63. Final Instructions

After implementation:

1. Run unit tests.
2. Run policy safety tests.
3. Run remediation tests.
4. Run verification tests.
5. Run memory tests.
6. Run audit tests.
7. Run the complete autonomous scenario.
8. Run the human-approval scenario.
9. Run the failure/escalation scenario.
10. Verify forbidden actions cannot execute.
11. Verify executor cannot be reached before approval when approval is required.
12. Verify historical memory is stored after resolution.
13. Verify the investigation output from Person 3 is consumed correctly.
14. Verify the frontend receives structured decision/action/verification/audit data through Person 2.
15. Remove dead code.
16. Document integration assumptions in `docs/contracts.md` or the appropriate documentation.
17. Do not modify Git identity or Git email.
18. Do not commit unless explicitly instructed.
19. Do not modify `MASTERPLAN.md`.

Do not build fake autonomous behavior.

Build the **control layer that makes the autonomy real, bounded, explainable, verifiable, and auditable**.
