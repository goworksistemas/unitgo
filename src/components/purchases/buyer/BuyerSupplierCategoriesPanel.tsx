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

export function BuyerSupplierCategoriesPanel() {
  const { supplierCategories, isLoadingPurchases } = usePurchases();

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando categorias…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Categorias de fornecedor</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Classificação usada no cadastro de fornecedores e em relatórios de compras.
        </p>
      </header>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30">
          <CardTitle className="text-base">Cadastro</CardTitle>
          <CardDescription>
            {supplierCategories.length === 0
              ? 'Nenhuma categoria cadastrada.'
              : `${supplierCategories.length} categoria(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {supplierCategories.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4">
              Categorias podem ser criadas pelo administrador de compras na área de cadastros.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierCategories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.nome}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-md truncate">
                      {cat.descricao ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.status === 'active' ? 'default' : 'secondary'} className="font-normal">
                        {cat.status === 'active' ? 'Ativa' : cat.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
