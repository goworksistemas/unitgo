/**
 * Tela placeholder para rotas que ainda nao foram implementadas.
 *
 * Le o codigo da rota da URL atual e mostra o nome humano da rota
 * (a partir das rotas permitidas). Util enquanto telas reais
 * estao sendo construidas em lotes futuros.
 */
import { useLocation } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePerfil } from '@/contexts/PerfilContext';

function getIcone(nome: string | null | undefined): React.ComponentType<{ className?: string }> {
  if (!nome) return Icons.Hammer;
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascal];
  return Comp ?? Icons.Hammer;
}

export function EmConstrucao() {
  const location = useLocation();
  const { rotasPermitidas } = usePerfil();
  const rota = rotasPermitidas.find((r) => r.caminho === location.pathname);

  const nome = rota?.nome ?? 'Tela';
  const Icon = getIcone(rota?.icone);

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{nome}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Esta tela sera implementada em breve.
            </p>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {location.pathname}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
