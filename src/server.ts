import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import schema from "./handlers/schema";
import cors from "cors";
import { accessTokenNotFound, BadRequestError, BotClient, BotClientFactory } from "@open-ic/openchat-botclient-ts";
import { WithBotClient } from "./types";
import executeCommand from "./handlers/executeCommand";
import { handlePrompt } from "./services/prompt/handler";
import { handleGame } from "./services/game/handler";
import { getHealthTip, getHealthJoke, getSimpleResponse } from "./services/basicResponses";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

const factory = new BotClientFactory({
    identityPrivateKey: process.env.IDENTITY_PRIVATE!,
    openchatPublicKey: process.env.OC_PUBLIC!,
    icHost: process.env.IC_HOST!,
    openStorageCanisterId: process.env.STORAGE_INDEX_CANISTER!,
});

app.get("/", (req: Request, res: Response) => {
    res.send("Welcome to Dermadect OpenChat Api");
});
app.get("/bot_definition", schema);
app.post("/execute_command", createCommandBotClient(factory), executeCommand);

// Development endpoints
app.post("/dev/prompt", async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, message } = req.body;
        if (!userId || !message) {
            res.status(400).json({ error: "userId and message are required" });
            return;
        }
        const response = handlePrompt(message);
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/dev/game", async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId, message } = req.body;
        if (!userId) {
            res.status(400).json({ error: "userId is required" });
            return;
        }
        const response = handleGame(userId, message);
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/dev/health-tip", async (req: Request, res: Response): Promise<void> => {
    try {
        const response = getHealthTip();
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/dev/health-joke", async (req: Request, res: Response): Promise<void> => {
    try {
        const response = getHealthJoke();
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/dev/info", async (req: Request, res: Response): Promise<void> => {
    try {
        const response = getSimpleResponse("info");
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/dev/ping", async (req: Request, res: Response): Promise<void> => {
    try {
        const response = getSimpleResponse("ping");
        res.status(200).json({ response });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

function createCommandBotClient(factory: BotClientFactory) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            const token = req.headers["x-oc-jwt"];
            if (!token) {
                throw new BadRequestError(accessTokenNotFound());
            }
            const client = factory.createClientFromCommandJwt(token as string);
            (req as WithBotClient).botClient = client;
            next();
        }
        catch (err: any) {
            if (err instanceof BadRequestError) {
                res.status(400).json({ error: err.message });
            }
            else {
                res.status(500).json({ error: "Internal Server Error" });
            }
        }
    }
}

export default app;

