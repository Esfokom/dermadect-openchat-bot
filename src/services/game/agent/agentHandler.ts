import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { gameStateManager } from '../state/stateManager';
import { formatQuestion } from '../utils/questionFormatter';

// Initialize the Gemini model
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY
});

// Create prompt template for the agent
const agentPrompt = PromptTemplate.fromTemplate(`
You are a health quiz game agent. Your role is to:
1. Evaluate the user's answer to the current question
2. Provide feedback on their answer
3. Keep track of their score
4. Guide them through the quiz

Current question: {currentQuestion}
User's answer: {userAnswer}
Game state: {gameState}

Provide a response that:
1. Evaluates if the answer is correct
2. Explains why the answer is correct or incorrect
3. Updates the score if needed
4. Provides the next question or concludes the game

Response format:
{format}
`);

// Create the agent chain
const agentChain = RunnableSequence.from([
    agentPrompt,
    model,
    new StringOutputParser()
]);

export const handleAgentMessage = async (userId: string, message: string): Promise<string> => {
    try {
        const state = gameStateManager.getState(userId);
        if (!state?.isActive) {
            return "No active game found. Type 'start' to begin a new game.";
        }

        // Process the answer through the agent
        const response = await agentChain.invoke({
            currentQuestion: formatQuestion(state.currentQuestion),
            userAnswer: message,
            gameState: JSON.stringify(state),
            format: `
            Evaluation: [Correct/Incorrect]
            Explanation: [Why the answer is correct/incorrect]
            Score Update: [New score]
            Next Step: [Next question or game conclusion]
            `
        });

        // Update game state based on agent's response
        // This is a simplified version - you might want to parse the response more carefully
        if (response.toLowerCase().includes("correct")) {
            state.score++;
        }

        state.currentQuestion++;
        state.history.push({
            question: formatQuestion(state.currentQuestion - 1),
            userAnswer: message,
            correctAnswer: "To be determined by agent", // This should be extracted from the agent's response
            isCorrect: response.toLowerCase().includes("correct"),
            timestamp: new Date()
        });

        if (state.currentQuestion >= 10) { // Assuming 10 questions per game
            state.isActive = false;
            return `Game Over! Your final score is ${state.score}/10\n\n${response}`;
        }

        gameStateManager.setState(userId, state);
        return `${response}\n\n${formatQuestion(state.currentQuestion)}`;

    } catch (error) {
        console.error('Error in agent handler:', error);
        return "Sorry, I encountered an error processing your answer. Please try again.";
    }
}; 