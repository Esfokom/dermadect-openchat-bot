import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';


let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = () => {
    if (!firebaseApp) {
        try {
            const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
            const missingFields = requiredFields.filter(field => !serviceAccount[field as keyof typeof serviceAccount]);

            if (missingFields.length > 0) {
                throw new Error(`Missing required environment variables: ${missingFields.join(', ')}`);
            }

            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
            });

            console.log('Firebase initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Firebase:', error);
            throw error;
        }
    }
    return firebaseApp;
};

export const getFirestoreInstance = () => {
    if (!firebaseApp) {
        initializeFirebase();
    }
    return getFirestore();
}; 