import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Literal

from pydantic import BaseModel, Field

class Alert(BaseModel):
    """Normalized incoming operational alert."""
    id: str = Field(description="Unique alert identifier")
    timestamp: str = Field(description="ISO timestamp of alert occurrence")
    service: str = Field(description="Target service name")
    severity: Literal["P1", "P2", "P3", "P4"] = Field(description="Alert severity tier")
    title: str = Field(description="Short descriptive title")
    message: str = Field(description="Detailed error or event description")
    source: str = Field(description="Observability system source (e.g. Prometheus, Datadog, Sentry)")
    metric_name: Optional[str] = Field(default=None, description="Associated metric name if applicable")
    metric_value: Optional[float] = Field(default=None, description="Associated metric value if applicable")

class Incident(BaseModel):
    """Aggregated enterprise operational incident."""
    id: str = Field(description="Unique incident identifier, e.g. INC-2026-1042")
    title: str = Field(description="Incident title summarizing the failure")
    severity: Literal["P1", "P2", "P3", "P4"] = Field(description="Overall incident severity")
    status: Literal[
        "TRIGGERED", "CORRELATED", "INVESTIGATING", "IDENTIFIED", 
        "AWAITING_APPROVAL", "REMEDIATING", "VERIFYING", "RESOLVED", "ESCALATED"
    ] = Field(default="TRIGGERED")
    affected_services: List[str] = Field(default_factory=list, description="List of impacted services")
    correlated_alert_ids: List[str] = Field(default_factory=list, description="Alerts grouped into this incident")
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: str = Field(description="High-level incident description")

class Evidence(BaseModel):
    """Atomic piece of operational evidence discovered during investigation."""
    id: str = Field(default_factory=lambda: f"EVD-{uuid.uuid4().hex[:6]}")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source_tool: str = Field(description="Tool that produced this evidence")
    query_or_target: str = Field(description="Query parameter or target queried")
    finding: str = Field(description="Extracted fact or observation")
    supports_hypothesis: Optional[str] = Field(default=None, description="Hypothesis ID supported or refuted")
    confidence_score: float = Field(default=0.8, ge=0.0, le=1.0)

class Hypothesis(BaseModel):
    """Plausible root cause hypothesis evaluated during investigation."""
    id: str = Field(description="Identifier e.g. H1, H2")
    statement: str = Field(description="Hypothesis explanation")
    status: Literal["active", "confirmed", "refuted"] = Field(default="active")
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    likelihood_score: float = Field(default=0.5, ge=0.0, le=1.0)

class InvestigationStep(BaseModel):
    """Detailed log of one diagnostic iteration in the agent loop."""
    step_number: int = Field(description="Sequential step number")
    question: str = Field(description="Diagnostic question being investigated")
    tool_called: str = Field(description="Name of the operational tool invoked")
    tool_input: Dict[str, Any] = Field(default_factory=dict, description="Parameters passed to tool")
    tool_output: str = Field(description="Raw or formatted tool observation")
    reasoning: str = Field(description="LLM reasoning regarding this observation")
    updated_hypotheses: List[str] = Field(default_factory=list, description="Hypothesis states after this step")

class RemediationAction(BaseModel):
    """Safe, bounded operational remediation proposal."""
    id: str = Field(default_factory=lambda: f"REM-{uuid.uuid4().hex[:6]}")
    action_type: str = Field(description="Action identifier, e.g. rollback_deployment, clear_cache")
    target_service: str = Field(description="Service to remediate")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Execution parameters")
    rationale: str = Field(description="Why this action resolves the root cause")
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field(description="Risk classification")
    approval_required: bool = Field(description="True if human SRE sign-off is required")

class AuditEvent(BaseModel):
    """Immutable audit log entry for the incident timeline."""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    incident_id: str = Field(description="Incident ID")
    node_name: str = Field(description="LangGraph node where action occurred")
    actor: Literal["agent", "tool", "human", "system"] = Field(description="Entity performing action")
    action: str = Field(description="Action name or transition")
    decision_reasoning: str = Field(description="Reasoning or rationale behind decision")
    result: str = Field(description="Outcome or output summary")

# Schemas for LLM structured output
class InvestigationDecisionSchema(BaseModel):
    reasoning: str = Field(description="Step-by-step reasoning on what is known and what specific evidence is needed.")
    is_investigation_complete: bool = Field(description="True if root cause is identified with high confidence; False if more diagnostics are needed.")
    tool_to_call: Optional[Literal[
        "query_logs", "query_metrics", "get_service_health", 
        "get_recent_deployments", "get_dependencies", "search_knowledge_base"
    ]] = Field(default=None, description="Operational tool to invoke next.")
    service: Optional[str] = Field(default=None, description="Target service (e.g. payment-worker, payment-api, redis-cluster).")
    query_or_metric: Optional[str] = Field(default="", description="Log query, metric name, or KB search string.")
    target_hypothesis_id: Optional[str] = Field(default=None, description="Hypothesis ID (e.g. H1, H2) this query tests.")

class RootCauseDecisionSchema(BaseModel):
    primary_root_cause: str = Field(description="Definitive technical root cause explanation.")
    confirmed_hypothesis_id: str = Field(description="ID of confirmed hypothesis (e.g. H1).")
    confidence_score: float = Field(description="Calibrated confidence score between 0.0 and 1.0.", ge=0.0, le=1.0)
    supporting_evidence_summary: str = Field(description="Key evidence supporting this conclusion.")

class RemediationDecisionSchema(BaseModel):
    action_type: Literal["rollback_deployment", "restart_service", "clear_cache", "scale_replicas"] = Field(description="Action type.")
    target_service: str = Field(description="Service to remediate.")
    target_version_or_param: str = Field(description="Deployment version (e.g. v1.8.1) or configuration parameter.")
    rationale: str = Field(description="Technical rationale explaining why this action resolves root cause.")
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field(description="Risk classification.")
    approval_required: bool = Field(description="True if human SRE sign-off is mandatory.")
