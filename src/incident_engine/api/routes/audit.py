from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from incident_engine.core.database import get_db
from incident_engine.core.models_db import AuditEventDB

router = APIRouter()

@router.get("/audit/events")
async def get_audit_events(db: Session = Depends(get_db)):
    events = db.query(AuditEventDB).order_by(AuditEventDB.timestamp.desc()).all()
    return events
