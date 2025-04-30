import firebase_admin
from firebase_admin import firestore
from google.cloud.firestore import Client
import os
from datetime import datetime
from models.schemas import UserContext, HealthMetric
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class FirebaseService:
    def __init__(self):
        if not firebase_admin._apps:
            cred = firebase_admin.credentials.Certificate(
                os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
            )
            firebase_admin.initialize_app(cred)
        self.db: Client = firestore.client()

    async def get_user_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user data including health metrics and context"""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting user data: {str(e)}", exc_info=True)
            return None

    async def save_user_data(self, user_id: str, data: Dict[str, Any]) -> bool:
        """Save user data including health metrics and context"""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            data["updated_at"] = datetime.now()
            doc_ref.set(data, merge=True)
            return True
        except Exception as e:
            logger.error(f"Error saving user data: {str(e)}", exc_info=True)
            return False

    async def save_health_metric(self, user_id: str, metric: HealthMetric) -> bool:
        """Save a health metric for a user"""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            doc_ref.update({
                "health_metrics": firestore.ArrayUnion([metric.dict()]),
                "updated_at": datetime.now()
            })
            return True
        except Exception as e:
            logger.error(f"Error saving health metric: {str(e)}", exc_info=True)
            return False

    async def get_health_metrics(self, user_id: str) -> List[HealthMetric]:
        """Get all health metrics for a user"""
        try:
            doc_ref = self.db.collection("users").document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                return [HealthMetric(**metric) for metric in data.get("health_metrics", [])]
            return []
        except Exception as e:
            logger.error(f"Error getting health metrics: {str(e)}", exc_info=True)
            return []

    async def get_conversation_history(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation history for a user"""
        try:
            conversations_ref = self.db.collection("users").document(user_id).collection("conversations")
            query = conversations_ref.order_by("created_at", direction=firestore.Query.DESCENDING).limit(limit)
            docs = query.get()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error getting conversation history: {str(e)}", exc_info=True)
            return []

    async def save_conversation(self, user_id: str, conversation_data: Dict[str, Any]) -> bool:
        """Save conversation data and update user context"""
        try:
            # Get current conversation count
            user_ref = self.db.collection("users").document(user_id)
            user_doc = user_ref.get()
            user_data = user_doc.to_dict() if user_doc.exists else {}
            
            # Save conversation in user's subcollection
            conversations_ref = user_ref.collection("conversations")
            conversation_ref = conversations_ref.document()
            
            # Add conversation data
            conversation_data["id"] = conversation_ref.id
            conversation_data["created_at"] = datetime.now()
            conversation_data["user_id"] = user_id
            conversation_ref.set(conversation_data)

            # Update user context
            user_data.update({
                "last_interaction": conversation_data.get("last_interaction"),
                "needs_followup": conversation_data.get("needs_followup", False),
                "followup_question": conversation_data.get("followup_question"),
                "updated_at": datetime.now()
            })
            user_ref.set(user_data, merge=True)

            # Maintain only last 10 conversations
            conversations = await self.get_conversation_history(user_id, limit=11)  # Get 11 to check if we need to delete
            if len(conversations) > 10:
                # Delete the oldest conversation
                oldest_conv = conversations[-1]
                await conversations_ref.document(oldest_conv["id"]).delete()

            return True
        except Exception as e:
            logger.error(f"Error saving conversation: {str(e)}", exc_info=True)
            return False