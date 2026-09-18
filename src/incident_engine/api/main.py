from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from incident_engine.api.routes import health, incidents, simulation, alerts, agents, memory, audit
from incident_engine.core.database import engine, Base
from incident_engine.core.models_db import IncidentDB, AlertDB, AuditEventDB

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Resolvegent Backend API",
    description="Autonomous Enterprise Incident Resolution Engine",
    version="0.1.0",
)

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(incidents.router, prefix="/api/v1", tags=["Incidents"])
app.include_router(simulation.router, prefix="/api/v1", tags=["Simulation"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])
app.include_router(memory.router, prefix="/api/v1", tags=["Memory"])
app.include_router(audit.router, prefix="/api/v1", tags=["Audit"])

def main():
    import uvicorn
    uvicorn.run("incident_engine.api.main:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    main()
