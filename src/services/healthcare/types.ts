export type HealthcareState = 'idle' | 'collecting_symptoms' | 'asking_followup' | 'evaluation' | 'qa';

export interface HealthcareSession {
    sessionId: string;
    userId: string;
    symptoms: string[];
    followupQuestions: string[];
    followupAnswers: string[];
    evaluation: {
        possibleConditions: string[];
        confidence: number;
        severity: 'low' | 'medium' | 'high';
        recommendations: string[];
    };
    currentState: HealthcareState;
    createdAt: Date;
    updatedAt: Date;
}

export interface HealthcareUser {
    userId: string;
    currentSessionId: string | null;
    sessions: string[];
    totalSessions: number;
    lastSessionDate: Date | null;
} 