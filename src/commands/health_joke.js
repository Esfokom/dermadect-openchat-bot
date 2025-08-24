"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HealthJoke;
const handler_1 = require("../services/health-joke/handler");
function HealthJoke(req, res, client) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const responseMsg = yield (0, handler_1.handleHealthJoke)();
            const final = yield client.createTextMessage(responseMsg);
            final.setFinalised(true);
            client
                .sendMessage(final)
                .then(() => console.log("Message sent successfully"))
                .catch((err) => console.log("Error sending message:", err));
            res.status(200).json({
                message: final.toResponse()
            });
        }
        catch (error) {
            console.error("Error in health joke command:", error);
            res.status(500).json({ error: "Failed to generate health joke" });
        }
    });
}
