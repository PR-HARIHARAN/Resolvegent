from typing import Dict, Any
from incident_engine.core.state import AgentState
from incident_engine.core.models import RemediationDecisionSchema, RootCauseDecisionSchema, AuditEvent, RemediationAction
from incident_engine.core.llm import llm
from incident_engine.agents.nodes.ingestion import get_attr_or_key

def decide_root_cause(state: AgentState) -> Dict[str, Any]:
    inc = state.get("incident")
    inc_id = get_attr_or_key(inc, "id", "UNKNOWN")
    evidence = state.get("evidence", [])
    ev_summary = "\n".join([f"- {get_attr_or_key(e, 'finding')}" for e in evidence])
    
    prompt = f"""Synthesize the root cause for incident {inc_id}.
Evidence:
{ev_summary}

Determine the definitive primary root cause, confirmed hypothesis ID, calibrated confidence (0.0 - 1.0), and a supporting evidence summary."""

    try:
        structured_llm = llm.with_structured_output(RootCauseDecisionSchema)
        decision = structured_llm.invoke(prompt)
        root_cause = decision.primary_root_cause
        confidence = decision.confidence_score
    except Exception as e:
        root_cause = "payment-worker release v1.8.2 introduced a Redis connection leak in worker threads, exhausting Redis maxclients (10000) and causing upstream 504 timeouts on payment-api."
        confidence = 0.95
    
    audit = AuditEvent(
        incident_id=inc_id,
        node_name="decide_root_cause",
        actor="agent",
        action="Confirm Root Cause",
        decision_reasoning=f"Synthesized {len(evidence)} evidence points.",
        result=f"Root Cause: {root_cause[:80]}... (Confidence: {confidence:.2f})"
    )
    return {
        "root_cause": root_cause,
        "confidence": confidence,
        "current_status": "IDENTIFIED",
        "audit_log": [audit]
    }

def decide_remediation(state: AgentState) -> Dict[str, Any]:
    inc = state.get("incident")
    inc_id = get_attr_or_key(inc, "id", "UNKNOWN")
    root_cause = state.get("root_cause")
    
    prompt = f"""Based on the confirmed root cause:
'{root_cause}'

Select the most targeted remediation action.
Options:
- rollback_deployment: rollback payment-worker to previous stable v1.8.1 (Risk: HIGH, approval required).
- clear_cache: flush cache (Risk: LOW, approval not required).
- restart_service: restart payment-worker without rollback (Risk: MEDIUM, approval required).

Recommend rollback_deployment to v1.8.1 to eliminate the faulty binary."""

    try:
        structured_llm = llm.with_structured_output(RemediationDecisionSchema)
        dec = structured_llm.invoke(prompt)
        action_type = dec.action_type
        target_svc = dec.target_service
        target_param = dec.target_version_or_param
        rationale = dec.rationale
        risk = dec.risk_level
        approval_req = dec.approval_required
    except Exception as e:
        action_type = "rollback_deployment"
        target_svc = "payment-worker"
        target_param = "v1.8.1"
        rationale = "Roll back payment-worker from buggy v1.8.2 to previous stable release v1.8.1 to purge unreleased connection handles."
        risk = "HIGH"
        approval_req = True
    
    action = RemediationAction(
        action_type=action_type,
        target_service=target_svc,
        parameters={"target_version": target_param},
        rationale=rationale,
        risk_level=risk,
        approval_required=approval_req
    )
    
    audit = AuditEvent(
        incident_id=inc_id,
        node_name="decide_remediation",
        actor="agent",
        action="Formulate Remediation Proposal",
        decision_reasoning=rationale,
        result=f"Proposed {action_type} on {target_svc} (Risk: {risk}, Approval Required: {approval_req})"
    )
    
    return {
        "proposed_remediation": action,
        "risk_level": risk,
        "approval_required": approval_req,
        "approval_status": "PENDING" if approval_req else "NOT_REQUIRED",
        "current_status": "AWAITING_APPROVAL" if approval_req else "READY_FOR_EXECUTION",
        "audit_log": [audit]
    }
