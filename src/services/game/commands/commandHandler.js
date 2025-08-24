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
exports.handleGameInput = exports.handleGameCommand = void 0;
const gameService_1 = require("../firestore/gameService");
const uuid_1 = require("uuid");
const prompts_1 = require("@langchain/core/prompts");
const output_parsers_1 = require("@langchain/core/output_parsers");
const google_genai_1 = require("@langchain/google-genai");
const firestoreService = new gameService_1.GameFirestoreService();
// Global agent state
// let agentState: AgentState = {
//     stage: 'idle',
//     currentQuestion: ''
// };
const handleGameCommand = (userId, command) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('handleGameCommand', userId, command);
    if (command === 'start') {
        return yield handleStartCommand(userId);
    }
    return "Invalid command. Available commands: start, end";
});
exports.handleGameCommand = handleGameCommand;
const handleGameInput = (userId, input) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('handleGameInput', userId, input);
    // Get current user state from Firestore
    const user = yield firestoreService.getOrCreateUser(userId);
    const currentState = user.gameState || 'idle';
    const currentQuestion = user.currentQuestion || '';
    switch (currentState) {
        case 'idle':
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "No active game session found. Type /game start to begin a new game."
            });
            return "No active game session found. Type /game start to begin a new game.";
        case 'awaiting_yes_no':
            const yesNoResponse = yield handleYesNoResponse(userId, input);
            yield firestoreService.updateUserGameState(userId, {
                currentQuestion: yesNoResponse
            });
            return yesNoResponse;
        case 'collecting_settings':
            const settingsResponse = yield handleSettingsInput(userId, input);
            yield firestoreService.updateUserGameState(userId, {
                currentQuestion: settingsResponse
            });
            return settingsResponse;
        case 'in_progress':
            const progressResponse = yield handleGameProgress(userId, input);
            yield firestoreService.updateUserGameState(userId, {
                currentQuestion: progressResponse
            });
            return progressResponse;
        default:
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Invalid game state. Please start a new game."
            });
            return "Invalid game state. Please start a new game.";
    }
});
exports.handleGameInput = handleGameInput;
function handleStartCommand(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get or create user with default values
        const user = yield firestoreService.getOrCreateUser(userId);
        // Check and set default values if null
        const updates = {};
        if (!user.defaultDifficulty)
            updates.defaultDifficulty = 'medium';
        if (!user.defaultNumQuestions)
            updates.defaultNumQuestions = 5;
        if (!user.defaultTopic)
            updates.defaultTopic = 'general health';
        if (Object.keys(updates).length > 0) {
            yield firestoreService.updateUser(userId, updates);
        }
        // Handle state transitions based on current agent state
        const currentState = user.gameState || 'idle';
        const currentQuestion = user.currentQuestion || '';
        const getSettingsMessage = () => `Let's set up your new game! Please provide your settings in this format:
topic, difficulty, number of questions

For example:
- "general health, medium, 5"
- "dermatology, easy, 3"
- "skin care, hard, 10"

Valid difficulties: easy, medium, hard
Number of questions must be a positive number.

Or type 'default' to use your current settings:
- Topic: ${user.defaultTopic}
- Difficulty: ${user.defaultDifficulty}
- Questions: ${user.defaultNumQuestions}`;
        switch (currentState) {
            case 'idle':
                const idleMessage = getSettingsMessage();
                yield firestoreService.updateUserGameState(userId, {
                    gameState: 'collecting_settings',
                    currentQuestion: idleMessage
                });
                return idleMessage;
            case 'collecting_settings':
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: currentQuestion
                });
                return currentQuestion;
            case 'awaiting_yes_no':
                if (user.currentGameSessionId) {
                    const currentSession = yield firestoreService.getGameSession(user.currentGameSessionId);
                    if (currentSession && !currentSession.completed) {
                        const yesNoMessage = 'You have an active game session. Do you want to continue with your current game? Please respond with exactly "yes" or "no" (or "y"/"n").';
                        yield firestoreService.updateUserGameState(userId, {
                            gameState: 'awaiting_yes_no',
                            currentQuestion: yesNoMessage
                        });
                        return yesNoMessage;
                    }
                }
                // If no active session, proceed to settings collection
                const newSettingsMessage = getSettingsMessage();
                yield firestoreService.updateUserGameState(userId, {
                    gameState: 'collecting_settings',
                    currentQuestion: newSettingsMessage
                });
                return newSettingsMessage;
            case 'in_progress':
                if (user.currentGameSessionId) {
                    const currentSession = yield firestoreService.getGameSession(user.currentGameSessionId);
                    if (currentSession && !currentSession.completed) {
                        const yesNoMessage = 'You have an active game session. Do you want to continue with your current game? Please respond with exactly "yes" or "no" (or "y"/"n").';
                        yield firestoreService.updateUserGameState(userId, {
                            gameState: 'awaiting_yes_no',
                            currentQuestion: yesNoMessage
                        });
                        return yesNoMessage;
                    }
                }
                const progressSettingsMessage = getSettingsMessage();
                yield firestoreService.updateUserGameState(userId, {
                    gameState: 'collecting_settings',
                    currentQuestion: progressSettingsMessage
                });
                return progressSettingsMessage;
            default:
                const defaultMessage = getSettingsMessage();
                yield firestoreService.updateUserGameState(userId, {
                    gameState: 'collecting_settings',
                    currentQuestion: defaultMessage
                });
                return defaultMessage;
        }
    });
}
function handleYesNoResponse(userId, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield firestoreService.getOrCreateUser(userId);
        if (!user.currentGameSessionId) {
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Session error. Please start a new game."
            });
            return "Session error. Please start a new game.";
        }
        if (!input) {
            return user.currentQuestion || "Please respond with 'yes' or 'no'.";
        }
        if (/^(y|yes)$/i.test(input.trim())) {
            // Continue with existing game
            const session = yield firestoreService.getGameSession(user.currentGameSessionId);
            if (!session) {
                yield firestoreService.updateUserGameState(userId, {
                    gameState: 'idle',
                    currentQuestion: "Session error. Please start a new game."
                });
                return "Session error. Please start a new game.";
            }
            // Update user state to in_progress
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'in_progress',
                currentQuestion: yield getResumeMessage(session)
            });
            return yield getResumeMessage(session);
        }
        else if (/^(n|no)$/i.test(input.trim())) {
            // Abandon current game and start collecting settings
            yield firestoreService.updateUser(userId, {
                currentGameSessionId: null
            });
            const settingsMessage = `Please provide your settings in this format:
topic, difficulty, number of questions

For example:
- "general health, medium, 5"
- "dermatology, easy, 3"
- "skin care, hard, 10"

Valid difficulties: easy, medium, hard
Number of questions must be a positive number.

Or type 'default' to use your current settings:
- Topic: ${user.defaultTopic}
- Difficulty: ${user.defaultDifficulty}
- Questions: ${user.defaultNumQuestions}`;
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: settingsMessage
            });
            return settingsMessage;
        }
        else {
            return user.currentQuestion || "Please respond with exactly 'yes' or 'no' (or 'y'/'n').";
        }
    });
}
function handleSettingsInput(userId, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield firestoreService.getOrCreateUser(userId);
        if (!input) {
            const settingsMessage = `Please provide your settings in this format:
topic, difficulty, number of questions

For example:
- "general health, medium, 5"
- "dermatology, easy, 3"
- "skin care, hard, 10"

Valid difficulties: easy, medium, hard
Number of questions must be a positive number.

Or type 'default' to use your current settings:
- Topic: ${user.defaultTopic}
- Difficulty: ${user.defaultDifficulty}
- Questions: ${user.defaultNumQuestions}`;
            yield firestoreService.updateUserGameState(userId, {
                currentQuestion: settingsMessage
            });
            return settingsMessage;
        }
        if (input.trim().toLowerCase() === 'default') {
            // Use all default values
            const newSessionId = (0, uuid_1.v4)();
            const newSession = {
                sessionId: newSessionId,
                userId,
                questions: [],
                userAnswers: [],
                currentQuestion: 0,
                difficulty: user.defaultDifficulty || 'medium',
                topic: user.defaultTopic || 'general health',
                numQuestions: user.defaultNumQuestions || 5,
                completed: false,
                stage: 'in_progress'
            };
            const message = yield generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty, userId);
            // Update user with new session ID and append to gameSessions array
            yield firestoreService.updateUser(userId, {
                currentGameSessionId: newSessionId,
                gameState: 'in_progress',
                currentQuestion: message,
                gameSessions: [...(user.gameSessions || []), newSessionId]
            });
            return message;
        }
        // Use LLM to parse the input
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            temperature: 0.7,
            apiKey: process.env.GEMINI_API_KEY
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`Parse the following input into a JSON object with fields: topic, difficulty, and numQuestions.
The input is in the format: "topic, difficulty, number of questions"
Valid difficulties are: easy, medium, hard
If any field cannot be parsed or is invalid, return null for that field.
Example valid input: "general health, medium, 5"
Example output: {{"topic": "general health", "difficulty": "medium", "numQuestions": 5}}

Input: {input}

Return only the JSON object.`);
        const outputParser = new output_parsers_1.StringOutputParser();
        const chain = prompt.pipe(model).pipe(outputParser);
        try {
            const response = yield chain.invoke({ input: input.trim() });
            // Clean the response by removing markdown code block markers
            const cleanedResponse = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            let settings;
            try {
                settings = JSON.parse(cleanedResponse);
            }
            catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Raw response:', response);
                console.error('Cleaned response:', cleanedResponse);
                const errorMessage = "I couldn't understand your settings. Please provide them in this format: topic, difficulty, number of questions\nExample: general health, medium, 5";
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: errorMessage
                });
                return errorMessage;
            }
            // Check if any field is null or invalid
            if (!settings || settings.topic === null || settings.difficulty === null || settings.numQuestions === null) {
                const errorMessage = "I couldn't understand your settings. Please provide them in this format: topic, difficulty, number of questions\nExample: general health, medium, 5";
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: errorMessage
                });
                return errorMessage;
            }
            // Validate settings
            const validDiff = ['easy', 'medium', 'hard'];
            if (!validDiff.includes(settings.difficulty.toLowerCase())) {
                const errorMessage = "Invalid difficulty. Please use: easy, medium, or hard";
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: errorMessage
                });
                return errorMessage;
            }
            if (isNaN(settings.numQuestions) || settings.numQuestions <= 0) {
                const errorMessage = "Invalid number of questions. Please provide a positive number";
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: errorMessage
                });
                return errorMessage;
            }
            // Add validation for maximum number of questions
            if (settings.numQuestions > 10) {
                const errorMessage = "The maximum number of questions allowed is 10. Please provide a number between 1 and 10.";
                yield firestoreService.updateUserGameState(userId, {
                    currentQuestion: errorMessage
                });
                return errorMessage;
            }
            // Create new session with validated settings
            const newSessionId = (0, uuid_1.v4)();
            const newSession = {
                sessionId: newSessionId,
                userId,
                questions: [],
                userAnswers: [],
                currentQuestion: 0,
                difficulty: settings.difficulty.toLowerCase(),
                topic: settings.topic,
                numQuestions: settings.numQuestions,
                completed: false,
                stage: 'in_progress'
            };
            const message = yield generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty, userId);
            // Update user with new session ID and append to gameSessions array
            yield firestoreService.updateUser(userId, {
                currentGameSessionId: newSessionId,
                gameState: 'in_progress',
                currentQuestion: message,
                gameSessions: [...(user.gameSessions || []), newSessionId]
            });
            return message;
        }
        catch (error) {
            console.error('Error processing settings:', error);
            const errorMessage = "Sorry, there was an error processing your settings. Please try again.";
            yield firestoreService.updateUserGameState(userId, {
                currentQuestion: errorMessage
            });
            return errorMessage;
        }
    });
}
function handleGameProgress(userId, input) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield firestoreService.getOrCreateUser(userId);
        if (!user.currentGameSessionId) {
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Session error. Please start a new game."
            });
            return "Session error. Please start a new game.";
        }
        const session = yield firestoreService.getGameSession(user.currentGameSessionId);
        if (!session) {
            yield firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Session error. Please start a new game."
            });
            return "Session error. Please start a new game.";
        }
        // Handle answer
        const currentQ = session.questions[session.currentQuestion];
        if (!currentQ) {
            // Game is complete - calculate score
            const correctAnswers = session.userAnswers.filter((answer, index) => answer === session.questions[index].correctIndex).length;
            const wrongAnswers = session.questions.length - correctAnswers;
            const score = Math.round((correctAnswers / session.questions.length) * 100);
            const completionMessage = `Game completed!\nYou answered ${correctAnswers} out of ${session.questions.length} questions correctly.\nYour score: ${score}%\n\nUse /game start to begin a new game.`;
            // Update session and user state
            yield firestoreService.updateGameSession(session.sessionId, { completed: true });
            // Update user statistics
            yield firestoreService.updateUser(userId, {
                currentGameSessionId: null,
                gameState: 'idle',
                currentQuestion: completionMessage,
                totalQuestionsAnswered: (user.totalQuestionsAnswered || 0) + session.questions.length,
                totalCorrectAnswers: (user.totalCorrectAnswers || 0) + correctAnswers,
                totalWrongAnswers: (user.totalWrongAnswers || 0) + wrongAnswers
            });
            return completionMessage;
        }
        // Process answer
        const answer = parseInt(input.trim());
        if (isNaN(answer) || answer < 1 || answer > 4) {
            return `Invalid answer. Please enter a number between 1 and 4.\n${yield getResumeMessage(session)}`;
        }
        // Record answer
        const userAnswers = [...session.userAnswers, answer - 1];
        const isCorrect = answer - 1 === currentQ.correctIndex;
        // Update session
        yield firestoreService.updateGameSession(session.sessionId, {
            userAnswers,
            currentQuestion: session.currentQuestion + 1
        });
        // Get next question or end game
        const nextQ = session.questions[session.currentQuestion + 1];
        if (!nextQ) {
            // Game is complete - calculate score
            const correctAnswers = userAnswers.filter((answer, index) => answer === session.questions[index].correctIndex).length;
            const wrongAnswers = session.questions.length - correctAnswers;
            const score = Math.round((correctAnswers / session.questions.length) * 100);
            const completionMessage = `Game completed!\nYou answered ${correctAnswers} out of ${session.questions.length} questions correctly.\nYour score: ${score}%\n\nUse /game start to begin a new game.`;
            // Update session and user state
            yield firestoreService.updateGameSession(session.sessionId, { completed: true });
            // Update user statistics
            yield firestoreService.updateUser(userId, {
                currentGameSessionId: null,
                gameState: 'idle',
                currentQuestion: completionMessage,
                totalQuestionsAnswered: (user.totalQuestionsAnswered || 0) + session.questions.length,
                totalCorrectAnswers: (user.totalCorrectAnswers || 0) + correctAnswers,
                totalWrongAnswers: (user.totalWrongAnswers || 0) + wrongAnswers
            });
            return completionMessage;
        }
        // Show next question
        const message = `Your answer was ${isCorrect ? 'correct' : 'incorrect'}.\n\nQuestion ${session.currentQuestion + 2}:\n${nextQ.question}\nOptions:\n${nextQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
        yield firestoreService.updateUserGameState(userId, {
            currentQuestion: message
        });
        return message;
    });
}
function getResumeMessage(session) {
    return __awaiter(this, void 0, void 0, function* () {
        const q = session.questions[session.currentQuestion];
        if (!q)
            return "No questions found in your session.";
        return `Question ${session.currentQuestion + 1}:\n${q.question}\nOptions:\n${q.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
    });
}
function generateAndStartQuiz(sessionId, numQuestions, topic, difficulty, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            temperature: 0.7,
            apiKey: process.env.GEMINI_API_KEY
        });
        const prompt = prompts_1.PromptTemplate.fromTemplate(`Generate a JSON array of {numQuestions} multiple-choice health quiz questions about "{topic}" at {difficulty} difficulty.\nEach question should have:\n- question: string\n- options: array of 4 strings\n- correctIndex: integer (0-3)\nExample:\n[{{\n  "question": "What is the largest organ in the human body?",\n  "options": ["Heart", "Skin", "Liver", "Lung"],\n  "correctIndex": 1\n}}]\nReturn only the JSON array.`);
        const outputParser = new output_parsers_1.StringOutputParser();
        const chain = prompt.pipe(model).pipe(outputParser);
        try {
            const response = yield chain.invoke({ numQuestions, topic, difficulty });
            // Clean the response by removing markdown code block markers and any extra whitespace
            const cleanedResponse = response
                .replace(/```json\n?/g, '') // Remove opening ```json
                .replace(/```\n?/g, '') // Remove closing ```
                .trim(); // Remove extra whitespace
            let questions;
            try {
                questions = JSON.parse(cleanedResponse);
            }
            catch (parseError) {
                console.error('Error parsing JSON:', parseError);
                console.error('Raw response:', response);
                console.error('Cleaned response:', cleanedResponse);
                throw new Error('Failed to parse quiz questions');
            }
            // Validate the questions array
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('Invalid quiz format: questions must be a non-empty array');
            }
            // Validate each question
            for (const question of questions) {
                if (!question.question || !Array.isArray(question.options) ||
                    question.options.length !== 4 || typeof question.correctIndex !== 'number' ||
                    question.correctIndex < 0 || question.correctIndex > 3) {
                    throw new Error('Invalid quiz format: each question must have a question string, 4 options, and a valid correctIndex');
                }
            }
            // Create initial game session document with the questions
            const initialSession = {
                sessionId,
                userId: userId, // Use the passed userId
                questions: questions, // Include the questions here
                userAnswers: [],
                currentQuestion: 0,
                difficulty,
                topic,
                numQuestions,
                completed: false,
                stage: 'in_progress'
            };
            // Create the game session with the questions
            yield firestoreService.createGameSession(initialSession);
            const firstQ = questions[0];
            return `Quiz is ready!\nQuestion 1:\n${firstQ.question}\nOptions:\n${firstQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
        }
        catch (e) {
            console.error('Error generating quiz:', e);
            return "Sorry, there was an error generating your quiz questions. Please try again.";
        }
    });
}
