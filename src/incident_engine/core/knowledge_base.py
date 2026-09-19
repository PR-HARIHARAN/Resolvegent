import os
import re
import hashlib
from typing import List
import numpy as np

from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_core.embeddings import Embeddings
from incident_engine.core.config import config


class LightweightEmbeddings(Embeddings):
    """
    Ultra-lightweight deterministic embedding engine.
    Uses subword n-gram feature hashing and term frequency normalization with numpy.
    RAM usage is < 2MB (vs >500MB for PyTorch/Transformers), preventing Render 512MB OOM kills.
    """
    def __init__(self, dim: int = 384):
        self.dim = dim

    def _text_to_vector(self, text: str) -> List[float]:
        vec = np.zeros(self.dim, dtype=np.float32)
        if not text:
            return vec.tolist()

        # Word tokens (lowercased)
        tokens = re.findall(r"\b[a-zA-Z0-9_\-\.]+\b", text.lower())
        for tok in tokens:
            h = int(hashlib.md5(tok.encode("utf-8")).hexdigest(), 16) % self.dim
            vec[h] += 1.5

        # Subword 3-gram and 4-gram hashing for morphology and partial matches
        clean_text = text.lower()
        for n in (3, 4):
            for i in range(len(clean_text) - n + 1):
                sub = clean_text[i:i + n]
                h = int(hashlib.md5(sub.encode("utf-8")).hexdigest(), 16) % self.dim
                vec[h] += 0.25

        # L2 Normalization for accurate cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._text_to_vector(t) for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return self._text_to_vector(text)


def get_embeddings() -> Embeddings:
    provider = getattr(config, "EMBEDDING_PROVIDER", "lightweight")
    if provider in ("huggingface", "hf", "sentence-transformers"):
        try:
            print(f"[KB] Attempting HuggingFaceEmbeddings ({config.EMBEDDING_MODEL})...")
            from langchain_huggingface import HuggingFaceEmbeddings
            return HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
        except Exception as e:
            print(f"[KB] HuggingFaceEmbeddings failed ({e}). Falling back to LightweightEmbeddings.")
            return LightweightEmbeddings()

    print("[KB] Initialized ultra-lightweight memory-optimized vector embeddings (<2MB RAM).")
    return LightweightEmbeddings()


# Baseline operational runbooks & historical post-mortems
INITIAL_KNOWLEDGE_BASE_DOCS = [
    Document(
        page_content=(
            "RUNBOOK: RB-REDIS-01 - Redis Connection Pool Exhaustion & Worker Socket Leaks.\n"
            "Symptoms: Workers timeout waiting for Redis connections from pool (redis_pool_wait_ms > 1000ms), "
            "redis-cluster maxclients reached (10000), worker RSS memory climbs.\n"
            "Common Root Causes:\n"
            "1. Unclosed connection leak in recent worker deployment (e.g. batch job threads missing try/finally pool release).\n"
            "2. Zombie connection accumulation due to missing TCP keepalive.\n"
            "Diagnostic Steps:\n"
            "- Inspect recent deployments for payment-worker in the last 2 hours.\n"
            "- Check worker logs for ConnectionPoolTimeout or socket exhaustion.\n"
            "Remediation Options:\n"
            "- If a recent payment-worker deployment occurred (<2 hours), execute an immediate rollback to the previous stable version.\n"
            "- Policy: Deployment rollbacks are classified as HIGH RISK and require human SRE approval."
        ),
        metadata={"doc_id": "RB-REDIS-01", "category": "runbook", "service": "redis-cluster"}
    ),
    Document(
        page_content=(
            "RUNBOOK: RB-PAY-02 - Payment Worker Pipeline Queue Saturation & 504 Triage.\n"
            "Symptoms: payment-api p99 latency spikes above 2000ms, 504 Gateway Timeouts returned to checkout-frontend, "
            "payment-worker queue backlog accumulates thousands of transactions.\n"
            "Diagnostic Steps:\n"
            "- Check upstream dependencies: payment-worker depends on redis-cluster (for caching & idempotency) and postgres-db.\n"
            "- If worker is stalled, payment-api gRPC calls will time out after 5000ms.\n"
            "Remediation Options:\n"
            "- Triage worker storage and cache connectivity before scaling replicas.\n"
            "- Roll back faulty worker releases or restart worker pool once upstream dependencies are restored."
        ),
        metadata={"doc_id": "RB-PAY-02", "category": "runbook", "service": "payment-worker"}
    ),
    Document(
        page_content=(
            "HISTORICAL POST-MORTEM: INC-2025-089 - Redis Connection Saturation from Batch Worker v1.4.0.\n"
            "Date: 2025-11-14. Severity: P1. Affected Service: payment-worker, redis-cluster.\n"
            "Root Cause: payment-worker v1.4.0 introduced batch cache prefetching without proper connection release in threadpool.\n"
            "Resolution: Rolled back payment-worker from v1.4.0 to v1.3.9. Redis client connections dropped immediately from 10,000 to 1,400. "
            "Time to recovery: 4 minutes. Verified healthy across all telemetry channels."
        ),
        metadata={"doc_id": "INC-2025-089", "category": "historical_incident", "service": "payment-worker"}
    ),
    Document(
        page_content=(
            "ARCHITECTURE: Payment Subsystem Topology and Capacity Limits.\n"
            "Topology: checkout-frontend -> payment-api -> payment-worker -> [redis-cluster, postgres-db].\n"
            "Connection Limits: redis-cluster maxclients is strictly 10,000. Each payment-worker instance maintains a pool of 20 connections. "
            "gRPC timeout from payment-api to payment-worker is 5000ms."
        ),
        metadata={"doc_id": "ARCH-TOPO-01", "category": "architecture", "service": "payment-api"}
    )
]

# Initialize Vector Store
embeddings = get_embeddings()
kb_vectorstore = InMemoryVectorStore(embeddings)


def seed_knowledge_base():
    """Seed baseline runbooks and architecture docs if store is empty."""
    if hasattr(kb_vectorstore, "store") and not kb_vectorstore.store:
        kb_vectorstore.add_documents(INITIAL_KNOWLEDGE_BASE_DOCS)
        print(f"[KB] Seeded {len(INITIAL_KNOWLEDGE_BASE_DOCS)} baseline knowledge base runbooks.")


def reset_knowledge_base():
    """Clear memory store and re-seed baseline runbooks."""
    if hasattr(kb_vectorstore, "store") and kb_vectorstore.store:
        kb_vectorstore.store.clear()
    kb_vectorstore.add_documents(INITIAL_KNOWLEDGE_BASE_DOCS)
    print(f"[KB] Reset vector store and re-seeded {len(INITIAL_KNOWLEDGE_BASE_DOCS)} baseline runbooks.")


# Seed immediately on module load
seed_knowledge_base()


def search_knowledge_base_fn(query: str, k: int = 2) -> str:
    """Search knowledge base using vector similarity."""
    results = kb_vectorstore.similarity_search(query, k=k)
    if not results:
        return "No relevant documentation or runbooks found for query."

    formatted = []
    for i, doc in enumerate(results, 1):
        doc_id = doc.metadata.get("doc_id", "UNKNOWN")
        cat = doc.metadata.get("category", "doc")
        formatted.append(f"[Match {i} | {doc_id} ({cat})]\n{doc.page_content}")
    return "\n\n".join(formatted)
