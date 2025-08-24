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
exports.handleGame = void 0;
const commandHandler_1 = require("./commands/commandHandler");
const stateManager_1 = require("./state/stateManager");
const GAME_COMMANDS = ['start', 'end'];
const isCommand = (message) => {
    const firstWord = message.trim().split(' ')[0].toLowerCase();
    return GAME_COMMANDS.includes(firstWord);
};
const parseCommand = (message) => {
    return message.trim().split(' ')[0].toLowerCase();
};
const handleGame = (userId, message) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!message) {
            const state = stateManager_1.gameStateManager.getState(userId);
            if (!(state === null || state === void 0 ? void 0 : state.isActive)) {
                return "Welcome to the Health Quiz Game! Type 'start' to begin.";
            }
            return "Please provide an answer or type 'end' to finish the game.";
        }
        if (isCommand(message)) {
            const command = parseCommand(message);
            return yield (0, commandHandler_1.handleGameCommand)(userId, command);
        }
        return yield (0, commandHandler_1.handleGameInput)(userId, message);
    }
    catch (error) {
        console.error('Error in game handler:', error);
        return "Sorry, something went wrong. Please try again.";
    }
});
exports.handleGame = handleGame;
