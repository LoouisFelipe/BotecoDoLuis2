# 📊 Boteco do Luis - Métricas e Relatórios (Reporting Metrics)
> **Agente Principal:** Product Strategist & Database Architect

Este arquivo define as regras matemáticas e indicadores de sucesso (KPIs) para a extração de relatórios e painéis financeiros do sistema do Boteco. Todas as manutenções arquiteturais feitas no código devem respeitar as diretrizes abaixo.

## 1. Fórmulas Financeiras e Margens
Sempre que o sistema precisar calcular lucros ou programar a tela de DRE (Demonstrativo do Resultado), as seguintes bases se aplicam:

### A. Valores de Base
- **Preço de Venda (PV):** Valor final pago pelo cliente (Ex: R$ 10,00).
- **Preço de Custo (PC):** Custo de aquisição do item (Ex: R$ 5,00).

### B. Lucro Bruto
- **Fórmula:** PV - PC (Ex: R$ 10,00 - R$ 5,00 = R$ 5,00)
- Representa a lucratividade da operação nua, sem considerar o método pelo qual o cliente escolheu pagar.

### C. Taxas de Transação (Cartão/Outros)
Cada método de pagamento gera uma dedução percentual do seu faturamento bruto.
- **Dinheiro / PIX:** Taxa 0%.
- **Cartão de Crédito/Débito:** Taxas cadastradas por operador e antecipação (ex: 3%).
*(Nota de Implementação do Produto: A taxa deve ser deduzível a partir do montante financiado por aquele respectivo método).*

### D. Lucro Líquido Real ("Dinheiro no Bolso")
- **Receita Líquida:** Preço de Venda - Taxa de Transação do Método.
- **Lucro Líquido:** Receita Líquida - Preço de Custo.
- **Exemplo de Fluxo Aplicado:**
  - Venda: `R$ 10,00`
  - Custo do Produto: `R$ 5,00`
  - Pagamento no Cartão (Exemplo Abstrato deduzido sobre margem/taxa resultando em 0,15 de desconto): `R$ -0,15`
  - **Lucro Bruto Operacional:** `R$ 5,00`
  - **Lucro Líquido Após Taxas:** `R$ 4,85`

### E. Despesas Operacionais e Entradas de Estoque (Outflows)
- O Custo do Produto (PV) é abatido por item vendido na métrica de Lucro. No entanto, o ato de **Comprar do Fornecedor** gera um Desembolso de Caixa (Despesa Operacional) no fluxo financeiro do boteco no dia que acontece.
- O Caixa Diário deve prever: *(Recebimento Real de Comandas ou Fiados) MINUS (Pagamento a Fornecedores/Compras do Dia)*.

## 2. Visões Obrigatórias para Relatórios

1. **Dashboard de Vendas Diárias (Por Expediente):** Separar obrigatoriamente "Venda Realizada/Recebida" vs "Venda Fiada (Contas a Receber)". O filtro de "Hoje" deve considerar a regra de Expediente (madrugadas pertencem ao dia anterior).
2. **Produtos Mais Rentáveis vs Mais Vendidos:** Um produto que vende muito não necessariamente é o que traz mais Lucro Líquido por conta das taxas ou alto custo, devemos priorizar análises de Markup.
3. **Controle de Inadimplência:** Somatório total do capital parado de clientes cujo status é 'Em Débito'.
