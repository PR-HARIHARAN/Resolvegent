from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_core.documents import Document
from incident_engine.core.knowledge_base import kb_vectorstore

router = APIRouter()

@router.get("/memory/similar")
async def get_similar_memory(query: str, top_k: Optional[int] = 3):
    results = kb_vectorstore.similarity_search(query, k=top_k)
    return [
        {
            "historicalIncidentId": doc.metadata.get("doc_id", "UNKNOWN"),
            "title": doc.page_content.split("\n")[0][:100],
            "similarityScore": 0.95,
            "postmortemSummary": doc.page_content[:200]
        }
        for doc in results
    ]

@router.get("/memory/records")
async def get_memory_records():
    items = []
    if hasattr(kb_vectorstore, "store") and kb_vectorstore.store:
        for k, v in list(kb_vectorstore.store.items()):
            if isinstance(v, dict):
                meta = v.get("metadata", {})
                content = v.get("text", "")
            else:
                meta = getattr(v, "metadata", {})
                content = getattr(v, "page_content", "")
            items.append({
                "id": str(k),
                "historicalIncidentId": meta.get("doc_id", str(k)),
                "category": meta.get("category", "post_mortem"),
                "service": meta.get("service", "ecommerce-service"),
                "content": content[:150] + ("..." if len(content) > 150 else "")
            })
    else:
        results = kb_vectorstore.similarity_search(" ", k=100)
        for doc in results:
            doc_id = doc.metadata.get("doc_id", getattr(doc, "id", "UNKNOWN"))
            items.append({
                "id": str(doc_id),
                "historicalIncidentId": str(doc_id),
                "category": doc.metadata.get("category", "UNKNOWN"),
                "service": doc.metadata.get("service", "UNKNOWN"),
                "content": doc.page_content[:150] + "..."
            })
    return items

@router.delete("/memory/records/{record_id}")
async def delete_memory_record(record_id: str):
    """Delete an individual memory record from the neural vector store by id or incident id."""
    to_delete = []
    if hasattr(kb_vectorstore, "store") and kb_vectorstore.store:
        for k, v in list(kb_vectorstore.store.items()):
            meta = v.get("metadata", {}) if isinstance(v, dict) else getattr(v, "metadata", {})
            if str(k) == str(record_id) or str(meta.get("doc_id")) == str(record_id):
                to_delete.append(k)

    deleted_count = 0
    for k in to_delete:
        if hasattr(kb_vectorstore, "delete"):
            try:
                kb_vectorstore.delete([k])
            except Exception:
                kb_vectorstore.store.pop(k, None)
        else:
            kb_vectorstore.store.pop(k, None)
        deleted_count += 1

    return {
        "status": "success",
        "deleted_count": deleted_count,
        "record_id": record_id
    }

@router.delete("/memory/records")
async def clear_all_memory():
    """Clear all records from the neural vector store."""
    count = 0
    if hasattr(kb_vectorstore, "store") and kb_vectorstore.store:
        count = len(kb_vectorstore.store)
        kb_vectorstore.store.clear()
    return {
        "status": "success",
        "cleared_count": count
    }

class MemoryRecord(BaseModel):
    doc_id: str
    category: str
    service: str
    content: str

@router.post("/memory/records")
async def add_memory_record(record: MemoryRecord):
    doc = Document(
        page_content=record.content,
        metadata={
            "doc_id": record.doc_id,
            "category": record.category,
            "service": record.service
        }
    )
    kb_vectorstore.add_documents([doc])
    return {"status": "success", "doc_id": record.doc_id}
