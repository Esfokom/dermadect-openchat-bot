export interface GameState {
    isActive: boolean;
    currentQuestion: number;
    score: number;
    history: GameHistory[];
}

export interface GameHistory {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    timestamp: Date;
} 