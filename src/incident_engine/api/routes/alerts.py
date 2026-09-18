from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from incident_engine.core.database import get_db
from incident_engine.core.models_db import AlertDB

router = APIRouter()

@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertDB).order_by(AlertDB.timestamp.desc()).all()
    return alerts

@router.post("/alerts/ingest")
async def ingest_alerts(payload: List[Dict[str, Any]], db: Session = Depends(get_db)):
    count = 0
    for al in payload:
        alert_db = AlertDB(
            id=al.get("id"),
            title=al.get("title"),
            source=al.get("source"),
            severity=al.get("severity"),
            status="RECEIVED",
            service=al.get("service"),
            metricName=al.get("metricName"),
            metricValue=str(al.get("metricValue")),
            threshold=al.get("threshold"),
            timestamp=al.get("timestamp"),
            summary=al.get("summary", al.get("message", ""))
        )
        db.add(alert_db)
        count += 1
    db.commit()
    
    # Normally this would trigger LangGraph via Celery/BackgroundTasks,
    # but for now we just ingest them.
    return {"status": "success", "count": count}
