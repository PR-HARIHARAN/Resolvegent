from incident_engine.tools.observability import query_logs, query_metrics, get_service_health
from incident_engine.tools.infrastructure import get_recent_deployments, get_dependencies, search_knowledge_base

TOOL_REGISTRY = {
    "query_logs": query_logs,
    "query_metrics": query_metrics,
    "get_service_health": get_service_health,
    "get_recent_deployments": get_recent_deployments,
    "get_dependencies": get_dependencies,
    "search_knowledge_base": search_knowledge_base
}
