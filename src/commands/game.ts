import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { handleGame } from "../services/game/handler";

export default async function Game(req: Request, res: Response, client: BotClient) {
    const message = (client.command?.args[0].value as { String: string }).String;
    const responseMsg = handleGame(client.initiator || "", message);

    const final = await client.createTextMessage(responseMsg);
    final.setFinalised(true);

    client
        .sendMessage(final)
        .then(() => console.log("Message sent successfully"))
        .catch((err) => console.log("Error sending message:", err));

    res.status(200).json({
        message: final.toResponse()
    });
}