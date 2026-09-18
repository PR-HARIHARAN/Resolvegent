from langchain_groq import ChatGroq
from incident_engine.core.config import config

# Initialize LLM
llm = ChatGroq(
    model=config.LLM_MODEL,
    temperature=0.0,
    api_key=config.GROQ_API_KEY
)
