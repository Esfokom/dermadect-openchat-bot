import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { handlePrompt } from "../services/prompt/handler";

export default async function Prompt(req: Request, res: Response, client: BotClient) {
    const message = (client.command?.args[0].value as { String: string }).String;
    console.log(message);

    const responseMsg = handlePrompt(message);
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