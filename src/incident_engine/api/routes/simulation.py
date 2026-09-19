import json
import asyncio
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

import requests
from incident_engine.core.config import config as app_config
from incident_engine.core.database import SessionLocal, get_db
from incident_engine.core.models_db import IncidentDB, AlertDB, AuditEventDB
from incident_engine.core.knowledge_base import kb_vectorstore, reset_knowledge_base
from incident_engine.core.agent_runner import _active_agent_state
from incident_engine.core.state import AgentState
from incident_engine.agents.graph import graph
from incident_engine.api.sse_manager import format_sse

router = APIRouter()

class SimulationStartRequest(BaseModel):
    scenarioId: str = "LIVE_ALERTS"
    timeGapSeconds: float = 2.0
    autoRemediate: bool = True

@router.post("/simulation/start")
async def start_simulation(request: SimulationStartRequest, db: Session = Depends(get_db)):
    session_id = f"sim-session-{datetime.now().strftime('%H%M%S')}"
    
    # Fetch pending alerts from DB
    pending_alerts = db.query(AlertDB).filter(AlertDB.status == "RECEIVED").all()
    
    alert_dicts = []
    for al in pending_alerts:
        al.status = "PROCESSING"
        metric_val = None
        if al.metricValue is not None:
            try:
                metric_val = float(al.metricValue)
            except (ValueError, TypeError):
                metric_val = None

        alert_dicts.append({
            "id": al.id,
            "timestamp": al.timestamp,
            "service": al.service,
            "severity": al.severity,
            "title": al.title,
            "message": al.summary,
            "source": al.source,
            "metric_name": al.metricName,
            "metric_value": metric_val
        })
    db.commit()
    
    # Initialize state
    initial_state = {
        "incoming_alerts": alert_dicts,
        "normalized_alerts": [],
        "retrieved_context": [],
        "hypotheses": [],
        "evidence": [],
        "investigation_steps": [],
        "audit_log": [],
        "current_status": "TRIGGERED"
    }
    
    # Pre-seed graph with start state
    config = {"configurable": {"thread_id": session_id}}
    graph.update_state(config, initial_state)
    
    return {
        "status": "RUNNING",
        "sessionId": session_id,
        "currentPhase": "detecting",
        "streamUrl": f"/api/v1/simulation/stream?sessionId={session_id}"
    }

@router.post("/simulation/reset")
async def reset_simulation(db: Session = Depends(get_db)):
    # 1. Clear database tables
    db.query(AlertDB).delete()
    db.query(IncidentDB).delete()
    db.query(AuditEventDB).delete()
    db.commit()

    # 2. Reset vector memory store to baseline runbooks
    reset_knowledge_base()

    # 3. Reset active agent state
    _active_agent_state["status"] = "IDLE"
    _active_agent_state["phase"] = "IDLE"
    _active_agent_state["current_incident_id"] = None
    _active_agent_state["current_incident_title"] = None
    _active_agent_state["last_updated"] = datetime.now(timezone.utc).isoformat()

    # 4. Clear alert engine buffered alerts if reachable
    try:
        requests.post(f"{app_config.ALERT_ENGINE_URL.rstrip('/')}/api/clear", timeout=2)
    except Exception:
        pass

    return {
        "status": "IDLE",
        "message": "All data, alerts, incidents, memory, and audit events cleared successfully"
    }

async def simulation_event_generator(session_id: str):
    config = {"configurable": {"thread_id": session_id}}
    
    yield await format_sse("phase_start", {"phase": "detecting", "timestamp": datetime.now(timezone.utc).isoformat()})
    
    async for event in graph.astream(None, config, stream_mode="updates"):
        db = SessionLocal()
        try:
            for node_name, state_update in event.items():
                phase_map = {
                    "detecting": ["detect_trigger"],
                    "correlating": ["correlate_alerts"],
                    "investigating": ["retrieve_context", "investigate", "execute_investigation_tool"],
                    "deciding": ["decide_root_cause", "decide_remediation"],
                    "remediating": ["human_approval", "execute_remediation"],
                    "verifying": ["verify_remediation", "update_knowledge_base", "close_incident"]
                }
                
                current_phase = "detecting"
                for phase, nodes in phase_map.items():
                    if node_name in nodes:
                        current_phase = phase
                        break
                        
                # Update DB with incident info if available
                inc_id_local = None
                if "incident" in state_update and state_update["incident"]:
                    inc = state_update["incident"]
                    if not isinstance(inc, dict):
                        inc = inc.model_dump()
                    inc_id_local = inc.get("id")
                    
                    db_inc = db.query(IncidentDB).filter(IncidentDB.id == inc_id_local).first()
                    if not db_inc:
                        db_inc = IncidentDB(id=inc_id_local)
                        db.add(db_inc)
                    
                    db_inc.title = inc.get("title")
                    db_inc.status = inc.get("status")
                    db_inc.severity = inc.get("severity")
                    services = inc.get("affected_services", [])
                    db_inc.service = services[0] if services else "unknown"
                    db_inc.openedAt = inc.get("created_at")
                    db_inc.correlatedAlertCount = len(inc.get("correlated_alert_ids", []))
                    db.commit()
                
                if "audit_log" in state_update:
                    for audit in state_update["audit_log"]:
                        if not isinstance(audit, dict):
                            audit = audit.model_dump()
                        db_audit = AuditEventDB(
                            id=f"AUD-{datetime.now().strftime('%H%M%S%f')}",
                            incidentId=audit.get("incident_id", inc_id_local or "PENDING"),
                            eventType="AGENT_ACTION",
                            actor=audit.get("actor"),
                            actorType="AGENT",
                            timestamp=audit.get("timestamp"),
                            status="SUCCESS",
                            details={"node": audit.get("node_name"), "action": audit.get("action"), "result": audit.get("result")}
                        )
                        db.add(db_audit)
                    db.commit()
                
                yield await format_sse("agent_completed", {
                    "phase": current_phase,
                    "agentName": node_name,
                    "status": "DONE"
                })
                
                await asyncio.sleep(0.5)
        finally:
            db.close()
            
    current_state = graph.get_state(config)
    if current_state.next and current_state.next[0] == "human_approval":
        yield await format_sse("phase_paused", {"phase": "remediating", "reason": "AWAITING_APPROVAL"})
    else:
        yield await format_sse("simulation_finished", {"status": "COMPLETED"})

@router.get("/simulation/stream")
async def stream_simulation(sessionId: str):
    if not sessionId:
        return {"error": "sessionId is required"}
    return EventSourceResponse(simulation_event_generator(sessionId))

@router.post("/simulation/phase/{id}/replay")
async def replay_phase(id: str):
    return {
        "replaying": True,
        "phase": id,
        "agentCount": 5
    }
