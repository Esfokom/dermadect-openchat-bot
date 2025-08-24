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
exports.HealthcareFirestoreService = void 0;
const firebase_1 = require("../../../config/firebase");
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
const USERS_COLLECTION = 'healthcare_users';
const SESSIONS_COLLECTION = 'healthcare_sessions';
class HealthcareFirestoreService {
    constructor() {
        this.db = (0, firebase_1.getFirestoreInstance)();
    }
    getOrCreateUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield this.db.collection(USERS_COLLECTION).doc(userId).get();
            if (doc.exists)
                return doc.data();
            const user = {
                userId,
                currentSessionId: null,
                sessions: [],
                totalSessions: 0,
                lastSessionDate: null
            };
            yield this.db.collection(USERS_COLLECTION).doc(userId).set(user);
            return user;
        });
    }
    createSession(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const sessionId = (0, uuid_1.v4)();
            const session = {
                sessionId,
                userId,
                symptoms: [],
                followupQuestions: [],
                followupAnswers: [],
                evaluation: {
                    possibleConditions: [],
                    confidence: 0,
                    severity: 'low',
                    recommendations: []
                },
                currentState: 'collecting_symptoms',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).set(session);
            // Update user document
            yield this.db.collection(USERS_COLLECTION).doc(userId).update({
                currentSessionId: sessionId,
                sessions: admin.firestore.FieldValue.arrayUnion(sessionId),
                totalSessions: admin.firestore.FieldValue.increment(1),
                lastSessionDate: new Date()
            });
            return session;
        });
    }
    getSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
            return doc.exists ? doc.data() : null;
        });
    }
    updateSession(sessionId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update(Object.assign(Object.assign({}, updates), { updatedAt: new Date() }));
        });
    }
    updateSessionState(sessionId, state) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateSession(sessionId, { currentState: state });
        });
    }
    addSymptom(sessionId, symptom) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
                symptoms: admin.firestore.FieldValue.arrayUnion(symptom),
                updatedAt: new Date()
            });
        });
    }
    addFollowupQuestion(sessionId, question) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
                followupQuestions: admin.firestore.FieldValue.arrayUnion(question),
                updatedAt: new Date()
            });
        });
    }
    addFollowupAnswer(sessionId, answer) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
                followupAnswers: admin.firestore.FieldValue.arrayUnion(answer),
                updatedAt: new Date()
            });
        });
    }
    updateEvaluation(sessionId, evaluation) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.updateSession(sessionId, { evaluation });
        });
    }
    endSession(sessionId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.db.collection(USERS_COLLECTION).doc(userId).update({
                currentSessionId: null
            });
        });
    }
}
exports.HealthcareFirestoreService = HealthcareFirestoreService;
