from langchain_groq import ChatGroq
from incident_engine.core.config import config

# Initialize LLM (use placeholder if not yet configured so app can initialize)
api_key = config.GROQ_API_KEY or "gsk_placeholder_key"
llm = ChatGroq(
    model=config.LLM_MODEL,
    temperature=0.0,
    api_key=api_key
)
