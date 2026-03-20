// This file re-exports from the main client/src/firebase.ts
// to avoid "App already exists" errors when multiple files try to initialize Firebase
export { db } from '../firebase';
