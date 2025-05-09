// Health tips array
const healthTips = [
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

// Health jokes array
const healthJokes = [
    "Why did the doctor carry a red pen? In case they needed to draw blood!",
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

// Simple responses for different commands
const responses = {
    ping: "Pong! 🏓",
    info: "I'm a health-focused bot that can provide tips, jokes, and answer your health-related questions!",
};

// Function to get a random item from an array
export const getRandomItem = (array: string[]) => {
    return array[Math.floor(Math.random() * array.length)];
};

export const getHealthTip = () => {
    return getRandomItem(healthTips);
};

export const getHealthJoke = () => {
    return getRandomItem(healthJokes);
};

export const getSimpleResponse = (command: string) => {
    return responses[command as keyof typeof responses] || "Command not recognized";
}; 