import { BotClient } from "@open-ic/openchat-botclient-ts";
import axios from "axios";
import { Request, Response } from "express";

export default async function Game(req: Request, res: Response, client: BotClient) {
    // const msg = await client.createTextMessage("Preparing to greet");
    // msg.setFinalised(false);

    const message = (client.command?.args[0].value as { String: string }).String;

    const response = await axios.post(`https://dermadect-oc-fastapi.vercel.app/game/${client.initiator}`, {
        user_id: client.initiator,
        message: message,
    }
    );
    const responseMsg = response.data.response;
    const final = await client.createTextMessage(responseMsg);
    final.setFinalised(true);
    client
        .sendMessage(final)
        .then(() => console.log("Message sent successfully"))
        .catch((err) => console.log("Error sending message:", err));


    // client
    //     .sendMessage(responseMsg)
    //     .catch((err) => console.log("Error sending message:", err));

    // setTimeout(async () => {
    //     const final = await client.createTextMessage(`Helloooo ${(client.command?.args[0].value as { String: string }).String}`);
    //     final.setFinalised(true);

    //     client
    //         .sendMessage(final)
    //         .then(() => console.log("Message sent successfully"))
    //         .catch((err) => console.log("Error sending message:", err));

    //     res.status(200).json({
    //         message: final.toResponse()
    //     });
    // }, 3000);
}