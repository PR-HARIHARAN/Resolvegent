from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from incident_engine.core.config import config

print(f"[KB] Initializing InMemoryVectorStore with {config.EMBEDDING_MODEL}...")
embeddings = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
kb_vectorstore = InMemoryVectorStore(embeddings)

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
