import { Permissions } from "@open-ic/openchat-botclient-ts";
import { Request, Response } from "express";

export default function schema(req: Request, res: Response) {
    res.status(200).json({
        description: "Dermadect bot is a healthcare bot",
        commands: [
            {
                name: "info",
                default_role: "Participant",
                description: "Get information about Dermadect bot and its commands",
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
            {
                name: "health_tip",
                default_role: "Participant",
                description: "Get information about Dermadect",
                placeholder: "Fetching health tip...",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: []
            },
            {
                name: "health_joke",
                default_role: "Participant",
                description: "Get information about Dermadect",
                placeholder: "Fetching health joke...",
                permissions: Permissions.encodePermissions({
                    chat: [],
                    community: [],
                    message: ["Text"],
                }),
                params: []
            },
        ]
    });
}