import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";

export default async function Ping(req: Request, res: Response, client: BotClient) {
    const msg = await client.createTextMessage("Thinking about ponging!!");
    msg.setFinalised(false);
    client
        .sendMessage(msg)
        .catch((err) => console.log("Error sending message:", err));

    setTimeout(async () => {
        const final = await client.createTextMessage("Pong!!");
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