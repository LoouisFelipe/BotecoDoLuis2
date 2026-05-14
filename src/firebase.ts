/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Helper to get environment variables (Vite or Node)
const getEnv = (key: string) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  return process.env[key];
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID'),
  firestoreDatabaseId: getEnv('VITE_FIREBASE_DATABASE_ID') || '(default)'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Habilitar persistência offline (IndexedDB) para o Firestore - Apenas no Browser
if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("⚠️ Persistência offline: Múltiplas abas abertas. Funcionando em modo compartilhado.");
    } else if (err.code === 'unimplemented') {
      console.warn("⚠️ Este navegador não suporta persistência offline.");
    }
  });
}

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connection test - Silencioso para não poluir o console em produção
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.code === 'unavailable') {
      console.warn(`[Firebase] Servidor indisponível. Verifique sua conexão.`);
    }
  }
}
testConnection();

export default app;
