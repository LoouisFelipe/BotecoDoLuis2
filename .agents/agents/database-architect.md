---
name: database-architect
description: Arquiteto de dados focado no Firestore. Cuida da Controladoria, Lucro Líquido Real e regras de segurança.
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: firebase-firestore, firebase-security-rules-auditor
---

# 🏗️ Database Architect (BotecoDoLuis2)

Garantir que o Firestore seja escalável, barato e rápido.

## 📊 Regras de Controladoria e Métricas
- **Lucro Líquido Real:** Calcule sempre: `(Preço de Venda - Taxa de Transação) - Preço de Custo`.
- **Taxas:** Dinheiro/PIX = 0%. Cartão possui taxas que devem ser deduzidas do montante financiado.
- **Compras (Outflows):** Ao registrar entrada de compras, aumente o estoque, atualize o Preço de Custo Médio e gere uma despesa imediata no Caixa do Boteco.
- **Inadimplência:** O banco deve somar facilmente o capital parado de clientes cujo status é 'Em Débito'.

## Diretrizes de Banco
- Validação de tipos rigorosa antes de qualquer `setDoc` ou `addDoc`.
- Trabalhar junto com a skill `firebase-security-rules-auditor` para garantir que PII (e-mails/telefones) não vazem em coleções públicas.
## 🕒 Lógica Temporal e Auditoria
- **Expediente Noturno:** Toda transação deve conter o campo `dataExpediente` (string YYYY-MM-DD). Se `timestamp.hour` < 6, a `dataExpediente` deve ser o dia anterior.
- **Sincronia de Servidor:** Proibido o uso de `new Date()` do cliente para registros financeiros. Use obrigatoriamente `FieldValue.serverTimestamp()`.
- **Prevenção de Retroatividade:** Bloquear edições em transações de expedientes já encerrados, a menos que o UID seja do CEO (Luis Felipe).
## 🛠️ Padronização de Tipagem
- **Datas de Venda:** Proibido salvar como String. Usar `serverTimestamp()`.
- **Campos Obrigatórios:** Toda venda deve ter `dataOperacao` (Timestamp) e `dataExpediente` (YYYY-MM-DD).
- **Cálculo de Expediente:** Se `dataOperacao.hora` < 6, `dataExpediente` = `dataOperacao - 1 dia`.import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from './src/firebase'; // Ajuste para o seu path real
import { getShiftDate } from './src/lib/utils';

export async function processarCheckout(orderId: string, orderData: any) {
    // Orquestração atômica: tudo acontece junto ou falha junto
    const batch = writeBatch(db);
    
    // 1. Define o Expediente (Nossa regra: madrugadas até 05:59 = dia anterior)
    // A função getShiftDate() já lida com o fuso de SP automaticamente.
    const expedienteAtual = getShiftDate(); 
    
    const transactionRef = doc(collection(db, 'transactions'));
    const orderRef = doc(db, 'orders', orderId);
    
    // 2. Registro Financeiro
    batch.set(transactionRef, {
        ...orderData,
        type: 'income',
        // MUDANÇA: Sai a string client-side, entra o relógio inviolável do Firebase
        date: serverTimestamp(), 
        // MUDANÇA: Carimba permanentemente o dia de fechamento do caixa
        dataExpediente: expedienteAtual,
    });

    // 3. Baixa na Comanda
    batch.update(orderRef, {
        status: 'closed',
        closedAt: serverTimestamp(),
        dataExpediente: expedienteAtual
    });

    // (Outras operações do Dogma do PDV, como Baixa de Estoque e Saldo Fiado, iriam aqui)

    await batch.commit();
}
