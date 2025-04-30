import { BotClient } from "@open-ic/openchat-botclient-ts";
import { ChatEvent } from "@open-ic/openchat-botclient-ts/lib/typebox/typebox";
import { Response, Request } from "express";
import axios from "axios";

export default async function Prompt(req: Request, res: Response, client: BotClient) {
    const message = (client.command?.args[0].value as { String: string }).String;
    console.log(message);
    console.log(client.stringArg("prompt"));
    const response = await axios.post("https://dermadect-oc-fastapi.vercel.app/chat", {
        user_id: client.initiator,
        message: message,
    }
    );
    const responseMsg = response.data.response;
    console.log(responseMsg);
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