/**
 * KpiCard — card padronizado para a Visao Geral.
 *
 * Mostra um numero "grande" com titulo, descricao opcional e icone, com cor
 * de accent por importancia (info, sucesso, atencao, alerta). Pode ter um
 * link de drill-down (transforma o card em <Link>).
 */
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type KpiAccent = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface KpiCardProps {
  titulo: string;
  /** Valor principal exibido grande. Pode ser numero ou texto formatado. */
  valor: number | string | null | undefined;
  /** Texto auxiliar abaixo do valor (ex: "registros", "dias", "pedidos"). */
  unidade?: string;
  descricao?: string;
  /** Nome do icone do lucide-react (kebab-case ou PascalCase). */
  icone?: string;
  accent?: KpiAccent;
  /** Se passado, o card vira um link clicavel para essa rota. */
  linkPara?: string;
  isLoading?: boolean;
  erro?: string | null;
}

const ACCENT_TOKENS: Record<KpiAccent, { chip: string; icon: string; ring: string; bar: string }> =
  {
    neutral: {
      chip: 'bg-slate-100 dark:bg-slate-800/60',
      icon: 'text-slate-600 dark:text-slate-300',
      ring: 'hover:ring-slate-300/60 dark:hover:ring-slate-500/40',
      bar: 'bg-slate-400/70 dark:bg-slate-500/60',
    },
    info: {
      chip: 'bg-blue-100/80 dark:bg-blue-900/35',
      icon: 'text-blue-600 dark:text-blue-300',
      ring: 'hover:ring-blue-300/60 dark:hover:ring-blue-400/40',
      bar: 'bg-blue-500 dark:bg-blue-400',
    },
    success: {
      chip: 'bg-emerald-100/80 dark:bg-emerald-900/35',
      icon: 'text-emerald-600 dark:text-emerald-300',
      ring: 'hover:ring-emerald-300/60 dark:hover:ring-emerald-400/40',
      bar: 'bg-emerald-500 dark:bg-emerald-400',
    },
    warning: {
      chip: 'bg-amber-100/80 dark:bg-amber-900/35',
      icon: 'text-amber-600 dark:text-amber-300',
      ring: 'hover:ring-amber-300/60 dark:hover:ring-amber-400/40',
      bar: 'bg-amber-500 dark:bg-amber-400',
    },
    danger: {
      chip: 'bg-red-100/80 dark:bg-red-900/35',
      icon: 'text-red-600 dark:text-red-300',
      ring: 'hover:ring-red-300/60 dark:hover:ring-red-400/40',
      bar: 'bg-red-500 dark:bg-red-400',
    },
  };

function getIcone(nome: string | undefined): React.ComponentType<{ className?: string }> {
  if (!nome) return Icons.Activity;
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascal
  ];
  return Comp ?? Icons.Activity;
}

export function KpiCard({
  titulo,
  valor,
  unidade,
  descricao,
  icone,
  accent = 'neutral',
  linkPara,
  isLoading,
  erro,
}: KpiCardProps) {
  const tokens = ACCENT_TOKENS[accent];
  const Icone = getIcone(icone);

  const conteudo = (
    <>
      {/* Barra lateral de accent */}
      <span
        className={cn('absolute top-3 bottom-3 left-0 w-1 rounded-r-full', tokens.bar)}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate text-xs font-semibold tracking-wider uppercase">
            {titulo}
          </p>
          {descricao && (
            <p className="text-muted-foreground/80 mt-0.5 line-clamp-2 text-[11px]">{descricao}</p>
          )}
        </div>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            tokens.chip,
          )}
        >
          <Icone className={cn('h-4 w-4', tokens.icon)} />
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : erro ? (
          <span className="text-destructive text-sm">Erro</span>
        ) : (
          <>
            <span className="text-foreground text-3xl leading-none font-bold tracking-tight">
              {valor ?? '—'}
            </span>
            {unidade && (
              <span className="text-muted-foreground text-xs font-medium">{unidade}</span>
            )}
          </>
        )}
      </div>

      {linkPara && !isLoading && !erro && (
        <div className="text-muted-foreground group-hover/kpi:text-foreground mt-3 flex items-center gap-1 text-xs font-medium transition-colors">
          <span>Ver detalhes</span>
          <ArrowRight className="h-3 w-3 transition-transform group-hover/kpi:translate-x-0.5" />
        </div>
      )}
    </>
  );

  const baseClass = cn(
    'group/kpi relative flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:ring-1',
    tokens.ring,
  );

  if (linkPara) {
    return (
      <Link to={linkPara} className={cn(baseClass, 'cursor-pointer')}>
        {conteudo}
      </Link>
    );
  }

  return <div className={baseClass}>{conteudo}</div>;
}
