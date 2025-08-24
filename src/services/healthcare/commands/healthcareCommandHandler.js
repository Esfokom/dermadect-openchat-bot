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
exports.HealthcareCommandHandler = void 0;
const healthcareService_1 = require("../firestore/healthcareService");
const healthcarePrompts_1 = require("../prompts/healthcarePrompts");
class HealthcareCommandHandler {
    constructor() {
        this.firestoreService = new healthcareService_1.HealthcareFirestoreService();
    }
    handleStartCommand(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.firestoreService.getOrCreateUser(userId);
            // End any existing session
            if (user.currentSessionId) {
                yield this.firestoreService.endSession(user.currentSessionId, userId);
            }
            // Create new session
            const session = yield this.firestoreService.createSession(userId);
            return "I'm here to help you with your health concerns. Please describe your symptoms in detail. " +
                "I'll ask you some follow-up questions to better understand your condition. " +
                "Remember, I'm not a replacement for professional medical advice.";
        });
    }
    handleUserInput(userId, input) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.firestoreService.getOrCreateUser(userId);
            if (!user.currentSessionId) {
                return "Please start a new session using the start command.";
            }
            const session = yield this.firestoreService.getSession(user.currentSessionId);
            if (!session) {
                return "Session not found. Please start a new session using the /start command.";
            }
            switch (session.currentState) {
                case 'collecting_symptoms':
                    return yield this.handleSymptomCollection(session, input);
                case 'asking_followup':
                    return yield this.handleFollowupAnswer(session, input);
                case 'evaluation':
                    return yield this.handleEvaluation(session, input);
                case 'qa':
                    return yield this.handleQA(session, input);
                default:
                    return "Invalid session state. Please start a new session using the /start command.";
            }
        });
    }
    handleSymptomCollection(session, input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add symptom to session
            yield this.firestoreService.addSymptom(session.sessionId, input);
            // Generate follow-up question
            const prompt = yield healthcarePrompts_1.collectingSymptomsTemplate.formatMessages({
                symptoms: (0, healthcarePrompts_1.formatSymptoms)(session.symptoms),
                input: input
            });
            const response = yield healthcarePrompts_1.model.invoke(prompt);
            const followupQuestion = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
            // Update session state and add question
            yield this.firestoreService.addFollowupQuestion(session.sessionId, followupQuestion);
            yield this.firestoreService.updateSessionState(session.sessionId, 'asking_followup');
            return followupQuestion;
        });
    }
    handleFollowupAnswer(session, input) {
        return __awaiter(this, void 0, void 0, function* () {
            // Add answer to session
            yield this.firestoreService.addFollowupAnswer(session.sessionId, input);
            // Move to evaluation state
            yield this.firestoreService.updateSessionState(session.sessionId, 'evaluation');
            // Generate evaluation
            const prompt = yield healthcarePrompts_1.evaluationTemplate.formatMessages({
                symptoms: (0, healthcarePrompts_1.formatSymptoms)(session.symptoms),
                followupQA: (0, healthcarePrompts_1.formatFollowupQA)(session.followupQuestions, session.followupAnswers),
                input: input
            });
            const response = yield healthcarePrompts_1.model.invoke(prompt);
            const evaluationText = typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
            try {
                const evaluation = JSON.parse(evaluationText);
                yield this.firestoreService.updateEvaluation(session.sessionId, evaluation);
                // Move to QA state
                yield this.firestoreService.updateSessionState(session.sessionId, 'qa');
                return `Based on your symptoms, here's my preliminary assessment:\n\n` +
                    `Possible conditions: ${evaluation.possibleConditions.join(', ')}\n` +
                    `Severity: ${evaluation.severity}\n\n` +
                    `Recommendations:\n${evaluation.recommendations.join('\n')}\n\n` +
                    `You can ask me questions about these conditions or recommendations. ` +
                    `Remember, this is not a replacement for professional medical advice.`;
            }
            catch (error) {
                console.error('Error parsing evaluation:', error);
                return "I apologize, but I'm having trouble processing the evaluation. Please try again with the /start command.";
            }
        });
    }
    handleEvaluation(session, input) {
        return __awaiter(this, void 0, void 0, function* () {
            // In evaluation state, we expect the user to confirm or ask for clarification
            const prompt = yield healthcarePrompts_1.qaTemplate.formatMessages({
                condition: session.evaluation.possibleConditions[0],
                question: "Please explain the evaluation and what it means for me",
                input: input
            });
            const response = yield healthcarePrompts_1.model.invoke(prompt);
            return typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
        });
    }
    handleQA(session, input) {
        return __awaiter(this, void 0, void 0, function* () {
            const prompt = yield healthcarePrompts_1.qaTemplate.formatMessages({
                condition: session.evaluation.possibleConditions[0],
                question: input,
                input: input
            });
            const response = yield healthcarePrompts_1.model.invoke(prompt);
            return typeof response.content === 'string'
                ? response.content
                : JSON.stringify(response.content);
        });
    }
    handleEndCommand(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.firestoreService.getOrCreateUser(userId);
            if (!user.currentSessionId) {
                return "No active session to end.";
            }
            yield this.firestoreService.endSession(user.currentSessionId, userId);
            return "Session ended. Thank you for using the healthcare assistant. Remember to consult with a healthcare professional for proper medical advice.";
        });
    }
}
exports.HealthcareCommandHandler = HealthcareCommandHandler;
