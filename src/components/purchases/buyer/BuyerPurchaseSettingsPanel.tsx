import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

export function BuyerPurchaseSettingsPanel() {
  const { currencies, costCenters, isLoadingPurchases } = usePurchases();

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando configurações…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Regras de aprovação, moedas, centros de custo e permissões amplas do módulo são mantidas pela gestão. Aqui
          você consulta os cadastros auxiliares ativos.
        </p>
      </header>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Moedas</CardTitle>
          <CardDescription>Moedas disponíveis para cotações e pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {currencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma moeda cadastrada.</p>
          ) : (
            currencies.map((c) => (
              <Badge key={c.id} variant="secondary" className="font-normal">
                {c.codigo} ({c.simbolo}) · {c.nome}
              </Badge>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Centros de custo</CardTitle>
          <CardDescription>
            Estrutura usada em contratos e alocação de gastos. Alterações exigem perfil administrativo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {costCenters.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground px-4">Nenhum centro cadastrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costCenters.map((cc) => (
                  <TableRow key={cc.id}>
                    <TableCell className="font-mono text-sm">{cc.codigo}</TableCell>
                    <TableCell>{cc.nome}</TableCell>
                    <TableCell>
                      <Badge variant={cc.status === 'active' ? 'default' : 'secondary'} className="font-normal">
                        {cc.status === 'active' ? 'Ativo' : cc.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Alçadas e permissões</CardTitle>
          <CardDescription>Fluxo de aprovação de SC e pedido</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            As regras de alçada (gestor, diretoria, limites por valor) e permissões de módulo são configuradas pelo{' '}
            <strong className="text-foreground">administrador de compras</strong> ou <strong className="text-foreground">desenvolvedor</strong>.
          </p>
          <Separator />
          <p className="text-xs">
            Se precisar incluir um novo aprovador ou alterar limites, abra um chamado interno para o time responsável
            pelo cadastro de alçadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
