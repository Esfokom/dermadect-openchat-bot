import { getHealthTip } from "../basicResponses";

export const handlePrompt = (message: string) => {
    let responseMsg = "I understand you're asking about: " + message + "\n\n";
    responseMsg += "We'll handle your response well";
    return responseMsg;
}; 