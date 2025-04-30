from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph
from typing import TypedDict, Optional, List, Dict, Any, Annotated
from models.schemas import ChatRequest, ChatResponse
from services.firebase_service import FirebaseService
from services.chat_service import ChatService
from utils.config import Config
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
import logging
from langgraph.prebuilt import ToolNode
from agents.workflows import (
    analyze_symptoms,
    provide_general_info,
    request_more_info,
    generate_response
)

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    messages: List[BaseMessage]
    needs_more_info: bool
    followup_question: Optional[str]
    llm: ChatGoogleGenerativeAI
    user_id: Optional[str]
    conversation_id: Optional[str]
    context: Dict[str, Any]

class HealthcareAgent:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=Config.GEMINI_API_KEY,
            temperature=0.7,
            max_output_tokens=2048
        )
        self.firebase = FirebaseService()
        self.chat_service = ChatService()
        self.workflow = self._create_workflow()
        self.logger = logging.getLogger(__name__)

    def _create_workflow(self):
        workflow = StateGraph(AgentState)

        # Define nodes
        workflow.add_node("analyze_symptoms", analyze_symptoms)
        workflow.add_node("provide_general_info", provide_general_info)
        workflow.add_node("request_more_info", request_more_info)
        workflow.add_node("generate_response", generate_response)

        # Define edges
        workflow.add_conditional_edges(
            "analyze_symptoms",
            lambda state: "request_more_info" if state.get("needs_more_info") else "generate_response"
        )
        workflow.add_edge("provide_general_info", "generate_response")
        workflow.add_edge("request_more_info", "analyze_symptoms")
        workflow.add_edge("generate_response", END)

        # Set entry point
        workflow.set_entry_point("analyze_symptoms")

        return workflow.compile()

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        try:
            self.logger.info(f"Processing message: {request.message}")
            
            # Get or create conversation with context
            conversation = await self.chat_service.get_conversation(
                request.user_id,
                request.conversation_id,
                request.context
            )
            self.logger.info(f"Retrieved conversation with {len(conversation.messages)} messages")

            # Add new user message
            user_message = HumanMessage(content=request.message)
            conversation.add_message(user_message)
            self.logger.info("Added user message to conversation")

            # Get user context and conversation history from Firebase
            user_context = await self.firebase.get_user_data(request.user_id) or {}
            conversation_history = await self.firebase.get_conversation_history(request.user_id)
            self.logger.info(f"Retrieved user context and {len(conversation_history)} previous conversations")

            # Prepare workflow state with context
            workflow_state = {
                "messages": conversation.messages,
                "user_id": request.user_id,
                "llm": self.llm,
                "needs_more_info": False,
                "followup_question": None,
                "conversation_id": conversation.id,
                "context": {
                    **user_context,
                    "previous_messages": [msg.content for msg in conversation.messages[:-1]],
                    "conversation_history": conversation_history[:5],  # Include last 5 conversations
                    "current_topic": self._extract_topic(conversation.messages)
                }
            }
            self.logger.info("Prepared workflow state with context")

            # Execute workflow
            self.logger.info("Executing workflow...")
            result = await self.workflow.ainvoke(workflow_state)
            self.logger.info(f"Workflow result: {result}")

            # Validate workflow result
            if not result:
                self.logger.error("Workflow returned None")
                raise ValueError("Invalid workflow response")
            if "messages" not in result:
                self.logger.error("Workflow result missing 'messages' field")
                raise ValueError("Invalid workflow response")
            if not result["messages"]:
                self.logger.error("Workflow result has empty messages list")
                raise ValueError("Invalid workflow response")

            # Add AI response to conversation
            ai_message = AIMessage(content=result["messages"][-1].content)
            conversation.add_message(ai_message)
            self.logger.info("Added AI response to conversation")

            # Save conversation and update user context
            await self.chat_service.save_conversation(conversation)
            if result.get("context"):
                await self.firebase.save_conversation(request.user_id, {
                    "last_interaction": ai_message.content,
                    "needs_followup": result.get("needs_more_info", False),
                    "followup_question": result.get("followup_question"),
                    **result.get("context", {})
                })
            self.logger.info("Saved conversation and updated user context")

            return ChatResponse(
                response=ai_message.content,
                conversation_id=conversation.id,
                requires_followup=result.get("needs_more_info", False),
                followup_question=result.get("followup_question"),
                context=conversation.to_context()
            )
        except Exception as e:
            self.logger.error(f"Error processing message: {str(e)}", exc_info=True)
            return ChatResponse(
                response="Sorry, I encountered an error. Please try again.",
                conversation_id=request.conversation_id or "error",
                requires_followup=False,
                followup_question=None,
                context=request.context or []
            )

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