"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAgentMessage = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
const stateManager_1 = require("../state/stateManager");
const questionFormatter_1 = require("../utils/questionFormatter");
// Initialize the Gemini model
const model = new google_genai_1.ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY
});
// Create prompt template for the agent
const agentPrompt = prompts_1.PromptTemplate.fromTemplate(`
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
const agentChain = runnables_1.RunnableSequence.from([
    agentPrompt,
    model,
    new output_parsers_1.StringOutputParser()
]);
const handleAgentMessage = (userId, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const state = stateManager_1.gameStateManager.getState(userId);
        if (!(state === null || state === void 0 ? void 0 : state.isActive)) {
            return "No active game found. Type 'start' to begin a new game.";
        }
        // Process the answer through the agent
        const response = yield agentChain.invoke({
            currentQuestion: (0, questionFormatter_1.formatQuestion)(state.currentQuestion),
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
            question: (0, questionFormatter_1.formatQuestion)(state.currentQuestion - 1),
            userAnswer: message,
            correctAnswer: "To be determined by agent", // This should be extracted from the agent's response
            isCorrect: response.toLowerCase().includes("correct"),
            timestamp: new Date()
        });
        if (state.currentQuestion >= 10) { // Assuming 10 questions per game
            state.isActive = false;
            return `Game Over! Your final score is ${state.score}/10\n\n${response}`;
        }
        stateManager_1.gameStateManager.setState(userId, state);
        return `${response}\n\n${(0, questionFormatter_1.formatQuestion)(state.currentQuestion)}`;
    }
    catch (error) {
        console.error('Error in agent handler:', error);
        return "Sorry, I encountered an error processing your answer. Please try again.";
    }
});
exports.handleAgentMessage = handleAgentMessage;
