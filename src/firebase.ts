/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Tenta carregar a config das envs (Padrão para Produção)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  // Atributo específico do ambiente AI Studio para o Firestore Enterprise
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

// Log aprimorado para depuração no navegador
console.log("%c 🚀 CONEXÃO FIREBASE ", "background: #0070f3; color: white; font-weight: bold; padding: 4px; border-radius: 4px;");
console.log("📍 Projeto:", firebaseConfig.projectId);
console.log("🗄️ Database ID:", firebaseConfig.firestoreDatabaseId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Habilitar persistência offline (IndexedDB) para o Firestore
if (typeof window !== 'undefined') {
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
