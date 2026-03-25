import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export function PurchasesModulePlaceholder({ title = 'Compras' }: { title?: string }) {
  return (
    <Card className="max-w-lg mx-auto mt-8 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>
          Esta área do módulo de compras foi desativada enquanto o fluxo é refeito.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Telas de comprador, cotações, pedidos e aprovações (gestor, diretoria e financeira de pedidos) foram
        removidas. O que permanece com acesso por perfil: nova solicitação e minhas solicitações (solicitante) e
        cadastros de centros de custo e contratos, quando liberados nas abas do usuário.
      </CardContent>
    </Card>
  );
}
