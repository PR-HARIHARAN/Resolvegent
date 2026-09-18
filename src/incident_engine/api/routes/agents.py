from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from incident_engine.core.database import get_db
from incident_engine.core.models_db import AuditEventDB

router = APIRouter()

@router.get("/incidents/{id}/agents")
async def get_incident_agents(id: str, db: Session = Depends(get_db)):
    events = db.query(AuditEventDB).filter(AuditEventDB.incidentId == id, AuditEventDB.eventType == "AGENT_ACTION").all()
    
    agents = []
    for event in events:
        details = event.details or {}
        agents.append({
            "name": details.get("node", "Agent"),
            "role": "Investigation",
            "status": "COMPLETED",
            "action": details.get("action", "Unknown action"),
            "detail": details.get("result", "Completed")
        })
    return agents

@router.get("/incidents/{id}/agents/{agent_id}/stream")
async def stream_agent(id: str, agent_id: str):
    return {"message": "Streaming not fully implemented for individual agents."}
