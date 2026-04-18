# 📋 Boteco do Luis - Regras de Negócio (Business Rules)
> **Agente Principal:** Quality Engineer & Orchestrator

## 1. Gestão de Comandas e Expediente (Shift)
- **Lançamento:** Todo pedido do sistema deve estar atrelado a uma comanda (seja ela Avulsa para quem paga no balcão, ou Vinculada a um Cliente Fiel).
- **Conexão Total:** A comanda é o coração do sistema. Fechar uma comanda impacta simultaneamente: Baixa no Estoque (Produtos), alteração de Saldo do Cliente (se for Fiado), e Entrada Financeira (Receitas).
- **Regra de "Expediente" (Business Day):** O boteco funciona de madrugada. Fechamentos realizados após a meia-noite (ex: 02h00 da manhã) NÃO pertencem ao dia de calendário atual, mas sim ao "Expediente" do dia anterior. 
  - *Lógica de Implementação:* Todo registro financeiro e de comanda deve carregar a `dataHoraFisica` (timestamp real) e a `dataExpediente` (data lógica, onde horas entre 00:00 e 05:59 pertencem ao dia anterior).

## 2. Tratamento de "Fiado" e Fluxo Financeiro
- Clientes no Boteco tem uma conta (`balance`) como um saldo flutuante.
- Quando uma comanda é finalizada sem que o pagamento total tenha sido feito, o sistema registrará a venda, dará baixa no estoque, mas o valor restante incide na Carteira do Cliente como um Débito (Valor Negativo).
- Adiantamentos feitos pelo cliente ao boteco geram Crédito (Valor Positivo) que deve ser abatido ativamente nas próximas comandas.

## 3. Compras, Fornecedores e Estoque
- **Gestão de Fornecedores:** O sistema deve cadastrar fornecedores para manter o histórico de compras.
- **Entrada de Compras:** Ao realizar uma compra, o sistema deve:
  1. Aumentar a quantidade do produto no Estoque.
  2. Atualizar o novo Preço de Custo (Custo Médio ou Custo Direto da última compra).
  3. Gerar uma despesa (Saída) no Financeiro, subtraindo do Caixa do Boteco.
- **Produtos Fracionados:** Os produtos vendidos podem ser fracionados (como "Doses" abatidas de Garrafas) para melhorar o controle antifraude e o controle do barman.

## 4. Segurança e Fechamento
- Modificações de Saldo ou reabertura de comandas exigem role (cargo) de \`admin\`.
- Nunca apagar registros permanentemente, adotar "Soft Delete" mudando apenas o status para "Cancelada/Excluída" para assegurar log.
