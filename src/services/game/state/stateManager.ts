import { GameState } from './types';

class GameStateManager {
    private states: Map<string, GameState>;

    constructor() {
        this.states = new Map();
    }

    getState(userId: string): GameState | undefined {
        return this.states.get(userId);
    }

    setState(userId: string, state: GameState): void {
        this.states.set(userId, state);
    }

    updateState(userId: string, update: Partial<GameState>): void {
        const currentState = this.getState(userId);
        if (currentState) {
            this.setState(userId, { ...currentState, ...update });
        }
    }

    clearState(userId: string): void {
        this.states.delete(userId);
    }
}

export const gameStateManager = new GameStateManager(); 