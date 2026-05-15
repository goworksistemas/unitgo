/**
 * NotificacoesPage — caixa de entrada in-app do usuario.
 *
 * Lista notificacoes nao lidas e arquivadas.
 * Permite marcar como lida e arquivar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Archive, Bell, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, crud } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate, formatRelativeTimePast } from '@/lib/format';
import type { Notificacao, PrioridadeNotificacao } from '@/types';

export function NotificacoesPage() {
  const { podeLer } = usePermissao('auditoria.notificacoes');
  const perfil = usePerfil();

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function recarregar() {
    if (!perfil.usuario?.id) return;
    setCarregando(true);
    try {
      const lista = await crud<Notificacao>('notificacoes').list({
        igualdade: { usuarioId: perfil.usuario.id },
        ordenarPor: 'criadoEm',
        ascendente: false,
        limite: 200,
      });
      setNotificacoes(lista);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.usuario?.id]);

  const naoLidas = useMemo(
    () => notificacoes.filter((n) => !n.lidoEm && !n.arquivadoEm),
    [notificacoes],
  );
  const lidas = useMemo(
    () => notificacoes.filter((n) => n.lidoEm && !n.arquivadoEm),
    [notificacoes],
  );
  const arquivadas = useMemo(() => notificacoes.filter((n) => !!n.arquivadoEm), [notificacoes]);

  async function marcarLida(n: Notificacao) {
    try {
      await crud<Notificacao>('notificacoes').update(n.id, {
        lidoEm: new Date().toISOString(),
      });
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    }
  }

  async function arquivar(n: Notificacao) {
    try {
      await crud<Notificacao>('notificacoes').update(n.id, {
        arquivadoEm: new Date().toISOString(),
      });
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    }
  }

  if (!podeLer) return <SemAcesso rotaCodigo="auditoria.notificacoes" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader titulo="Notificacoes" subtitulo="Suas notificacoes do sistema" />

      <Tabs defaultValue="naoLidas">
        <TabsList>
          <TabsTrigger value="naoLidas">
            Nao lidas{' '}
            {naoLidas.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {naoLidas.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="lidas">Lidas ({lidas.length})</TabsTrigger>
          <TabsTrigger value="arquivadas">Arquivadas ({arquivadas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="naoLidas" className="mt-4 space-y-2">
          {carregando ? (
            <Skeleton className="h-32 w-full" />
          ) : naoLidas.length === 0 ? (
            <Vazio mensagem="Nenhuma notificacao nao lida." />
          ) : (
            naoLidas.map((n) => (
              <NotificacaoCard
                key={n.id}
                n={n}
                onMarcarLida={() => marcarLida(n)}
                onArquivar={() => arquivar(n)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="lidas" className="mt-4 space-y-2">
          {lidas.length === 0 ? (
            <Vazio mensagem="Nada por aqui." />
          ) : (
            lidas.map((n) => <NotificacaoCard key={n.id} n={n} onArquivar={() => arquivar(n)} />)
          )}
        </TabsContent>

        <TabsContent value="arquivadas" className="mt-4 space-y-2">
          {arquivadas.length === 0 ? (
            <Vazio mensagem="Nenhuma arquivada." />
          ) : (
            arquivadas.map((n) => <NotificacaoCard key={n.id} n={n} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Vazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="text-muted-foreground rounded-md border border-dashed p-12 text-center">
      <Bell className="mx-auto mb-2 h-10 w-10 opacity-40" />
      {mensagem}
    </div>
  );
}

function prioridadeVariant(p: PrioridadeNotificacao) {
  switch (p) {
    case 'urgent':
      return 'destructive' as const;
    case 'high':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

function NotificacaoCard({
  n,
  onMarcarLida,
  onArquivar,
}: {
  n: Notificacao;
  onMarcarLida?: () => void;
  onArquivar?: () => void;
}) {
  const naoLida = !n.lidoEm && !n.arquivadoEm;
  return (
    <div className={`rounded-md border p-4 ${naoLida ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className="flex items-start gap-3">
        <Bell className={`mt-0.5 h-4 w-4 ${naoLida ? 'text-primary' : 'text-muted-foreground'}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h4 className="text-sm font-medium">{n.titulo}</h4>
            <Badge variant={prioridadeVariant(n.prioridade)} className="text-xs">
              {n.prioridade}
            </Badge>
            {n.tipo && <span className="text-muted-foreground font-mono text-xs">{n.tipo}</span>}
          </div>
          {n.mensagem && <p className="text-muted-foreground mt-1 text-sm">{n.mensagem}</p>}
          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
            <span>{formatDate(n.criadoEm)}</span>
            <span>({formatRelativeTimePast(n.criadoEm)})</span>
            {n.linkAcao && (
              <a href={n.linkAcao} className="text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" />
                Abrir
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {onMarcarLida && (
            <Button variant="ghost" size="icon" onClick={onMarcarLida} title="Marcar como lida">
              <Check className="h-4 w-4" />
            </Button>
          )}
          {onArquivar && (
            <Button variant="ghost" size="icon" onClick={onArquivar} title="Arquivar">
              <Archive className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
