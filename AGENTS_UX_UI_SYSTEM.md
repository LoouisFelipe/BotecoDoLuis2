# 🎨 Boteco do Luis - Design System (UX/UI System)
> **Agente Principal:** Frontend Specialist

## 1. Princípios Gerais da Aplicação
- Mobile-First absoluto. O sistema rola no bar, atrás do balcão, com uma mão suja, precisa de clareza visual e zonas de clique grandes (`Hitboxes`). Menus e inputs devem adotar larguras confortáveis para o touch.

## 2. Cores e Identidade Semântica
- **Theme Principal:** Tema Escuro (para confortar os olhos no ambiente do bar) com fundo azul/preto esmeralda (`#05070a`).
- **Interfaces e Cards:** Cinzas de alto contraste (`#0d1117`, `bg-[#161b22]`).
- **Marcações Primárias:** Azul vibrante (`#0070f3`) para tudo que for "Avançar", "Salvar", "Criar" (CTA).

## 3. Regras de Feedback Visual (Semântica Dinâmica)
Para facilitar a resposta rápida na operação do Boteco:
- **Cor Neutra:** `text-muted-foreground`
- **Débito, Calote, Conta a Pagar, Excluir:** Vermelhos/Alaranjados de perigo (`text-red-500` / `ring-red-500`). Representa "o cliente me deve".
- **Crédito, Pagamento Bem-sucedido:** Verde radiante (`text-green-500`). Representa dinheiro recebido/no bolso da casa.

## 4. Comportamento UI
- Utilizar animações limpas em Modais ou trocas de aba via `framer-motion` (Entradas suaves na tela).
- Botões de seleção como Categorias, A-Z, Saldos, devem preferir um formato em pílula ou blocos arredondados, evitando Dropdowns tradicionais complexos durante telas de grande conversão como fechamento de conta.
