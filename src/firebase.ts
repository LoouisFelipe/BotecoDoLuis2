/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

import firebaseConfig from '../firebase-applet-config.json';

// Configuração do Firebase com suporte a overrides de ambiente
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId
};

console.log("Firebase Config Initializing with Project:", config.projectId);

const app = initializeApp(config);
export const auth = getAuth(app);
const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
export const db = getFirestore(app, dbId);
console.log("Firestore Initialized with Database ID:", dbId);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc just to check connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn("Firebase Firestore está temporariamente offline ou ainda sendo provisionado. O sistema tentará reconectar automaticamente.");
    } else if (error.code === 'permission-denied') {
      console.info("Conexão com Firebase estabelecida (Permissão negada é normal para este teste).");
    } else {
      console.error("Erro de configuração do Firebase:", error);
    }
  }
}
testConnection();

export default app;
