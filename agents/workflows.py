from typing import TypedDict, Optional, List, Dict, Any
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
import logging

logger = logging.getLogger(__name__)

class WorkflowState(TypedDict):
    messages: List[BaseMessage]
    needs_more_info: bool
    followup_question: Optional[str]
    llm: BaseChatModel
    user_id: Optional[str]
    conversation_id: Optional[str]
    context: Dict[str, Any]

# Define prompts
SYMPTOM_ANALYSIS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a healthcare assistant specializing in disease prediction based on symptoms. Follow this structured format:

    **Symptom Analysis**
    - Primary symptoms: [list main symptoms]
    - Duration: [how long symptoms have been present]
    - Severity: [1-10 scale]
    - Location: [where symptoms occur]
    - Triggers/Patterns: [what causes or worsens symptoms]

    **Possible Conditions**
    - Most likely: [primary diagnosis with confidence %]
    - Secondary possibilities: [other potential diagnoses with confidence %]
    - Ruling out: [conditions that don't match the symptoms]

    **Next Steps**
    - Recommended tests: [specific medical tests needed]
    - Specialist referral: [which type of doctor to see]
    - Urgency level: [immediate/urgent/non-urgent]

    **Self-Care Recommendations**
    - Immediate actions: [what to do now]
    - Monitoring: [what to watch for]
    - When to seek help: [specific warning signs]

    Always conclude with: "This is a preliminary assessment. Please consult a healthcare professional for proper diagnosis and treatment."""),
    ("human", "{input}")
])

GENERAL_HEALTH_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Provide health information with:
    - Evidence-based facts
    - Actionable recommendations
    - Professional consultation guidance

    Format clearly with headers and bullet points.
    Include disclaimer: "This is general information, not medical advice."""),
    ("human", "{input}")
])

HEALTH_TRACKING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Help track health metrics and provide insights:
    - Record the provided metrics
    - Compare with previous data
    - Provide trend analysis
    - Suggest improvements

    Format with clear sections and actionable insights."""),
    ("human", "{input}")
])

HEALTH_TIP_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Generate a random health tip or advice. Follow this format:

    **Health Tip**
    - Topic: [specific health topic]
    - Tip: [practical, actionable advice]
    - Why it matters: [brief explanation]
    - Implementation: [how to apply it]

    Keep it concise, practical, and evidence-based."""),
    ("human", "{input}")
])

HEALTH_JOKE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Generate a health-related joke. Follow these guidelines:
    - Keep it light-hearted and appropriate
    - Make it relatable to healthcare or wellness
    - Include a punchline
    - If a topic is provided, make it relevant to that topic

    Format:
    Joke: [the joke]
    Punchline: [the punchline]"""),
    ("human", "{input}")
])

async def analyze_symptoms(state: WorkflowState) -> WorkflowState:
    """Analyze symptoms and predict possible conditions"""
    try:
        messages = state["messages"]
        if not messages:
            return {
                "messages": [AIMessage(content="Could you describe your symptoms?")],
                "needs_more_info": True,
                "followup_question": "Could you describe your symptoms?",
                "llm": state["llm"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
                "context": state.get("context", {})
            }

        last_message = messages[-1].content
        symptom_keywords = ["symptom", "pain", "hurt", "ache", "fever", "nausea", "headache", "joint"]

        # Check if this is a follow-up response
        if len(messages) >= 2 and any(word in messages[-2].content.lower() for word in ["location", "duration", "severity", "symptoms", "triggers"]):
            # This is a follow-up response, analyze with full context
            chain = (
                {"input": lambda x: "\n".join([m.content for m in x["messages"]])}
                | SYMPTOM_ANALYSIS_PROMPT
                | state["llm"]
            )
            response = await chain.ainvoke(state)
            return {
                "messages": messages + [AIMessage(content=response.content)],
                "needs_more_info": False,
                "followup_question": None,
                "llm": state["llm"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
                "context": state.get("context", {})
            }

        if any(word in last_message.lower() for word in symptom_keywords):
            symptom_messages = [m for m in messages
                              if any(w in m.content.lower() for w in symptom_keywords)]

            if len(symptom_messages) < 2:
                return {
                    "messages": messages + [AIMessage(content=(
                        "To better assess your symptoms and predict possible conditions:\n"
                        "1. Where exactly do you feel the symptoms?\n"
                        "2. How long have you been experiencing this?\n"
                        "3. On a scale of 1-10, how severe is it?\n"
                        "4. Are there any triggers or patterns?\n"
                        "5. Any other symptoms you're experiencing?"
                    ))],
                    "needs_more_info": True,
                    "followup_question": (
                        "To better assess your symptoms and predict possible conditions:\n"
                        "1. Where exactly do you feel the symptoms?\n"
                        "2. How long have you been experiencing this?\n"
                        "3. On a scale of 1-10, how severe is it?\n"
                        "4. Are there any triggers or patterns?\n"
                        "5. Any other symptoms you're experiencing?"
                    ),
                    "llm": state["llm"],
                    "user_id": state.get("user_id"),
                    "conversation_id": state.get("conversation_id"),
                    "context": state.get("context", {})
                }

            # Analyze symptoms with full context
            chain = (
                {"input": lambda x: "\n".join([m.content for m in x["messages"]])}
                | SYMPTOM_ANALYSIS_PROMPT
                | state["llm"]
            )
            response = await chain.ainvoke(state)
            return {
                "messages": messages + [AIMessage(content=response.content)],
                "needs_more_info": False,
                "followup_question": None,
                "llm": state["llm"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
                "context": state.get("context", {})
            }
        return await provide_general_info(state)
    except Exception as e:
        logger.error(f"Error in analyze_symptoms: {str(e)}", exc_info=True)
        return {
            "messages": messages + [AIMessage(content="I encountered an error analyzing symptoms. Please try again.")],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }

async def provide_general_info(state: WorkflowState) -> WorkflowState:
    """Provide health information using modern LangChain"""
    try:
        messages = state["messages"]
        if not messages:
            return {
                "messages": [AIMessage(content="What health information are you seeking?")],
                "needs_more_info": False,
                "followup_question": "What health information are you seeking?",
                "llm": state["llm"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
                "context": state.get("context", {})
            }

        # Create a chain that includes the conversation history
        chain = (
            {"input": lambda x: "\n".join([m.content for m in x["messages"]])}
            | GENERAL_HEALTH_PROMPT
            | state["llm"]
        )
        response = await chain.ainvoke(state)

        return {
            "messages": messages + [AIMessage(content=response.content)],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }
    except Exception as e:
        logger.error(f"Error in provide_general_info: {str(e)}", exc_info=True)
        return {
            "messages": messages + [AIMessage(content="I couldn't process that request. Please try again.")],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }

async def request_more_info(state: WorkflowState) -> WorkflowState:
    """Handle follow-up requests with new LangGraph patterns"""
    messages = state["messages"]
    return {
        "messages": messages + [
            AIMessage(content=state.get("followup_question", "Please provide more details"))],
        "needs_more_info": True,
        "followup_question": state.get("followup_question", "Please provide more details"),
        "llm": state["llm"],
        "user_id": state.get("user_id"),
        "conversation_id": state.get("conversation_id"),
        "context": state.get("context", {})
    }

async def generate_response(state: WorkflowState) -> WorkflowState:
    """Generate final response using latest LangChain features"""
    try:
        if state.get("needs_more_info"):
            return await request_more_info(state)

        messages = state["messages"]
        if not messages:
            return await provide_general_info(state)

        # Check for health tracking keywords
        tracking_keywords = ["track", "record", "measure", "monitor", "log"]
        if any(word in messages[-1].content.lower() for word in tracking_keywords):
            chain = (
                {"input": lambda x: "\n".join([m.content for m in x["messages"]])}
                | HEALTH_TRACKING_PROMPT
                | state["llm"]
            )
            response = await chain.ainvoke(state)
            return {
                "messages": messages + [AIMessage(content=response.content)],
                "needs_more_info": False,
                "followup_question": None,
                "llm": state["llm"],
                "user_id": state.get("user_id"),
                "conversation_id": state.get("conversation_id"),
                "context": state.get("context", {})
            }

        # Check for symptom keywords
        if any(word in messages[-1].content.lower()
               for word in ["symptom", "pain", "hurt", "ache"]):
            return await analyze_symptoms(state)

        return await provide_general_info(state)
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}", exc_info=True)
        return {
            "messages": messages + [AIMessage(content="I encountered an error. Please try again.")],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }

async def generate_health_tip(state: WorkflowState) -> WorkflowState:
    """Generate a random health tip"""
    try:
        topic = state.get("context", {}).get("topic", "general health")
        chain = (
            {"input": lambda x: f"Generate a health tip about {topic}"}
            | HEALTH_TIP_PROMPT
            | state["llm"]
        )
        response = await chain.ainvoke(state)
        return {
            "messages": [AIMessage(content=response.content)],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }
    except Exception as e:
        logger.error(f"Error generating health tip: {str(e)}", exc_info=True)
        return {
            "messages": [AIMessage(content="I couldn't generate a health tip right now. Please try again.")],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }

async def generate_health_joke(state: WorkflowState) -> WorkflowState:
    """Generate a health-related joke"""
    try:
        topic = state.get("context", {}).get("topic", "general health")
        chain = (
            {"input": lambda x: f"Generate a health joke about {topic}"}
            | HEALTH_JOKE_PROMPT
            | state["llm"]
        )
        response = await chain.ainvoke(state)
        return {
            "messages": [AIMessage(content=response.content)],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }
    except Exception as e:
        logger.error(f"Error generating health joke: {str(e)}", exc_info=True)
        return {
            "messages": [AIMessage(content="I couldn't think of a joke right now. Please try again.")],
            "needs_more_info": False,
            "followup_question": None,
            "llm": state["llm"],
            "user_id": state.get("user_id"),
            "conversation_id": state.get("conversation_id"),
            "context": state.get("context", {})
        }