"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameStateManager = void 0;
class GameStateManager {
    constructor() {
        this.states = new Map();
    }
    getState(userId) {
        return this.states.get(userId);
    }
    setState(userId, state) {
        this.states.set(userId, state);
    }
    updateState(userId, update) {
        const currentState = this.getState(userId);
        if (currentState) {
            this.setState(userId, Object.assign(Object.assign({}, currentState), update));
        }
    }
    clearState(userId) {
        this.states.delete(userId);
    }
}
exports.gameStateManager = new GameStateManager();
