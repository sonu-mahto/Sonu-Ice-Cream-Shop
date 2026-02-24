import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Helper to get config from localStorage
const getFirebaseConfig = () => {
    const saved = localStorage.getItem('firebase_config');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Invalid Firebase config in localStorage", e);
        }
    }
    return null;
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase only if config is available
let app;
let firestoreDb: any = null;

if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        app = initializeApp(firebaseConfig);
        firestoreDb = getFirestore(app);
    } catch (e) {
        console.error("Firebase initialization failed", e);
    }
}

export const db = firestoreDb;
export default app;
