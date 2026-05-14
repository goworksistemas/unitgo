/**
 * Componente exibido quando o usuario nao tem permissao de leitura na rota.
 */
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SemAcessoProps {
  rotaCodigo?: string;
  mensagem?: string;
}

export function SemAcesso({ rotaCodigo, mensagem }: SemAcessoProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sem permissao</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {mensagem ?? 'Voce nao tem permissao para acessar esta tela. Contate um administrador.'}
            </p>
          </div>
          {rotaCodigo && (
            <div className="text-xs text-muted-foreground font-mono">{rotaCodigo}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
