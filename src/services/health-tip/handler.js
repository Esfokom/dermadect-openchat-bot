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
exports.handleHealthTip = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
// Fallback health tips in case of API failure
const fallbackHealthTips = [
    "Remember to stay hydrated! Drink at least 8 glasses of water daily.",
    "Get 7-8 hours of sleep each night for optimal health.",
    "Regular exercise helps maintain both physical and mental health.",
    "Eat a balanced diet rich in fruits and vegetables.",
    "Take regular breaks when working on screens to protect your eyes.",
    "Practice good posture to prevent back and neck pain.",
    "Regular hand washing helps prevent the spread of germs.",
    "Don't forget to wear sunscreen when going outside.",
    "Take deep breaths throughout the day to reduce stress.",
    "Stay active by taking short walks during your breaks."
];
// Function to get a random item from an array
const getRandomItem = (array) => {
    return array[Math.floor(Math.random() * array.length)];
};
// Initialize Gemini model
const initializeGemini = () => {
    try {
        console.log("Initializing Gemini model...");
        const model = new google_genai_1.ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.7,
        });
        console.log("Gemini model initialized successfully");
        return model;
    }
    catch (error) {
        console.error("Error initializing Gemini model:", error);
        return null;
    }
};
// Create health tip prompt template
const healthTipPrompt = prompts_1.PromptTemplate.fromTemplate(`Generate a detailed but brief health tip with the following structure:
📌 Title: [Catchy title for the health tip]
💡 Reason: [Why this health tip is important]
✨ Benefits: [What this health tip does for your health]
🎯 Fun Fact: [An interesting fact related to this health tip]

Keep each section concise and engaging. The total response should be about 2-3 sentences per section.
Make it informative but easy to understand. Add relevant emojis throughout the text to make it more engaging and fun!`);
const handleHealthTip = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting health tip generation...");
        const model = initializeGemini();
        if (!model) {
            console.log("Using fallback health tips due to model initialization failure");
            return getRandomItem(fallbackHealthTips);
        }
        console.log("Creating health tip chain...");
        const chain = runnables_1.RunnableSequence.from([
            healthTipPrompt,
            model,
            new output_parsers_1.StringOutputParser(),
        ]);
        console.log("Generating health tip...");
        const response = yield chain.invoke({});
        console.log("Health tip generated successfully");
        return response;
    }
    catch (error) {
        console.error("Error generating health tip:", error);
        console.log("Using fallback health tip due to error");
        return getRandomItem(fallbackHealthTips);
    }
});
exports.handleHealthTip = handleHealthTip;
