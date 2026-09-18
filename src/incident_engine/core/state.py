import operator
from typing import List, Dict, Any, Optional, Literal, Annotated, TypedDict, Union

from incident_engine.core.models import Alert, Incident, Evidence, Hypothesis, InvestigationStep, RemediationAction, AuditEvent

class AgentState(TypedDict):
    """Strongly typed LangGraph state for the autonomous incident engine."""
    incoming_alerts: List[Alert]
    normalized_alerts: List[Alert]
    incident: Optional[Union[Incident, Dict[str, Any]]]
    retrieved_context: List[str]
    hypotheses: List[Union[Hypothesis, Dict[str, Any]]]
    evidence: Annotated[List[Union[Evidence, Dict[str, Any]]], operator.add]
    investigation_steps: Annotated[List[Union[InvestigationStep, Dict[str, Any]]], operator.add]
    root_cause: Optional[str]
    confidence: float
    proposed_remediation: Optional[Union[RemediationAction, Dict[str, Any]]]
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    approval_required: bool
    approval_status: Literal["NOT_REQUIRED", "PENDING", "APPROVED", "REJECTED"]
    remediation_result: Optional[Dict[str, Any]]
    verification_result: Optional[Dict[str, Any]]
    audit_log: Annotated[List[Union[AuditEvent, Dict[str, Any]]], operator.add]
    current_status: str
    
    # Internal agent loop routing controls
    next_step_action: Optional[Literal["continue_investigation", "conclude_investigation"]]
    pending_tool_call: Optional[Dict[str, Any]]
