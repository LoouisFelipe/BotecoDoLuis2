/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuração do Firebase (Manual)
const firebaseConfig = {
  apiKey: "AIzaSyBWMVE765V8nqz7gKwyBE2-SQ5_hNAPkDM",
  authDomain: "botecodoluis2.firebaseapp.com",
  projectId: "botecodoluis2",
  storageBucket: "botecodoluis2.firebasestorage.app",
  messagingSenderId: "959264021711",
  appId: "1:959264021711:web:d96d3d6efd985680092bba",
  measurementId: "G-3LEXX8S4X8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "botecodoluis");
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
