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
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascal
  ];
  return Comp ?? Icons.Hammer;
}

export function EmConstrucao() {
  const location = useLocation();
  const { rotasPermitidas } = usePerfil();
  const rota = rotasPermitidas.find((r) => r.caminho === location.pathname);

  const nome = rota?.nome ?? 'Tela';
  const Icon = getIcone(rota?.icone);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-dashed">
        <CardContent className="space-y-4 py-16 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <Icon className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{nome}</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Esta tela sera implementada em breve.
            </p>
          </div>
          <div className="text-muted-foreground font-mono text-xs">{location.pathname}</div>
        </CardContent>
      </Card>
    </div>
  );
}
