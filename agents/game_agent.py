from typing import Optional, Dict, List, Any
import logging
from models.schemas import GameSession, GameResponse, Question
from services.game_service import GameService
import asyncio
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
import json

from utils.config import Config 

logger = logging.getLogger(__name__)

class QuestionGenerator:
    def __init__(self, llm: ChatGoogleGenerativeAI):
        self.llm = llm
        
        # Define the question generation prompt
        self.question_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert in human anatomy and health. 
            Generate multiple-choice questions about human body parts and their functions.
            
            Your response MUST be a valid JSON array with the following structure:
            [
                {{
                    "text": "The question text",
                    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
                    "correct_answer": "The correct choice",
                    "category": "body_parts",
                    "difficulty": "easy|medium|hard",
                    "explanation": "A brief explanation of why the answer is correct"
                }},
                // ... more questions ...
            ]
            
            Rules:
            1. Each question must be clear and unambiguous
            2. Choices must be distinct and plausible
            3. The correct answer must be one of the choices
            4. The explanation should be educational
            5. Difficulty should be appropriate for the question
            6. Category should be "body_parts"
            7. Each question should test knowledge of human anatomy
            8. Avoid overly complex medical terminology
            9. Ensure the questions are appropriate for a general audience
            10. Generate 5 different questions about different body parts
            """),
            ("human", "Generate 5 different questions about human body parts and their functions.")
        ])
        
        # Create the chain
        self.chain = (
            {"input": RunnablePassthrough()}
            | self.question_prompt
            | self.llm
        )
        
        # Fallback questions
        self.fallback_questions = [
            Question(
                text="Which organ pumps blood throughout the body?",
                choices=["Heart", "Lungs", "Brain", "Stomach"],
                correct_answer="Heart",
                category="body_parts",
                difficulty="easy",
                explanation="The heart is a muscular organ that pumps blood throughout the body via the circulatory system."
            ),
            Question(
                text="What is the largest organ in the human body?",
                choices=["Liver", "Skin", "Brain", "Heart"],
                correct_answer="Skin",
                category="body_parts",
                difficulty="easy",
                explanation="The skin is the largest organ, covering the entire body and protecting internal organs."
            ),
            Question(
                text="Which part of the brain controls balance and coordination?",
                choices=["Cerebrum", "Cerebellum", "Brainstem", "Hypothalamus"],
                correct_answer="Cerebellum",
                category="body_parts",
                difficulty="medium",
                explanation="The cerebellum is responsible for coordinating voluntary movements, balance, and posture."
            ),
            Question(
                text="Which organ produces insulin to regulate blood sugar?",
                choices=["Liver", "Pancreas", "Kidney", "Spleen"],
                correct_answer="Pancreas",
                category="body_parts",
                difficulty="medium",
                explanation="The pancreas produces insulin, a hormone that helps regulate blood sugar levels."
            ),
            Question(
                text="Which organ is responsible for gas exchange in the body?",
                choices=["Heart", "Lungs", "Liver", "Kidneys"],
                correct_answer="Lungs",
                category="body_parts",
                difficulty="easy",
                explanation="The lungs are responsible for exchanging oxygen and carbon dioxide between the body and the environment."
            )
        ]

    async def generate_questions(self, num_questions: int = 5) -> List[Question]:
        """Generate multiple questions in a single call"""
        try:
            logger.info(f"Generating {num_questions} questions in a single call")
            
            # Generate questions using the chain
            response = await self.chain.ainvoke("")
            logger.debug(f"LLM raw response: {response.content}")
            
            # Clean the response by removing markdown code blocks if present
            content = response.content.strip()
            if content.startswith("```json"):
                content = content[7:]  # Remove ```json
            if content.startswith("```"):
                content = content[3:]  # Remove ```
            if content.endswith("```"):
                content = content[:-3]  # Remove ```
            content = content.strip()
            
            # Parse and validate response
            questions_data = json.loads(content)
            logger.debug(f"Parsed questions data: {questions_data}")
            
            # Validate each question
            questions = []
            for question_data in questions_data:
                # Validate required fields
                required_fields = ["text", "choices", "correct_answer", "category", "difficulty"]
                if not all(field in question_data for field in required_fields):
                    raise ValueError(f"Missing required fields in question. Got: {list(question_data.keys())}")
                
                # Validate choices
                if len(question_data["choices"]) != 4:
                    raise ValueError(f"Expected 4 choices, got {len(question_data['choices'])}")
                
                # Validate correct answer
                if question_data["correct_answer"] not in question_data["choices"]:
                    raise ValueError("Correct answer must be one of the choices")
                
                # Validate difficulty
                if question_data["difficulty"] not in ["easy", "medium", "hard"]:
                    raise ValueError(f"Invalid difficulty: {question_data['difficulty']}")
                
                # Validate category
                if question_data["category"] != "body_parts":
                    raise ValueError(f"Invalid category: {question_data['category']}")
                
                # Create Question object
                question = Question(**question_data)
                questions.append(question)
                logger.info(f"Successfully generated question: {question.text}")
            
            return questions
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {str(e)}")
            logger.debug(f"Raw response: {response.content}")
        except ValueError as e:
            logger.error(f"Invalid question format: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error generating questions: {str(e)}", exc_info=True)
        
        # If generation fails, use fallback questions
        logger.warning("Failed to generate questions, using fallback questions")
        return self.fallback_questions[:num_questions]

class GameAgent:
    def __init__(self):
        self.game_service = GameService()
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            temperature=0.7,
            max_output_tokens=2048,
            google_api_key=Config.GEMINI_API_KEY,
            convert_system_message_to_human=True
        )
        self.question_generator = QuestionGenerator(self.llm)

    async def process_message(self, user_id: str, message: str) -> GameResponse:
        """Process user message and return appropriate response"""
        try:
            # Check for active session
            active_session = await self.game_service.get_active_session(user_id)
            
            if message.lower() == "start game":
                if active_session:
                    # End existing session
                    await self.game_service.end_session(active_session)
                
                # Generate 5 questions about body parts
                questions = await self._generate_questions(5)
                # Create new session
                session = await self.game_service.create_session(user_id, questions)
                # Format first question
                question_text = self.game_service._format_question(questions[0])
                return GameResponse(
                    response=f"Game started! Here's your first question:\n\n{question_text}",
                    session_id=session.session_id,
                    score=session.score,
                    available_commands=self.game_service.available_commands
                )
            
            elif message.lower() == "end game":
                if active_session:
                    return await self.game_service.end_session(active_session)
                return GameResponse(
                    response="No active game session to end.",
                    available_commands=self.game_service.available_commands
                )
            
            elif message.lower() == "show stats":
                return await self.game_service.get_user_stats(user_id)
            
            elif message.lower() == "help":
                return self._get_help_message()
            
            elif active_session:
                # Process answer for active session
                return await self.game_service.process_answer(active_session, message)
            
            else:
                return GameResponse(
                    response="No active game session. Type 'start game' to begin or 'help' for available commands.",
                    available_commands=self.game_service.available_commands
                )
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)
            return GameResponse(
                response="An error occurred. Please try again.",
                available_commands=self.game_service.available_commands
            )

    async def _generate_questions(self, num_questions: int) -> List[Question]:
        """Generate multiple questions with proper error handling"""
        logger.info(f"Starting to generate {num_questions} questions")
        questions = await self.question_generator.generate_questions(num_questions)
        logger.info(f"Successfully generated {len(questions)} questions")
        return questions

    def _get_help_message(self) -> GameResponse:
        """Generate help message with available commands"""
        message = [
            "Welcome to the Body Parts Quiz Game!",
            "\nAvailable commands:",
            "- start game: Begin a new quiz session",
            "- end game: End the current session",
            "- show stats: View your game statistics",
            "- help: Show this help message",
            "\nDuring the game:",
            "- Answer questions about human body parts and their functions",
            "- You can answer with either the choice number or the full answer",
            "- Your score will be tracked",
            "- You can end the game at any time"
        ]
        
        return GameResponse(
            response="\n".join(message),
            available_commands=self.game_service.available_commands
        ) 