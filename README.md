# Autonomous Enterprise Incident Resolution Engine (AI-01)

> An event-driven AI operations control plane that moves from alert detection, real-time correlation, parallel specialist investigation, evidence aggregation, policy-governed decisioning, safe autonomous remediation or human approval, independent verification, and operational memory learning.

---

## 🚀 Architecture Overview

```text
ALERT INGESTION
      ↓
NORMALIZATION & DEDUPLICATION
      ↓
REAL-TIME CORRELATION
      ↓
INCIDENT STATE MACHINE (Authoritative)
      ↓
PARALLEL INVESTIGATION
  ├── Log Investigator
  ├── Change Investigator
  ├── Topology Investigator
  ├── Historical Memory Investigator
  └── Business Impact Investigator
      ↓
EVIDENCE AGGREGATION & HYPOTHESIS RANKING
      ↓
DECISION & POLICY ENGINE
  ├── Safe Action (LOW_RISK_AUTO)      → Autonomous Execution
  ├── Risky Action (APPROVAL_REQUIRED) → Human Approval Gate
  └── Forbidden Action (FORBIDDEN)     → Blocked & Escalated
      ↓
REMEDIATION EXECUTION (Idempotent, Dry-Run Capable)
      ↓
INDEPENDENT VERIFICATION (Health, Error Rate, Latency)
      ↓
OPERATIONAL MEMORY & AUDIT LOG (Immutable)
```

---

## 👥 4-Person Monorepo Workstream Ownership

| Person | Workstream | Primary Directory | Description |
| :--- | :--- | :--- | :--- |
| **Person 1** | **Frontend / Incident Command Center** | `frontend/` | React + TypeScript + Vite SRE dashboard, real-time alert stream, parallel agents matrix, evidence drawer, approval flow, and audit timeline. |
| **Person 2** | **Platform / Ingestion / Orchestrator** | `backend/app/api/`, `ingestion/`, `orchestration/`, `domain/` | Canonical schemas, async event bus, authoritative state machine, REST endpoints, SSE/WS streaming. |
| **Person 3** | **Correlation / Parallel Investigation** | `backend/app/correlation/`, `investigation/`, `mock_data/` | Hybrid correlation scoring, 5 specialist concurrent agents, evidence aggregation, and hypothesis ranking. |
| **Person 4** | **Decision / Policy / Remediation / Memory / Audit** | `backend/app/decision/`, `policy/`, `remediation/`, `memory/`, `audit/` | Policy engine, autonomy levels, mock infrastructure executor, independent verifier, historical memory, and append-only audit trail. |

---

## ⚡ Quickstart

### Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows pwsh:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Run Deterministic Demo Scenarios
```bash
# In project root:
python scripts/run_demo.py --scenario payment-db-pool-exhaustion
```

---

## 📖 Documentation
- [docs/architecture.md](docs/architecture.md) — System architecture, state machine, and data flow.
- [docs/contracts.md](docs/contracts.md) — REST endpoints, SSE event specifications, and inter-service schemas.
- [docs/demo-scenarios.md](docs/demo-scenarios.md) — Walkthroughs of the 4 judging demonstration scenarios.
- [docs/decisions.md](docs/decisions.md) — Architectural Decision Records (ADRs).
