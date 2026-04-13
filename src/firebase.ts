/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuração carregada via variáveis de ambiente (Vite)
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
