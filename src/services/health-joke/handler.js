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
exports.handleHealthJoke = void 0;
const google_genai_1 = require("@langchain/google-genai");
const prompts_1 = require("@langchain/core/prompts");
const runnables_1 = require("@langchain/core/runnables");
const output_parsers_1 = require("@langchain/core/output_parsers");
// Fallback health jokes in case of API failure
const fallbackHealthJokes = [
    "Why did the doctor go to art school? To learn how to draw blood!",
    "What did the grape say when it got stepped on? Nothing, it just let out a little wine!",
    "Why did the cookie go to the doctor? Because it was feeling crumbly!",
    "What do you call a fake noodle? An impasta!",
    "Why did the tomato turn red? Because it saw the salad dressing!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call a can opener that doesn't work? A can't opener!",
    "Why did the math book look so sad? Because it had too many problems!",
    "What do you call a fish with no eyes? Fsh!"
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
            temperature: 0.9, // Higher temperature for more creative jokes
        });
        console.log("Gemini model initialized successfully");
        return model;
    }
    catch (error) {
        console.error("Error initializing Gemini model:", error);
        return null;
    }
};
// Create health joke prompt template
const healthJokePrompt = prompts_1.PromptTemplate.fromTemplate(`Generate a creative and funny health-related joke. The joke should:
1. Be health or medical themed
2. Be family-friendly and appropriate
3. Be original and creative
4. Have a clear setup and punchline
5. Be concise (1-2 sentences)
6. Include relevant emojis for decoration and fun

Format the response as:
🎭 Joke: [Your joke here]
💡 Explanation: [Brief explanation of the health/medical reference in the joke]

Make it fun and engaging! Use emojis that match the theme of the joke.`);
const handleHealthJoke = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Starting health joke generation...");
        const model = initializeGemini();
        if (!model) {
            console.log("Using fallback health jokes due to model initialization failure");
            return getRandomItem(fallbackHealthJokes);
        }
        console.log("Creating health joke chain...");
        const chain = runnables_1.RunnableSequence.from([
            healthJokePrompt,
            model,
            new output_parsers_1.StringOutputParser(),
        ]);
        console.log("Generating health joke...");
        const response = yield chain.invoke({});
        console.log("Health joke generated successfully");
        return response;
    }
    catch (error) {
        console.error("Error generating health joke:", error);
        console.log("Using fallback health joke due to error");
        return getRandomItem(fallbackHealthJokes);
    }
});
exports.handleHealthJoke = handleHealthJoke;
