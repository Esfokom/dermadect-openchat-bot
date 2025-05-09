import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import { handleHealthTip } from "../services/health-tip/handler";

export default async function HealthTip(req: Request, res: Response, client: BotClient) {
    try {
        console.log("Fetching health tip...");
        const responseMsg = await handleHealthTip();
        console.log("Health tip fetched successfully");

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
        console.error("Error in health tip command:", error);
        res.status(500).json({ error: "Failed to generate health tip" });
    }
}   