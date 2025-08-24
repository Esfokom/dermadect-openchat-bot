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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = executeCommand;
const game_1 = __importDefault(require("../commands/game"));
const info_1 = __importDefault(require("../commands/info"));
const prompt_1 = __importDefault(require("../commands/prompt"));
const health_joke_1 = __importDefault(require("../commands/health_joke"));
const health_tip_1 = __importDefault(require("../commands/health_tip"));
function hasBotClient(req) {
    return req.botClient !== undefined;
}
function executeCommand(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!hasBotClient(req)) {
            res.status(400).json({ error: "Bot client not found" });
            return;
        }
        const client = req.botClient;
        switch (client.commandName) {
            case "game":
                (0, game_1.default)(req, res, client);
                break;
            case "info":
                (0, info_1.default)(req, res, client);
                break;
            case "prompt":
                (0, prompt_1.default)(req, res, client);
                break;
            case "health_joke":
                (0, health_joke_1.default)(req, res, client);
                break;
            case "health_tip":
                (0, health_tip_1.default)(req, res, client);
                break;
            default:
                break;
        }
        console.log("Initiator", client.initiator);
        console.log("Command name:", client.commandName);
        // res.status(200).json();
    });
}
