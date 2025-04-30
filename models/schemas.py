from pydantic import BaseModel
from typing import Optional, List, Dict

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None
    context: Optional[List[Message]] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    requires_followup: bool
    followup_question: Optional[str] = None
    context: List[Message]