import { collection, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './src/firebase';
import { parseAsSaoPaulo, getShiftDate } from './src/lib/utils';
import { toast } from 'sonner';

/**
 * Script de Auditoria e Correção de Datas
 * Corrige transações com erro de data, converte para Timestamp do Firestore
 * e aplica a Regra de Expediente: transações após as 06:00 AM pertencem ao dia civil corrente.
 */
export async function migrateLegacyDatesToTimestamp() {
    try {
        if (typeof window !== 'undefined') {
            toast.loading('Iniciando auditoria e correção de Datas e Expediente...');
        } else {
            console.log('⏳ Iniciando auditoria e correção de Datas e Expediente...');
        }

        const snapshot = await getDocs(collection(db, 'transactions'));

        let batches = [];
        let currentBatch = writeBatch(db);
        let opCount = 0;
        let totalUpdated = 0;

        snapshot.forEach((doc) => {
            const data = doc.data();
            let needsUpdate = false;
            let updatePayload: any = {};

            // 1. Extração segura da data (Type-safe)
            const dataRaw = data.closedAt || data.date;
            let correctDate: Date;

            if (dataRaw instanceof Timestamp) {
                correctDate = dataRaw.toDate();
            } else if (typeof dataRaw === 'string') {
                correctDate = parseAsSaoPaulo(dataRaw);
            } else if (dataRaw && typeof dataRaw === 'object' && 'seconds' in dataRaw) {
                // Objeto plano que representa um Timestamp
                correctDate = new Date(dataRaw.seconds * 1000);
            } else if (dataRaw?.toDate && typeof dataRaw.toDate === 'function') {
                correctDate = dataRaw.toDate();
            } else {
                correctDate = parseAsSaoPaulo(dataRaw || '');
            }

            // 2. Identifica se precisa de correção (Apenas formato legado String ou erro de data)
            const isLegacyString = typeof data.date === 'string';
            const isMissingDataExpediente = !data.dataExpediente;
            const shiftDateStr = getShiftDate(correctDate);
            const isWrongShiftDate = data.dataExpediente !== shiftDateStr;

            if (isLegacyString) {
                updatePayload.date = Timestamp.fromDate(correctDate);
                needsUpdate = true;
            }

            if (isMissingDataExpediente || isWrongShiftDate) {
                updatePayload.dataExpediente = shiftDateStr;
                needsUpdate = true;
            }

            // Correção adicional: garantir que closedAt também seja Timestamp se existir como string
            if (data.closedAt && typeof data.closedAt === 'string') {
                updatePayload.closedAt = Timestamp.fromDate(parseAsSaoPaulo(data.closedAt));
                needsUpdate = true;
            }

            if (needsUpdate) {
                currentBatch.update(doc.ref, updatePayload);
                opCount++;
                totalUpdated++;

                // Limite rígido do Firestore de operações por Batch (Máx 500)
                if (opCount >= 490) {
                    batches.push(currentBatch.commit());
                    currentBatch = writeBatch(db);
                    opCount = 0;
                }
            }
        });

        // Executa o que sobrou no último lote
        if (opCount > 0) {
            batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
        
        if (typeof window !== 'undefined') {
            toast.success(`Auditoria concluída! ${totalUpdated} registros foram corrigidos.`);
        }
        console.log(`✅ ${totalUpdated} documentos atualizados (Timestamps e dataExpediente).`);

    } catch (error) {
        console.error("Erro durante a migração das datas:", error);
        if (typeof window !== 'undefined') {
            toast.error('Ocorreu um erro durante a migração. Verifique o console.');
        }
    }
}

// Auto-run if executed directly via node/tsx
if (typeof process !== 'undefined' && process.env) {
    // Only run if we are in a CLI context (not in a browser build)
    // We check for a specific flag or just assume if it's the main module
    migrateLegacyDatesToTimestamp().then(() => {
        if (typeof window === 'undefined') process.exit(0);
    }).catch(err => {
        console.error(err);
        if (typeof window === 'undefined') process.exit(1);
    });
}
