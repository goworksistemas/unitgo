/**
 * DataTable — tabela generica para listagens CRUD.
 *
 * Recursos:
 *  - Header configuravel por `colunas`
 *  - Busca client-side em colunas marcadas como `pesquisavel`
 *  - Coluna de acoes (Editar/Excluir) condicionada a permissoes
 *  - Skeleton loading + estado vazio
 */
import { useMemo, useState, type ReactNode } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  /** Se true, valor desta coluna entra na busca textual. Default: false. */
  pesquisavel?: boolean;
  /** Largura CSS opcional (ex: '120px', '20%'). */
  largura?: string;
  /** Alinhamento do conteudo. Default: 'left'. */
  alinhar?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  itens: T[];
  colunas: ColunaDataTable<T>[];
  isLoading?: boolean;
  /** Mensagem mostrada quando nao ha itens. */
  mensagemVazia?: string;
  /** Placeholder do campo de busca. */
  placeholderBusca?: string;
  podeEditar?: boolean;
  podeExcluir?: boolean;
  aoEditar?: (item: T) => void;
  aoExcluir?: (item: T) => void;
  /** Funcao opcional que decide se a linha pode ser excluida (ex: bloqueia protegidas). */
  permiteExcluir?: (item: T) => boolean;
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
}: DataTableProps<T>) {
  const [busca, setBusca] = useState('');

  const colunasPesquisaveis = useMemo(
    () => colunas.filter((c) => c.pesquisavel).map((c) => c.chave),
    [colunas],
  );

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens;
    const termo = busca.toLowerCase();
    return itens.filter((item) =>
      colunasPesquisaveis.some((chave) => {
        const valor = (item as Record<string, unknown>)[chave];
        if (valor == null) return false;
        return String(valor).toLowerCase().includes(termo);
      }),
    );
  }, [itens, busca, colunasPesquisaveis]);

  const mostrarColunaAcoes = podeEditar || podeExcluir;

  if (isLoading) {
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
      {colunasPesquisaveis.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholderBusca}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((c) => (
                <TableHead
                  key={c.chave}
                  style={c.largura ? { width: c.largura } : undefined}
                  className={c.alinhar === 'right' ? 'text-right' : c.alinhar === 'center' ? 'text-center' : ''}
                >
                  {c.titulo}
                </TableHead>
              ))}
              {mostrarColunaAcoes && <TableHead className="w-32 text-right">Acoes</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itensFiltrados.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colunas.length + (mostrarColunaAcoes ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  {busca.trim() ? 'Nenhum resultado para a busca.' : mensagemVazia}
                </TableCell>
              </TableRow>
            ) : (
              itensFiltrados.map((item) => {
                const podeExcluirEsta = podeExcluir && (permiteExcluir ? permiteExcluir(item) : true);
                return (
                  <TableRow key={item.id}>
                    {colunas.map((c) => (
                      <TableCell
                        key={c.chave}
                        className={c.alinhar === 'right' ? 'text-right' : c.alinhar === 'center' ? 'text-center' : ''}
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

      <div className="text-xs text-muted-foreground">
        {itensFiltrados.length} de {itens.length} registro(s)
        {busca.trim() && ` (filtrado por "${busca}")`}
      </div>
    </div>
  );
}
