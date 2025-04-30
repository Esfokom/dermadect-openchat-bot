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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Prompt;
const axios_1 = __importDefault(require("axios"));
function Prompt(req, res, client) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const message = ((_a = client.command) === null || _a === void 0 ? void 0 : _a.args[0].value).String;
        console.log(message);
        console.log(client.stringArg("prompt"));
        const response = yield axios_1.default.post("https://dermadect-oc-fastapi.vercel.app/chat", {
            user_id: client.initiator,
            message: message,
        });
        const responseMsg = response.data.response;
        console.log(responseMsg);
        const final = yield client.createTextMessage(responseMsg);
        final.setFinalised(true);
        client
            .sendMessage(final)
            .then(() => console.log("Message sent successfully"))
            .catch((err) => console.log("Error sending message:", err));
        res.status(200).json({
            message: final.toResponse()
        });
    });
}
