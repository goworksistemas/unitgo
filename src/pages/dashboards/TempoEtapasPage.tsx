/**
 * TempoEtapasPage — drill-down do KPI "Tempo medio total".
 *
 * Le a view `solicitacoes_tempo_etapas` (so solicitacoes ja concluidas).
 * Mostra estatisticas (avg/median) por tipo + chart de barras com a media de
 * horas por etapa para cada tipo.
 */
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyDashboard } from '@/components/shared/EmptyDashboard';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { usePermissao } from '@/hooks/usePermissao';
import { useView } from '@/hooks/useView';
import { getTipoSolicitacaoLabel } from '@/lib/format';
import type { TipoSolicitacao, ViewSolicitacaoTempoEtapas } from '@/types';

interface AggPorTipo {
  tipo: TipoSolicitacao;
  label: string;
  qtd: number;
  mediaAprovacao: number;
  mediaConclusao: number;
  mediaTotal: number;
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

export function TempoEtapasPage() {
  const { podeLer } = usePermissao('dashboards.tempo-etapas');

  const { itens, isLoading, erro } = useView<ViewSolicitacaoTempoEtapas>(
    'solicitacoes_tempo_etapas',
    {
      habilitado: podeLer,
      // ultimas 500 concluidas — janela suficiente sem overload
      limite: 500,
      ordenarPor: 'criado_em',
      ascendente: false,
    },
  );

  // Agregar por tipo de solicitacao
  const agregado = useMemo<AggPorTipo[]>(() => {
    const grupos = new Map<TipoSolicitacao, ViewSolicitacaoTempoEtapas[]>();
    for (const t of itens) {
      const lista = grupos.get(t.tipo) ?? [];
      lista.push(t);
      grupos.set(t.tipo, lista);
    }
    return Array.from(grupos.entries())
      .map(([tipo, lista]) => ({
        tipo,
        label: getTipoSolicitacaoLabel(tipo),
        qtd: lista.length,
        mediaAprovacao: media(lista.map((t) => t.horasAteAprovacao ?? 0).filter((n) => n > 0)),
        mediaConclusao: media(
          lista.map((t) => t.horasAprovacaoAConclusao ?? 0).filter((n) => n > 0),
        ),
        mediaTotal: media(lista.map((t) => t.horasTotal ?? 0).filter((n) => n > 0)),
      }))
      .sort((a, b) => b.qtd - a.qtd);
  }, [itens]);

  if (!podeLer) return <SemAcesso rotaCodigo="dashboards.tempo-etapas" />;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Tempo por Etapa"
        subtitulo="Tempo medio (em horas) entre etapas das ultimas 500 solicitacoes concluidas"
      />

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : itens.length === 0 ? (
        <EmptyDashboard
          icone="LineChart"
          titulo="Sem amostras"
          descricao="Ainda nao ha solicitacoes concluidas para calcular tempos."
        />
      ) : (
        <>
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Media de horas por etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agregado} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="currentColor"
                      className="text-muted-foreground"
                      label={{
                        value: 'Horas',
                        angle: -90,
                        position: 'insideLeft',
                        style: { fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: 12,
                      }}
                      formatter={(value: number) => `${value.toFixed(1)} h`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="mediaAprovacao"
                      name="Ate aprovacao"
                      fill="#3F76FF"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="mediaConclusao"
                      name="Aprovacao ate conclusao"
                      fill="#00C5E9"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <div className="border-border overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-32 text-right">Amostras</TableHead>
                  <TableHead className="w-44 text-right">Media ate aprovacao</TableHead>
                  <TableHead className="w-44 text-right">Media ate conclusao</TableHead>
                  <TableHead className="w-44 text-right">Media total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agregado.map((a) => (
                  <TableRow key={a.tipo}>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell className="text-right font-mono">{a.qtd}</TableCell>
                    <TableCell className="text-right font-mono">
                      {a.mediaAprovacao.toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {a.mediaConclusao.toFixed(1)} h
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {a.mediaTotal < 24
                        ? `${a.mediaTotal.toFixed(1)} h`
                        : `${(a.mediaTotal / 24).toFixed(1)} dias`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
