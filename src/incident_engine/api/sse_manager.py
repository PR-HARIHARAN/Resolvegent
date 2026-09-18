import json
from typing import AsyncGenerator
from sse_starlette.sse import ServerSentEvent

async def format_sse(event: str, data: dict) -> ServerSentEvent:
    """Format data as a ServerSentEvent."""
    return ServerSentEvent(
        event=event,
        data=json.dumps(data)
    )
