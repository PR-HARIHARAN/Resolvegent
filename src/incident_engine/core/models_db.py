from sqlalchemy import Column, String, Float, Boolean, JSON
from incident_engine.core.database import Base

class IncidentDB(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    status = Column(String)
    severity = Column(String)
    service = Column(String)
    environment = Column(String, default="production")
    openedAt = Column(String)
    resolvedAt = Column(String, nullable=True)
    mttrSeconds = Column(Float, nullable=True)
    correlatedAlertCount = Column(Float, default=0)
    rootCause = Column(String, nullable=True)
    rootCauseConfidence = Column(Float, nullable=True)
    businessImpact = Column(JSON, nullable=True)
    decision = Column(JSON, nullable=True)

class AlertDB(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, index=True)
    incidentId = Column(String, index=True, nullable=True)
    title = Column(String)
    source = Column(String)
    severity = Column(String)
    status = Column(String)
    service = Column(String)
    metricName = Column(String, nullable=True)
    metricValue = Column(String, nullable=True)
    threshold = Column(String, nullable=True)
    timestamp = Column(String)
    summary = Column(String)

class AuditEventDB(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    incidentId = Column(String, index=True)
    eventType = Column(String)
    actor = Column(String)
    actorType = Column(String)
    timestamp = Column(String)
    status = Column(String)
    details = Column(JSON, nullable=True)
