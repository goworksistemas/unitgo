import { useMemo } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { useAllowedTabs } from '@/hooks/useAllowedTabs';
import {
  LayoutDashboard,
  ClipboardList,
  Scale,
  Gavel,
  ShoppingBag,
  Settings,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierManagementPanel } from '@/components/purchases/admin/SupplierManagementPanel';
import { PurchaseApproversConfigPanel } from '@/components/purchases/admin/PurchaseApproversConfigPanel';

const TAB_MAP: Record<string, string> = {
  visao: 'compras_admin.visao',
  requisicoes: 'compras_admin.requisicoes',
  cotacoes: 'compras_admin.cotacoes',
  aprovacoes: 'compras_admin.aprovacoes',
  pedidos: 'compras_admin.pedidos',
  configuracoes: 'compras_admin.configuracoes',
};

export function PurchasesAdminDashboard() {
  const {
    purchaseRequests,
    quotations,
    purchaseOrders,
    isLoadingPurchases,
  } = usePurchases();
  const { canAccessTab } = useAllowedTabs();

  const navigationSections: NavigationSection[] = useMemo(() => {
    const all: NavigationSection[] = [
      { id: 'visao', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'requisicoes', label: 'Requisições', icon: ClipboardList },
      { id: 'cotacoes', label: 'Cotações', icon: Scale },
      { id: 'aprovacoes', label: 'Aprovações', icon: Gavel },
      { id: 'pedidos', label: 'Pedidos de Compra', icon: ShoppingBag },
      { id: 'configuracoes', label: 'Configurações', icon: Settings },
    ];
    return all.filter((s) => {
      const tabId = TAB_MAP[s.id];
      return !tabId || canAccessTab(tabId);
    });
  }, [canAccessTab]);

  const { activeSection, setActiveSection } = useDashboardNav(
    navigationSections,
    'Admin de Compras',
    'Operação completa do fluxo (requisição, cotação, pedido, aprovações) e parametrização de alçadas',
    'visao'
  );

  const pendingReqApprovals = purchaseRequests.filter((r) =>
    ['pending_manager', 'pending_director'].includes(r.status)
  ).length;
  const inQuotation = purchaseRequests.filter((r) =>
    ['in_quotation', 'quotation_completed'].includes(r.status)
  ).length;
  const pendingOrderApprovals = purchaseOrders.filter(
    (o) => o.statusAprovacao === 'pendente' || o.statusAprovacao === 'em_revisao'
  ).length;
  const quotationsOpen = quotations.filter((q) => q.status === 'draft' || q.status === 'sent').length;

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          Carregando módulo de compras…
        </CardContent>
      </Card>
    );
  }

  switch (activeSection) {
    case 'requisicoes':
      return (
        <AdminScreen
          title="Requisições"
          description="Visão global de todas as unidades: filtrar, acompanhar, editar, cancelar ou redirecionar. O Admin de Compras atua como gestor operacional do fluxo (não só aprovador)."
        />
      );
    case 'cotacoes':
      return (
        <AdminScreen
          title="Cotações"
          description="O Admin de Compras pode criar e conduzir cotações como um comprador: mapa comparativo, convites a fornecedores, atribuição ou troca de comprador e acompanhamento de respostas."
        />
      );
    case 'aprovacoes':
      return (
        <AdminScreen
          title="Aprovações"
          description="Fila do que está pendente (requisições e pedidos), histórico e intervenção. O mesmo perfil também executa cotações e emissão de pedidos quando necessário — aqui o foco é decidir e destravar aprovações."
          metrics={[
            { label: 'Requisições aguardando aprovação', value: pendingReqApprovals },
            { label: 'Pedidos aguardando aprovação', value: pendingOrderApprovals },
          ]}
        />
      );
    case 'pedidos':
      return (
        <AdminScreen
          title="Pedidos de compra"
          description="Emitir e acompanhar pedidos (como comprador), ver status de NF/entrega e histórico. O Admin de Compras não fica limitado à aprovação: conclui o ciclo até o pedido."
          metrics={[{ label: 'Pedidos cadastrados', value: purchaseOrders.length }]}
        />
      );
    case 'configuracoes':
      return <PurchasesAdminSettingsSection />;
    case 'visao':
    default:
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Em aprovação (requisições)"
              value={pendingReqApprovals}
              onOpen={() => setActiveSection('aprovacoes')}
            />
            <MetricCard
              title="Em cotação"
              value={inQuotation}
              onOpen={() => setActiveSection('cotacoes')}
            />
            <MetricCard
              title="Cotações abertas"
              value={quotationsOpen}
              onOpen={() => setActiveSection('cotacoes')}
            />
            <MetricCard
              title="Pedidos pendentes de aprovação"
              value={pendingOrderApprovals}
              onOpen={() => setActiveSection('aprovacoes')}
            />
          </div>

          <Card className="border-primary/25 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Papel do Admin de Compras</CardTitle>
              <CardDescription className="text-sm space-y-1.5">
                <p>
                  Mesmo poder operacional de quem administra compras: além de <strong>aprovar</strong>, pode{' '}
                  <strong>cotar</strong>, <strong>gerar pedidos</strong> e intervir em qualquer etapa.
                </p>
                <p>
                  Em <strong>Configurações</strong> você define <strong>quem aprova</strong> (por usuário), as{' '}
                  <strong>faixas de valor</strong> e os <strong>setores</strong> atendidos por cada aprovador — para
                  pedidos e, separadamente, para requisições.
                </p>
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Alertas (SLA)
              </CardTitle>
              <CardDescription>
                Itens parados além do tempo definido aparecerão aqui quando o monitoramento estiver ligado ao fluxo.
              </CardDescription>
            </CardHeader>
          </Card>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Acesso rápido</h3>
            <div className="flex flex-wrap gap-2">
              <QuickLink label="Requisições" onClick={() => setActiveSection('requisicoes')} />
              <QuickLink label="Cotações" onClick={() => setActiveSection('cotacoes')} />
              <QuickLink label="Aprovações" onClick={() => setActiveSection('aprovacoes')} />
              <QuickLink label="Pedidos" onClick={() => setActiveSection('pedidos')} />
              <QuickLink label="Configurações" onClick={() => setActiveSection('configuracoes')} />
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo do pipeline</CardTitle>
              <CardDescription>Contagem atual no sistema (requisições por macro-etapa).</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>Total de requisições: {purchaseRequests.length}</p>
              <p>Total de cotações: {quotations.length}</p>
              <p>Total de pedidos: {purchaseOrders.length}</p>
            </CardContent>
          </Card>
        </div>
      );
  }
}

function MetricCard({
  title,
  value,
  onOpen,
}: {
  title: string;
  value: number;
  onOpen: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2 text-primary" onClick={onOpen}>
          Abrir <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}

function AdminScreen({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics?: { label: string; value: number }[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{description}</p>
      </div>
      {metrics && metrics.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardHeader className="pb-2">
                <CardDescription>{m.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{m.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Listas, filtros e ações desta tela serão ligadas ao fluxo na sequência da implementação.
        </CardContent>
      </Card>
    </div>
  );
}

function PurchasesAdminSettingsSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Configurações</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Exclusivas do Admin de Compras: aprovadores e alçadas, compradores e unidades atendidas, fornecedores.
        </p>
      </div>
      <Tabs defaultValue="aprovadores" className="w-full">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/50 p-1">
          <TabsTrigger value="aprovadores" className="text-xs sm:text-sm">
            Aprovadores
          </TabsTrigger>
          <TabsTrigger value="compradores" className="text-xs sm:text-sm">
            Compradores
          </TabsTrigger>
          <TabsTrigger value="fornecedores" className="text-xs sm:text-sm">
            Fornecedores
          </TabsTrigger>
        </TabsList>
        <TabsContent value="aprovadores" className="mt-4">
          <PurchaseApproversConfigPanel />
        </TabsContent>
        <TabsContent value="compradores" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compradores</CardTitle>
              <CardDescription>Quais usuários são compradores e quais unidades cada um atende.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Matriz comprador × unidades e redistribuição de filas entra nesta seção.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fornecedores" className="mt-4">
          <SupplierManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
