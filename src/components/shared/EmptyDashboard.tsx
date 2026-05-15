/**
 * EmptyDashboard — estado vazio reutilizavel para dashboards.
 *
 * Aparece quando uma view nao retornou linhas (caso bom: nada em alerta).
 */
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyDashboardProps {
  /** Nome do icone do lucide-react. Default: 'check-circle-2'. */
  icone?: string;
  titulo?: string;
  descricao?: string;
  className?: string;
}

function getIcone(nome: string | undefined): React.ComponentType<{ className?: string }> {
  if (!nome) return Icons.CheckCircle2;
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascal
  ];
  return Comp ?? Icons.CheckCircle2;
}

export function EmptyDashboard({
  icone,
  titulo = 'Nada por aqui',
  descricao = 'Tudo em ordem por enquanto.',
  className,
}: EmptyDashboardProps) {
  const Icone = getIcone(icone);

  return (
    <div
      className={cn(
        'border-border bg-muted/30 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100/80 dark:bg-emerald-900/35">
        <Icone className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
      </span>
      <p className="text-foreground mt-3 text-sm font-semibold">{titulo}</p>
      <p className="text-muted-foreground mt-1 max-w-md text-xs">{descricao}</p>
    </div>
  );
}
