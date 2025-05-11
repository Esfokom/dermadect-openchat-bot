import { HealthcareFirestoreService } from '../firestore/healthcareService';
import { HealthcareSession, HealthcareState } from '../types';
import {
    collectingSymptomsTemplate,
    evaluationTemplate,
    qaTemplate,
    model,
    formatFollowupQA,
    formatSymptoms
} from '../prompts/healthcarePrompts';

export class HealthcareCommandHandler {
    private firestoreService: HealthcareFirestoreService;

    constructor() {
        this.firestoreService = new HealthcareFirestoreService();
    }

    async handleStartCommand(userId: string): Promise<string> {
        const user = await this.firestoreService.getOrCreateUser(userId);

        // End any existing session
        if (user.currentSessionId) {
            await this.firestoreService.endSession(user.currentSessionId, userId);
        }

        // Create new session
        const session = await this.firestoreService.createSession(userId);

        return "I'm here to help you with your health concerns. Please describe your symptoms in detail. " +
            "I'll ask you some follow-up questions to better understand your condition. " +
            "Remember, I'm not a replacement for professional medical advice.";
    }

    async handleUserInput(userId: string, input: string): Promise<string> {
        const user = await this.firestoreService.getOrCreateUser(userId);
        if (!user.currentSessionId) {
            return "Please start a new session using the start command.";
        }

        const session = await this.firestoreService.getSession(user.currentSessionId);
        if (!session) {
            return "Session not found. Please start a new session using the /start command.";
        }

        switch (session.currentState) {
            case 'collecting_symptoms':
                return await this.handleSymptomCollection(session, input);
            case 'asking_followup':
                return await this.handleFollowupAnswer(session, input);
            case 'evaluation':
                return await this.handleEvaluation(session, input);
            case 'qa':
                return await this.handleQA(session, input);
            default:
                return "Invalid session state. Please start a new session using the /start command.";
        }
    }

    private async handleSymptomCollection(session: HealthcareSession, input: string): Promise<string> {
        // Add symptom to session
        await this.firestoreService.addSymptom(session.sessionId, input);

        // Generate follow-up question
        const prompt = await collectingSymptomsTemplate.formatMessages({
            symptoms: formatSymptoms(session.symptoms),
            input: input
        });

        const response = await model.invoke(prompt);
        const followupQuestion = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        // Update session state and add question
        await this.firestoreService.addFollowupQuestion(session.sessionId, followupQuestion);
        await this.firestoreService.updateSessionState(session.sessionId, 'asking_followup');

        return followupQuestion;
    }

    private async handleFollowupAnswer(session: HealthcareSession, input: string): Promise<string> {
        // Add answer to session
        await this.firestoreService.addFollowupAnswer(session.sessionId, input);

        // Move to evaluation state
        await this.firestoreService.updateSessionState(session.sessionId, 'evaluation');

        // Generate evaluation
        const prompt = await evaluationTemplate.formatMessages({
            symptoms: formatSymptoms(session.symptoms),
            followupQA: formatFollowupQA(session.followupQuestions, session.followupAnswers),
            input: input
        });

        const response = await model.invoke(prompt);
        const evaluationText = typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);

        try {
            const evaluation = JSON.parse(evaluationText);
            await this.firestoreService.updateEvaluation(session.sessionId, evaluation);

            // Move to QA state
            await this.firestoreService.updateSessionState(session.sessionId, 'qa');

            return `Based on your symptoms, here's my preliminary assessment:\n\n` +
                `Possible conditions: ${evaluation.possibleConditions.join(', ')}\n` +
                `Severity: ${evaluation.severity}\n\n` +
                `Recommendations:\n${evaluation.recommendations.join('\n')}\n\n` +
                `You can ask me questions about these conditions or recommendations. ` +
                `Remember, this is not a replacement for professional medical advice.`;
        } catch (error) {
            console.error('Error parsing evaluation:', error);
            return "I apologize, but I'm having trouble processing the evaluation. Please try again with the /start command.";
        }
    }

    private async handleEvaluation(session: HealthcareSession, input: string): Promise<string> {
        // In evaluation state, we expect the user to confirm or ask for clarification
        const prompt = await qaTemplate.formatMessages({
            condition: session.evaluation.possibleConditions[0],
            question: "Please explain the evaluation and what it means for me",
            input: input
        });

        const response = await model.invoke(prompt);
        return typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
    }

    private async handleQA(session: HealthcareSession, input: string): Promise<string> {
        const prompt = await qaTemplate.formatMessages({
            condition: session.evaluation.possibleConditions[0],
            question: input,
            input: input
        });

        const response = await model.invoke(prompt);
        return typeof response.content === 'string'
            ? response.content
            : JSON.stringify(response.content);
    }

    async handleEndCommand(userId: string): Promise<string> {
        const user = await this.firestoreService.getOrCreateUser(userId);
        if (!user.currentSessionId) {
            return "No active session to end.";
        }

        await this.firestoreService.endSession(user.currentSessionId, userId);
        return "Session ended. Thank you for using the healthcare assistant. Remember to consult with a healthcare professional for proper medical advice.";
    }
} 