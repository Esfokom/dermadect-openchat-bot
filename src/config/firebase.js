"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFirestoreInstance = exports.initializeFirebase = void 0;
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
let firebaseApp = null;
const initializeFirebase = () => {
    var _a;
    if (!firebaseApp) {
        try {
            const privateKey = (_a = process.env.GOOGLE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n');
            if (!privateKey) {
                throw new Error('GOOGLE_PRIVATE_KEY is not set in environment variables');
            }
            const serviceAccount = {
                type: "service_account",
                project_id: process.env.GOOGLE_PROJECT_ID,
                private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
                private_key: privateKey,
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                client_id: process.env.GOOGLE_CLIENT_ID,
                auth_uri: process.env.GOOGLE_AUTH_URI,
                token_uri: process.env.GOOGLE_TOKEN_URI,
                auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
                client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
                universe_domain: "googleapis.com"
            };
            // Validate required fields
            const requiredFields = ["project_id", "private_key_id", "private_key", "client_email"];
            const missingFields = requiredFields.filter(field => !serviceAccount[field]);
            if (missingFields.length > 0) {
                throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
            }
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Firebase:', error);
            throw error;
        }
    }
    return firebaseApp;
};
exports.initializeFirebase = initializeFirebase;
const getFirestoreInstance = () => {
    if (!firebaseApp) {
        (0, exports.initializeFirebase)();
    }
    return (0, firestore_1.getFirestore)();
};
exports.getFirestoreInstance = getFirestoreInstance;
