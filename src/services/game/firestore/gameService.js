"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.GameFirestoreService = void 0;
const firebase_1 = require("../../../config/firebase");
const admin = __importStar(require("firebase-admin"));
const USERS_COLLECTION = 'users';
const GAME_SESSIONS_COLLECTION = 'game_sessions';
class GameFirestoreService {
    constructor() {
        this.db = (0, firebase_1.getFirestoreInstance)();
    }
    saveGameState(userId, gameState) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db.collection(USERS_COLLECTION).doc(userId).set(Object.assign(Object.assign({}, gameState), { lastUpdated: new Date() }));
            }
            catch (error) {
                console.error('Error saving game state:', error);
                throw error;
            }
        });
    }
    getGameState(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const doc = yield this.db.collection(USERS_COLLECTION).doc(userId).get();
                return doc.exists ? doc.data() : null;
            }
            catch (error) {
                console.error('Error getting game state:', error);
                throw error;
            }
        });
    }
    updateGameHistory(userId, history) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const gameState = yield this.getGameState(userId);
                if (gameState) {
                    gameState.history.push(history);
                    yield this.saveGameState(userId, gameState);
                }
            }
            catch (error) {
                console.error('Error updating game history:', error);
                throw error;
            }
        });
    }
    clearGameState(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db.collection(USERS_COLLECTION).doc(userId).delete();
            }
            catch (error) {
                console.error('Error clearing game state:', error);
                throw error;
            }
        });
    }
    getOrCreateUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield this.db.collection(USERS_COLLECTION).doc(userId).get();
            if (doc.exists)
                return doc.data();
            const user = {
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
            yield this.db.collection(USERS_COLLECTION).doc(userId).set(user);
            return user;
        });
    }
    updateUser(userId, update) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(USERS_COLLECTION).doc(userId).update(update);
        });
    }
    getGameSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield this.db.collection(GAME_SESSIONS_COLLECTION).doc(sessionId).get();
            return doc.exists ? doc.data() : null;
        });
    }
    createGameSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(GAME_SESSIONS_COLLECTION).doc(session.sessionId).set(session);
        });
    }
    updateGameSession(sessionId, update) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(GAME_SESSIONS_COLLECTION).doc(sessionId).update(update);
        });
    }
    appendGameSessionToUser(userId, sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(USERS_COLLECTION).doc(userId).update({
                gameSessions: admin.firestore.FieldValue.arrayUnion(sessionId),
                currentGameSessionId: sessionId
            });
        });
    }
    getLastQuestion(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield this.getGameSession(sessionId);
            if (!session)
                return null;
            return session.questions[session.currentQuestion] || null;
        });
    }
    updateUserGameState(userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userRef = this.db.collection('users').doc(userId);
                yield userRef.update(updates);
            }
            catch (error) {
                console.error('Error updating user game state:', error);
                throw error;
            }
        });
    }
}
exports.GameFirestoreService = GameFirestoreService;
