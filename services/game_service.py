from typing import Optional, Dict, List, Any
from datetime import datetime
import uuid
import logging
from models.schemas import GameSession, GameResponse, GameStats, Question
from services.firebase_service import FirebaseService

logger = logging.getLogger(__name__)

class GameService:
    def __init__(self):
        self.firebase = FirebaseService()
        self.available_commands = ["start game", "end game", "show stats", "help"]
        self.game_collection = "game_sessions"

    async def get_active_session(self, user_id: str) -> Optional[GameSession]:
        """Get user's active game session"""
        try:
            docs = self.firebase.db.collection(self.game_collection).where(
                "user_id", "==", user_id
            ).where(
                "status", "==", "active"
            ).limit(1).get() 
            
            if not docs:
                return None
                
            return GameSession(**docs[0].to_dict())
        except Exception as e:
            logger.error(f"Error getting active session: {str(e)}", exc_info=True)
            return None

    async def create_session(self, user_id: str, questions: List[Question]) -> GameSession:
        """Create a new game session with pre-generated questions"""
        try:
            session_id = str(uuid.uuid4())
            session = GameSession(
                session_id=session_id,
                user_id=user_id,
                difficulty="medium",  # Default difficulty
                num_questions=len(questions),
                current_question_index=0,
                score=0,
                questions=questions,
                answers=[],
                start_time=datetime.now(),
                status="active"
            )
            
            # Save to game_sessions collection
            self.firebase.db.collection(self.game_collection).document(session_id).set(session.dict())
            return session
        except Exception as e:
            logger.error(f"Error creating session: {str(e)}", exc_info=True)
            raise

    async def process_answer(self, session: GameSession, answer: str) -> GameResponse:
        """Process user's answer and return next question or results"""
        try:
            # Validate session state
            if session.status != "active":
                return GameResponse(
                    response="This game session has ended. Start a new game to continue playing.",
                    available_commands=self.available_commands
                )
            
            if session.current_question_index >= session.num_questions:
                return GameResponse(
                    response="All questions have been answered. The game is over.",
                    available_commands=self.available_commands
                )
            
            current_question = session.questions[session.current_question_index]
            is_correct = self._check_answer(current_question, answer)
            
            # Record answer
            answer_data = {
                "question": current_question.dict(),
                "user_answer": answer,
                "correct": is_correct,
                "timestamp": datetime.now()
            }
            session.answers.append(answer_data)
            
            if is_correct:
                session.score += 1
                feedback = "Correct! "
            else:
                feedback = f"Incorrect. The correct answer was: {current_question.correct_answer}. "
                if current_question.explanation:
                    feedback += f"\nExplanation: {current_question.explanation}\n"
            
            # Check if game is over
            if session.current_question_index >= session.num_questions - 1:
                return await self.end_session(session)
            
            # Move to next question
            session.current_question_index += 1
            next_question = session.questions[session.current_question_index]
            
            # Save updated session
            await self._save_session(session)
            
            # Format next question with progress indicator
            progress = f"Question {session.current_question_index + 1} of {session.num_questions}"
            score_info = f"Current Score: {session.score}/{session.current_question_index}"
            question_text = self._format_question(next_question)
            
            response = f"{feedback}\n\n{progress}\n{score_info}\n\n{question_text}"
            
            return GameResponse(
                response=response,
                session_id=session.session_id,
                score=session.score,
                available_commands=self.available_commands
            )
            
        except Exception as e:
            logger.error(f"Error processing answer: {str(e)}", exc_info=True)
            return GameResponse(
                response="An error occurred while processing your answer. Please try again or start a new game.",
                available_commands=self.available_commands
            )

    def _check_answer(self, question: Question, answer: str) -> bool:
        """Check if the answer is correct"""
        try:
            answer = answer.strip().lower()
            correct_answer = question.correct_answer.lower()
            
            # Try to parse as choice number
            try:
                choice_index = int(answer) - 1
                if 0 <= choice_index < len(question.choices):
                    return question.choices[choice_index].lower() == correct_answer
            except ValueError:
                pass
            
            # Direct string match
            if answer == correct_answer:
                return True
                
            # Check if answer is contained in correct answer or vice versa
            if answer in correct_answer or correct_answer in answer:
                return True
                
            # Check for close matches (e.g., "heart" vs "the heart")
            answer_words = set(answer.split())
            correct_words = set(correct_answer.split())
            common_words = answer_words.intersection(correct_words)
            
            # If most words match (allowing for articles and minor differences)
            if len(common_words) >= min(len(answer_words), len(correct_words)) - 1:
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error checking answer: {str(e)}", exc_info=True)
            return False

    def _format_question(self, question: Question) -> str:
        """Format question with choices in a clear and readable way"""
        # Format the question text
        formatted_text = f"📝 {question.text}\n"
        
        # Add difficulty indicator
        difficulty_icons = {
            "easy": "⭐",
            "medium": "⭐⭐",
            "hard": "⭐⭐⭐"
        }
        formatted_text += f"{difficulty_icons.get(question.difficulty.lower(), '⭐')} Difficulty: {question.difficulty.capitalize()}\n\n"
        
        # Format choices with emojis
        choice_icons = ["🅰️", "🅱️", "©️", "🅳️"]
        formatted_choices = []
        for i, (icon, choice) in enumerate(zip(choice_icons, question.choices)):
            formatted_choices.append(f"{icon} {i+1}. {choice}")
            
        formatted_text += "\n".join(formatted_choices)
        
        return formatted_text

    async def _save_session(self, session: GameSession):
        """Save session state to Firestore"""
        try:
            self.firebase.db.collection(self.game_collection).document(session.session_id).update(session.dict())
        except Exception as e:
            logger.error(f"Error saving session: {str(e)}", exc_info=True)
            raise

    async def end_session(self, session: GameSession) -> GameResponse:
        """End the current game session"""
        try:
            session.status = "completed"
            session.end_time = datetime.now()
            
            # Update in game_sessions collection
            self.firebase.db.collection(self.game_collection).document(session.session_id).update(session.dict())
            
            # Update user stats
            await self._update_user_stats(session)
            
            # Generate results message
            results_message = self._generate_results_message(session)
            
            return GameResponse(
                response=results_message,
                session_id=session.session_id,
                score=session.score,
                available_commands=self.available_commands
            )
        except Exception as e:
            logger.error(f"Error ending session: {str(e)}", exc_info=True)
            raise

    def _generate_results_message(self, session: GameSession) -> str:
        """Generate a detailed message with game results and performance analysis"""
        try:
            # Calculate performance metrics
            total_questions = session.num_questions
            correct_answers = session.score
            percentage = (correct_answers / total_questions) * 100
            
            # Generate performance grade and message
            if percentage >= 90:
                grade = "🏆 Outstanding!"
                message = "Excellent work! You have a strong understanding of human anatomy."
            elif percentage >= 75:
                grade = "🌟 Very Good!"
                message = "Great job! You have good knowledge of human anatomy."
            elif percentage >= 60:
                grade = "👍 Good"
                message = "Good effort! Keep learning to improve your knowledge."
            else:
                grade = "📚 Keep Learning"
                message = "Don't worry! Practice makes perfect. Keep studying and try again."
            
            # Format the results message
            results = [
                "🎯 Game Results",
                f"\n{grade}",
                f"Score: {correct_answers}/{total_questions} ({percentage:.1f}%)",
                f"Message: {message}\n",
                "📊 Question Review:"
            ]
            
            # Add review of all questions
            for i, answer in enumerate(session.answers, 1):
                question = answer["question"]
                is_correct = answer["correct"]
                icon = "✅" if is_correct else "❌"
                
                results.append(f"\n{icon} Question {i}: {question['text']}")
                results.append(f"   Your answer: {answer['user_answer']}")
                if not is_correct:
                    results.append(f"   Correct answer: {question['correct_answer']}")
                    if question.get('explanation'):
                        results.append(f"   Explanation: {question['explanation']}")
            
            # Add encouragement message
            results.append("\n🎮 Type 'start game' to play again and improve your score!")
            
            return "\n".join(results)
            
        except Exception as e:
            logger.error(f"Error generating results message: {str(e)}", exc_info=True)
            return "Game completed! Check your stats for detailed results."

    async def _update_user_stats(self, session: GameSession):
        """Update user's game statistics"""
        try:
            # Get current stats
            stats_doc = self.firebase.db.collection("users").document(session.user_id).collection("game_stats").document("stats").get()
            stats = GameStats(user_id=session.user_id) if not stats_doc.exists else GameStats(**stats_doc.to_dict())
            
            # Update stats
            stats.total_games += 1
            stats.total_score += session.score
            stats.average_score = stats.total_score / stats.total_games
            stats.last_played = datetime.now()
            
            # Update category stats
            for answer in session.answers:
                category = answer["question"]["category"]
                if category not in stats.categories:
                    stats.categories[category] = {"correct": 0, "total": 0}
                stats.categories[category]["total"] += 1
                if answer["correct"]:
                    stats.categories[category]["correct"] += 1
            
            # Save updated stats
            self.firebase.db.collection("users").document(session.user_id).collection("game_stats").document("stats").set(stats.dict())
        except Exception as e:
            logger.error(f"Error updating user stats: {str(e)}", exc_info=True)
            raise

    async def get_user_stats(self, user_id: str) -> GameResponse:
        """Get user's game statistics"""
        try:
            stats_doc = self.firebase.db.collection("users").document(user_id).collection("game_stats").document("stats").get()
            
            if not stats_doc.exists:
                return GameResponse(
                    response="No game statistics found. Play a game to get started!",
                    available_commands=self.available_commands
                )
            
            stats = GameStats(**stats_doc.to_dict())
            
            message = [
                "Your Game Statistics:",
                f"Total Games Played: {stats.total_games}",
                f"Total Score: {stats.total_score}",
                f"Average Score: {stats.average_score:.1f}",
                "\nCategory Performance:"
            ]
            
            for category, scores in stats.categories.items():
                percentage = (scores["correct"] / scores["total"]) * 100
                message.append(f"{category}: {scores['correct']}/{scores['total']} ({percentage:.1f}%)")
            
            if stats.last_played:
                message.append(f"\nLast Played: {stats.last_played.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return GameResponse(
                response="\n".join(message),
                available_commands=self.available_commands
            )
        except Exception as e:
            logger.error(f"Error getting user stats: {str(e)}", exc_info=True)
            return GameResponse(
                response="Error retrieving statistics. Please try again.",
                available_commands=self.available_commands
            ) 