import { handleGameCommand, handleGameInput } from './commands/commandHandler';
import { handleAgentMessage } from './agent/agentHandler';
import { gameStateManager } from './state/stateManager';

const GAME_COMMANDS = ['start', 'end'];

const isCommand = (message: string): boolean => {
    const firstWord = message.trim().split(' ')[0].toLowerCase();
    return GAME_COMMANDS.includes(firstWord);
};

const parseCommand = (message: string): string => {
    return message.trim().split(' ')[0].toLowerCase();
};

export const handleGame = async (userId: string, message?: string): Promise<string> => {
    try {
        if (!message) {
            const state = gameStateManager.getState(userId);
            if (!state?.isActive) {
                return "Welcome to the Health Quiz Game! Type 'start' to begin.";
            }
            return "Please provide an answer or type 'end' to finish the game.";
        }

        if (isCommand(message)) {
            const command = parseCommand(message);
            return await handleGameCommand(userId, command);
        }

        return await handleGameInput(userId, message);
    } catch (error) {
        console.error('Error in game handler:', error);
        return "Sorry, something went wrong. Please try again.";
    }
}; 
