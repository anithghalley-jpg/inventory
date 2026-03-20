import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase-config.json"; // Path goes up one level to src

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export default app;