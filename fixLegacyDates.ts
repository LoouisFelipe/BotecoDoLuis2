import { collection, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './src/firebase';
import { parseAsSaoPaulo, getShiftDate } from './src/lib/utils';
import { toast } from 'sonner';

/**
 * Script de Auditoria e Correção de Datas (Versão Gold)
 * Resolve Timestamps vs Strings e aplica a Regra de Expediente (06h).
 * Foco em: Resiliência total e Type-Safety.
 */
export async function migrateLegacyDatesToTimestamp() {
    try {
        const isBrowser = typeof window !== 'undefined';
        
        if (isBrowser) {
            toast.loading('Iniciando auditoria e correção em massa...');
        } else {
            console.log('⏳ Iniciando auditoria e correção em massa...');
        }

        const collectionsToFix = ['transactions', 'expenses', 'purchases', 'game_sessions', 'closed_orders'];
        let totalUpdated = 0;

        for (const colName of collectionsToFix) {
            console.log(`🔍 Auditando coleção: ${colName}`);

            const snapshot = await getDocs(collection(db, colName));
            let batch = writeBatch(db);
            let opCount = 0;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                let needsUpdate = false;
                let updatePayload: any = {};

                // 1. Extração segura da data principal
                // Alguns documentos podem usar 'date', outros 'closedAt' ou 'createdAt'
                const rawDate = data.date || data.closedAt || data.createdAt;
                let dateObj: Date | null = null;

                if (!rawDate) continue;

                // Identificar o tipo e converter para DateObj
                if (typeof rawDate === 'string') {
                    // FORMATO LEGADO: String - PRECISA DE CONVERSÃO
                    try {
                        dateObj = parseAsSaoPaulo(rawDate);
                        updatePayload.date = Timestamp.fromDate(dateObj);
                        needsUpdate = true;
                    } catch (e) {
                        console.error(`Falha ao converter string para data no doc ${docSnap.id}:`, rawDate);
                        continue;
                    }
                } else if (rawDate instanceof Timestamp) {
                    dateObj = rawDate.toDate();
                } else if (rawDate && typeof rawDate === 'object' && 'seconds' in rawDate) {
                    // Caso o Firebase retorne um objeto plano ou instanceof falhe por versão do SDK
                    dateObj = new Date(rawDate.seconds * 1000);
                    // Se não for uma instância real de Timestamp, padronizamos no banco para evitar problemas futuros
                    if (!(rawDate instanceof Timestamp)) {
                        updatePayload.date = Timestamp.fromDate(dateObj);
                        needsUpdate = true;
                    }
                } else if (rawDate instanceof Date) {
                    dateObj = rawDate;
                    updatePayload.date = Timestamp.fromDate(dateObj);
                    needsUpdate = true;
                }

                // 2. Validação da Regra de Expediente (06:00 AM)
                if (dateObj) {
                    const shiftDate = getShiftDate(dateObj);
                    
                    // Definir qual campo de expediente checar baseando-se na coleção
                    const shiftField = colName === 'closed_orders' ? 'closedShiftDate' : 'dataExpediente';
                    const currentShiftValue = data[shiftField];

                    if (currentShiftValue !== shiftDate) {
                        updatePayload[shiftField] = shiftDate;
                        needsUpdate = true;
                    }
                }

                // 3. Execução do Batch
                if (needsUpdate) {
                    batch.update(docSnap.ref, updatePayload);
                    opCount++;
                    totalUpdated++;

                    if (opCount >= 450) {
                        await batch.commit();
                        batch = writeBatch(db);
                        opCount = 0;
                    }
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }
        }

        if (isBrowser) {
            toast.success(`Correção finalizada! ${totalUpdated} registros corrigidos.`);
        }
        console.log(`✅ Sucesso! Total de ${totalUpdated} documentos sincronizados.`);

    } catch (error) {
        console.error("❌ Erro fatal na migração:", error);
        if (isBrowser) {
            toast.error('Erro na migração. Verifique o console.');
        }
    }
}
