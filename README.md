# Dermadect-OC FastAPI Application

## Overview

Dermadect-OC is a comprehensive healthcare and educational application built with FastAPI. It provides multiple services including a healthcare chatbot, health metrics tracking, and an educational game about human anatomy. The application uses modern AI technologies and follows a microservices architecture pattern.

## Table of Contents

1. [Architecture](#architecture)
2. [Components](#components)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Services](#services)
6. [Agents](#agents)
7. [Game Flow](#game-flow)
8. [Healthcare Flow](#healthcare-flow)
9. [Setup and Installation](#setup-and-installation)
10. [Configuration](#configuration)
11. [Running the Application](#running-the-application)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Contributing](#contributing)
15. [License](#license)

## Architecture

### High-Level Architecture

The application follows a layered architecture with the following components:

1. **API Layer (FastAPI)**

   - Handles HTTP requests and responses
   - Provides API documentation
   - Implements CORS middleware
   - Manages authentication and authorization

2. **Agent Layer**

   - Contains business logic
   - Manages AI interactions
   - Handles game mechanics
   - Processes healthcare queries

3. **Service Layer**

   - Manages data persistence
   - Handles external service integrations
   - Implements business rules
   - Manages game sessions

4. **Data Layer**
   - Defines data models
   - Manages data validation
   - Handles data serialization

### Technology Stack

- **Backend Framework**: FastAPI
- **Database**: Firebase Firestore
- **AI/ML**: Google Gemini API
- **Authentication**: Firebase Authentication
- **API Documentation**: Swagger UI
- **Logging**: Python logging module
- **Testing**: pytest

## Components

### 1. Main Application (`main.py`)

The main application file that:

- Initializes FastAPI application
- Configures middleware
- Sets up logging
- Defines API endpoints
- Manages application lifecycle

### 2. Agents

Located in the `agents/` directory:

#### Game Agent (`game_agent.py`)

- Manages game sessions
- Generates questions using AI
- Processes user answers
- Tracks game statistics
- Handles game commands

#### Healthcare Agent (`healthcare_agent.py`)

- Processes healthcare queries
- Provides health tips
- Manages health metrics
- Generates health jokes
- Handles follow-up questions

#### Workflows (`workflows.py`)

- Contains shared workflows
- Manages state transitions
- Handles complex operations
- Implements business rules

### 3. Services

Located in the `services/` directory:

#### Game Service (`game_service.py`)

- Manages game sessions
- Processes answers
- Updates statistics
- Handles session persistence
- Manages user progress

#### Firebase Service (`firebase_service.py`)

- Handles data persistence
- Manages user data
- Stores health metrics
- Manages game statistics
- Handles authentication

#### Chat Service (`chat_service.py`)

- Manages chat sessions
- Processes messages
- Handles conversation history
- Manages context

### 4. Models

Located in the `models/` directory:

#### Schemas (`schemas.py`)

Defines data models for:

- Chat requests and responses
- Health metrics
- Game sessions
- Game statistics
- User data

## API Endpoints

### Chat Endpoints

- `POST /chat`: Process chat messages
- `GET /health-tip`: Get health tips
- `GET /health-joke`: Get health jokes
- `POST /health-metrics/{user_id}`: Save health metrics
- `GET /health-metrics/{user_id}`: Get health metrics

### Game Endpoints

- `POST /game/{user_id}`: Process game commands
- `GET /game/{user_id}/stats`: Get game statistics

## Data Models

### Chat Models

```python
class ChatRequest:
    user_id: str
    message: str
    context: List[Dict]

class ChatResponse:
    response: str
    conversation_id: str
    requires_followup: bool
    followup_question: Optional[str]
    context: List[Dict]
```

### Game Models

```python
class GameSession:
    session_id: str
    user_id: str
    difficulty: str
    num_questions: int
    current_question_index: int
    score: int
    questions: List[Question]
    answers: List[Dict]
    start_time: datetime
    status: str

class GameResponse:
    response: str
    session_id: Optional[str]
    score: Optional[int]
    available_commands: List[str]

class GameStats:
    total_games: int
    total_score: int
    average_score: float
    categories: Dict[str, Dict[str, int]]
    last_played: Optional[datetime]
```

### Health Models

```python
class HealthMetric:
    type: str
    value: float
    unit: str
    timestamp: Optional[datetime]
    notes: Optional[str]
```

## Services

### Game Service

The game service manages:

- Game session creation and management
- Question generation and validation
- Answer processing and scoring
- Statistics tracking and updates
- Session persistence

### Firebase Service

The Firebase service handles:

- User data management
- Health metrics storage
- Game statistics persistence
- Authentication
- Real-time updates

### Chat Service

The chat service manages:

- Message processing
- Context management
- Conversation history
- Response generation
- Follow-up handling

## Agents

### Game Agent

The game agent:

- Processes game commands
- Generates questions using AI
- Manages game state
- Handles user interactions
- Provides game feedback

### Healthcare Agent

The healthcare agent:

- Processes health queries
- Provides medical information
- Manages health metrics
- Generates health tips
- Handles follow-ups

## Game Flow

1. **Game Start**

   - User sends "start game" command
   - System generates 5 questions
   - Creates new game session
   - Returns first question

2. **Question Processing**

   - User submits answer
   - System validates answer
   - Updates score
   - Returns next question or results

3. **Game End**

   - User sends "end game" command
   - System calculates final score
   - Updates statistics
   - Returns game summary

4. **Statistics**
   - User can view game statistics
   - System shows performance metrics
   - Displays category-wise performance
   - Shows historical data

## Healthcare Flow

1. **Chat Processing**

   - User sends health query
   - System processes query
   - Generates response
   - Manages follow-ups

2. **Health Tips**

   - User requests health tip
   - System generates relevant tip
   - Provides additional context
   - Suggests related topics

3. **Health Metrics**

   - User submits metrics
   - System validates data
   - Stores in database
   - Provides feedback

4. **Health Jokes**
   - User requests health joke
   - System generates joke
   - Ensures appropriateness
   - Provides context

## Setup and Installation

### Prerequisites

- Python 3.8+
- Firebase account
- Google Gemini API key
- Virtual environment

### Installation Steps

1. Clone the repository
2. Create virtual environment
3. Install dependencies
4. Configure environment variables
5. Initialize Firebase
6. Run the application

### Environment Variables

```env
FIREBASE_SERVICE_ACCOUNT_JSON=path/to/service-account.json
GEMINI_API_KEY=your-gemini-api-key
```

## Configuration

### Firebase Configuration

1. Create Firebase project
2. Generate service account key
3. Enable Firestore
4. Set up authentication
5. Configure security rules

### API Configuration

1. Set up CORS
2. Configure rate limiting
3. Set up logging
4. Configure error handling
5. Set up monitoring

## Running the Application

### Development

```bash
uvicorn main:app --reload
```

### Production

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Testing

### Unit Tests

```bash
pytest tests/
```

### Integration Tests

```bash
pytest tests/integration/
```

### API Tests

```bash
pytest tests/api/
```

## Deployment

### Docker

```dockerfile
FROM python:3.8-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dermadect-oc
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: dermadect-oc
          image: dermadect-oc:latest
          ports:
            - containerPort: 8000
```

## Contributing

### Guidelines

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run tests
5. Submit pull request

### Code Style

- Follow PEP 8
- Use type hints
- Write docstrings
- Add comments
- Follow naming conventions

## License

This project is licensed under the MIT License - see the LICENSE file for details.
