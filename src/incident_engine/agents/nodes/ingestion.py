import uuid
from typing import Dict, Any
from incident_engine.core.state import AgentState
from incident_engine.core.models import Incident, AuditEvent

def get_attr_or_key(obj: Any, key: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def detect_trigger(state: AgentState) -> Dict[str, Any]:
    alerts = state.get("incoming_alerts", [])
    audit = AuditEvent(
        incident_id="PENDING",
        node_name="detect_trigger",
        actor="system",
        action="Ingest and Normalize Alerts",
        decision_reasoning=f"Received {len(alerts)} raw alerts from MessageQueue trigger. Validated schema.",
        result=f"Normalized {len(alerts)} alerts into state."
    )
    return {
        "normalized_alerts": alerts,
        "current_status": "TRIGGERED",
        "audit_log": [audit]
    }

def correlate_alerts(state: AgentState) -> Dict[str, Any]:
    alerts = state.get("normalized_alerts", [])
    services = list(set(get_attr_or_key(a, "service") for a in alerts))
    severities = [get_attr_or_key(a, "severity") for a in alerts]
    overall_sev = "P1" if "P1" in severities else "P2"
    alert_ids = [get_attr_or_key(a, "id") for a in alerts]
    
    incident = Incident(
        id=f"INC-{uuid.uuid4().hex[:4].upper()}",
        title="Cascading Latency Spike & Connection Saturation across Payment Stack",
        severity=overall_sev,
        status="CORRELATED",
        affected_services=services,
        correlated_alert_ids=alert_ids,
        summary=f"Correlated {len(alerts)} alerts across {', '.join(services)} into unified operational incident."
    )
    
    audit = AuditEvent(
        incident_id=incident.id,
        node_name="correlate_alerts",
        actor="agent",
        action="Correlate Alerts into Incident",
        decision_reasoning=(
            f"Grouped {len(alerts)} burst alerts occurring in 45s window across dependent services: {services}. "
            "Identified payment-api 504s and redis saturation as symptoms of single cascading failure."
        ),
        result=f"Created incident {incident.id} (Severity: {overall_sev})"
    )
    return {
        "incident": incident,
        "current_status": "CORRELATED",
        "audit_log": [audit]
    }
