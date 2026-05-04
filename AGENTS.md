# 🤖 Ecossistema de Agentes - Boteco do Luis (v2.0 - Centralizado)

Este projeto opera sob um regime de **Orquestração Inteligente**, onde cada decisão técnica passa pelo crivo de especialistas dedicados.

## 📋 Quadro de Especialistas & Protocolos

| Agente | Especialidade Principal | Protocolo de Atuação |
|--------|-------------------------|-----------------------|
| **Orchestrator** | Gestão de Fluxo & Síntese | Garante a comunicação entre os silos e alinhamento com a visão do CEO. |
| **Product Strategist** | Negócio & ROI | Valida o impacto financeiro (CFO) de cada nova feature ou mudança. |
| **Frontend Articulator**| UI/UX Operacional | Foco em Next.js/Tailwind, performance de balcão e ausência de "Purple Ban". |
| **Cloud Architect** | Firestore & Firebase | Estruturação de dados para escala e minimização de leituras (cost-saving). |
| **Security Auditor** | Zero Trust & PII | Auditoria obrigatória de Firebase Rules e proteção de dados sensíveis. |
| **Quality & CX** | Estabilidade & Bugs | Prevenção de regressões e garantia de que o PDV nunca trave em pico de movimento. |

## 🔄 Protocolo de "Handshake"
Nenhuma mudança em banco de dados ocorre sem o **Security Auditor** validar as regras. Nenhuma mudança visual ocorre sem o **Product Strategist** confirmar que isso ajuda na operação do boteco.

---

## 📋 1. Regras de Negócio (Business Rules)
*Agente Responsável: Quality Engineer & Orchestrator*

### Gestão de Comandas e Expediente
- **Lançamento:** Todo pedido deve estar atrelado a uma comanda (Avulsa ou Vinculada).
- **Conexão Total:** Fechar comanda impacta simultaneamente: Baixa no Estoque (Produtos), Saldo do Cliente (se for Fiado), e Entrada Financeira (Receitas).
- **Expediente Lógico:** Madrugadas (00:00 - 05:59) pertencem ao dia anterior. Use `dataExpediente` para agrupamento lógico de relatórios.

### Fluxo Financeiro & Fiado
- Clientes possuem saldo (`balance`). Finalizar sem pagamento gera Débito. Adiantamentos geram Crédito.
- **Estoque:** Compras aumentam quantidade, atualizam Preço de Custo e geram Saída no Financeiro.
- **Fracionados:** Suporte para doses abatidas de garrafas.

### Segurança & Integridade
- Role `admin` exigida para modificação de saldo ou reabertura de comandas.
- **Soft Delete:** Nunca apagar registros permanentemente, apenas mudar status para assegurar log.

---

## 📊 2. Inteligência de Métricas (Reporting)
*Agente Responsável: Product Strategist & Cloud Architect*

- **Lucro Líquido Real:** `(Preço de Venda - Taxa Transação) - Preço de Custo`. Taxas de cartões devem ser parametrizáveis.
- **CMV (Custo de Mercadoria Vendida):** Preço de custo é usado para cálculo de margem no momento da venda.
- **Saída de Caixa:** Compras do fornecedor são saídas imediatas no fluxo financeiro do dia.
- **KPIs Decisivos:** Health Score (`Entradas Reais / (Saídas + Fixos)`), Inadimplência Real-time (`fiel_balance`), e Ranking de Markup.

---

## 🎨 3. Design System (UX/UI System)
*Agente Responsável: Frontend Articulator*

- **Estética:** Industrial & Command Center (Painel de Operação Crítica).
- **Elementos Visuais:** Bordas `rounded-[40px]`, fontes mono (`tabular-nums`) para valores, headers `uppercase tracking-widest`.
- **Purple Ban:** PROIBIDO o uso de roxos/violetas genéricos de SaaS. Se parecer um "Stripe Clone", está errado.
- **Hitboxes:** Mínimo `h-14` no mobile. Feedback visual instantâneo com pulses ou badges brilhantes.

---

## 🛠️ 4. Diretrizes Técnicas dos Especialistas

### Frontend Articulator
- Uso rigoroso de Tailwind Design Tokens e micro-interações via `motion`.
- Performance: Lazy loading e prioridade LCP para carregamento instantâneo.

### Cloud Architect (Database)
- Desnormalização estratégica para performance. Queries indexadas e baratas.
- Validação de tipos rigorosa antes de qualquer gravação (`setDoc`/`addDoc`).

### Security Auditor
- Auditoria Zero-Trust em `firestore.rules`. Isolamento total de PII e Princípio do Menor Privilégio.

### Quality & CX
- Prevenção de regressões. Debugging proativo e tratamento de erros visível para o staff.
- Consistência total entre o estado do banco e o que aparece na tela (Real-time).
