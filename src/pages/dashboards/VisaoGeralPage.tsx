/**
 * VisaoGeralPage — pagina inicial pos-login.
 *
 * Estrutura:
 *  1. Saudacao
 *  2. Grid de KPIs (cada KPI so aparece se o usuario tiver `podeLer` na rota
 *     correspondente do modulo `dashboards`)
 *  3. Atalhos por modulo (cards com a lista de telas liberadas)
 */
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KpiCard } from '@/components/shared/KpiCard';
import { usePerfil } from '@/contexts/PerfilContext';
import { usePermissao } from '@/hooks/usePermissao';
import { useView } from '@/hooks/useView';
import type {
  RotaPermitida,
  ViewContratoProximoVencimento,
  ViewEmprestimoAtrasado,
  ViewEstoqueAbaixoMinimo,
  ViewPedidoAguardandoAprovacao,
  ViewSolicitacaoTempoEtapas,
} from '@/types';

interface ModuloConfig {
  codigo: string;
  nome: string;
  descricao: string;
  icone: string;
}

const MODULOS: ModuloConfig[] = [
  {
    codigo: 'admin',
    nome: 'Administracao',
    descricao: 'Usuarios, unidades, perfis e configuracoes',
    icone: 'Settings2',
  },
  {
    codigo: 'cadastros',
    nome: 'Cadastros',
    descricao: 'Itens, fornecedores, listas auxiliares',
    icone: 'List',
  },
  {
    codigo: 'estoque',
    nome: 'Estoque',
    descricao: 'Saldos por unidade e movimentacoes',
    icone: 'Warehouse',
  },
  {
    codigo: 'solicitacoes',
    nome: 'Solicitacoes',
    descricao: 'Pedidos de material, moveis e emprestimos',
    icone: 'ClipboardList',
  },
  {
    codigo: 'entregas',
    nome: 'Entregas',
    descricao: 'Lotes, recepcao e conferencia',
    icone: 'Truck',
  },
  {
    codigo: 'compras',
    nome: 'Compras',
    descricao: 'Cotacoes, pedidos, NFs e contratos',
    icone: 'ShoppingCart',
  },
  {
    codigo: 'auditoria',
    nome: 'Auditoria',
    descricao: 'Timeline de atividades e notificacoes',
    icone: 'History',
  },
];

function getIcone(nome: string | null | undefined): React.ComponentType<{ className?: string }> {
  if (!nome) return Icons.Circle;
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascal
  ];
  return Comp ?? Icons.Circle;
}

export function VisaoGeralPage() {
  const { usuario, rotasPermitidas, isLoading: perfilLoading, perfis } = usePerfil();

  // Permissoes por dashboard — controla se a query roda e se o card aparece
  const permEstoque = usePermissao('dashboards.estoques-abaixo-minimo');
  const permEmprestimo = usePermissao('dashboards.emprestimos-atrasados');
  const permContrato = usePermissao('dashboards.contratos-vencendo');
  const permPedido = usePermissao('dashboards.pedidos-aguardando');
  const permTempo = usePermissao('dashboards.tempo-etapas');

  // Queries (cada uma so dispara se o usuario tiver permissao)
  const estoque = useView<ViewEstoqueAbaixoMinimo>('estoques_abaixo_minimo', {
    habilitado: permEstoque.podeLer,
    ordenarPor: 'deficit',
    ascendente: false,
  });
  const emprestimos = useView<ViewEmprestimoAtrasado>('emprestimos_atrasados', {
    habilitado: permEmprestimo.podeLer,
    ordenarPor: 'emprestimo_devolucao_prevista',
    ascendente: true,
  });
  const contratos = useView<ViewContratoProximoVencimento>('contratos_proximos_vencimento', {
    habilitado: permContrato.podeLer,
    ordenarPor: 'dias_para_vencer',
    ascendente: true,
  });
  const pedidos = useView<ViewPedidoAguardandoAprovacao>('pedidos_aguardando_aprovacao', {
    habilitado: permPedido.podeLer,
    ordenarPor: 'criado_em',
    ascendente: true,
  });
  const tempos = useView<ViewSolicitacaoTempoEtapas>('solicitacoes_tempo_etapas', {
    habilitado: permTempo.podeLer,
    limite: 200,
    ordenarPor: 'criado_em',
    ascendente: false,
  });

  // Tempo medio total das ultimas 200 solicitacoes concluidas (em horas)
  const tempoMedioHoras =
    tempos.itens.length > 0
      ? tempos.itens.reduce((acc, t) => acc + (t.horasTotal ?? 0), 0) / tempos.itens.length
      : null;

  // Modulos visiveis (idem da antiga Welcome)
  const rotasPorModulo = new Map<string, RotaPermitida[]>();
  for (const r of rotasPermitidas) {
    if (!r.podeLer || !r.modulo) continue;
    // o modulo `dashboards` tem destaque proprio (KPIs); nao reaparece aqui
    if (r.modulo === 'dashboards') continue;
    const lista = rotasPorModulo.get(r.modulo) ?? [];
    lista.push(r);
    rotasPorModulo.set(r.modulo, lista);
  }
  const modulosLiberados = MODULOS.filter((m) => (rotasPorModulo.get(m.codigo)?.length ?? 0) > 0);

  if (perfilLoading) {
    return (
      <div className="text-muted-foreground flex min-h-[40vh] items-center justify-center">
        Carregando...
      </div>
    );
  }

  const algumKpiVisivel =
    permEstoque.podeLer ||
    permEmprestimo.podeLer ||
    permContrato.podeLer ||
    permPedido.podeLer ||
    permTempo.podeLer;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Saudacao */}
      <div>
        <h1 className="text-2xl font-semibold">
          Ola, {usuario?.nome?.split(' ')[0] ?? 'usuario'}!
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Bem-vindo ao SupplyGo. Aqui esta um resumo do que precisa da sua atencao.
        </p>
        {perfis.length > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            Perfis ativos:{' '}
            <span className="font-mono">{perfis.map((p) => p.codigo).join(', ')}</span>
          </p>
        )}
      </div>

      {/* KPIs */}
      {algumKpiVisivel && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {permEstoque.podeLer && (
            <KpiCard
              titulo="Estoque baixo"
              valor={estoque.count}
              unidade={estoque.count === 1 ? 'item' : 'itens'}
              descricao="Saldo abaixo do minimo configurado"
              icone="AlertTriangle"
              accent="danger"
              linkPara="/dashboards/estoques-abaixo-minimo"
              isLoading={estoque.isLoading}
              erro={estoque.erro}
            />
          )}
          {permEmprestimo.podeLer && (
            <KpiCard
              titulo="Emprestimos atrasados"
              valor={emprestimos.count}
              unidade={emprestimos.count === 1 ? 'emprestimo' : 'emprestimos'}
              descricao="Prazo de devolucao vencido"
              icone="ClockAlert"
              accent="warning"
              linkPara="/dashboards/emprestimos-atrasados"
              isLoading={emprestimos.isLoading}
              erro={emprestimos.erro}
            />
          )}
          {permContrato.podeLer && (
            <KpiCard
              titulo="Contratos vencendo"
              valor={contratos.count}
              unidade={contratos.count === 1 ? 'contrato' : 'contratos'}
              descricao="Vencem em ate 30 dias ou saldo abaixo de 10%"
              icone="FileWarning"
              accent="warning"
              linkPara="/dashboards/contratos-vencendo"
              isLoading={contratos.isLoading}
              erro={contratos.erro}
            />
          )}
          {permPedido.podeLer && (
            <KpiCard
              titulo="Pedidos aguardando"
              valor={pedidos.count}
              unidade={pedidos.count === 1 ? 'pedido' : 'pedidos'}
              descricao="Aguardando aprovacao por alcada"
              icone="Hourglass"
              accent="info"
              linkPara="/dashboards/pedidos-aguardando"
              isLoading={pedidos.isLoading}
              erro={pedidos.erro}
            />
          )}
          {permTempo.podeLer && (
            <KpiCard
              titulo="Tempo medio total"
              valor={
                tempoMedioHoras !== null
                  ? tempoMedioHoras < 24
                    ? tempoMedioHoras.toFixed(1)
                    : (tempoMedioHoras / 24).toFixed(1)
                  : '—'
              }
              unidade={
                tempoMedioHoras !== null ? (tempoMedioHoras < 24 ? 'horas' : 'dias') : undefined
              }
              descricao="Da abertura ate a conclusao das ultimas solicitacoes"
              icone="Timer"
              accent="info"
              linkPara="/dashboards/tempo-etapas"
              isLoading={tempos.isLoading}
              erro={tempos.erro}
            />
          )}
        </div>
      )}

      {/* Atalhos por modulo */}
      {modulosLiberados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-muted-foreground py-12 text-center">
            <Icons.Lock className="mx-auto mb-4 h-10 w-10 opacity-40" />
            <p className="text-foreground font-semibold">Sem permissoes atribuidas</p>
            <p className="mt-1 text-sm">
              Sua conta foi criada, mas voce ainda nao tem nenhum modulo liberado.
              <br />
              Aguarde um administrador atribuir um perfil ou rotas avulsas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
            Modulos liberados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modulosLiberados.map((modulo) => {
              const itens = rotasPorModulo.get(modulo.codigo)!;
              const ModuloIcon = getIcone(modulo.icone);

              return (
                <Card key={modulo.codigo} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ModuloIcon className="text-primary h-5 w-5" />
                      {modulo.nome}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">{modulo.descricao}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {itens
                        .sort((a, b) => a.ordem - b.ordem)
                        .map((rota) => {
                          const Icon = getIcone(rota.icone ?? 'Circle');
                          return (
                            <li key={rota.id}>
                              <Link
                                to={rota.caminho}
                                className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                              >
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{rota.nome}</span>
                              </Link>
                            </li>
                          );
                        })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
