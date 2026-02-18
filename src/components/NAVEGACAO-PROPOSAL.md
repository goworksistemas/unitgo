# Proposta de Nova Navegação - Sistema Escalável

## Problema Atual
O sistema usa tabs horizontais que ficam limitadas quando o sistema cresce. Com a adição de:
- Sistema de Estoque Geral
- Sistema de Solicitação de Compras (futuro)

As tabs ficarão sobrecarregadas e difíceis de navegar.

## Solução Proposta: Navegação Lateral Modular

### Estrutura de Módulos

```
📦 Módulos Principais
├── 🏠 Estoque
│   ├── Móveis
│   ├── Materiais
│   ├── Empréstimos
│   └── Recebimentos
├── 🛒 Solicitações de Compra (futuro)
│   ├── Criar Solicitação
│   ├── Minhas Solicitações
│   └── Aprovações
└── 📊 Relatórios (futuro)
    ├── Estoque
    └── Movimentações
```

### Benefícios

1. **Escalável**: Fácil adicionar novos módulos sem sobrecarregar a UI
2. **Organizado**: Hierarquia clara de funcionalidades
3. **Responsivo**: Sidebar colapsável em mobile
4. **Consistente**: Mesma estrutura em todos os dashboards

### Implementação

- Componente `DashboardNavigation` para navegação lateral
- Cada dashboard define suas próprias seções
- Renderização condicional do conteúdo baseado na seção ativa
- Mantém toda funcionalidade existente

### Próximos Passos

1. ✅ Criar componente DashboardNavigation
2. ⏳ Refatorar ControllerDashboard como exemplo
3. ⏳ Aplicar em outros dashboards
4. ⏳ Preparar estrutura para módulo de Solicitações de Compra

