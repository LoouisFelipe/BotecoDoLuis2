import React, { useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, setDoc, doc, writeBatch } from 'firebase/firestore';
import { db as destDb } from '../firebase';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Database, ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SOURCE_CONFIG = {
  projectId: "bardoluis",
  appId: "1:392644795631:web:a329f6b840cef328a64f1a",
  apiKey: "AIzaSyDtvFpzCvrgsboJuMh7uDWOUzqTm4qjP98",
  authDomain: "bardoluis-86e9e.firebaseapp.com",
  firestoreDatabaseId: "bard0luis",
  storageBucket: "bardoluis.firebasestorage.app",
  messagingSenderId: "392644795631"
};

const COLLECTIONS = [
  'categories',
  'products',
  'customers',
  'suppliers',
  'game_modalities',
  'open_orders',
  'transactions',
  'expenses',
  'recurring_expenses',
  'purchases',
  'payment_fees',
  'bi_summaries',
  'users'
];

export function MigrationTool() {
  const [status, setStatus] = useState<'idle' | 'migrating' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentCollection, setCurrentCollection] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const startMigration = async () => {
    setStatus('migrating');
    setLogs([]);
    addLog('Iniciando migração...');

    try {
      // Initialize Source App
      let sourceApp;
      if (getApps().find(app => app.name === 'sourceApp')) {
        sourceApp = getApp('sourceApp');
      } else {
        sourceApp = initializeApp(SOURCE_CONFIG, 'sourceApp');
      }
      const sourceDb = getFirestore(sourceApp, SOURCE_CONFIG.firestoreDatabaseId);

      for (let i = 0; i < COLLECTIONS.length; i++) {
        const collName = COLLECTIONS[i];
        setCurrentCollection(collName);
        addLog(`Migrando coleção: ${collName}...`);
        
        let snapshot;
        try {
          snapshot = await getDocs(collection(sourceDb, collName));
        } catch (readErr) {
          addLog(`ERRO DE LEITURA em ${collName}: ${readErr instanceof Error ? readErr.message : 'Sem permissão no banco antigo'}`);
          continue; // Tenta a próxima coleção
        }

        const docsCount = snapshot.size;
        addLog(`Encontrados ${docsCount} documentos em ${collName}`);

        if (docsCount > 0) {
          let count = 0;
          const docs = snapshot.docs;
          
          for (let j = 0; j < docs.length; j += 500) {
            const batch = writeBatch(destDb);
            const chunk = docs.slice(j, j + 500);
            
            chunk.forEach(d => {
              batch.set(doc(destDb, collName, d.id), d.data());
              count++;
            });
            
            try {
              await batch.commit();
              addLog(`Progresso em ${collName}: ${count}/${docsCount}`);
            } catch (writeErr) {
              addLog(`ERRO DE GRAVAÇÃO em ${collName}: ${writeErr instanceof Error ? writeErr.message : 'Sem permissão no banco novo'}`);
              break;
            }
          }
        }

        setProgress(((i + 1) / COLLECTIONS.length) * 100);
      }

      setStatus('completed');
      addLog('Migração concluída com sucesso!');
      toast.success('Dados migrados com sucesso!');
    } catch (error) {
      console.error('Erro na migração:', error);
      setStatus('error');
      addLog(`ERRO: ${error instanceof Error ? error.message : String(error)}`);
      toast.error('Falha na migração de dados');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="border-border bg-card/50 rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter">Migração de Dados</CardTitle>
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Transferência entre Projetos Firebase</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-center gap-12 py-8">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-border flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Origem</p>
              <p className="text-xs font-black">bardoluis</p>
            </div>
            
            <ArrowRight className="w-8 h-8 text-primary animate-pulse" />

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <Database className="w-8 h-8 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Destino</p>
              <p className="text-xs font-black">botecodoluis2</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-yellow-500 uppercase tracking-tight">Atenção</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este processo irá sobrescrever documentos com o mesmo ID no banco de destino. 
                Certifique-se de que o banco de origem está acessível e as regras de segurança permitem a leitura.
              </p>
            </div>
          </div>

          {status === 'migrating' && (
            <div className="space-y-4">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span>Migrando: {currentCollection}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <div className="flex justify-center">
            <Button 
              onClick={startMigration} 
              disabled={status === 'migrating'}
              className="h-14 px-12 rounded-xl gap-3 font-bold tracking-widest uppercase shadow-lg shadow-primary/20"
            >
              {status === 'migrating' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  Iniciar Migração
                </>
              )}
            </Button>
          </div>

          {logs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Logs do Processo</p>
              <div className="bg-black/40 rounded-xl p-4 h-48 overflow-y-auto font-mono text-[10px] space-y-1 border border-border">
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    log.includes('ERRO') ? 'text-red-500' : 
                    log.includes('concluída') ? 'text-green-500' : 'text-muted-foreground'
                  )}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
