import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import axios from "axios";

export default async function HealthTip(req: Request, res: Response, client: BotClient) {

    const response = await axios.get("https://dermadect-oc-fastapi.vercel.app/health-tip");
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