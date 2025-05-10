import { GameFirestoreService, User, GameSession } from '../firestore/gameService';
import { v4 as uuidv4 } from 'uuid';
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const firestoreService = new GameFirestoreService();

// Agent state types
type AgentState = {
    stage: 'idle' | 'awaiting_yes_no' | 'collecting_settings' | 'in_progress';
    currentQuestion: string;
    currentSessionId?: string;
    settings?: {
        topic?: string;
        difficulty?: string;
        numQuestions?: number;
    };
};

// Global agent state
// let agentState: AgentState = {
//     stage: 'idle',
//     currentQuestion: ''
// };

export const handleGameCommand = async (userId: string, command: string): Promise<string> => {
    console.log('handleGameCommand', userId, command);
    if (command === 'start') {
        return await handleStartCommand(userId);
    }
    return "Invalid command. Available commands: start, end";
};

export const handleGameInput = async (userId: string, input: string): Promise<string> => {
    console.log('handleGameInput', userId, input);
    // Get current user state from Firestore
    const user = await firestoreService.getOrCreateUser(userId);
    const currentState = user.gameState || 'idle';
    const currentQuestion = user.currentQuestion || '';

    switch (currentState) {
        case 'idle':
            await firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "No active game session found. Type /game start to begin a new game."
            });
            return "No active game session found. Type /game start to begin a new game.";

        case 'awaiting_yes_no':
            const yesNoResponse = await handleYesNoResponse(userId, input);
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: yesNoResponse
            });
            return yesNoResponse;

        case 'collecting_settings':
            const settingsResponse = await handleSettingsInput(userId, input);
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: settingsResponse
            });
            return settingsResponse;

        case 'in_progress':
            const progressResponse = await handleGameProgress(userId, input);
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: progressResponse
            });
            return progressResponse;

        default:
            await firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Invalid game state. Please start a new game."
            });
            return "Invalid game state. Please start a new game.";
    }
};

async function handleStartCommand(userId: string): Promise<string> {
    // Get or create user with default values
    const user = await firestoreService.getOrCreateUser(userId);

    // Check and set default values if null
    const updates: Partial<User> = {};
    if (!user.defaultDifficulty) updates.defaultDifficulty = 'medium';
    if (!user.defaultNumQuestions) updates.defaultNumQuestions = 5;
    if (!user.defaultTopic) updates.defaultTopic = 'general health';

    if (Object.keys(updates).length > 0) {
        await firestoreService.updateUser(userId, updates);
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
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: idleMessage
            });
            return idleMessage;

        case 'collecting_settings':
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: currentQuestion
            });
            return currentQuestion;

        case 'awaiting_yes_no':
            if (user.currentGameSessionId) {
                const currentSession = await firestoreService.getGameSession(user.currentGameSessionId);
                if (currentSession && !currentSession.completed) {
                    const yesNoMessage = 'You have an active game session. Do you want to continue with your current game? Please respond with exactly "yes" or "no" (or "y"/"n").';
                    await firestoreService.updateUserGameState(userId, {
                        gameState: 'awaiting_yes_no',
                        currentQuestion: yesNoMessage
                    });
                    return yesNoMessage;
                }
            }
            // If no active session, proceed to settings collection
            const newSettingsMessage = getSettingsMessage();
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: newSettingsMessage
            });
            return newSettingsMessage;

        case 'in_progress':
            if (user.currentGameSessionId) {
                const currentSession = await firestoreService.getGameSession(user.currentGameSessionId);
                if (currentSession && !currentSession.completed) {
                    const yesNoMessage = 'You have an active game session. Do you want to continue with your current game? Please respond with exactly "yes" or "no" (or "y"/"n").';
                    await firestoreService.updateUserGameState(userId, {
                        gameState: 'awaiting_yes_no',
                        currentQuestion: yesNoMessage
                    });
                    return yesNoMessage;
                }
            }
            const progressSettingsMessage = getSettingsMessage();
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: progressSettingsMessage
            });
            return progressSettingsMessage;

        default:
            const defaultMessage = getSettingsMessage();
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: defaultMessage
            });
            return defaultMessage;
    }
}

async function handleYesNoResponse(userId: string, input: string): Promise<string> {
    const user = await firestoreService.getOrCreateUser(userId);

    if (!user.currentGameSessionId) {
        await firestoreService.updateUserGameState(userId, {
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
        const session = await firestoreService.getGameSession(user.currentGameSessionId);
        if (!session) {
            await firestoreService.updateUserGameState(userId, {
                gameState: 'idle',
                currentQuestion: "Session error. Please start a new game."
            });
            return "Session error. Please start a new game.";
        }

        // Update user state to in_progress
        await firestoreService.updateUserGameState(userId, {
            gameState: 'in_progress',
            currentQuestion: await getResumeMessage(session)
        });

        return await getResumeMessage(session);
    } else if (/^(n|no)$/i.test(input.trim())) {
        // Abandon current game and start collecting settings
        await firestoreService.updateUser(userId, {
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

        await firestoreService.updateUserGameState(userId, {
            gameState: 'collecting_settings',
            currentQuestion: settingsMessage
        });

        return settingsMessage;
    } else {
        return user.currentQuestion || "Please respond with exactly 'yes' or 'no' (or 'y'/'n').";
    }
}

async function handleSettingsInput(userId: string, input: string): Promise<string> {
    const user = await firestoreService.getOrCreateUser(userId);

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

        await firestoreService.updateUserGameState(userId, {
            currentQuestion: settingsMessage
        });
        return settingsMessage;
    }

    if (input.trim().toLowerCase() === 'default') {
        // Use all default values
        const newSessionId = uuidv4();
        const newSession: GameSession = {
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

        const message = await generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty, userId);
        await firestoreService.updateUser(userId, {
            currentGameSessionId: newSessionId,
            gameState: 'in_progress',
            currentQuestion: message
        });

        return message;
    }

    // Use LLM to parse the input
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = PromptTemplate.fromTemplate(
        `Parse the following input into a JSON object with fields: topic, difficulty, and numQuestions.
The input is in the format: "topic, difficulty, number of questions"
Valid difficulties are: easy, medium, hard
If any field cannot be parsed or is invalid, return null for that field.
Example valid input: "general health, medium, 5"
Example output: {{"topic": "general health", "difficulty": "medium", "numQuestions": 5}}

Input: {input}

Return only the JSON object.`
    );

    const outputParser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    try {
        const response = await chain.invoke({ input: input.trim() });

        // Clean the response by removing markdown code block markers
        const cleanedResponse = response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        let settings;
        try {
            settings = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            console.error('Raw response:', response);
            console.error('Cleaned response:', cleanedResponse);
            const errorMessage = "I couldn't understand your settings. Please provide them in this format: topic, difficulty, number of questions\nExample: general health, medium, 5";
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: errorMessage
            });
            return errorMessage;
        }

        // Check if any field is null or invalid
        if (!settings || settings.topic === null || settings.difficulty === null || settings.numQuestions === null) {
            const errorMessage = "I couldn't understand your settings. Please provide them in this format: topic, difficulty, number of questions\nExample: general health, medium, 5";
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: errorMessage
            });
            return errorMessage;
        }

        // Validate settings
        const validDiff = ['easy', 'medium', 'hard'];
        if (!validDiff.includes(settings.difficulty.toLowerCase())) {
            const errorMessage = "Invalid difficulty. Please use: easy, medium, or hard";
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: errorMessage
            });
            return errorMessage;
        }

        if (isNaN(settings.numQuestions) || settings.numQuestions <= 0) {
            const errorMessage = "Invalid number of questions. Please provide a positive number";
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: errorMessage
            });
            return errorMessage;
        }

        // Create new session with validated settings
        const newSessionId = uuidv4();
        const newSession: GameSession = {
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

        const message = await generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty, userId);
        await firestoreService.updateUser(userId, {
            currentGameSessionId: newSessionId,
            gameState: 'in_progress',
            currentQuestion: message
        });

        return message;
    } catch (error) {
        console.error('Error processing settings:', error);
        const errorMessage = "Sorry, there was an error processing your settings. Please try again.";
        await firestoreService.updateUserGameState(userId, {
            currentQuestion: errorMessage
        });
        return errorMessage;
    }
}

async function handleGameProgress(userId: string, input: string): Promise<string> {
    const user = await firestoreService.getOrCreateUser(userId);

    if (!user.currentGameSessionId) {
        await firestoreService.updateUserGameState(userId, {
            gameState: 'idle',
            currentQuestion: "Session error. Please start a new game."
        });
        return "Session error. Please start a new game.";
    }

    const session = await firestoreService.getGameSession(user.currentGameSessionId);
    if (!session) {
        await firestoreService.updateUserGameState(userId, {
            gameState: 'idle',
            currentQuestion: "Session error. Please start a new game."
        });
        return "Session error. Please start a new game.";
    }

    // Handle answer
    const currentQ = session.questions[session.currentQuestion];
    if (!currentQ) {
        // Game is complete - calculate score
        const correctAnswers = session.userAnswers.filter((answer, index) =>
            answer === session.questions[index].correctIndex
        ).length;

        const score = Math.round((correctAnswers / session.questions.length) * 100);
        const completionMessage = `Game completed!\nYou answered ${correctAnswers} out of ${session.questions.length} questions correctly.\nYour score: ${score}%\n\nUse /game start to begin a new game.`;

        // Update session and user state
        await firestoreService.updateGameSession(session.sessionId, { completed: true });
        await firestoreService.updateUser(userId, {
            currentGameSessionId: null,
            gameState: 'idle',
            currentQuestion: completionMessage
        });

        return completionMessage;
    }

    // Process answer
    const answer = parseInt(input.trim());
    if (isNaN(answer) || answer < 1 || answer > 4) {
        return `Invalid answer. Please enter a number between 1 and 4.\n${await getResumeMessage(session)}`;
    }

    // Record answer
    const userAnswers = [...session.userAnswers, answer - 1];
    const isCorrect = answer - 1 === currentQ.correctIndex;

    // Update session
    await firestoreService.updateGameSession(session.sessionId, {
        userAnswers,
        currentQuestion: session.currentQuestion + 1
    });

    // Get next question or end game
    const nextQ = session.questions[session.currentQuestion + 1];
    if (!nextQ) {
        // Game is complete - calculate score
        const correctAnswers = userAnswers.filter((answer, index) =>
            answer === session.questions[index].correctIndex
        ).length;

        const score = Math.round((correctAnswers / session.questions.length) * 100);
        const completionMessage = `Game completed!\nYou answered ${correctAnswers} out of ${session.questions.length} questions correctly.\nYour score: ${score}%\n\nUse /game start to begin a new game.`;

        // Update session and user state
        await firestoreService.updateGameSession(session.sessionId, { completed: true });
        await firestoreService.updateUser(userId, {
            currentGameSessionId: null,
            gameState: 'idle',
            currentQuestion: completionMessage
        });

        return completionMessage;
    }

    // Show next question
    const message = `Your answer was ${isCorrect ? 'correct' : 'incorrect'}.\n\nQuestion ${session.currentQuestion + 2}:\n${nextQ.question}\nOptions:\n${nextQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;

    await firestoreService.updateUserGameState(userId, {
        currentQuestion: message
    });

    return message;
}

async function getResumeMessage(session: GameSession): Promise<string> {
    const q = session.questions[session.currentQuestion];
    if (!q) return "No questions found in your session.";
    return `Question ${session.currentQuestion + 1}:\n${q.question}\nOptions:\n${q.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
}

async function generateAndStartQuiz(sessionId: string, numQuestions: number, topic: string, difficulty: string, userId: string): Promise<string> {
    const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash",
        temperature: 0.7,
        apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = PromptTemplate.fromTemplate(
        `Generate a JSON array of {numQuestions} multiple-choice health quiz questions about "{topic}" at {difficulty} difficulty.\nEach question should have:\n- question: string\n- options: array of 4 strings\n- correctIndex: integer (0-3)\nExample:\n[{{\n  "question": "What is the largest organ in the human body?",\n  "options": ["Heart", "Skin", "Liver", "Lung"],\n  "correctIndex": 1\n}}]\nReturn only the JSON array.`
    );

    const outputParser = new StringOutputParser();
    const chain = prompt.pipe(model).pipe(outputParser);

    try {
        const response = await chain.invoke({ numQuestions, topic, difficulty });

        // Clean the response by removing markdown code block markers and any extra whitespace
        const cleanedResponse = response
            .replace(/```json\n?/g, '') // Remove opening ```json
            .replace(/```\n?/g, '')    // Remove closing ```
            .trim();                   // Remove extra whitespace

        let questions;
        try {
            questions = JSON.parse(cleanedResponse);
        } catch (parseError) {
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
        const initialSession: GameSession = {
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
        await firestoreService.createGameSession(initialSession);

        const firstQ = questions[0];
        return `Quiz is ready!\nQuestion 1:\n${firstQ.question}\nOptions:\n${firstQ.options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join('\n')}`;
    } catch (e) {
        console.error('Error generating quiz:', e);
        return "Sorry, there was an error generating your quiz questions. Please try again.";
    }
} 