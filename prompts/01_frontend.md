# Person 1 — Frontend / Incident Command Center

You are **Person 1 of a 4-person engineering team** building the **Autonomous Enterprise Incident Resolution Engine** described in `MASTERPLAN.md`.

You own the **frontend workstream**.

Your job is to build a polished, operational-grade **Incident Command Center** that makes the autonomous incident-resolution workflow immediately understandable during a hackathon demo.

You are working in parallel with 3 other developers.

Your implementation must therefore be **isolated, contract-driven, and integration-friendly**.

---

# 1. First Read the Architecture

Before writing code:

1. Read `MASTERPLAN.md` completely.
2. Read:

   * `docs/architecture.md`
   * `docs/contracts.md`
   * `docs/demo-scenarios.md`
3. Inspect the existing repository.
4. Understand the backend API/contracts that already exist.
5. Do not invent conflicting data models.
6. Do not rewrite backend code unless absolutely required for a frontend integration contract.
7. Do not ask the user to explain the architecture. Derive it from the repository and masterplan.

Your output should fit the existing architecture rather than creating a second architecture.

---

# 2. Your Ownership

You own:

```text
frontend/
```

Primarily work inside:

```text
frontend/
```

You may read other parts of the repository.

Do not modify another developer's implementation unless a genuine frontend integration issue requires a minimal contract change.

If you discover a backend contract problem:

1. document it clearly;
2. use a frontend adapter/mock interface where possible;
3. avoid blocking frontend development;
4. do not redesign the backend.

---

# 3. Frontend Objective

Build an **Incident Command Center**, not a generic admin dashboard and not a chatbot.

The UI must communicate this workflow:

```text
ALERT
  ↓
CORRELATION
  ↓
INVESTIGATION
  ↓
ROOT CAUSE
  ↓
IMPACT
  ↓
DECISION
  ↓
APPROVAL / AUTONOMOUS ACTION
  ↓
REMEDIATION
  ↓
VERIFICATION
  ↓
RESOLUTION
  ↓
MEMORY
```

A judge should understand what the system is doing within seconds.

The interface should make the AI's operational behavior visible.

---

# 4. Product Style

Build a serious enterprise/SRE operations interface.

The visual language should feel closer to:

```text
Datadog
PagerDuty
Grafana
Kubernetes dashboards
AWS operations tooling
modern SOC/NOC systems
```

than:

```text
generic SaaS dashboard
AI chatbot
marketing landing page
template dashboard
```

Prioritize:

* information hierarchy
* fast scanning
* high signal-to-noise ratio
* live state changes
* clear severity
* obvious actions
* evidence visibility
* strong incident storytelling

Avoid excessive gradients, giant cards, decorative illustrations, unnecessary animations, and dashboard clutter.

The application should look credible when shown to judges.

---

# 5. Recommended Frontend Stack

Inspect the repository first.

If no frontend stack has been established, use:

```text
React
TypeScript
Vite
Tailwind CSS
```

Use a component architecture that is easy for another developer to extend.

Prefer mature libraries where useful rather than implementing common UI primitives from scratch.

Keep the dependency list small.

Do not install large libraries merely for visual effects.

---

# 6. Main Application Layout

Create an application shell similar to an operational command center.

Recommended structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ Header                                                        │
│ System Status | Active Incidents | Autonomous Actions        │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│ Navigation   │ Main Workspace                                 │
│              │                                                │
│ Overview     │                                                │
│ Incidents    │                                                │
│ Alerts       │                                                │
│ Memory       │                                                │
│ Audit        │                                                │
│              │                                                │
└──────────────┴────────────────────────────────────────────────┘
```

Keep navigation lightweight.

The most important page is the incident view.

---

# 7. Dashboard / Overview

Build an operational overview screen.

It should provide:

### Top-level metrics

Examples:

```text
Active Incidents
Critical Incidents
Alerts / min
Investigations Running
Pending Approvals
Autonomous Actions
Resolved Today
```

Do not fabricate meaningless KPI values.

Use actual backend data when available and clearly labeled deterministic demo data otherwise.

### Active incident feed

Display incidents with:

```text
Incident ID
Title
Severity
Status
Affected service
Business impact
Started time
Current phase
Confidence
Action state
```

Example:

```text
INC-1042
Payment API degradation

CRITICAL
Investigating

Affected:
Payment Service

Impact:
Checkout failures

Phase:
Root Cause Investigation

Confidence:
91%
```

---

# 8. Live Alert Stream

The system is asynchronous.

The frontend must visually reflect that.

Create a live alert stream showing:

```text
09:31:02  API latency increased
09:31:03  5xx error spike
09:31:04  DB connection saturation
09:31:05  Checkout failure rate increased
```

When multiple alerts belong to the same incident, visually show them being grouped.

Example:

```text
4 new alerts
      ↓
correlating...
      ↓
INC-1042 created
```

The user should be able to understand that the system is not simply listing alerts.

---

# 9. Incident Detail Page

This is the most important part of the frontend.

Create a rich incident detail page.

Recommended layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ INC-1042                                     CRITICAL         │
│ Payment API degradation                     INVESTIGATING    │
├──────────────────────────────────────────────────────────────┤
│ Root Cause │ Impact │ Confidence │ Duration │ Services       │
├───────────────────────────────┬──────────────────────────────┤
│ Investigation Timeline        │ Incident Context             │
│                               │                              │
│ Alert                         │ Affected Services            │
│ Correlation                   │ Business Impact              │
│ Agent investigation           │ Related Alerts               │
│ Evidence                      │ Historical Incidents          │
│ Decision                      │                              │
│ Action                        │                              │
│ Verification                 │                              │
└───────────────────────────────┴──────────────────────────────┘
```

---

# 10. Incident Lifecycle Visualization

Create a visual lifecycle/progress component:

```text
● Detection
│
● Correlation
│
● Investigation
│
● Impact Assessment
│
● Decision
│
● Approval
│
● Remediation
│
● Verification
│
● Resolved
```

The current state must be visually obvious.

Completed states should look completed.

Current state should look active.

Future states should look pending.

Failed states should be unmistakable.

---

# 11. Investigation View

The parallel-agent architecture is a major differentiator.

Make it visible.

Create an investigation panel showing agents running concurrently.

Example:

```text
INVESTIGATION

┌────────────────────────┐
│ Log Investigator       │
│ ● Completed            │
│ 12 evidence items      │
└────────────────────────┘

┌────────────────────────┐
│ Change Investigator    │
│ ● Completed            │
│ Deployment #884        │
└────────────────────────┘

┌────────────────────────┐
│ Topology Investigator  │
│ ● Running              │
│ Payment → DB           │
└────────────────────────┘

┌────────────────────────┐
│ Memory Investigator    │
│ ● Completed            │
│ 3 similar incidents    │
└────────────────────────┘

┌────────────────────────┐
│ Impact Investigator    │
│ ● Completed            │
│ 18% checkout impact    │
└────────────────────────┘
```

The UI should make **parallel execution** obvious.

Do not present all investigation results as one generic AI response.

---

# 12. Evidence Panel

Create an evidence-first interface.

Every important conclusion should expose its supporting evidence.

Example:

```text
PROBABLE ROOT CAUSE

Database connection pool exhaustion

Confidence
91%

Supporting Evidence

✓ alert-102
  DB connection saturation

✓ log-883
  "connection pool exhausted"

✓ deployment-22
  worker concurrency increased

✓ incident-0911
  historical match
```

Clicking evidence should reveal details.

Do not expose chain-of-thought.

Show:

* evidence
* facts
* structured reasoning outputs
* confidence
* source
* timestamp

Not hidden internal reasoning.

---

# 13. Root Cause Section

Create a root-cause visualization.

Show:

```text
Leading hypothesis
Confidence
Supporting evidence
Alternative hypotheses
```

Example:

```text
ROOT CAUSE

Database connection pool exhaustion
91%

Alternative hypotheses

Network latency
23%

Application regression
12%
```

Confidence values must come from backend data.

If actual alternatives are not available, do not invent pseudo-scientific values.

For deterministic demo mode, seed these explicitly in the scenario data.

---

# 14. Business Impact

The system must go beyond technical monitoring.

Show business impact.

Possible fields:

```text
Affected Service
Affected Users
Failed Transactions
Revenue Risk
Business Criticality
Geographic Impact
Blast Radius
```

Example:

```text
BUSINESS IMPACT

Checkout Service
18% failed transactions

Estimated affected users
4,820

Business criticality
Critical

Blast radius
Payment → Checkout → Order Service
```

Keep these values tied to scenario data.

---

# 15. Decision Panel

Create a highly visible decision section.

Example:

```text
AI DECISION

Root Cause:
Database connection exhaustion

Recommended Action:
Restart Payment Worker

Confidence:
91%

Risk:
Medium

Execution Mode:
Human Approval Required

Why:
The action is permitted by policy and is expected
to restore the affected worker without modifying data.

Expected Result:
Payment error rate returns below threshold.
```

The decision panel must make the AI's operational decision understandable.

---

# 16. Approval Experience

Approval is a key requirement.

Create an approval interface for actions that require intervention.

Example:

```text
ACTION REQUIRES APPROVAL

Rollback deployment payment-api:v42

Risk:
HIGH

Reason:
Recent deployment correlates with 5xx spike.

Evidence:
5 related alerts
1 deployment event
2 investigation findings

Expected result:
Return service to previous stable version.

[ Approve ]   [ Reject ]
```

Do not make approval a tiny button hidden somewhere.

It must be a first-class part of the incident workflow.

After approval:

```text
Approval received
       ↓
Executing remediation
       ↓
Verifying recovery
```

The UI must visibly update.

---

# 17. Autonomous Execution

For safe actions, do not show an approval button.

Instead show:

```text
AUTONOMOUS ACTION

Policy:
LOW_RISK_AUTO

Action:
Restart payment worker

Status:
EXECUTING
```

Then:

```text
REMEDIATION SUCCESSFUL

Health check
✓ PASS

Error rate
✓ NORMAL

Latency
✓ NORMAL
```

This visually demonstrates that the system can act autonomously.

---

# 18. Verification Panel

Make verification separate from remediation.

Example:

```text
VERIFICATION

Service health       ✓ PASS
Error rate           ✓ PASS
Latency              ✓ PASS
Transaction success  ✓ PASS

Verification result:
RECOVERED
```

Failure should be represented too:

```text
Remediation completed
       ↓
Verification failed
       ↓
Incident escalated
```

This distinction is important.

---

# 19. Historical Memory

Create a historical incident panel.

Example:

```text
HISTORICAL MEMORY

3 similar incidents found

INC-0911
Payment DB connection exhaustion

Similarity:
High

Previous action:
Restart payment worker

Outcome:
Resolved in 47 sec

Used as evidence:
YES
```

The UI must clearly communicate:

**Historical memory is supporting evidence, not an automatic instruction.**

---

# 20. Audit Timeline

Build a detailed audit/activity timeline.

Example:

```text
14:21:03
Alert received

14:21:04
4 alerts correlated into INC-1042

14:21:05
Parallel investigation started

14:21:07
Root cause identified

14:21:08
Remediation proposed

14:21:08
Human approval requested

14:21:15
Action approved

14:21:16
Remediation executed

14:21:20
Verification successful

14:21:22
Incident resolved

14:21:23
Memory updated
```

Include metadata where useful:

```text
component
agent
action
timestamp
status
duration
```

This should look like a proper operational audit trail.

---

# 21. Real-Time Updates

The application must support asynchronous updates.

Prefer:

```text
WebSocket
```

or:

```text
Server-Sent Events
```

based on the backend implementation.

Abstract this through a frontend event layer:

```text
eventClient.ts
```

The UI should react to events such as:

```text
ALERT_RECEIVED
INCIDENT_CREATED
INCIDENT_UPDATED
INVESTIGATION_STARTED
AGENT_STARTED
AGENT_COMPLETED
DECISION_CREATED
APPROVAL_REQUIRED
ACTION_STARTED
ACTION_COMPLETED
VERIFICATION_COMPLETED
INCIDENT_RESOLVED
MEMORY_UPDATED
```

Do not scatter raw WebSocket/SSE logic across components.

---

# 22. Frontend Architecture

Create a clean structure.

Example:

```text
frontend/
└── src/
    ├── app/
    │   ├── routes/
    │   ├── providers/
    │   └── app.tsx
    │
    ├── components/
    │   ├── layout/
    │   ├── incidents/
    │   ├── alerts/
    │   ├── investigation/
    │   ├── decisions/
    │   ├── remediation/
    │   ├── audit/
    │   └── memory/
    │
    ├── pages/
    │   ├── overview/
    │   ├── incidents/
    │   ├── alerts/
    │   ├── memory/
    │   └── audit/
    │
    ├── api/
    │   ├── client.ts
    │   ├── incidents.ts
    │   ├── alerts.ts
    │   └── memory.ts
    │
    ├── realtime/
    │   └── event-client.ts
    │
    ├── hooks/
    │
    ├── types/
    │
    ├── utils/
    │
    └── styles/
```

Adjust the structure if the repository already has a better established convention.

Do not create unnecessary folders.

---

# 23. API Layer

Do not call backend endpoints directly from random components.

Centralize API access.

For example:

```text
api/client.ts
api/incidents.ts
api/alerts.ts
api/memory.ts
```

Components should consume typed hooks/services.

Example conceptual flow:

```text
Component
   ↓
Hook
   ↓
API Service
   ↓
HTTP Client
```

This makes backend integration easier for Person 2.

---

# 24. Typed Frontend Models

Create TypeScript types that correspond to the shared backend contracts.

Examples:

```text
Alert
Incident
IncidentStatus
InvestigationResult
Evidence
Decision
Action
Approval
VerificationResult
MemoryRecord
AuditEvent
```

Do not redefine the same model in multiple files.

If JSON schema/OpenAPI contracts are available, derive or align types from those contracts rather than manually creating conflicting versions.

---

# 25. Mock Mode

The frontend must be usable even if the backend is incomplete.

Create a clean mock-data adapter.

Example:

```text
src/api/mock/
```

The mock layer must simulate:

```text
alerts arriving
incident creation
parallel investigation
decision
approval
remediation
verification
resolution
memory update
```

The mock system should produce deterministic demo data.

Do not place giant JSON blobs directly inside UI components.

---

# 26. Demo Mode

Create a visible/demo-friendly way to trigger scenarios.

Example:

```text
Demo Scenarios

[ Payment DB Failure ]
[ Deployment Regression ]
[ Historical Memory Match ]
```

Selecting a scenario should trigger the corresponding backend demo endpoint where available.

For frontend-only development, the mock adapter can simulate the event stream.

The final demo should be deterministic.

---

# 27. Loading / Error / Empty States

Every important screen needs:

```text
loading
empty
error
success
```

states.

Do not leave blank screens.

Example:

```text
No active incidents

All monitored services are currently healthy.
```

For backend failure:

```text
Unable to connect to incident engine.

Retry
```

Make operational status explicit.

---

# 28. Responsive Behavior

The main judging environment will probably be a laptop/projector.

Prioritize desktop.

Still make the interface reasonably responsive.

Do not spend significant hackathon time on mobile-specific layouts.

---

# 29. Accessibility

At minimum:

* semantic buttons
* keyboard-friendly controls
* readable contrast
* clear status indicators
* do not rely only on color to communicate severity
* proper labels
* useful hover/focus states

Severity should use both:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

and visual differentiation.

---

# 30. Performance

Do not introduce unnecessary re-renders.

Be especially careful with:

* live event streams
* timeline updates
* large alert lists

Use appropriate memoization/windowing only where required.

Do not over-engineer performance before measuring.

---

# 31. Frontend Testing

Write meaningful tests for:

### Incident lifecycle

```text
received
→ investigating
→ decision
→ approval
→ remediation
→ verification
→ resolved
```

### Approval

Verify:

```text
approval required
approve
reject
```

### Live events

Verify that events correctly update incident state.

### Error states

Verify that API failures are shown correctly.

Do not attempt 100% test coverage during the hackathon.

Prioritize critical workflow behavior.

---

# 32. Integration Contract With Person 2

Assume Person 2 owns backend/API.

The frontend should expect APIs conceptually equivalent to:

```text
POST /alerts
GET /alerts

GET /incidents
GET /incidents/{id}

GET /incidents/{id}/timeline
GET /incidents/{id}/evidence
GET /incidents/{id}/decision
GET /incidents/{id}/audit

POST /incidents/{id}/approve
POST /incidents/{id}/reject

GET /memory/incidents

POST /demo/scenarios/{scenario_id}/run
```

Do not hard-code assumptions everywhere.

Keep endpoint paths/configuration centralized.

Use environment configuration such as:

```text
VITE_API_BASE_URL
```

Never hard-code `localhost` throughout the codebase.

---

# 33. Integration Contract With Person 4

Person 4 owns decision/remediation/memory/audit.

Design components around structured data.

The frontend must not parse natural-language AI output to determine:

```text
risk
approval_required
action
status
confidence
```

Those values must come from typed backend fields.

Example:

```json
{
  "action": "restart_payment_worker",
  "risk": "MEDIUM",
  "approval_required": true,
  "status": "AWAITING_APPROVAL"
}
```

Render the state.

Do not infer it.

---

# 34. Integration Contract With Person 3

Person 3 owns correlation and investigation.

Expect structured information such as:

```text
correlated_alerts
investigations
agents
evidence
hypotheses
confidence
affected_services
```

The UI should make parallel investigation visible.

Do not require Person 3's agents to return frontend-specific strings.

Backend owns semantics.

Frontend owns presentation.

---

# 35. Important Engineering Rule

Never let UI state become the source of truth for incident state.

The backend is authoritative.

The frontend reflects backend state.

Example:

```text
Backend says:
AWAITING_APPROVAL

Frontend:
shows approval UI
```

Not:

```text
Frontend assumes:
probably awaiting approval
```

---

# 36. Visual Demo Sequence

Optimize the UI for this exact judging sequence:

### Step 1

Judge sees incoming alerts.

### Step 2

Alerts visually correlate.

### Step 3

Incident appears.

### Step 4

Multiple investigation agents run simultaneously.

### Step 5

Evidence accumulates.

### Step 6

Root cause and impact appear.

### Step 7

AI proposes remediation.

### Step 8

System determines:

```text
AUTONOMOUS
```

or:

```text
REQUIRES APPROVAL
```

### Step 9

Action executes.

### Step 10

Verification runs.

### Step 11

Incident resolves.

### Step 12

Memory is updated.

This sequence should be smooth and visually understandable without verbal explanation.

---

# 37. What NOT To Do

Do not:

* build a chatbot as the primary interface
* create fake AI conversations
* hard-code hundreds of visual states
* duplicate backend business logic in React
* create giant components
* create one giant state store containing everything
* couple UI directly to mock data
* hide important incident information behind many clicks
* add unnecessary animations
* spend hours making a landing page
* redesign the backend
* modify shared contracts casually
* add dependencies without need
* expose internal chain-of-thought

The frontend must visualize the actual operational workflow.

---

# 38. Definition of Done

Your workstream is complete when:

```text
✓ Frontend starts cleanly
✓ Dashboard exists
✓ Live alerts can be displayed
✓ Alerts can become incidents
✓ Incident detail page exists
✓ Incident lifecycle is visible
✓ Parallel agents are visible
✓ Evidence is visible
✓ Root cause is visible
✓ Business impact is visible
✓ Decision is visible
✓ Approval flow works
✓ Autonomous action flow works
✓ Remediation status is visible
✓ Verification is visible
✓ Audit timeline is visible
✓ Historical memory is visible
✓ Demo scenarios can be triggered
✓ Frontend works with mock data
✓ Frontend is ready to connect to backend APIs
✓ Loading/error/empty states exist
✓ Important workflow components have tests
✓ No unnecessary code or dependencies remain
```

---

# 39. Final Instruction

Work like a **senior frontend engineer building a production-quality internal operations platform under severe time constraints**.

Do not produce a giant amount of code just to appear productive.

Prioritize the smallest implementation that gives us the strongest complete operational experience.

Build the **Incident Command Center first**.

Then connect live events.

Then polish the incident workflow.

Then integrate approval/remediation.

Then improve visual quality.

Do not block on other developers.

Use mock adapters wherever backend implementation is not yet available.

Keep all integration points clean so Person 2, Person 3, and Person 4 can plug into your frontend without rewriting it.

At the end:

1. run the frontend;
2. verify the main flows;
3. run relevant tests;
4. remove dead code;
5. document any integration assumptions in `docs/`;
6. clearly report what you implemented and what backend contract is expected.

Do not rewrite `MASTERPLAN.md`.

Do not modify Git identity/configuration.

Do not commit changes unless explicitly instructed.

The result must look like an **enterprise incident command product**, not a hackathon UI.
