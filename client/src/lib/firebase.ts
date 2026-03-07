import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyDIvPv2kkfoNH9EUkflZgiEYxEkyGqzSsY",
    authDomain: "inventory-user123.firebaseapp.com",
    projectId: "inventory-user123", // From .firebaserc default project
    storageBucket: "inventory-user123.firebasestorage.app",
    messagingSenderId: "663436203984",
    appId: "1:663436203984:web:2d2c31e9f42007b2298bd5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
