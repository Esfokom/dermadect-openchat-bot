from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
from models.schemas import Message as SchemaMessage, HealthMetric
from services.firebase_service import FirebaseService
import logging

logger = logging.getLogger(__name__)

class Conversation:
    def __init__(self, user_id: str, conversation_id: Optional[str] = None):
        self.user_id = user_id
        self.id = conversation_id or str(uuid.uuid4())
        self.messages: List[BaseMessage] = []
        self.health_metrics: List[HealthMetric] = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def add_message(self, message: BaseMessage):
        self.messages.append(message)
        self.updated_at = datetime.now()

    def add_health_metric(self, metric: HealthMetric):
        self.health_metrics.append(metric)
        self.updated_at = datetime.now()

    def to_context(self) -> List[SchemaMessage]:
        return [SchemaMessage(
            role="user" if isinstance(m, HumanMessage) else "assistant",
            content=m.content,
            timestamp=datetime.now()
        ) for m in self.messages]

    @classmethod
    def from_context(cls, user_id: str, context: List[SchemaMessage], conversation_id: str) -> 'Conversation':
        conv = cls(user_id, conversation_id)
        for msg in context:
            if msg.role == "user":
                conv.add_message(HumanMessage(content=msg.content))
            else:
                conv.add_message(AIMessage(content=msg.content))
        return conv


class ChatService:
    def __init__(self):
        self.firebase = FirebaseService()

    async def get_conversation(self, user_id: str, conversation_id: Optional[str] = None,
                               context: Optional[List[SchemaMessage]] = None) -> Conversation:
        try:
            # Get conversation history
            conversation_history = await self.firebase.get_conversation_history(user_id)
            
            if conversation_id:
                # Find the specific conversation in history
                for conv in conversation_history:
                    if conv.get("id") == conversation_id:
                        return Conversation.from_context(
                            user_id,
                            conv.get("messages", []),
                            conversation_id
                        )
            
            # If no specific conversation found, create new one with context
            if context:
                return Conversation.from_context(user_id, context, conversation_id or str(uuid.uuid4()))
            
            # Create new conversation
            return Conversation(user_id)
        except Exception as e:
            logger.error(f"Error getting conversation: {str(e)}", exc_info=True)
            return Conversation(user_id)

    async def save_conversation(self, conversation: Conversation):
        try:
            # Get conversation history for context
            conversation_history = await self.firebase.get_conversation_history(conversation.user_id)
            
            # Prepare conversation data with context
            data = {
                "user_id": conversation.user_id,
                "messages": [{
                    "role": "user" if isinstance(m, HumanMessage) else "assistant",
                    "content": m.content,
                    "timestamp": datetime.now()
                } for m in conversation.messages],
                "health_metrics": [metric.dict() for metric in conversation.health_metrics],
                "updated_at": conversation.updated_at,
                "context": {
                    "previous_conversations": conversation_history[:5],  # Include last 5 conversations as context
                    "current_topic": self._extract_topic(conversation.messages)
                }
            }
            
            await self.firebase.save_conversation(conversation.user_id, data)
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}", exc_info=True)
            raise

    def _extract_topic(self, messages: List[BaseMessage]) -> str:
        """Extract the main topic from conversation messages"""
        if not messages:
            return ""
        
        # Get the last few messages
        recent_messages = messages[-3:] if len(messages) > 3 else messages
        content = " ".join([m.content for m in recent_messages])
        
        # Simple topic extraction - can be enhanced with NLP
        keywords = ["symptom", "pain", "ache", "fever", "headache", "joint", "exercise"]
        for keyword in keywords:
            if keyword in content.lower():
                return keyword
        return "general"