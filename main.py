from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ChatRequest, ChatResponse, HealthMetric, GameRequest, GameResponse, GameStats
from agents.healthcare_agent import HealthcareAgent
from agents.workflows import generate_health_tip, generate_health_joke
from agents.game_agent import GameAgent
import logging
from typing import List, Optional
from datetime import datetime

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Healthcare Agent API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize agents
agent = HealthcareAgent()
game_agent = GameAgent()

@app.get("/")
async def greet():
    return "Welcome to Dermadect API"

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        logger.info(f"Received chat request from user {request.user_id}")
        return await agent.process_message(request)
    except Exception as e:
        logger.error(f"API Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health-tip", response_model=ChatResponse)
async def get_health_tip(
    topic: Optional[str] = Query(None, description="Optional topic for the health tip")
):
    try:
        logger.info(f"Generating health tip for topic: {topic or 'general'}")
        state = {
            "messages": [],
            "needs_more_info": False,
            "followup_question": None,
            "llm": agent.llm,
            "context": {"topic": topic} if topic else {}
        }
        result = await generate_health_tip(state)
        return ChatResponse(
            response=result["messages"][0].content,
            conversation_id=str(datetime.now().timestamp()),
            requires_followup=False,
            followup_question=None,
            context=[]
        )
    except Exception as e:
        logger.error(f"Error generating health tip: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate health tip")

@app.get("/health-joke", response_model=ChatResponse)
async def get_health_joke(
    topic: Optional[str] = Query(None, description="Optional topic for the health joke")
):
    try:
        logger.info(f"Generating health joke for topic: {topic or 'general'}")
        state = {
            "messages": [],
            "needs_more_info": False,
            "followup_question": None,
            "llm": agent.llm,
            "context": {"topic": topic} if topic else {}
        }
        result = await generate_health_joke(state)
        return ChatResponse(
            response=result["messages"][0].content,
            conversation_id=str(datetime.now().timestamp()),
            requires_followup=False,
            followup_question=None,
            context=[]
        )
    except Exception as e:
        logger.error(f"Error generating health joke: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate health joke")

@app.post("/health-metrics/{user_id}", response_model=bool)
async def save_health_metrics(user_id: str, metrics: List[HealthMetric]):
    try:
        logger.info(f"Saving health metrics for user {user_id}")
        for metric in metrics:
            if not metric.timestamp:
                metric.timestamp = datetime.now()
            await agent.firebase.save_health_metric(user_id, metric)
        return True
    except Exception as e:
        logger.error(f"Error saving health metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save health metrics")

@app.get("/health-metrics/{user_id}", response_model=List[HealthMetric])
async def get_health_metrics(user_id: str):
    try:
        logger.info(f"Retrieving health metrics for user {user_id}")
        metrics = await agent.firebase.get_health_metrics(user_id)
        return metrics
    except Exception as e:
        logger.error(f"Error retrieving health metrics: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve health metrics")
 
@app.post("/game/{user_id}", response_model=GameResponse) 
async def game_endpoint(user_id: str, request: GameRequest):
    """
    Handle game interactions. Available commands:
    - start game: Begin a new quiz session
    - end game: End current session
    - show stats: View game statistics
    - help: Show available commands
    - [answer]: Submit answer for current question
    """
    try:
        logger.info(f"Received game request from user {user_id}")
        return await game_agent.process_message(user_id, request.message)
    except Exception as e:
        logger.error(f"Game API Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/game/{user_id}/stats", response_model=GameStats)
async def get_game_stats(user_id: str):
    """Get user's game statistics"""
    try:
        logger.info(f"Retrieving game stats for user {user_id}")
        return await game_agent.game_service.get_user_stats(user_id)
    except Exception as e:
        logger.error(f"Error retrieving game stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to retrieve game statistics")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)