import { Request, Response } from "express";
import { WithBotClient } from "../types";
import Game from "../commands/game";
import Ping from "../commands/ping";
import Prompt from "../commands/prompt";

function hasBotClient(req: Request): req is WithBotClient {
    return (req as WithBotClient).botClient !== undefined;
}

export default async function executeCommand(req: Request, res: Response) {
    if (!hasBotClient(req)) {
        res.status(400).json({ error: "Bot client not found" });
        return;
    }
    const client = req.botClient;

    switch (client.commandName) {
        case "game":
            Game(req, res, client);
            break;
        case "ping":
            Ping(req, res, client);
            break;
        case "prompt":
            Prompt(req, res, client);
            break;
        default:
            break;
    }
    console.log("Initiator", client.initiator);
    console.log("Command name:", client.commandName);

    // res.status(200).json();
}