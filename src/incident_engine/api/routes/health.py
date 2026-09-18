from datetime import datetime, timezone
from fastapi import APIRouter
from incident_engine.core.config import config

router = APIRouter()

@router.get("/health")
async def health_check():
    """Verifies backend service health."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "groq": {
            "connected": True if config.GROQ_API_KEY else False,
            "llm_model": config.LLM_MODEL,
        },
        "embeddings": {
            "model": config.EMBEDDING_MODEL
        },
        "langgraph": {
            "initialized": True,
            "checkpoint_store": "MemorySaver"
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
