"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleHealthcareMessage = void 0;
const healthcareCommandHandler_1 = require("./commands/healthcareCommandHandler");
const healthcareHandler = new healthcareCommandHandler_1.HealthcareCommandHandler();
// Define available commands
const COMMANDS = ['start', 'end'];
// Function to check if a word is a valid command
const isCommand = (word) => {
    return COMMANDS.includes(word.toLowerCase());
};
// Function to parse command from message
const parseCommand = (message) => {
    const firstWord = message.trim().split(' ')[0].toLowerCase();
    return isCommand(firstWord) ? firstWord : null;
};
const handleHealthcareMessage = (userId, message) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("handleHealthcareMessage", userId, message);
    const command = parseCommand(message);
    if (command) {
        switch (command) {
            case 'start':
                console.log("handleHealthcareMessage start command", userId, message);
                return yield healthcareHandler.handleStartCommand(userId);
            case 'end':
                console.log("handleHealthcareMessage end command", userId, message);
                return yield healthcareHandler.handleEndCommand(userId);
            default:
                return "Invalid command. Available commands: start, end";
        }
    }
    // Handle regular messages
    console.log("handleHealthcareMessage regular message", userId, message);
    return yield healthcareHandler.handleUserInput(userId, message);
});
exports.handleHealthcareMessage = handleHealthcareMessage;
