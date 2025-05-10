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
let agentState: AgentState = {
    stage: 'idle',
    currentQuestion: ''
};

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

    switch (currentState) {
        case 'idle':
            const idleMessage = `Let's set up your new game!\nPlease provide the following settings (or type 'default' to use your defaults):\n1. Topic (default: ${user.defaultTopic})\n2. Difficulty (easy/medium/hard, default: ${user.defaultDifficulty})\n3. Number of questions (default: ${user.defaultNumQuestions})\n\nYou can provide all settings at once in this format:\ntopic: [your topic]\ndifficulty: [easy/medium/hard]\nquestions: [number]`;
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
            await firestoreService.updateUserGameState(userId, {
                currentQuestion: currentQuestion
            });
            return currentQuestion;

        case 'in_progress':
            if (user.currentGameSessionId) {
                const currentSession = await firestoreService.getGameSession(user.currentGameSessionId);
                if (currentSession && !currentSession.completed) {
                    const yesNoMessage = 'You have a pending game which has not been completed. Do you want to abandon it? (y/n)';
                    await firestoreService.updateUserGameState(userId, {
                        gameState: 'awaiting_yes_no',
                        currentQuestion: yesNoMessage
                    });
                    return yesNoMessage;
                }
            }
            const settingsMessage = `Let's set up your new game!\nPlease provide the following settings (or type 'default' to use your defaults):\n1. Topic (default: ${user.defaultTopic})\n2. Difficulty (easy/medium/hard, default: ${user.defaultDifficulty})\n3. Number of questions (default: ${user.defaultNumQuestions})\n\nYou can provide all settings at once in this format:\ntopic: [your topic]\ndifficulty: [easy/medium/hard]\nquestions: [number]`;
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: settingsMessage
            });
            return settingsMessage;

        default:
            const defaultMessage = `Let's set up your new game!\nPlease provide the following settings (or type 'default' to use your defaults):\n1. Topic (default: ${user.defaultTopic})\n2. Difficulty (easy/medium/hard, default: ${user.defaultDifficulty})\n3. Number of questions (default: ${user.defaultNumQuestions})\n\nYou can provide all settings at once in this format:\ntopic: [your topic]\ndifficulty: [easy/medium/hard]\nquestions: [number]`;
            await firestoreService.updateUserGameState(userId, {
                gameState: 'collecting_settings',
                currentQuestion: defaultMessage
            });
            return defaultMessage;
    }
}

async function handleYesNoResponse(userId: string, input: string): Promise<string> {
    if (!agentState.currentSessionId) {
        agentState = {
            stage: 'idle',
            currentQuestion: "Session error. Please start a new game."
        };
        return agentState.currentQuestion;
    }

    if (!input) {
        return agentState.currentQuestion;
    }

    if (/^(y|yes)$/i.test(input.trim())) {
        // Abandon current game and start collecting settings
        await firestoreService.updateUser(userId, { currentGameSessionId: null });
        const user = await firestoreService.getOrCreateUser(userId);

        agentState = {
            stage: 'collecting_settings',
            currentQuestion: `Let's set up your new game!\nPlease provide the following settings (or type 'default' to use your defaults):\n1. Topic (default: ${user.defaultTopic})\n2. Difficulty (easy/medium/hard, default: ${user.defaultDifficulty})\n3. Number of questions (default: ${user.defaultNumQuestions})\n\nYou can provide all settings at once in this format:\ntopic: [your topic]\ndifficulty: [easy/medium/hard]\nquestions: [number]`,
            settings: {}
        };

        return agentState.currentQuestion;
    } else if (/^(n|no)$/i.test(input.trim())) {
        const session = await firestoreService.getGameSession(agentState.currentSessionId);
        if (!session) {
            agentState = {
                stage: 'idle',
                currentQuestion: "Session error. Please start a new game."
            };
            return agentState.currentQuestion;
        }
        agentState = {
            stage: 'in_progress',
            currentQuestion: await getResumeMessage(session),
            currentSessionId: session.sessionId
        };
        return agentState.currentQuestion;
    } else {
        return agentState.currentQuestion;
    }
}

async function handleSettingsInput(userId: string, input: string): Promise<string> {
    const user = await firestoreService.getOrCreateUser(userId);

    if (!input) {
        return agentState.currentQuestion;
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

        const message = await generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty);
        // await firestoreService.createGameSession(newSession);
        await firestoreService.updateUser(userId, { currentGameSessionId: newSessionId, gameState: 'in_progress' });

        agentState = {
            stage: 'in_progress',
            currentQuestion: message,
            currentSessionId: newSessionId
        };

        return message;
    }

    // Parse settings from input
    const settings = parseSettingsInput(input);
    if (!settings) {
        return agentState.currentQuestion;
    }

    // Validate settings
    if (!settings.topic || !settings.difficulty || !settings.numQuestions) {
        return agentState.currentQuestion;
    }

    const validDiff = ['easy', 'medium', 'hard'];
    if (!validDiff.includes(settings.difficulty.toLowerCase())) {
        return agentState.currentQuestion;
    }

    if (isNaN(settings.numQuestions) || settings.numQuestions <= 0) {
        return agentState.currentQuestion;
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

    const message = await generateAndStartQuiz(newSessionId, newSession.numQuestions, newSession.topic, newSession.difficulty);
    // await firestoreService.createGameSession(newSession);
    await firestoreService.updateUser(userId, { currentGameSessionId: newSessionId });

    agentState = {
        stage: 'in_progress',
        currentQuestion: message,
        currentSessionId: newSessionId
    };


    return message;
}

function parseSettingsInput(input: string): { topic?: string; difficulty?: string; numQuestions?: number } | null {
    const lines = input.split('\n').map(line => line.trim());
    const settings: { topic?: string; difficulty?: string; numQuestions?: number } = {};

    for (const line of lines) {
        const [key, value] = line.split(':').map(part => part.trim());
        if (!key || !value) continue;

        switch (key.toLowerCase()) {
            case 'topic':
                settings.topic = value;
                break;
            case 'difficulty':
                settings.difficulty = value;
                break;
            case 'questions':
                settings.numQuestions = parseInt(value);
                break;
        }
    }

    return settings;
}

async function handleGameProgress(userId: string, input: string): Promise<string> {
    if (!agentState.currentSessionId) {
        agentState = {
            stage: 'idle',
            currentQuestion: "Session error. Please start a new game."
        };
        return agentState.currentQuestion;
    }

    const session = await firestoreService.getGameSession(agentState.currentSessionId);
    if (!session) {
        agentState = {
            stage: 'idle',
            currentQuestion: "Session error. Please start a new game."
        };
        return agentState.currentQuestion;
    }

    // Handle answer
    const currentQ = session.questions[session.currentQuestion];
    if (!currentQ) {
        // Game is complete
        await firestoreService.updateGameSession(session.sessionId, { completed: true });
        await firestoreService.updateUser(userId, { currentGameSessionId: null });
        agentState = {
            stage: 'idle',
            currentQuestion: "Game completed! Use /game start to begin a new game."
        };
        return agentState.currentQuestion;
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
        // Game is complete
        await firestoreService.updateGameSession(session.sessionId, { completed: true });
        await firestoreService.updateUser(userId, { currentGameSessionId: null });
        agentState = {
            stage: 'idle',
            currentQuestion: "Game completed! Use /game start to begin a new game."
        };
        return agentState.currentQuestion;
    }

    // Show next question
    const message = `Your answer was ${isCorrect ? 'correct' : 'incorrect'}.\n\nQuestion ${session.currentQuestion + 2}:\n${nextQ.question}\nOptions:\n${nextQ.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
    agentState.currentQuestion = message;
    return message;
}

async function getResumeMessage(session: GameSession): Promise<string> {
    const q = session.questions[session.currentQuestion];
    if (!q) return "No questions found in your session.";
    return `Question ${session.currentQuestion + 1}:\n${q.question}\nOptions:\n${q.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
}

async function generateAndStartQuiz(sessionId: string, numQuestions: number, topic: string, difficulty: string): Promise<string> {
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
            userId: '', // This will be set by the caller
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