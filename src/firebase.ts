/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuração do Firebase utilizando o arquivo gerado pelo provisionamento
import firebaseConfig from '../firebase-applet-config.json';

console.log("Firebase Config Initializing with Project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
console.log("Firestore Initialized with Database ID:", firebaseConfig.firestoreDatabaseId);
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
