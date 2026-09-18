import json
from langchain_core.tools import tool
from incident_engine.core.knowledge_base import search_knowledge_base_fn

@tool
def get_recent_deployments(service: str) -> str:
    """Retrieve recent deployments, versions, commit messages, and deployment timestamps for a service."""
    # TODO: Connect to real deployment tracker (e.g. Jenkins, GitHub Actions, ArgoCD)
    return json.dumps({"service": service, "active_version": "unknown", "deployment_history": []}, indent=2)

@tool
def get_dependencies(service: str) -> str:
    """Retrieve upstream and downstream architectural dependencies for a service."""
    # TODO: Connect to real service mesh or CMDB
    return json.dumps({"service": service, "downstream_dependencies": []}, indent=2)

@tool
def search_knowledge_base(query: str) -> str:
    """Perform semantic search in the enterprise knowledge base for runbooks, historical incidents, and architecture docs."""
    return search_knowledge_base_fn(query)

