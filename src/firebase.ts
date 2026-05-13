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

// Habilitar persistência offline (IndexedDB) para o Firestore com forceOwnership
// Isso garante que se houver múltiplas abas, a aba atual possa assumir o controle se necessário
enableIndexedDbPersistence(db, { forceOwnership: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("⚠️ Persistência offline: Múltiplas abas abertas. Funcionando em modo limitado.");
  } else if (err.code === 'unimplemented') {
    console.warn("⚠️ Este navegador não suporta persistência offline.");
  }
});

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Connection test
async function testConnection() {
  try {
    // Try to fetch a non-existent doc just to check connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("✅ Firestore connection successful to database:", firebaseConfig.firestoreDatabaseId);
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.warn(`⚠️ Firebase Firestore está OFFLINE ou o banco '${firebaseConfig.firestoreDatabaseId}' não foi encontrado.`);
    } else if (error.code === 'permission-denied') {
      console.info("✅ Conexão com Firebase estabelecida (Permissão negada é normal para o teste de conexão).");
    } else {
      console.error("❌ Erro de configuração do Firebase:", error);
    }
  }
}
testConnection();

export default app;
