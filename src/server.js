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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const schema_1 = __importDefault(require("./handlers/schema"));
const cors_1 = __importDefault(require("cors"));
const openchat_botclient_ts_1 = require("@open-ic/openchat-botclient-ts");
const executeCommand_1 = __importDefault(require("./handlers/executeCommand"));
const handler_1 = require("./services/game/handler");
const handler_2 = require("./services/health-tip/handler");
const handler_3 = require("./services/health-joke/handler");
const basicResponses_1 = require("./services/basicResponses");
const firebase_1 = require("./config/firebase");
const handler_4 = require("./services/healthcare/handler");
// Initialize Firebase
(0, firebase_1.initializeFirebase)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3000;
// Only create factory if we're not in development mode
let factory = null;
if (process.env.NODE_ENV !== 'development') {
    factory = new openchat_botclient_ts_1.BotClientFactory({
        identityPrivateKey: process.env.IDENTITY_PRIVATE,
        openchatPublicKey: process.env.OC_PUBLIC,
        icHost: process.env.IC_HOST,
        openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER,
    });
}
app.get("/", (req, res) => {
    res.send("Welcome to Dermadect OpenChat Api");
});
app.get("/bot_definition", schema_1.default);
// Only use bot client middleware in production
if (factory) {
    app.post("/execute_command", createCommandBotClient(factory), executeCommand_1.default);
}
else {
    app.post("/execute_command", (req, res) => {
        res.status(503).json({ error: "Bot client is not available in development mode" });
    });
}
// Development endpoints
app.post("/dev/prompt", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            res.status(400).json({ error: "userId and message are required" });
            return;
        }
        const response = yield (0, handler_4.handleHealthcareMessage)(userId, message);
        // const response = handlePrompt(message);
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.post("/dev/game", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, message } = req.body;
        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }
        const response = yield (0, handler_1.handleGame)(userId, message);
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/dev/health-tip", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Dev endpoint: Fetching health tip...");
        const response = yield (0, handler_2.handleHealthTip)();
        console.log("Dev endpoint: Health tip fetched successfully");
        res.status(200).json({ response });
    }
    catch (error) {
        console.error("Dev endpoint: Error fetching health tip:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/dev/health-joke", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = (0, handler_3.handleHealthJoke)();
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/dev/info", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = (0, basicResponses_1.getSimpleResponse)("info");
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.get("/dev/ping", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = (0, basicResponses_1.getSimpleResponse)("ping");
        res.status(200).json({ response });
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}));
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (!factory) {
        console.log("Running in development mode - bot client is disabled");
    }
});
function createCommandBotClient(factory) {
    return (req, res, next) => {
        try {
            const token = req.headers["x-oc-jwt"];
            if (!token) {
                throw new openchat_botclient_ts_1.BadRequestError((0, openchat_botclient_ts_1.accessTokenNotFound)());
            }
            const client = factory.createClientFromCommandJwt(token);
            req.botClient = client;
            next();
        }
        catch (err) {
            if (err instanceof openchat_botclient_ts_1.BadRequestError) {
                res.status(400).json({ error: err.message });
            }
            else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    };
}
exports.default = app;
