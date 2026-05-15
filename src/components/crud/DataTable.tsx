/**
 * DataTable — tabela generica para listagens CRUD.
 *
 * Modos:
 *  - Cliente (default): recebe `itens` ja carregados, faz busca/filtro
 *    em memoria via colunas `pesquisavel`.
 *  - Servidor: recebe `paginacao` (total/pagina/tamanho/busca + handlers).
 *    Desliga a busca client-side e renderiza controles de paginacao.
 *
 * Recursos comuns:
 *  - Header configuravel por `colunas`
 *  - Coluna de acoes (Editar/Excluir) condicionada a permissoes
 *  - Skeleton loading + estado vazio
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColunaDataTable<T> {
  /** Nome da chave da coluna (usado em key e busca client-side). */
  chave: string;
  /** Texto do cabecalho. */
  titulo: string;
  /** Funcao customizada de renderizacao. Se ausente, usa `item[chave]`. */
  render?: (item: T) => ReactNode;
  /** Se true, valor desta coluna entra na busca textual (apenas modo cliente). */
  pesquisavel?: boolean;
  /** Largura CSS opcional (ex: '120px', '20%'). */
  largura?: string;
  /** Alinhamento do conteudo. Default: 'left'. */
  alinhar?: 'left' | 'center' | 'right';
}

/** Controles de paginacao server-side. */
export interface PaginacaoServidor {
  total: number;
  pagina: number;
  tamanho: number;
  busca: string;
  aoMudarPagina: (p: number) => void;
  aoMudarTamanho: (t: number) => void;
  aoMudarBusca: (b: string) => void;
  /** Texto do placeholder do campo de busca. Default 'Buscar...'. */
  placeholderBusca?: string;
  /** Opcoes para o select de tamanho. Default [25, 50, 100, 200]. */
  opcoesTamanho?: number[];
}

interface DataTableProps<T> {
  itens: T[];
  colunas: ColunaDataTable<T>[];
  isLoading?: boolean;
  /** Mensagem mostrada quando nao ha itens. */
  mensagemVazia?: string;
  /** Placeholder do campo de busca (modo cliente). */
  placeholderBusca?: string;
  podeEditar?: boolean;
  podeExcluir?: boolean;
  aoEditar?: (item: T) => void;
  aoExcluir?: (item: T) => void;
  /** Funcao opcional que decide se a linha pode ser excluida. */
  permiteExcluir?: (item: T) => boolean;
  /** Quando informado, ativa o modo server-side. */
  paginacao?: PaginacaoServidor;
}

export function DataTable<T extends { id: string }>({
  itens,
  colunas,
  isLoading = false,
  mensagemVazia = 'Nenhum registro encontrado.',
  placeholderBusca = 'Buscar...',
  podeEditar = false,
  podeExcluir = false,
  aoEditar,
  aoExcluir,
  permiteExcluir,
  paginacao,
}: DataTableProps<T>) {
  const ehServidor = !!paginacao;

  // Estado da busca client-side (apenas no modo cliente).
  const [buscaCliente, setBuscaCliente] = useState('');

  const colunasPesquisaveis = useMemo(
    () => colunas.filter((c) => c.pesquisavel).map((c) => c.chave),
    [colunas],
  );

  const itensFiltrados = useMemo(() => {
    if (ehServidor) return itens;
    if (!buscaCliente.trim()) return itens;
    const termo = buscaCliente.toLowerCase();
    return itens.filter((item) =>
      colunasPesquisaveis.some((chave) => {
        const valor = (item as Record<string, unknown>)[chave];
        if (valor == null) return false;
        return String(valor).toLowerCase().includes(termo);
      }),
    );
  }, [ehServidor, itens, buscaCliente, colunasPesquisaveis]);

  const mostrarColunaAcoes = podeEditar || podeExcluir;
  const mostrarBuscaCliente = !ehServidor && colunasPesquisaveis.length > 0;
  const mostrarBuscaServidor = ehServidor;

  if (isLoading && !ehServidor) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mostrarBuscaCliente && (
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={placeholderBusca}
            value={buscaCliente}
            onChange={(e) => setBuscaCliente(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {mostrarBuscaServidor && (
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={paginacao!.placeholderBusca ?? placeholderBusca}
            value={paginacao!.busca}
            onChange={(e) => paginacao!.aoMudarBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="border-border overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((c) => (
                <TableHead
                  key={c.chave}
                  style={c.largura ? { width: c.largura } : undefined}
                  className={
                    c.alinhar === 'right'
                      ? 'text-right'
                      : c.alinhar === 'center'
                        ? 'text-center'
                        : ''
                  }
                >
                  {c.titulo}
                </TableHead>
              ))}
              {mostrarColunaAcoes && <TableHead className="w-32 text-right">Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={`skel-${idx}`}>
                  {colunas.map((c) => (
                    <TableCell key={c.chave}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                  {mostrarColunaAcoes && (
                    <TableCell>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : itensFiltrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colunas.length + (mostrarColunaAcoes ? 1 : 0)}
                  className="text-muted-foreground h-24 text-center"
                >
                  {(!ehServidor && buscaCliente.trim()) || (ehServidor && paginacao!.busca.trim())
                    ? 'Nenhum resultado para a busca.'
                    : mensagemVazia}
                </TableCell>
              </TableRow>
            ) : (
              itensFiltrados.map((item) => {
                const podeExcluirEsta =
                  podeExcluir && (permiteExcluir ? permiteExcluir(item) : true);
                return (
                  <TableRow key={item.id}>
                    {colunas.map((c) => (
                      <TableCell
                        key={c.chave}
                        className={
                          c.alinhar === 'right'
                            ? 'text-right'
                            : c.alinhar === 'center'
                              ? 'text-center'
                              : ''
                        }
                      >
                        {c.render
                          ? c.render(item)
                          : String((item as Record<string, unknown>)[c.chave] ?? '')}
                      </TableCell>
                    ))}
                    {mostrarColunaAcoes && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {podeEditar && aoEditar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => aoEditar(item)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {podeExcluirEsta && aoExcluir && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => aoExcluir(item)}
                              title="Excluir"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {ehServidor ? (
        <RodapePaginacao paginacao={paginacao!} />
      ) : (
        <div className="text-muted-foreground text-xs">
          {itensFiltrados.length} de {itens.length} registro(s)
          {buscaCliente.trim() && ` (filtrado por "${buscaCliente}")`}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Rodape com controles de paginacao server-side
// ============================================================================

function RodapePaginacao({ paginacao }: { paginacao: PaginacaoServidor }) {
  const { total, pagina, tamanho, aoMudarPagina, aoMudarTamanho } = paginacao;
  const opcoesTamanho = paginacao.opcoesTamanho ?? [25, 50, 100, 200];

  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const inicio = total === 0 ? 0 : (pagina - 1) * tamanho + 1;
  const fim = Math.min(pagina * tamanho, total);

  const podeAnterior = pagina > 1;
  const podeProximo = pagina < totalPaginas;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <div className="text-muted-foreground text-xs">
        {total === 0 ? '0 registro(s)' : `${inicio}-${fim} de ${total} registro(s)`}
      </div>

      <div className="flex items-center gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span>Por pagina</span>
          <Select value={String(tamanho)} onValueChange={(v) => aoMudarTamanho(Number(v))}>
            <SelectTrigger className="h-8 w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoesTamanho.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!podeAnterior}
            onClick={() => aoMudarPagina(1)}
            title="Primeira pagina"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!podeAnterior}
            onClick={() => aoMudarPagina(pagina - 1)}
            title="Pagina anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-muted-foreground min-w-24 px-2 text-center text-xs">
            Pagina {pagina} de {totalPaginas}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!podeProximo}
            onClick={() => aoMudarPagina(pagina + 1)}
            title="Proxima pagina"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!podeProximo}
            onClick={() => aoMudarPagina(totalPaginas)}
            title="Ultima pagina"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
