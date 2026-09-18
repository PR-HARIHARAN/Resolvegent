import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "qwen-2.5-32b")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
    MAX_INVESTIGATION_STEPS = 4
    HIGH_RISK_ACTIONS = ["rollback_deployment", "restart_database", "modify_security_rules"]
    LOW_RISK_ACTIONS = ["clear_cache", "recycle_connection_pool", "scale_replicas"]

config = Config()
