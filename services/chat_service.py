from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from typing import List, Optional
import uuid
from datetime import datetime
from services.firebase_service import FirebaseService


class Conversation:
    def __init__(self, user_id: str, conversation_id: Optional[str] = None):
        self.user_id = user_id
        self.id = conversation_id or str(uuid.uuid4())
        self.messages: List[BaseMessage] = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def add_message(self, message: BaseMessage):
        self.messages.append(message)
        self.updated_at = datetime.now()

    def to_context(self):
        return [{"role": "user" if isinstance(m, HumanMessage) else "assistant",
                 "content": m.content} for m in self.messages]


class ChatService:
    def __init__(self):
        self.firebase = FirebaseService()

    async def get_conversation(self, user_id: str, conversation_id: Optional[str] = None):
        if not conversation_id:
            return Conversation(user_id)

        # Load existing conversation from Firebase
        doc_ref = self.firebase.db.collection("conversations").document(conversation_id)
        doc = await doc_ref.get()

        if doc.exists:
            data = doc.to_dict()
            conv = Conversation(user_id, conversation_id)
            conv.messages = self._deserialize_messages(data.get("messages", []))
            return conv
        return Conversation(user_id)

    async def save_conversation(self, conversation: Conversation):
        data = {
            "user_id": conversation.user_id,
            "messages": self._serialize_messages(conversation.messages),
            "updated_at": conversation.updated_at
        }
        await self.firebase.save_conversation(conversation.id, data)

    def _serialize_messages(self, messages: List[BaseMessage]):
        return [{"type": "human" if isinstance(m, HumanMessage) else "ai",
                 "content": m.content} for m in messages]

    def _deserialize_messages(self, messages_data: List[dict]):
        messages = []
        for data in messages_data:
            if data["type"] == "human":
                messages.append(HumanMessage(content=data["content"]))
            else:
                messages.append(AIMessage(content=data["content"]))
        return messages