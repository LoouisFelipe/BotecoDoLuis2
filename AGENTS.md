# 🤖 Ecossistema de Agentes - Boteco do Luis 360

**Nota de Arquitetura:** As instruções operacionais e as skills nativas (Firebase) de cada agente detalhado abaixo estão configuradas individualmente na pasta oculta `.agents/agents/`. Este documento serve como a visão consolidada de negócio e regras (Business Rules & Design System).

Este projeto opera sob um regime de **Orquestração Inteligente** utilizando o Antigravity Kit. Nenhuma decisão técnica ocorre sem passar pelos especialistas.

## 📋 1. Regras de Negócio (Business Rules)
*Atenção: Todos os agentes devem respeitar estas regras antes de sugerir códigos.*

### Gestão de Comandas e Expediente
- **Lançamento:** Todo pedido deve estar atrelado a uma comanda.
- **Conexão Total (Dogma do PDV):** Fechar comanda impacta simultaneamente: Baixa no Estoque, Saldo do Cliente (Fiado), e Entrada Financeira. NUNCA faça um sem o outro.
- **Expediente Lógico:** Madrugadas (00:00 - 05:59) pertencem ao dia anterior (`dataExpediente`).

### Fluxo Financeiro & Segurança
- **Lucro Líquido Real:** `(Preço de Venda - Taxa Transação) - Preço de Custo`.
- **Soft Delete:** Nunca apagar registros permanentemente, apenas mude o status.
- **Bypass do CEO:** O UID `e5SB016rBhWuYEKifTIYSCfE5Bq2` (Luis Felipe) tem acesso irrestrito a todas as coleções no Firebase.

---

## 🎨 2. Design System (UX/UI System)
- **Estética:** Industrial & Command Center (Painel de Operação Crítica para o balcão).
- **Elementos Visuais:** Bordas `rounded-[40px]`, fontes mono (`tabular-nums`) para valores, headers `uppercase tracking-widest`.
- **Purple Ban:** PROIBIDO o uso de roxos/violetas genéricos de SaaS. 
- **Hitboxes:** Mínimo `h-14` no mobile (foco no garçom). Feedback visual instantâneo.

---

## 🛠️ 3. Gatilhos de Agentes (Como Operamos)

Para modificar este sistema, utilize os Comandos Slash (`/`) ou invoque os agentes diretamente:

1. **O Maestro (`/orchestrator` ou `@orchestrator`):**
   *Sempre* inicie tarefas complexas com o Orchestrator. Ele dividirá o trabalho entre o Frontend e o Banco de dados.

2. **A Visão do Negócio (`@product-owner`):**
   Use para validar impacto financeiro e evitar "feature creep".

3. **O Balcão (`@frontend-specialist`):**
   Uso rigoroso do Design System acima. Foco em Lazy loading e carregamento instantâneo. Nenhuma tela deve travar em pico de movimento.

4. **A Infraestrutura (`@database-architect` + `@backend-specialist`):**
   Validação rigorosa antes de `setDoc`/`addDoc`. Queries indexadas. 

5. **A Blindagem (`@security-auditor`):**
   Toda mudança no `firestore.rules` exige auditoria Zero-Trust e Princípio do Menor Privilégio.

6. **Zero-Gap (`@test-engineer`):**
   Prevenção de regressões. Depuração proativa.