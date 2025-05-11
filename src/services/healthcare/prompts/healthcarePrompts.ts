import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Initialize Gemini model
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.7,
    apiKey: process.env.GEMINI_API_KEY
});

// System prompts for different states
const COLLECTING_SYMPTOMS_PROMPT = `You are a healthcare assistant helping to collect and analyze symptoms. 
Your role is to:
1. Listen carefully to the user's symptoms
2. Ask relevant follow-up questions to gather more information
3. Maintain a professional and empathetic tone
4. Always remind users that you are not a replacement for professional medical advice

Current symptoms: {symptoms}

Ask ONE follow-up question to gather more information about their condition.`;

const EVALUATION_PROMPT = `You are a healthcare assistant analyzing symptoms to provide preliminary insights.
Based on the following information:
Symptoms: {symptoms}
Follow-up Q&A: {followupQA}

Provide a structured evaluation in JSON format:
{
    "possibleConditions": ["condition1", "condition2"],
    "confidence": 0.85,
    "severity": "low|medium|high",
    "recommendations": ["recommendation1", "recommendation2"]
}

Remember to:
1. Include a disclaimer about seeking professional medical advice
2. Be conservative in your assessment
3. Focus on common conditions first
4. Consider severity based on symptoms`;

const QA_PROMPT = `You are a healthcare assistant providing information about a specific condition.
Current condition: {condition}
User question: {question}

Provide a helpful response that:
1. Answers the question directly
2. Includes relevant medical information
3. Emphasizes the importance of professional medical advice
4. Suggests when to seek immediate medical attention`;

// Create prompt templates
export const collectingSymptomsTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(COLLECTING_SYMPTOMS_PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}")
]);

export const evaluationTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(EVALUATION_PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}")
]);

export const qaTemplate = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate(QA_PROMPT),
    HumanMessagePromptTemplate.fromTemplate("{input}")
]);

// Helper functions to format prompts
export const formatFollowupQA = (questions: string[], answers: string[]): string => {
    return questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join('\n\n');
};

export const formatSymptoms = (symptoms: string[]): string => {
    return symptoms.join(', ');
};

// Export the model for use in the agent
export { model }; 