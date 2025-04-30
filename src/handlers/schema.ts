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
                name: "game",
                default_role: "Participant",
                description: "This is a game about anatomy. 5 questions will be asked. Enter \"start game\" to start the game",
                placeholder: "Derma is thinking...",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: [
                    {
                        name: "message",
                        description: "Enter your command or response to the question",
                        placeholder: "Enter message",
                        required: true,
                        param_type: {
                            StringParam: {
                                min_length: 0,
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