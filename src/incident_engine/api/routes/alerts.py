import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Union, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import requests

import asyncio
from incident_engine.core.config import config
from incident_engine.core.database import get_db
from incident_engine.core.models_db import AlertDB
from incident_engine.core.agent_runner import run_autonomous_agent, get_active_agent_state

router = APIRouter()

def normalize_severity(sev: Any) -> str:
    """Normalize alert severity to P1-P4 tier expected by incident state machine."""
    if not sev:
        return "P3"
    s = str(sev).upper().strip()
    mapping = {
        "CRITICAL": "P1",
        "FATAL": "P1",
        "ERROR": "P2",
        "HIGH": "P2",
        "WARNING": "P3",
        "WARN": "P3",
        "MEDIUM": "P3",
        "INFO": "P4",
        "LOW": "P4",
        "P1": "P1",
        "P2": "P2",
        "P3": "P3",
        "P4": "P4",
    }
    return mapping.get(s, "P3")

def normalize_alert_payload(al: Dict[str, Any]) -> AlertDB:
    """Adapt alert payload from external alert engine or standard observability format."""
    alert_id = al.get("id") or al.get("alert_id") or f"ALT-{uuid.uuid4().hex[:8]}"
    
    # Title / Rule
    title = al.get("title")
    if not title and al.get("rule_name"):
        title = al.get("rule_name", "").replace("_", " ").title()
    if not title:
        title = "Operational Alert"
        
    # Service & Source
    service = al.get("service") or "ecommerce-service"
    source = al.get("source") or service or "ecommerce-platform"
    
    # Severity
    severity = normalize_severity(al.get("severity"))
    
    # Timestamp
    ts = al.get("timestamp_iso") or al.get("timestamp")
    if ts is None:
        ts = datetime.now(timezone.utc).isoformat()
    elif isinstance(ts, (int, float)):
        ts = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
    else:
        ts = str(ts)
        
    # Summary / Message
    summary = al.get("summary") or al.get("message", "")
    
    # Incident ID / Correlation ID
    inc_id = al.get("incidentId") or al.get("incident_id") or al.get("correlation_id")
    
    # Details / Metrics: look for numeric metric first
    details = al.get("details", {})
    metric_name = al.get("metricName") or al.get("metric_name")
    metric_value = al.get("metricValue") or al.get("metric_value")
    if not metric_name and isinstance(details, dict) and details:
        for k, v in details.items():
            if isinstance(v, (int, float)):
                metric_name = k
                metric_value = str(v)
                break
        if not metric_name and details:
            metric_name = list(details.keys())[0]
            metric_value = str(details[metric_name])
    elif metric_value is not None:
        metric_value = str(metric_value)
        
    threshold = al.get("threshold")
    if threshold is None and isinstance(details, dict) and "threshold" in details:
        threshold = str(details["threshold"])

    return AlertDB(
        id=str(alert_id),
        incidentId=str(inc_id) if inc_id else None,
        title=str(title),
        source=str(source),
        severity=severity,
        status=al.get("status", "RECEIVED"),
        service=str(service),
        metricName=str(metric_name) if metric_name else None,
        metricValue=str(metric_value) if metric_value is not None else None,
        threshold=str(threshold) if threshold else None,
        timestamp=ts,
        summary=str(summary)
    )

@router.get("/alerts")
async def get_alerts(db: Session = Depends(get_db)):
    alerts = db.query(AlertDB).order_by(AlertDB.timestamp.desc()).all()
    return alerts

@router.post("/alerts/ingest")
async def ingest_alerts(payload: Union[List[Dict[str, Any]], Dict[str, Any]], db: Session = Depends(get_db)):
    """Ingest alerts from alert engine or monitoring stack with automatic schema adaptation."""
    if isinstance(payload, dict):
        alerts_list = [payload]
    elif isinstance(payload, list):
        alerts_list = payload
    else:
        alerts_list = []
        
    count = 0
    for al in alerts_list:
        alert_db = normalize_alert_payload(al)
        
        # Idempotent insert / update
        existing = db.query(AlertDB).filter(AlertDB.id == alert_db.id).first()
        if existing:
            existing.incidentId = alert_db.incidentId
            existing.title = alert_db.title
            existing.severity = alert_db.severity
            existing.service = alert_db.service
            existing.summary = alert_db.summary
            existing.status = alert_db.status
            existing.timestamp = alert_db.timestamp
        else:
            db.add(alert_db)
        count += 1
        
    db.commit()

    # Automatically launch the autonomous incident agent loop in the background!
    detected_inc_id = None
    for al in alerts_list:
        cand = al.get("incidentId") or al.get("incident_id") or al.get("correlation_id")
        if cand:
            detected_inc_id = str(cand)
            break
            
    asyncio.create_task(run_autonomous_agent(auto_remediate=True, preferred_incident_id=detected_inc_id))

    return {
        "status": "success",
        "count": count,
        "auto_agent_started": True,
        "incidentId": detected_inc_id
    }

@router.get("/agent/status")
async def get_agent_status_endpoint():
    """Returns the live autonomous agent loop phase and active incident."""
    return get_active_agent_state()

@router.post("/alerts/pull-from-engine")
async def pull_alerts_from_engine(
    engine_url: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    """Directly fetch and ingest latest alerts from the E-Commerce Alert Engine."""
    target_url = engine_url or f"{config.ALERT_ENGINE_URL.rstrip('/')}/api/alerts?limit=50&order=desc"
    try:
        resp = requests.get(target_url, timeout=5)
        if resp.status_code != 200:
            return {"status": "error", "message": f"Alert engine returned status {resp.status_code}"}
        
        data = resp.json()
        alerts_data = data.get("alerts", [])
        if not alerts_data and isinstance(data, list):
            alerts_data = data
            
        ingest_result = await ingest_alerts(alerts_data, db)
        return {
            "status": "success",
            "imported_count": ingest_result.get("count", 0),
            "source_engine": engine_url
        }
    except Exception as e:
        return {"status": "error", "message": f"Failed to connect to alert engine: {str(e)}"}

@router.post("/alerts/clear")
async def clear_alerts(db: Session = Depends(get_db)):
    """Clear all alerts from the database."""
    deleted = db.query(AlertDB).delete()
    db.commit()
    return {"status": "success", "cleared_count": deleted}

