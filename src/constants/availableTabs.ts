/**
 * Catálogo global de abas do sistema para controle de acesso
 */

export interface TabItem {
  id: string;
  label: string;
}

export interface TabCategory {
  label: string;
  tabs: TabItem[];
}

export const AVAILABLE_TABS: TabCategory[] = [
  {
    label: 'Compras (Buyer)',
    tabs: [
      { id: 'compras.solicitacoes', label: 'Solicitações Aprovadas' },
      { id: 'compras.cotacoes', label: 'Cotações' },
      { id: 'compras.pedidos', label: 'Pedidos' },
      { id: 'compras.aprovacoes', label: 'Aprovações Financeiras' },
      { id: 'compras.fornecedores', label: 'Fornecedores' },
    ],
  },
  {
    label: 'Compras (Admin)',
    tabs: [
      { id: 'compras.gestor', label: 'Solicitações Gestor' },
      { id: 'compras.diretoria', label: 'Aprovações Diretoria' },
      { id: 'compras.centros_custo', label: 'Centros de Custo' },
      { id: 'compras.contratos', label: 'Contratos' },
    ],
  },
  {
    label: 'Estoque',
    tabs: [
      { id: 'estoque.materiais', label: 'Materiais' },
      { id: 'estoque.moveis', label: 'Móveis' },
      { id: 'estoque.emprestimos', label: 'Empréstimos' },
    ],
  },
  {
    label: 'Almoxarifado',
    tabs: [
      { id: 'almox.visao', label: 'Visão Geral' },
      { id: 'almox.solicitacoes', label: 'Solicitações' },
      { id: 'almox.logistica', label: 'Logística' },
    ],
  },
  {
    label: 'Financeiro',
    tabs: [
      { id: 'financeiro.visao', label: 'Visão Executiva' },
      { id: 'financeiro.contratos', label: 'Contratos' },
      { id: 'financeiro.centros_custo', label: 'Centros de Custo' },
      { id: 'financeiro.alertas', label: 'Alertas' },
      { id: 'financeiro.relatorios', label: 'Relatórios' },
    ],
  },
  {
    label: 'Solicitante',
    tabs: [
      { id: 'solicitante.estoque', label: 'Estoque Disponível' },
      { id: 'solicitante.nova', label: 'Nova Solicitação' },
      { id: 'solicitante.minhas', label: 'Minhas Solicitações' },
      { id: 'solicitante.recebimentos', label: 'Recebimentos' },
    ],
  },
  {
    label: 'Designer',
    tabs: [
      { id: 'designer.visao', label: 'Visão Geral' },
      { id: 'designer.projetos', label: 'Pedidos das unidades' },
    ],
  },
  {
    label: 'Motorista',
    tabs: [
      { id: 'motorista.entregas', label: 'Entregas' },
    ],
  },
  {
    label: 'Admin',
    tabs: [
      { id: 'admin.usuarios', label: 'Gestão de Usuários' },
      { id: 'admin.unidades', label: 'Gestão de Unidades' },
      { id: 'admin.produtos', label: 'Catálogo de Produtos' },
      { id: 'admin.grupos_acesso', label: 'Grupos de Acesso' },
    ],
  },
];

export const ALL_TAB_IDS = AVAILABLE_TABS.flatMap((c) => c.tabs.map((t) => t.id));
export const TAB_LABEL_MAP = new Map(AVAILABLE_TABS.flatMap((c) => c.tabs.map((t) => [t.id, t.label])));
