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

// Log para debug da inicialização (não exibe a API Key por segurança)
console.log("🔥 Firebase Config Initializing with Project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Habilitar persistência offline (IndexedDB) para o Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Múltiplas abas abertas, persistência só funciona em uma.
    console.warn("Múltiplas abas abertas. A persistência offline do Firestore funcionará apenas na aba principal.");
  } else if (err.code === 'unimplemented') {
    // Navegador não suporta a persistência.
    console.warn("Este navegador não suporta persistência offline do Firestore.");
  }
});

console.log("Firestore Initialized with Database ID:", firebaseConfig.firestoreDatabaseId);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc just to check connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn("Firebase Firestore está temporariamente offline ou ainda sendo provisionado. O sistema continuará usando os dados em cache (Modo Offline).");
    } else if (error.code === 'permission-denied') {
      console.info("Conexão com Firebase estabelecida (Permissão negada é normal para este teste).");
    } else {
      console.error("Erro de configuração do Firebase:", error);
    }
  }
}
testConnection();

export default app;
