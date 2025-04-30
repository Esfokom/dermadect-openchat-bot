import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";

export default async function Prompt(req: Request, res: Response, client: BotClient) {
    // const msg = await client.createTextMessage("Thinking about prompt!!");
    // msg.setFinalised(false);
    // client
    //     .sendMessage(msg)
    //     .catch((err) => console.log("Error sending message:", err));

    const message = (client.command?.args[0].value as { String: string }).String;
    console.log(message);
    console.log(client.stringArg("prompt"));

    // setTimeout(async () => {

    // }, 3000);
    const final = await client.createTextMessage(message);
    final.setFinalised(true);

    client
        .sendMessage(final)
        .then(() => console.log("Message sent successfully"))
        .catch((err) => console.log("Error sending message:", err));

    res.status(200).json({
        message: final.toResponse()
    });
}