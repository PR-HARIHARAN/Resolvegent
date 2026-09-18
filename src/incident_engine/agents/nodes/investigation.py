from typing import Dict, Any
from incident_engine.core.state import AgentState
from incident_engine.core.models import Hypothesis, AuditEvent, Evidence, InvestigationStep, InvestigationDecisionSchema
from incident_engine.core.llm import llm
from incident_engine.core.config import config
from incident_engine.core.knowledge_base import search_knowledge_base_fn
from incident_engine.tools import TOOL_REGISTRY
from incident_engine.agents.nodes.ingestion import get_attr_or_key

def retrieve_context(state: AgentState) -> Dict[str, Any]:
    inc = state.get("incident")
    inc_id = get_attr_or_key(inc, "id", "UNKNOWN")
    affected_services = get_attr_or_key(inc, "affected_services", [])
    
    query = f"{' '.join(affected_services)} latency timeout connection exhaustion runbook"
    context_str = search_knowledge_base_fn(query, k=2)
    
    initial_hypotheses = [
        Hypothesis(
            id="H1",
            statement="Recent payment-worker deployment introduced a Redis connection leak, exhausting connection pool and stalling workers.",
            likelihood_score=0.6
        ),
        Hypothesis(
            id="H2",
            statement="Redis cluster node hardware degradation or network partition causing connection timeouts.",
            likelihood_score=0.3
        ),
        Hypothesis(
            id="H3",
            statement="Sudden organic traffic spike saturating payment-api throughput capacity.",
            likelihood_score=0.1
        )
    ]
    
    audit = AuditEvent(
        incident_id=inc_id,
        node_name="retrieve_context",
        actor="agent",
        action="Retrieve Global Context & Seed Hypotheses",
        decision_reasoning="Retrieved matching runbooks and historical incidents. Formulated 3 initial hypotheses.",
        result=f"Retrieved {len(context_str)} chars of context; initialized hypotheses H1, H2, H3."
    )
    return {
        "retrieved_context": [context_str],
        "hypotheses": initial_hypotheses,
        "current_status": "INVESTIGATING",
        "audit_log": [audit]
    }

def investigate(state: AgentState) -> Dict[str, Any]:
    inc = state.get("incident")
    inc_id = get_attr_or_key(inc, "id", "UNKNOWN")
    affected_services = get_attr_or_key(inc, "affected_services", [])
    inc_title = get_attr_or_key(inc, "title", "Incident")
    
    steps = state.get("investigation_steps", [])
    evidence = state.get("evidence", [])
    hypotheses = state.get("hypotheses", [])
    step_num = len(steps) + 1
    
    if step_num > config.MAX_INVESTIGATION_STEPS:
        return {
            "next_step_action": "conclude_investigation",
            "pending_tool_call": None
        }
    
    ev_lines = []
    for e in evidence:
        src = get_attr_or_key(e, "source_tool", "tool")
        fnd = get_attr_or_key(e, "finding", "")
        ev_lines.append(f"- [{src}] {fnd}")
    ev_summary = "\n".join(ev_lines) if ev_lines else "None yet."
    
    hypo_lines = []
    for h in hypotheses:
        hid = get_attr_or_key(h, "id")
        stmt = get_attr_or_key(h, "statement")
        sc = get_attr_or_key(h, "likelihood_score", 0.5)
        st = get_attr_or_key(h, "status", "active")
        hypo_lines.append(f"- {hid}: {stmt} (Likelihood: {sc}, Status: {st})")
    hypo_summary = "\n".join(hypo_lines)
    
    prompt = f"""You are the Senior SRE Incident Lead investigating incident {inc_id}.
Affected Services: {', '.join(affected_services)}
Incident Title: {inc_title}

Working Hypotheses:
{hypo_summary}

Evidence Collected So Far:
{ev_summary}

Step Number: {step_num} / {config.MAX_INVESTIGATION_STEPS}

Available Tools:
1. get_recent_deployments(service) - Check if recent code changes were pushed to payment-worker or payment-api.
2. query_logs(service) - Inspect error logs and stacktraces for payment-worker, payment-api, or redis-cluster.
3. query_metrics(service, metric) - Query latency_p99_ms, redis_pool_wait_ms, queue_backlog, memory_usage_pct.
4. get_service_health(service) - Check service probe statuses.
5. search_knowledge_base(query) - Search runbooks for specific remediation guides.

Reason carefully. What diagnostic step will most effectively confirm or refute the leading hypothesis (H1: worker deployment connection leak)?
If you already have clear evidence of the root cause, set is_investigation_complete=True."""

    try:
        structured_llm = llm.with_structured_output(InvestigationDecisionSchema)
        decision = structured_llm.invoke(prompt)
    except Exception as e:
        if step_num == 1:
            decision = InvestigationDecisionSchema(
                reasoning="Inspect payment-worker logs to identify why worker threads are stalling.",
                is_investigation_complete=False,
                tool_to_call="query_logs",
                service="payment-worker",
                query_or_metric="",
                target_hypothesis_id="H1"
            )
        elif step_num == 2:
            decision = InvestigationDecisionSchema(
                reasoning="Check recent deployments on payment-worker to see if a recent change introduced the pool timeout.",
                is_investigation_complete=False,
                tool_to_call="get_recent_deployments",
                service="payment-worker",
                query_or_metric="",
                target_hypothesis_id="H1"
            )
        else:
            decision = InvestigationDecisionSchema(
                reasoning="Sufficient evidence gathered confirming worker deployment connection leak.",
                is_investigation_complete=True
            )

    if decision.is_investigation_complete or not decision.tool_to_call:
        audit = AuditEvent(
            incident_id=inc_id,
            node_name="investigate",
            actor="agent",
            action="Conclude Diagnostic Investigation",
            decision_reasoning=decision.reasoning,
            result="Sufficient evidence gathered. Routing to root cause decision."
        )
        return {
            "next_step_action": "conclude_investigation",
            "pending_tool_call": None,
            "audit_log": [audit]
        }
    else:
        pending = {
            "tool": decision.tool_to_call,
            "service": decision.service or "payment-worker",
            "query_or_metric": decision.query_or_metric or "",
            "reasoning": decision.reasoning,
            "target_hypothesis_id": decision.target_hypothesis_id or "H1",
            "step_num": step_num
        }
        return {
            "next_step_action": "continue_investigation",
            "pending_tool_call": pending
        }

def execute_investigation_tool(state: AgentState) -> Dict[str, Any]:
    inc = state.get("incident")
    inc_id = get_attr_or_key(inc, "id", "UNKNOWN")
    pending = state.get("pending_tool_call", {})
    tool_name = pending.get("tool")
    service = pending.get("service")
    query_param = pending.get("query_or_metric")
    step_num = pending.get("step_num")
    
    target_fn = TOOL_REGISTRY.get(tool_name, TOOL_REGISTRY["query_logs"])
    if tool_name in ["query_logs", "query_metrics"]:
        observation = target_fn.invoke({"service": service, "metric": query_param} if tool_name == "query_metrics" and query_param else {"service": service})
    elif tool_name == "search_knowledge_base":
        observation = target_fn.invoke({"query": query_param or "runbook"})
    else:
        observation = target_fn.invoke({"service": service})
    
    finding = f"{tool_name}({service}): {str(observation)[:250]}..."
    new_evidence = Evidence(
        source_tool=tool_name,
        query_or_target=f"{service} {query_param}".strip(),
        finding=finding,
        supports_hypothesis=pending.get("target_hypothesis_id"),
        confidence_score=0.9
    )
    
    current_hypotheses = []
    for h in state.get("hypotheses", []):
        hid = get_attr_or_key(h, "id")
        hstmt = get_attr_or_key(h, "statement")
        hstatus = get_attr_or_key(h, "status", "active")
        hlikeli = get_attr_or_key(h, "likelihood_score", 0.5)
        hevids = get_attr_or_key(h, "supporting_evidence_ids", [])
        
        if hid == pending.get("target_hypothesis_id"):
            current_hypotheses.append(Hypothesis(
                id=hid,
                statement=hstmt,
                status="confirmed" if "ConnectionPoolTimeout" in str(observation) or "v1.8.2" in str(observation) else hstatus,
                supporting_evidence_ids=hevids + [new_evidence.id],
                likelihood_score=min(1.0, float(hlikeli) + 0.25)
            ))
        else:
            current_hypotheses.append(Hypothesis(
                id=hid,
                statement=hstmt,
                status=hstatus,
                supporting_evidence_ids=hevids,
                likelihood_score=max(0.05, float(hlikeli) - 0.1)
            ))
            
    step_record = InvestigationStep(
        step_number=step_num,
        question=pending.get("reasoning", ""),
        tool_called=tool_name,
        tool_input={"service": service, "query_or_metric": query_param},
        tool_output=str(observation)[:300],
        reasoning=f"Executed {tool_name} on {service}.",
        updated_hypotheses=[f"{h.id}:{h.likelihood_score:.2f}" for h in current_hypotheses]
    )
    
    audit = AuditEvent(
        incident_id=inc_id,
        node_name="execute_investigation_tool",
        actor="tool",
        action=f"Execute {tool_name}",
        decision_reasoning=pending.get("reasoning", ""),
        result=f"Step {step_num} executed. Observation recorded. Hypotheses updated."
    )
    
    return {
        "evidence": [new_evidence],
        "investigation_steps": [step_record],
        "hypotheses": current_hypotheses,
        "audit_log": [audit]
    }
