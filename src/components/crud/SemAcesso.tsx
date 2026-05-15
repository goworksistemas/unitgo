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
    <div className="mx-auto max-w-2xl">
      <Card className="border-dashed">
        <CardContent className="space-y-4 py-16 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Lock className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sem permissao</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {mensagem ??
                'Voce nao tem permissao para acessar esta tela. Contate um administrador.'}
            </p>
          </div>
          {rotaCodigo && (
            <div className="text-muted-foreground font-mono text-xs">{rotaCodigo}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
