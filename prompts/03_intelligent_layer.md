# Person 3 — Correlation / Parallel Investigation / Root Cause Analysis

You are **Person 3 of a 4-person engineering team** building the **Autonomous Enterprise Incident Resolution Engine** described in `MASTERPLAN.md`.

You own the **intelligence layer responsible for alert correlation, parallel investigation, evidence aggregation, and root-cause hypothesis generation**.

Person 1 owns the frontend.

Person 2 owns platform, ingestion, orchestration, and APIs.

Person 4 owns decision, policy, remediation, verification, memory, and audit.

Your job is to make the system genuinely capable of answering:

> **Which alerts belong together, what is probably causing the incident, what evidence supports that conclusion, and what is the likely blast radius?**

Do not build a generic chatbot.

Do not build an uncontrolled multi-agent swarm.

Build a **bounded, evidence-driven investigation system** that plugs cleanly into Person 2's orchestration layer and produces structured outputs that Person 4 can consume.

---

# 1. Read Before Coding

Before writing code:

1. Read `MASTERPLAN.md` completely.
2. Read:

   * `docs/architecture.md`
   * `docs/contracts.md`
   * `docs/demo-scenarios.md`
3. Inspect the repository.
4. Inspect the domain models created by Person 2.
5. Inspect the orchestration interfaces created by Person 2.
6. Reuse existing contracts rather than creating competing models.
7. Inspect existing mock data before adding new datasets.

Do not ask for architectural clarification when the repository already contains the relevant contract.

Make reasonable decisions and document them.

---

# 2. Your Ownership

Your primary ownership is:

```text
backend/app/correlation/
backend/app/investigation/
```

You may add tests under:

```text
backend/tests/
tests/integration/
```

You may add mock investigation datasets under:

```text
backend/mock_data/
```

or the existing mock-data location.

You may read and integrate with:

```text
backend/app/domain/
backend/app/orchestration/
backend/app/llm/
```

but do not redesign those layers.

You are NOT responsible for:

```text
frontend/
backend/app/decision/
backend/app/policy/
backend/app/remediation/
backend/app/memory/
backend/app/audit/
```

Those belong to other team members.

---

# 3. Core Objective

Implement this workflow:

```text
Incoming Alerts
      ↓
Deduplication Signals
      ↓
Candidate Incident Matching
      ↓
Correlation Scoring
      ↓
New Incident OR Existing Incident
      ↓
Parallel Investigation
      ├── Log Investigation
      ├── Change Investigation
      ├── Topology Investigation
      ├── Historical Investigation
      └── Impact Investigation
      ↓
Evidence Aggregation
      ↓
Root Cause Hypotheses
      ↓
Ranked Evidence-Based Findings
```

Your output is not the final remediation decision.

Your output is the **best available investigation picture**.

---

# 4. Correlation Philosophy

Do not rely exclusively on embeddings or exclusively on hard-coded rules.

Use a **hybrid correlation strategy**.

Combine deterministic signals with semantic reasoning.

Recommended signals:

```text
time proximity
service match
service dependency
environment
host
region
alert type
error type
metric relationship
deployment relationship
trace/request identifiers
message similarity
semantic similarity
historical incident similarity
```

The MVP should be deterministic enough to demo reliably.

The architecture should leave room for ML/LLM-assisted correlation later.

---

# 5. Correlation Pipeline

Implement a correlation engine with clear stages.

Conceptually:

```text
Alert A
Alert B
Alert C
Alert D
    ↓
Candidate generation
    ↓
Signal extraction
    ↓
Pairwise / cluster scoring
    ↓
Incident matching
    ↓
Correlation decision
```

Do not compare every alert against every other alert indefinitely.

Keep correlation bounded using:

```text
active incident scope
correlation time window
service/environment filters
candidate limits
```

---

# 6. Correlation Window

Use the configurable correlation window provided by Person 2.

For example:

```text
CORRELATION_WINDOW_SECONDS=45
```

Do not hard-code this value into correlation logic.

Alerts outside the configured window should not automatically be grouped solely because they look semantically similar.

Historical similarity is different from real-time correlation.

Keep these concepts separate.

---

# 7. Correlation Signals

Create explicit scoring components.

For example:

```text
time_score
service_score
dependency_score
error_score
metric_score
deployment_score
semantic_score
```

Then produce a final correlation confidence.

Example:

```text
Correlation:
0.92

Reasons:
- same service
- 4 second interval
- same environment
- shared database dependency
- related error class
```

Do not expose arbitrary mathematical complexity just for the appearance of sophistication.

The score must be explainable.

---

# 8. Example Correlation

Input:

```text
09:31:02
Payment API latency > 2s

09:31:03
Payment API 5xx > 8%

09:31:04
DB connection utilization 98%

09:31:05
Checkout transaction failures > 15%
```

Correlation output:

```json
{
  "new_incident": true,
  "incident_id": null,
  "related_alert_ids": [
    "alert-101",
    "alert-102",
    "alert-103",
    "alert-104"
  ],
  "confidence": 0.94,
  "reasons": [
    "tight temporal proximity",
    "shared payment service dependency",
    "related database signal",
    "consistent failure pattern"
  ]
}
```

The result should be structured.

Do not return only:

```text
"These alerts seem related."
```

---

# 9. Correlation vs Historical Similarity

These are NOT the same operation.

### Real-time correlation

Question:

> Do these alerts belong to the same active incident?

### Historical similarity

Question:

> Does this incident resemble a previously resolved incident?

Keep separate interfaces.

For example:

```text
CorrelationEngine
HistoricalInvestigator
```

Do not contaminate real-time incident grouping with historical retrieval logic.

---

# 10. Deduplication

Handle duplicate alerts.

Example:

```text
alert-101
alert-101
alert-101
```

should not produce three separate investigation signals.

Support common duplicate patterns:

```text
same alert_id
same source fingerprint
same service + timestamp + error
```

Do not blindly deduplicate alerts that represent repeated meaningful events.

Preserve counts where relevant.

Example:

```text
5 identical alerts received
```

can itself be meaningful evidence.

---

# 11. Incident Matching

The correlation engine must support:

```text
match existing incident
```

and:

```text
create new incident
```

Return structured results.

Example:

```text
CorrelationResult
    decision
    matched_incident_id
    related_alert_ids
    confidence
    reasons
    signals
```

Person 2's orchestrator will decide what state transition occurs.

Do not create competing incident lifecycle logic in your module.

---

# 12. Investigation Architecture

Investigation must be **parallel**.

Use independent specialist agents.

Recommended agents:

```text
LogInvestigator
ChangeInvestigator
TopologyInvestigator
MemoryInvestigator
ImpactInvestigator
```

These are investigation components, not unrestricted autonomous agents.

Each has:

* narrow responsibility
* bounded input
* bounded execution time
* structured output

---

# 13. Investigation Interface

Implement the interface expected by Person 2.

Conceptually:

```python
class InvestigationAgent(Protocol):
    name: str

    async def investigate(
        self,
        context: InvestigationContext,
    ) -> InvestigationResult:
        ...
```

Each investigator must satisfy this contract.

Do not return raw strings.

---

# 14. Investigation Context

The context should contain only what the investigator needs.

Possible fields:

```text
incident
correlated alerts
service information
environment
known evidence
current timeline
deployment context
historical context
```

Do not give every agent unrestricted access to the entire application state.

Prefer explicit dependencies.

---

# 15. Log Investigator

The Log Investigator should inspect mock application/infrastructure logs.

It should identify:

```text
error spikes
repeating exceptions
connection failures
timeouts
resource exhaustion
dependency failures
unusual sequences
```

Example:

```text
Evidence:
"connection pool exhausted"

Source:
payment-service.log

Timestamp:
09:31:04
```

Return structured evidence.

Do not invent evidence that does not exist in the mock data.

---

# 16. Change Investigator

The Change Investigator should inspect:

```text
deployments
configuration changes
feature flags
version changes
infrastructure changes
```

Focus on temporal relationships.

Example:

```text
Deployment:
payment-api:v42

Deployment time:
09:30:57

Incident spike:
09:31:02
```

Return this as evidence.

Do not automatically conclude that the deployment caused the incident.

It is a hypothesis.

---

# 17. Topology Investigator

The Topology Investigator should inspect service relationships.

Example:

```text
Checkout Service
      ↓
Payment API
      ↓
Payment Worker
      ↓
Postgres
```

When an alert occurs in Postgres, identify potentially affected downstream services.

The investigator should return:

```text
affected services
upstream dependencies
downstream dependencies
possible propagation path
```

This is important for business impact assessment.

---

# 18. Historical Investigator

The historical investigator uses available historical incident records.

For MVP this may use:

```text
mock JSON
SQLite
```

or another lightweight store.

Search for incidents with similar:

```text
service
symptoms
errors
alerts
failure pattern
root cause
```

Example result:

```text
Previous incident:
INC-0911

Similarity:
0.88

Root cause:
DB connection pool exhaustion

Previous action:
Restart payment worker

Outcome:
Resolved
```

Historical evidence must clearly identify itself as historical.

Do not merge historical facts into current facts.

---

# 19. Impact Investigator

Estimate technical/business impact using available mock information.

Possible signals:

```text
affected services
affected users
transaction failure rate
criticality
request volume
revenue-sensitive service
geographical scope
blast radius
```

Return evidence and structured impact fields.

Example:

```text
Affected service:
Checkout

Failure rate:
18%

Service criticality:
CRITICAL

Blast radius:
Payment → Checkout → Order
```

Do not fabricate financial impact values unless they are seeded in the scenario dataset.

---

# 20. LLM Usage

Use the LLM for bounded reasoning tasks.

Good uses:

```text
semantic comparison
hypothesis generation
evidence interpretation
log pattern explanation
historical incident similarity
root-cause candidate generation
```

Bad uses:

```text
raw infrastructure execution
arbitrary command generation
unrestricted tool access
direct state mutation
```

The LLM should produce structured output validated with Pydantic.

---

# 21. LLM Abstraction

Do not hard-code your investigation agents to one specific LLM SDK.

Use an interface such as:

```text
LLMProvider
```

so the system can support:

```text
Ollama
OpenAI-compatible API
other provider
```

through configuration.

Person 2 owns the general platform/LLM wiring.

Your investigators should consume an abstraction rather than directly initializing clients everywhere.

---

# 22. Structured LLM Output

When using an LLM, request structured output.

Example:

```json
{
  "hypotheses": [
    {
      "cause": "database_connection_pool_exhaustion",
      "confidence": 0.91,
      "evidence_ids": [
        "log-883",
        "alert-103"
      ]
    }
  ]
}
```

Validate this response.

If parsing fails:

```text
retry once
```

or:

```text
return structured investigation failure
```

Do not crash the whole incident.

---

# 23. Evidence Model

Every investigator must return evidence objects.

Evidence should include:

```text
evidence_id
source_type
source_id
timestamp
title
description
severity
relevance
metadata
```

Example:

```json
{
  "evidence_id": "log-883",
  "source_type": "LOG",
  "source_id": "payment-service",
  "timestamp": "09:31:04",
  "title": "Connection pool exhausted",
  "description": "Payment worker exhausted available database connections.",
  "relevance": 0.95
}
```

Evidence must be traceable.

The frontend needs to display where it came from.

---

# 24. Hypothesis Model

Create explicit root-cause hypotheses.

Each hypothesis should contain:

```text
hypothesis_id
cause
confidence
supporting_evidence_ids
contradicting_evidence_ids
affected_services
status
```

Example:

```text
Hypothesis:
database_connection_pool_exhaustion

Confidence:
0.91

Supporting:
log-883
alert-103
topology-12

Contradicting:
none
```

Do not represent root cause as an ungrounded paragraph.

---

# 25. Evidence Aggregation

After parallel agents finish:

```text
Agent A results
Agent B results
Agent C results
Agent D results
Agent E results
        ↓
Evidence Aggregator
        ↓
Deduplicated Evidence
        ↓
Hypothesis Graph
        ↓
Ranked Root Cause Candidates
```

The aggregator should:

* deduplicate evidence;
* preserve source attribution;
* identify supporting evidence;
* identify conflicting evidence;
* combine hypotheses;
* calculate a final confidence;
* preserve uncertainty.

---

# 26. Conflicting Evidence

The system must not assume all agents agree.

Example:

```text
Log Investigator:
DB failure likely

Change Investigator:
Recent deployment also suspicious

Topology Investigator:
DB dependency supports DB hypothesis
```

The aggregator should preserve both possibilities.

Example output:

```text
Leading hypothesis:
DB connection exhaustion

Alternative:
deployment regression
```

Do not silently discard conflicting evidence.

---

# 27. Root Cause Ranking

Rank hypotheses by evidence support.

Recommended inputs:

```text
evidence relevance
number of independent supporting signals
temporal consistency
service topology consistency
historical support
contradicting evidence
```

Avoid making the score look more precise than the evidence supports.

A confidence value such as:

```text
0.91
```

is acceptable for deterministic demo scenarios when it is defined by the system.

Do not pretend the value is a calibrated probability.

---

# 28. Root Cause Output

Produce a structured investigation summary.

Example:

```json
{
  "leading_hypothesis": {
    "cause": "database_connection_pool_exhaustion",
    "confidence": 0.91,
    "supporting_evidence_ids": [
      "alert-103",
      "log-883",
      "topology-21",
      "incident-0911"
    ]
  },
  "alternatives": [
    {
      "cause": "recent_deployment_regression",
      "confidence": 0.28
    }
  ],
  "affected_services": [
    "payment-worker",
    "payment-api",
    "checkout"
  ]
}
```

This becomes input to Person 4's decision engine.

---

# 29. Investigation Timeline

Every investigation action should generate an event/result that Person 2 can emit to the frontend.

Examples:

```text
INVESTIGATION_STARTED
AGENT_STARTED
AGENT_COMPLETED
AGENT_FAILED
EVIDENCE_FOUND
HYPOTHESIS_UPDATED
INVESTIGATION_COMPLETED
```

The frontend should be able to show parallel execution.

Do not build frontend-specific event formatting inside these agents.

Return structured events/results.

---

# 30. Timeouts and Failure Isolation

Every investigator must respect a timeout.

An individual failure must not kill the entire investigation.

Example:

```text
Log Investigator       ✓
Change Investigator    ✓
Topology Investigator  ✓
Memory Investigator    ✗ timeout
Impact Investigator    ✓

→ aggregate partial evidence
```

The final investigation should include:

```text
completed_agents
failed_agents
partial_evidence
```

The system must remain useful under partial failure.

---

# 31. Bounded Concurrency

Use controlled parallelism.

Do not spawn unlimited tasks.

Use a small fixed investigation set.

For the MVP:

```text
5 concurrent investigation agents
```

is enough.

Avoid recursive agent spawning.

No investigator should autonomously create another investigator.

---

# 32. Mock Data

Create realistic deterministic datasets for the three primary demo scenarios.

At minimum:

```text
logs
alerts
deployments
topology
historical incidents
business impact
```

The data must be internally consistent.

Do not generate random values each run.

A judge should see the same logical outcome every time.

---

# 33. Scenario 1 — Database Connection Exhaustion

Prepare data such as:

```text
DB connection utilization spike
payment worker connection errors
payment API latency
checkout failures
historical matching incident
```

Expected leading hypothesis:

```text
database_connection_pool_exhaustion
```

The evidence should come from multiple independent sources.

Example:

```text
Alert
Log
Topology
Historical incident
```

Do not let one mock record magically determine the answer.

---

# 34. Scenario 2 — Deployment Regression

Prepare:

```text
recent deployment
5xx increase
latency increase
application error
checkout failures
```

Expected leading hypothesis:

```text
recent_deployment_regression
```

Again, provide multiple supporting signals.

---

# 35. Scenario 3 — Ambiguous Incident

Create at least one scenario where evidence is not perfectly conclusive.

Example:

```text
network latency
+
recent deployment
+
partial database errors
```

The system should return:

```text
Leading hypothesis
Alternative hypotheses
Confidence
Missing evidence
```

rather than pretending certainty.

This makes the system more credible.

---

# 36. Noisy Alerts

Include alert noise.

Example:

```text
CPU spike
health-check warning
duplicate API latency alert
real database saturation
```

The correlation/investigation layer should demonstrate that not every alert deserves equal attention.

---

# 37. Correlation Test Cases

Implement tests for:

### Same incident

```text
5 related alerts
→ 1 incident
```

### Separate incidents

```text
Payment incident
+
Unrelated authentication incident
→ 2 incidents
```

### Duplicate

```text
same alert twice
→ one logical alert
```

### Historical match

```text
new symptoms
→ related historical incident
```

### Out-of-order timestamps

Ensure source timestamps are respected.

---

# 38. Investigation Test Cases

Test:

```text
all agents succeed
```

```text
one agent fails
```

```text
one agent times out
```

```text
conflicting hypotheses
```

```text
insufficient evidence
```

```text
historical match exists
```

The final investigation should remain structurally valid in all cases.

---

# 39. Explainability

The engine should answer:

```text
Why were these alerts correlated?
Why is this root cause considered likely?
What evidence supports it?
What evidence contradicts it?
Which agents contributed?
What information is missing?
```

Expose these through structured fields.

Do not expose hidden chain-of-thought.

---

# 40. Avoid Fake Intelligence

Do not create code that does:

```python
if scenario == "db_failure":
    return "database failure"
```

unless that is part of an explicit deterministic demo adapter.

For actual system behavior, make the conclusion emerge from:

```text
alerts
+
logs
+
topology
+
changes
+
historical evidence
```

The judge should be able to see why the system reached the result.

---

# 41. Architecture

Use approximately:

```text
backend/app/
├── correlation/
│   ├── engine.py
│   ├── signals.py
│   ├── scorer.py
│   ├── dedup.py
│   └── models.py
│
└── investigation/
    ├── base.py
    ├── context.py
    ├── orchestrator.py
    ├── aggregator.py
    ├── hypotheses.py
    ├── evidence.py
    │
    └── agents/
        ├── log.py
        ├── change.py
        ├── topology.py
        ├── memory.py
        └── impact.py
```

Adapt this to repository conventions.

Do not create files simply because they appear in this example.

---

# 42. Separation of Responsibilities

This boundary is important.

### You own:

```text
What alerts are related?
What evidence exists?
What hypotheses are plausible?
What is the likely root cause?
What services appear affected?
```

### Person 4 owns:

```text
What action should be taken?
Is the action allowed?
Does it require approval?
Execute action.
Verify action.
Store final memory.
```

Do not blur these responsibilities.

---

# 43. Integration With Person 2

Person 2's orchestrator should be able to call:

```python
correlation_engine.correlate(...)
```

and:

```python
investigation_registry.run(...)
```

Your output must match the shared contracts.

If the existing contract is different, adapt to the existing contract rather than silently changing it.

If the contract must change:

1. update `docs/contracts.md`;
2. notify through code/documentation;
3. keep the change minimal.

Do not casually rename shared fields.

---

# 44. Integration With Person 4

Person 4 needs structured evidence and hypotheses.

Provide enough information for the decision engine to reason about:

```text
root cause
confidence
impact
evidence
alternatives
uncertainty
```

The decision engine should NOT have to parse your natural-language investigation summary.

Structured data comes first.

Summary text is secondary.

---

# 45. Performance

The primary performance goal is **parallel latency reduction**.

Measure:

```text
sequential estimated duration
parallel execution duration
```

For deterministic mock agents, intentionally include small delays where useful to demonstrate concurrency.

Example:

```text
Log agent: 2s
Change agent: 3s
Topology agent: 2s
Memory agent: 2s
Impact agent: 1s
```

Sequential:

```text
~10s
```

Parallel:

```text
~3s
```

Do not artificially slow down production logic just for this effect.

Use it only in demo instrumentation where appropriate.

---

# 46. Do Not Overuse LLMs

Not every correlation problem requires an LLM.

Use deterministic logic for:

```text
exact duplicate detection
timestamp window
service equality
environment equality
trace matching
known topology relationships
```

Use LLM reasoning for:

```text
semantic relationship
ambiguous logs
hypothesis generation
evidence synthesis
historical interpretation
```

This improves reliability and reduces unnecessary inference.

---

# 47. Safety Boundary

Investigation is read-only.

Your agents must NOT:

```text
restart services
rollback deployments
modify infrastructure
modify databases
execute shell commands
change configuration
```

You may inspect mock representations of these systems.

The decision/remediation layer handles actions.

---

# 48. Definition of Done

Your workstream is complete when:

```text
✓ Correlation engine exists
✓ Duplicate alerts are handled
✓ Real-time correlation window works
✓ Existing incident matching works
✓ New incident correlation works
✓ Correlation reasons are returned
✓ Parallel investigation works
✓ Log investigator works
✓ Change investigator works
✓ Topology investigator works
✓ Historical investigator works
✓ Impact investigator works
✓ Structured evidence exists
✓ Structured hypotheses exist
✓ Evidence aggregation works
✓ Conflicting evidence is preserved
✓ Root cause candidates are ranked
✓ Uncertainty is represented
✓ Agent timeout works
✓ Failed agent isolation works
✓ Deterministic demo datasets exist
✓ Scenario tests exist
✓ Integration contract with Person 2 works
✓ Output contract with Person 4 works
✓ No remediation/execution logic is present
✓ No hidden chain-of-thought is exposed
```

---

# 49. Final Integration Test

Demonstrate this complete investigation:

```text
4–5 asynchronous alerts arrive
        ↓
Correlation engine groups them
        ↓
Incident created
        ↓
5 investigation agents launch concurrently
        ↓
agents inspect independent data sources
        ↓
evidence returned
        ↓
evidence aggregated
        ↓
root-cause candidates generated
        ↓
leading hypothesis selected
        ↓
confidence calculated
        ↓
affected services identified
        ↓
structured investigation result
        ↓
Person 4 receives decision-ready evidence
```

At least one investigator should be deliberately failed during a test to prove that the remaining investigation continues.

---

# 50. Final Engineering Standard

Work like a **senior AI/ML systems engineer building an enterprise incident investigation engine under a 24-hour deadline**.

Prioritize:

```text
evidence
determinism
parallelism
clear interfaces
bounded reasoning
failure isolation
explainability
integration simplicity
```

Do not optimize for:

```text
number of agents
number of prompts
number of files
LLM usage
complexity
```

Five well-designed investigators are better than twenty overlapping agents.

A hybrid deterministic + AI investigation engine is better than an LLM guessing the answer.

---

# 51. Final Instructions

After implementation:

1. Run correlation tests.
2. Run investigation tests.
3. Run the parallel execution test.
4. Verify one agent failure does not stop the others.
5. Run all three demo scenarios.
6. Verify structured evidence is present.
7. Verify root-cause hypotheses are grounded in evidence.
8. Verify historical evidence is clearly separated from current evidence.
9. Verify outputs match `docs/contracts.md`.
10. Remove dead code.
11. Document assumptions.
12. Do not modify Git identity or email.
13. Do not commit unless explicitly instructed.
14. Do not modify `MASTERPLAN.md`.

Your final output must be a **reusable investigation subsystem**, not a demo-specific hard-coded script.

The rest of the team must be able to plug your correlation and investigation engine into the orchestrator and immediately drive the incident-resolution workflow.
