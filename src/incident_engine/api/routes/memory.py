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
    # In-memory store does not have an easy 'get all', so we search a generic term and get top 100
    results = kb_vectorstore.similarity_search(" ", k=100)
    return [
        {
            "historicalIncidentId": doc.metadata.get("doc_id", "UNKNOWN"),
            "category": doc.metadata.get("category", "UNKNOWN"),
            "service": doc.metadata.get("service", "UNKNOWN"),
            "content": doc.page_content[:150] + "..."
        }
        for doc in results
    ]

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
