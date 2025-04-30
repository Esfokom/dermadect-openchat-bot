import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import schema from "./handlers/schema";
import cors from "cors";
import { accessTokenNotFound, BadRequestError, BotClient, BotClientFactory } from "@open-ic/openchat-botclient-ts";
import { WithBotClient } from "./types";
import executeCommand from "./handlers/executeCommand";

const app = express();
app.use(cors());
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

