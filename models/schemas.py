from pydantic import BaseModel
from typing import Optional, List, Dict, Union, Any
from datetime import datetime

class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[datetime] = None

class HealthMetric(BaseModel):
    type: str  # e.g., "blood_pressure", "weight", "temperature"
    value: float
    unit: str
    timestamp: datetime
    notes: Optional[str] = None

class UserContext(BaseModel):
    user_id: str
    health_metrics: List[HealthMetric] = []
    last_interaction: Optional[str] = None
    needs_followup: bool = False
    followup_question: Optional[str] = None
    preferences: Dict[str, str] = {}
    created_at: datetime
    updated_at: datetime

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: Optional[str] = None
    context: Optional[List[Message]] = None
    health_metrics: Optional[List[HealthMetric]] = None

class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    requires_followup: bool
    followup_question: Optional[str] = None
    context: List[Message]
    suggested_actions: Optional[List[str]] = None
    health_metrics: Optional[List[HealthMetric]] = None

class Question(BaseModel):
    text: str
    choices: List[str]
    correct_answer: str
    category: str
    difficulty: str
    explanation: Optional[str] = None

class GameSession(BaseModel):
    session_id: str
    user_id: str
    difficulty: str
    num_questions: int
    current_question_index: int = 0
    score: int = 0
    questions: List[Question] = []
    answers: List[Dict[str, Any]] = []
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str = "active"

class GameStats(BaseModel):
    user_id: str
    total_games: int = 0
    total_score: int = 0
    average_score: float = 0.0
    categories: Dict[str, Dict[str, int]] = {}  # category -> {correct: int, total: int}
    last_played: Optional[datetime] = None

class GameSetupState(BaseModel):
    user_id: str
    num_questions: Optional[int] = None
    difficulty: Optional[str] = None
    topic: Optional[str] = None
    categories: Optional[List[str]] = None
    missing_fields: List[str] = []
    conversation_history: List[Dict[str, str]] = []

class GameRequest(BaseModel):
    user_id: str
    message: str
    setup_params: Optional[Dict[str, Any]] = None
    setup_state: Optional[GameSetupState] = None

class GameSetupParams(BaseModel):
    num_questions: int = 5
    difficulty: str = "medium"
    topic: Optional[str] = None
    categories: Optional[List[str]] = None

class GameResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    score: Optional[int] = None
    available_commands: List[str] = []