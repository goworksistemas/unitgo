import { Scale, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BuyerApprovalTiersInfoPanel() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Alçadas de aprovação</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Visão do fluxo de decisão para solicitações de compra e pedidos. Ajustes finos são feitos pelo administrador
          de compras.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" aria-hidden />
            </div>
            <CardTitle className="text-sm pt-2">Solicitação de compra</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Normalmente passa por gestor da área e, conforme valor ou política, diretoria.</p>
            <p className="text-xs">Status como “pendente gestor” ou “pendente diretoria” refletem essa fila.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <Scale className="h-4 w-4" aria-hidden />
            </div>
            <CardTitle className="text-sm pt-2">Pedido de compra</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Após cotação e escolha do fornecedor, o PC pode exigir nova alçada antes da emissão.</p>
            <p className="text-xs">Acompanhe em <strong className="text-foreground">Aprovações</strong> no menu Compras.</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </div>
            <CardTitle className="text-sm pt-2">Quem altera as regras</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Perfis administrativos cadastram aprovadores, limites e papéis no sistema de alçadas.</p>
            <p className="text-xs">O comprador executa o fluxo; não altera parametrização aqui.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-border/80 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Precisa de mudança de alçada?</CardTitle>
          <CardDescription>
            Solicite ao administrador de compras ou ao time de TI — eles acessam a tela de configuração com permissões
            elevadas.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
