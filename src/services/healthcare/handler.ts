import { HealthcareCommandHandler } from './commands/healthcareCommandHandler';

const healthcareHandler = new HealthcareCommandHandler();

// Define available commands
const COMMANDS = ['start', 'end'] as const;
type Command = typeof COMMANDS[number];

// Function to check if a word is a valid command
const isCommand = (word: string): word is Command => {
    return COMMANDS.includes(word.toLowerCase() as Command);
};

// Function to parse command from message
const parseCommand = (message: string): Command | null => {
    const firstWord = message.trim().split(' ')[0].toLowerCase();
    return isCommand(firstWord) ? firstWord : null;
};

export const handleHealthcareMessage = async (userId: string, message: string): Promise<string> => {
    console.log("handleHealthcareMessage", userId, message);
    const command = parseCommand(message);

    if (command) {
        switch (command) {
            case 'start':
                console.log("handleHealthcareMessage start command", userId, message);
                return await healthcareHandler.handleStartCommand(userId);
            case 'end':
                console.log("handleHealthcareMessage end command", userId, message);
                return await healthcareHandler.handleEndCommand(userId);
            default:
                return "Invalid command. Available commands: start, end";
        }
    }

    // Handle regular messages
    console.log("handleHealthcareMessage regular message", userId, message);
    return await healthcareHandler.handleUserInput(userId, message);
}; 