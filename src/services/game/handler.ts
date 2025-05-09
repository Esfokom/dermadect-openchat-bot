// Game state interface
interface GameState {
    isActive: boolean;
    currentQuestion: number;
    score: number;
}

// Game questions
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

// Store game states for different users
const gameStates = new Map<string, GameState>();

export const handleGame = (userId: string, message?: string) => {
    const gameState = gameStates.get(userId);

    if (!gameState || !gameState.isActive) {
        // Start new game
        gameStates.set(userId, {
            isActive: true,
            currentQuestion: 0,
            score: 0
        });
        return formatQuestion(0);
    }

    // Handle ongoing game
    return handleGameResponse(userId, message || "", gameState);
};

const formatQuestion = (questionIndex: number) => {
    const question = questions[questionIndex];
    return `Question ${questionIndex + 1}:\n${question.question}\n\nOptions:\n${question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}`;
};

const handleGameResponse = (userId: string, message: string, gameState: GameState) => {
    const answer = parseInt(message);

    if (isNaN(answer) || answer < 1 || answer > 4) {
        return "Please enter a number between 1 and 4 to answer the question.";
    }

    const currentQuestion = questions[gameState.currentQuestion];
    const isCorrect = answer - 1 === currentQuestion.correct;

    if (isCorrect) {
        gameState.score++;
    }

    gameState.currentQuestion++;

    if (gameState.currentQuestion >= questions.length) {
        // Game over
        gameState.isActive = false;
        return `Game Over! Your final score is ${gameState.score}/${questions.length}`;
    }

    // Send next question
    return formatQuestion(gameState.currentQuestion);
}; 