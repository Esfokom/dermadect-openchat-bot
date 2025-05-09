import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { getHealthJoke } from "../services/basicResponses";

export default async function HealthJoke(req: Request, res: Response, client: BotClient) {
    const responseMsg = getHealthJoke();
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