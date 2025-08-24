"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatQuestion = void 0;
// Sample questions - in a real implementation, these would come from a database or API
const questions = [
    {
        question: "How many glasses of water should you drink daily?",
        options: ["4-6 glasses", "8-10 glasses", "2-3 glasses", "12+ glasses"],
        correct: 1
    },
    {
        question: "What's the recommended amount of sleep for adults?",
        options: ["4-5 hours", "6-7 hours", "7-8 hours", "9-10 hours"],
        correct: 2
    },
    {
        question: "Which vitamin is produced when your skin is exposed to sunlight?",
        options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"],
        correct: 3
    }
];
const formatQuestion = (questionIndex) => {
    const question = questions[questionIndex];
    return `Question ${questionIndex + 1}:\n${question.question}\n\nOptions:\n${question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
};
exports.formatQuestion = formatQuestion;
