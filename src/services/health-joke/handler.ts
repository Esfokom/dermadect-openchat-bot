import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

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
            temperature: 0.9, // Higher temperature for more creative jokes
        });
        console.log("Gemini model initialized successfully");
        return model;
    } catch (error) {
        console.error("Error initializing Gemini model:", error);
        return null;
    }
};

// Create health joke prompt template
const healthJokePrompt = PromptTemplate.fromTemplate(
    `Generate a creative and funny health-related joke. The joke should:
1. Be health or medical themed
2. Be family-friendly and appropriate
3. Be original and creative
4. Have a clear setup and punchline
5. Be concise (1-2 sentences)
6. Include relevant emojis for decoration and fun

Format the response as:
🎭 Joke: [Your joke here]
💡 Explanation: [Brief explanation of the health/medical reference in the joke]

Make it fun and engaging! Use emojis that match the theme of the joke.`
);

export const handleHealthJoke = async () => {
    try {
        console.log("Starting health joke generation...");
        const model = initializeGemini();

        if (!model) {
            console.log("Using fallback health jokes due to model initialization failure");
            return getRandomItem(fallbackHealthJokes);
        }

        console.log("Creating health joke chain...");
        const chain = RunnableSequence.from([
            healthJokePrompt,
            model,
            new StringOutputParser(),
        ]);

        console.log("Generating health joke...");
        const response = await chain.invoke({});
        console.log("Health joke generated successfully");

        return response;
    } catch (error) {
        console.error("Error generating health joke:", error);
        console.log("Using fallback health joke due to error");
        return getRandomItem(fallbackHealthJokes);
    }
}; 