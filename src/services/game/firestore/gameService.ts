import { getFirestoreInstance } from '../../../config/firebase';
import { GameState, GameHistory } from '../state/types';
import * as admin from "firebase-admin";

export interface User {
    userId: string;
    currentGameSessionId?: string | null;
    gameSessions: string[];
    questionsAnswered: number;
    wrongQuestions: string[];
    totalQuestionsAnswered: number;
    totalCorrectAnswers: number;
    totalWrongAnswers: number;
    defaultDifficulty?: string;
    defaultNumQuestions?: number;
    defaultTopic?: string;
    gameState?: 'idle' | 'awaiting_yes_no' | 'collecting_settings' | 'in_progress';
    currentQuestion?: string;
    // ...other stats
}

export interface GameSession {
    sessionId: string;
    userId: string;
    questions: { question: string, options: string[], correctIndex: number }[];
    userAnswers: number[];
    currentQuestion: number;
    difficulty: string;
    topic: string;
    numQuestions: number;
    completed: boolean;
    stage: string;
    // ...other state
}

const USERS_COLLECTION = 'users';
const GAME_SESSIONS_COLLECTION = 'game_sessions';

export class GameFirestoreService {
    private db;

    constructor() {
        this.db = getFirestoreInstance();
    }

    async saveGameState(userId: string, gameState: GameState): Promise<void> {
        try {
            await this.db.collection(USERS_COLLECTION).doc(userId).set({
                ...gameState,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error('Error saving game state:', error);
            throw error;
        }
    }

    async getGameState(userId: string): Promise<GameState | null> {
        try {
            const doc = await this.db.collection(USERS_COLLECTION).doc(userId).get();
            return doc.exists ? (doc.data() as GameState) : null;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }

    async updateGameHistory(userId: string, history: GameHistory): Promise<void> {
        try {
            const gameState = await this.getGameState(userId);
            if (gameState) {
                gameState.history.push(history);
                await this.saveGameState(userId, gameState);
            }
        } catch (error) {
            console.error('Error updating game history:', error);
            throw error;
        }
    }

    async clearGameState(userId: string): Promise<void> {
        try {
            await this.db.collection(USERS_COLLECTION).doc(userId).delete();
        } catch (error) {
            console.error('Error clearing game state:', error);
            throw error;
        }
    }

    async getOrCreateUser(userId: string): Promise<User> {
        const doc = await this.db.collection(USERS_COLLECTION).doc(userId).get();
        if (doc.exists) return doc.data() as User;
        const user: User = {
            userId,
            currentGameSessionId: null,
            gameSessions: [],
            questionsAnswered: 0,
            wrongQuestions: [],
            totalQuestionsAnswered: 0,
            totalCorrectAnswers: 0,
            totalWrongAnswers: 0,
            defaultDifficulty: 'medium',
            defaultNumQuestions: 5,
            defaultTopic: 'general healthcare',
            gameState: 'idle',
        };
        await this.db.collection(USERS_COLLECTION).doc(userId).set(user);
        return user;
    }

    async updateUser(userId: string, update: Partial<User>): Promise<void> {
        await this.db.collection(USERS_COLLECTION).doc(userId).update(update);
    }

    async getGameSession(sessionId: string): Promise<GameSession | null> {
        const doc = await this.db.collection(GAME_SESSIONS_COLLECTION).doc(sessionId).get();
        return doc.exists ? (doc.data() as GameSession) : null;
    }

    async createGameSession(session: GameSession): Promise<void> {
        await this.db.collection(GAME_SESSIONS_COLLECTION).doc(session.sessionId).set(session);
    }

    async updateGameSession(sessionId: string, update: Partial<GameSession>): Promise<void> {
        await this.db.collection(GAME_SESSIONS_COLLECTION).doc(sessionId).update(update);
    }

    async appendGameSessionToUser(userId: string, sessionId: string): Promise<void> {
        await this.db.collection(USERS_COLLECTION).doc(userId).update({
            gameSessions: admin.firestore.FieldValue.arrayUnion(sessionId),
            currentGameSessionId: sessionId
        });
    }

    async getLastQuestion(sessionId: string): Promise<{ question: string, options: string[], correctIndex: number } | null> {
        const session = await this.getGameSession(sessionId);
        if (!session) return null;
        return session.questions[session.currentQuestion] || null;
    }

    async updateUserGameState(userId: string, updates: { gameState?: User['gameState'], currentQuestion?: string }): Promise<void> {
        try {
            const userRef = this.db.collection('users').doc(userId);
            await userRef.update(updates);
        } catch (error) {
            console.error('Error updating user game state:', error);
            throw error;
        }
    }
} 