import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { getSimpleResponse } from "../services/basicResponses";

export default async function Info(req: Request, res: Response, client: BotClient) {
    const responseMsg = getSimpleResponse("info");
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