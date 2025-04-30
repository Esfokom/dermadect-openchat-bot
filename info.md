# Dermadect Bot Information

## Welcome to Dermadect!

Dermadect is your AI-powered healthcare companion, designed to provide personalized health information, educational content, and interactive experiences. Our bot combines advanced AI technology with medical expertise to offer you a comprehensive healthcare experience right in your chat.

## Core Features

### 1. AI-Powered Healthcare Assistant
The `/prompt` command connects you with our advanced AI healthcare agent, built on cutting-edge technology. This feature is specifically designed for symptom-based health consultations:

#### Symptom Analysis Workflow:
1. **Initial Symptoms**:
   - Start by describing your symptoms using `/prompt`
   - Example: "/prompt I've been experiencing headaches and fatigue for the past 3 days"

2. **Follow-up Questions**:
   - The AI agent will ask relevant follow-up questions
   - It may request additional details about:
     - Duration of symptoms
     - Severity
     - Related symptoms
     - Medical history
     - Lifestyle factors

3. **Condition Assessment**:
   - After gathering sufficient information, the AI will:
     - Provide a potential condition assessment
     - Explain the reasoning behind the assessment
     - Suggest next steps
     - Offer relevant health advice

4. **Further Discussion**:
   - You can ask follow-up questions about:
     - The condition
     - Treatment options
     - Prevention strategies
     - Related health concerns

The AI agent maintains your last 10 conversations in Firestore, allowing it to:
- Reference previous health discussions
- Track symptom progression
- Provide consistent advice
- Maintain context across sessions

When you message the bot directly (without using a command), your messages are automatically routed to the AI healthcare assistant through the `/chat` endpoint. This creates a seamless, natural conversation experience where the AI maintains context and provides relevant, personalized responses.

### 2. Interactive Anatomy Game
The `/game` command launches our educational anatomy game with the following commands:

#### Game Commands:
- `/game help` - Get detailed instructions about the game
- `/game start game` - Begin a new game session
- `/game end game` - End the current game and view your stats

Game Features:
- 5 carefully crafted anatomy questions
- Real-time progress tracking
- Immediate feedback on answers
- Score calculation and statistics
- Separate conversation thread for game interactions

Important: All game-related interactions must start with the `/game` command. This creates a parallel conversation thread specifically for the game, separate from your general chat with the AI assistant.

#### Game Statistics:
At the end of each game session, you'll receive:
- Your final score
- Time taken to complete
- Accuracy percentage
- Question-by-question breakdown
- Historical performance comparison

All game data is securely stored in our Firestore database, allowing you to:
- Track your progress over time
- Compare performance across sessions
- Identify areas for improvement
- Maintain a personal learning history

### 3. Health Tips and Wellness
The `/health_tip` command provides:
- Daily health tips
- Wellness advice
- Preventive care information
- Lifestyle recommendations
- Evidence-based health information

### 4. Health-Related Humor
The `/health_joke` command offers:
- Medical-themed jokes
- Light-hearted healthcare content
- Stress-relieving humor
- Educational entertainment

## How It Works

### AI Assistant Workflow
1. When you send a message directly to the bot or use `/prompt`:
   - Your message is processed by our LangChain-powered AI agent
   - The agent uses LangGraph to manage complex workflows
   - Context is maintained using advanced memory systems
   - Your conversation history (last 10 interactions) is retrieved from Firestore
   - Responses are personalized based on your interaction history
   - All interactions are securely stored in Firestore

2. The AI agent can:
   - Analyze symptoms and ask relevant follow-up questions
   - Provide condition assessments based on symptoms
   - Explain medical concepts in simple terms
   - Suggest appropriate next steps
   - Maintain context across multiple messages
   - Reference previous health discussions

### Game System Workflow
1. Start a game with `/game start game`:
   - A new game session is created in Firestore
   - Questions are generated based on your level
   - Progress is tracked in real-time
   - Scores are updated after each answer

2. During the game:
   - All interactions must use the `/game` command
   - Each answer is validated and scored
   - Progress is saved automatically
   - You can end the game anytime with `/game end game`

3. After completing the game:
   - Your statistics are calculated
   - Performance data is stored in Firestore
   - You receive a detailed performance report
   - Historical data is updated

## Data Management

All your interactions with Dermadect are securely stored in our Firestore database:
- Chat history with the AI assistant (last 10 conversations)
- Game progress and scores
- Health tips viewed
- Interaction patterns
- Performance statistics
- Learning progress
- Symptom history and assessments

This allows us to:
- Provide personalized experiences
- Maintain conversation context
- Track your progress
- Improve our services
- Ensure data security and privacy
- Generate meaningful insights
- Reference previous health discussions

## Best Practices

1. For health consultations:
   - Start with `/prompt` and describe your symptoms
   - Answer follow-up questions thoroughly
   - Ask for clarification if needed
   - Discuss the condition assessment
   - Ask follow-up questions about treatment or prevention

2. For the anatomy game:
   - Use `/game help` to understand the game mechanics
   - Start with `/game start game`
   - Follow the game's instructions
   - Take your time with answers
   - End with `/game end game` to view your stats

3. For quick information:
   - Use `/health_tip` for wellness advice
   - Use `/health_joke` for light-hearted content
   - Use `/info` to see available commands

Remember: Dermadect is designed to complement, not replace, professional medical advice. Always consult healthcare professionals for medical concerns. 