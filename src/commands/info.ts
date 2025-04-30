import { BotClient } from "@open-ic/openchat-botclient-ts";
import { Response, Request } from "express";
import fs from "fs";
import path from "path";

export default async function Info(req: Request, res: Response, client: BotClient) {
    try {
        // Read the info.md file
        const infoContent = fs.readFileSync(
            path.join(__dirname, "../../info.md"),
            "utf-8"
        );

        // Create and send the message
        const final = await client.createTextMessage(infoContent);
        final.setFinalised(true);

        client
            .sendMessage(final)
            .then(() => console.log("Info message sent successfully"))
            .catch((err) => console.log("Error sending info message:", err));

        res.status(200).json({
            message: final.toResponse()
        });
    } catch (error) {
        console.error("Error in Info command:", error);
        res.status(500).json({
            error: "Failed to process info command"
        });
    }
}