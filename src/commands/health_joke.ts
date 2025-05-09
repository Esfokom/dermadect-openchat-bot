import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { handleHealthJoke } from "../services/health-joke/handler";

export default async function HealthJoke(req: Request, res: Response, client: BotClient) {
    try {
        const responseMsg = await handleHealthJoke();
        const final = await client.createTextMessage(responseMsg);
        final.setFinalised(true);

        client
            .sendMessage(final)
            .then(() => console.log("Message sent successfully"))
            .catch((err) => console.log("Error sending message:", err));

        res.status(200).json({
            message: final.toResponse()
        });
    } catch (error) {
        console.error("Error in health joke command:", error);
        res.status(500).json({ error: "Failed to generate health joke" });
    }
}   