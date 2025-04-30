import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";

export default async function Greet(req: Request, res: Response, client: BotClient) {
    const msg = await client.createTextMessage("Preparing to greet");
    msg.setFinalised(false);

    console.log((client.command?.args[0].value as { String: string }).String);

    client
        .sendMessage(msg)
        .catch((err) => console.log("Error sending message:", err));

    setTimeout(async () => {
        const final = await client.createTextMessage(`Helloooo ${(client.command?.args[0].value as { String: string }).String}`);
        final.setFinalised(true);

        client
            .sendMessage(final)
            .then(() => console.log("Message sent successfully"))
            .catch((err) => console.log("Error sending message:", err));

        res.status(200).json({
            message: final.toResponse()
        });
    }, 3000);
}