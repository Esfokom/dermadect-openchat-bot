import { Permissions } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";

export default function schema(req: Request, res: Response) {
    res.status(200).json({
        description: " This is a schema endpoint",
        commands: [
            {
                name: "ping",
                default_role: "Participant",
                description: "Ping the server",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: []
            },
            {
                name: "greet",
                default_role: "Participant",
                description: "Give a greeting",
                placeholder: "Processing greeting",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: [
                    {
                        name: "Name",
                        description: "Name of the person to greet",
                        placeholder: "Enter name",
                        required: true,
                        param_type: {
                            StringParam: {
                                min_length: 1,
                                max_length: 100,
                                choices: [],
                                multi_line: false
                            }
                        },
                    }
                ]
            },
            {
                name: "prompt",
                default_role: "Participant",
                description: "This command helps in interacting with AI agents",
                placeholder: "AI agent is thinking...",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: [
                    {
                        name: "Message",
                        description: "This refers to the prompt to be given to the agent",
                        placeholder: "Enter prompt",
                        required: true,
                        param_type: {
                            StringParam: {
                                min_length: 1,
                                max_length: 10000,
                                choices: [],
                                multi_line: true
                            }
                        },
                    }
                ],
                direct_messages: true
            },
        ]
    });
}