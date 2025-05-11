import { getFirestoreInstance } from '../../../config/firebase';
import { HealthcareSession, HealthcareUser, HealthcareState } from '../types';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

const USERS_COLLECTION = 'healthcare_users';
const SESSIONS_COLLECTION = 'healthcare_sessions';

export class HealthcareFirestoreService {
    private db;

    constructor() {
        this.db = getFirestoreInstance();
    }

    async getOrCreateUser(userId: string): Promise<HealthcareUser> {
        const doc = await this.db.collection(USERS_COLLECTION).doc(userId).get();
        if (doc.exists) return doc.data() as HealthcareUser;

        const user: HealthcareUser = {
            userId,
            currentSessionId: null,
            sessions: [],
            totalSessions: 0,
            lastSessionDate: null
        };

        await this.db.collection(USERS_COLLECTION).doc(userId).set(user);
        return user;
    }

    async createSession(userId: string): Promise<HealthcareSession> {
        const sessionId = uuidv4();
        const session: HealthcareSession = {
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

        await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).set(session);

        // Update user document
        await this.db.collection(USERS_COLLECTION).doc(userId).update({
            currentSessionId: sessionId,
            sessions: admin.firestore.FieldValue.arrayUnion(sessionId),
            totalSessions: admin.firestore.FieldValue.increment(1),
            lastSessionDate: new Date()
        });

        return session;
    }

    async getSession(sessionId: string): Promise<HealthcareSession | null> {
        const doc = await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).get();
        return doc.exists ? (doc.data() as HealthcareSession) : null;
    }

    async updateSession(sessionId: string, updates: Partial<HealthcareSession>): Promise<void> {
        await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
            ...updates,
            updatedAt: new Date()
        });
    }

    async updateSessionState(sessionId: string, state: HealthcareState): Promise<void> {
        await this.updateSession(sessionId, { currentState: state });
    }

    async addSymptom(sessionId: string, symptom: string): Promise<void> {
        await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
            symptoms: admin.firestore.FieldValue.arrayUnion(symptom),
            updatedAt: new Date()
        });
    }

    async addFollowupQuestion(sessionId: string, question: string): Promise<void> {
        await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
            followupQuestions: admin.firestore.FieldValue.arrayUnion(question),
            updatedAt: new Date()
        });
    }

    async addFollowupAnswer(sessionId: string, answer: string): Promise<void> {
        await this.db.collection(SESSIONS_COLLECTION).doc(sessionId).update({
            followupAnswers: admin.firestore.FieldValue.arrayUnion(answer),
            updatedAt: new Date()
        });
    }

    async updateEvaluation(sessionId: string, evaluation: HealthcareSession['evaluation']): Promise<void> {
        await this.updateSession(sessionId, { evaluation });
    }

    async endSession(sessionId: string, userId: string): Promise<void> {
        await this.db.collection(USERS_COLLECTION).doc(userId).update({
            currentSessionId: null
        });
    }
} 