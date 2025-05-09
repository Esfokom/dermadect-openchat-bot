import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

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
const getRandomItem = (array: string[]) => {
    return array[Math.floor(Math.random() * array.length)];
};

// Initialize Gemini model
const initializeGemini = () => {
    try {
        console.log("Initializing Gemini model...");
        const model = new ChatGoogleGenerativeAI({
            model: "gemini-2.0-flash",
            apiKey: process.env.GEMINI_API_KEY,
            temperature: 0.7,
        });
        console.log("Gemini model initialized successfully");
        return model;
    } catch (error) {
        console.error("Error initializing Gemini model:", error);
        return null;
    }
};

// Create health tip prompt template
const healthTipPrompt = PromptTemplate.fromTemplate(
    `Generate a detailed but brief health tip with the following structure:
📌 Title: [Catchy title for the health tip]
💡 Reason: [Why this health tip is important]
✨ Benefits: [What this health tip does for your health]
🎯 Fun Fact: [An interesting fact related to this health tip]

Keep each section concise and engaging. The total response should be about 2-3 sentences per section.
Make it informative but easy to understand. Add relevant emojis throughout the text to make it more engaging and fun!`
);

export const handleHealthTip = async () => {
    try {
        console.log("Starting health tip generation...");
        const model = initializeGemini();

        if (!model) {
            console.log("Using fallback health tips due to model initialization failure");
            return getRandomItem(fallbackHealthTips);
        }

        console.log("Creating health tip chain...");
        const chain = RunnableSequence.from([
            healthTipPrompt,
            model,
            new StringOutputParser(),
        ]);

        console.log("Generating health tip...");
        const response = await chain.invoke({});
        console.log("Health tip generated successfully");

        return response;
    } catch (error) {
        console.error("Error generating health tip:", error);
        console.log("Using fallback health tip due to error");
        return getRandomItem(fallbackHealthTips);
    }
}; 