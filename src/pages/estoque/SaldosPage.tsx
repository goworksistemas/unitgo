/**
 * SaldosPage — saldos por unidade, com alerta de minimo.
 *
 * Mostra para cada par (item, unidade) a quantidade atual, o minimo e
 * destaca quando esta abaixo (alerta visual).
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, crud } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import type { EstoqueUnidade, Item, Unidade } from '@/types';

interface LinhaSaldo extends EstoqueUnidade {
  itemNome: string;
  itemCategoriaId: string | null;
  unidadeNome: string;
}

export function SaldosPage() {
  const { podeLer } = usePermissao('estoque.saldos');

  const { opcoes: unidadesOpcoes } = useOpcoesFK('unidades', 'nome');
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaSaldo[]>([]);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    Promise.all([
      crud<EstoqueUnidade>('estoques_unidade').list({}),
      crud<Item>('itens').list({}),
      crud<Unidade>('unidades').list({}),
    ])
      .then(([estoques, itens, unidades]) => {
        if (cancelado) return;
        const itensMap = new Map(itens.map((i) => [i.id, i]));
        const unidadesMap = new Map(unidades.map((u) => [u.id, u]));
        setLinhas(
          estoques.map((e) => ({
            ...e,
            itemNome: itensMap.get(e.itemId)?.nome ?? '?',
            itemCategoriaId: itensMap.get(e.itemId)?.categoriaId ?? null,
            unidadeNome: unidadesMap.get(e.unidadeId)?.nome ?? '?',
          })),
        );
      })
      .catch((e) => {
        if (!cancelado)
          setErro(e instanceof ApiError ? e.message : 'Erro ao carregar saldos');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const linhasFiltradas = useMemo(() => {
    let r = linhas;
    if (filtroUnidade !== 'todas') {
      r = r.filter((l) => l.unidadeId === filtroUnidade);
    }
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter(
        (l) =>
          l.itemNome.toLowerCase().includes(t) ||
          l.unidadeNome.toLowerCase().includes(t),
      );
    }
    return r;
  }, [linhas, filtroUnidade, busca]);

  const totalAbaixoMinimo = linhasFiltradas.filter(
    (l) => l.quantidadeMinima > 0 && l.quantidade < l.quantidadeMinima,
  ).length;

  if (!podeLer) return <SemAcesso rotaCodigo="estoque.saldos" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Saldos por Unidade"
        subtitulo="Quantidades atuais com alerta para itens abaixo do minimo"
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item ou unidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {unidadesOpcoes.map((u) => (
              <SelectItem key={u.valor} value={u.valor}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {totalAbaixoMinimo > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {totalAbaixoMinimo} abaixo do minimo
          </Badge>
        )}
      </div>

      {erro && <p className="text-sm text-red-500">{erro}</p>}

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right w-32">Quantidade</TableHead>
                <TableHead className="text-right w-32">Minimo</TableHead>
                <TableHead className="text-center w-24">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhasFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum saldo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                linhasFiltradas.map((l) => {
                  const abaixo = l.quantidadeMinima > 0 && l.quantidade < l.quantidadeMinima;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.itemNome}</TableCell>
                      <TableCell className="text-sm">{l.unidadeNome}</TableCell>
                      <TableCell className="text-right font-mono">
                        {l.quantidade}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {l.quantidadeMinima}
                      </TableCell>
                      <TableCell className="text-center">
                        {abaixo ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Baixo
                          </Badge>
                        ) : l.quantidade === 0 ? (
                          <Badge variant="outline">Zerado</Badge>
                        ) : (
                          <Badge variant="default">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {linhasFiltradas.length} de {linhas.length} registro(s)
      </div>
    </div>
  );
}
