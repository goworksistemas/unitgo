/**
 * CrudPage — orquestrador generico para listagens CRUD.
 *
 * Junta useCrud/useListaPaginada + DataTable + FormDialog + AlertDialog de
 * confirmacao. Cada CRUD vira ~30-50 linhas de configuracao na pagina.
 *
 * Modos de listagem:
 *  - Cliente (padrao legado): carrega tudo via `useCrud` e filtra em memoria.
 *  - Paginado por RPC: passe `rpcLista` (nome da fn_listar_*) e opcionalmente
 *    `paramsRpc` (filtros extras enviados ao RPC).
 *  - Paginado por tabela (CRUD simples sem JOIN): passe `colunasBuscaServidor`
 *    (colunas para ILIKE) — usa PostgREST range()+count.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ApiError, crud } from '@/lib/api';
import { useCrud } from '@/hooks/useCrud';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from './DataTable';
import { FormDialog, type CampoForm } from './FormDialog';
import { SemAcesso } from './SemAcesso';

interface CrudPageProps<T extends { id: string }> {
  /** Codigo da rota (ex: 'admin.unidades'). Usado para checar permissao. */
  rotaCodigo: string;
  /** Nome da tabela no banco. */
  tabela: string;
  /** Titulo exibido no topo da pagina. */
  titulo: string;
  /** Subtitulo opcional. */
  subtitulo?: string;
  /** Coluna usada para ordenar a listagem. */
  ordenarPor?: string;
  ascendente?: boolean;
  /** Filtros default na consulta (igualdade). */
  filtros?: Record<string, unknown>;
  /** Definicao das colunas da tabela. */
  colunas: ColunaDataTable<T>[];
  /** Definicao dos campos do formulario. */
  campos: CampoForm[];
  /** Texto do botao de criacao. Default: "Novo". */
  textoBotaoNovo?: string;
  /** Mensagem quando nao ha registros. */
  mensagemVazia?: string;
  /** Permite excluir a linha (override). */
  permiteExcluir?: (item: T) => boolean;
  /** Hook para transformar payload antes de enviar (ex: limpar JSONB). */
  antesDeSalvar?: (
    valores: Record<string, unknown>,
    eh: 'criar' | 'editar',
  ) => Record<string, unknown>;

  // -------- Paginacao server-side --------
  /**
   * Nome da RPC `fn_listar_*` para listar dados com JOINs prontos.
   * Quando informado, a tela passa a operar em modo paginado server-side.
   */
  rpcLista?: string;
  /** Parametros extras enviados ao RPC (alem de pBusca/pPagina/pTamanho). */
  paramsRpc?: Record<string, unknown>;
  /**
   * Colunas (camelCase ou snake_case) usadas para ILIKE quando a paginacao
   * for via tabela direta (sem RPC). Se informado e `rpcLista` ausente,
   * tambem ativa modo paginado server-side.
   */
  colunasBuscaServidor?: string[];
  /** Tamanho de pagina inicial. Default 50. */
  tamanhoPagina?: number;
  /** Placeholder do campo de busca. */
  placeholderBusca?: string;
}

export function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const ehPaginado = !!props.rpcLista || !!props.colunasBuscaServidor?.length;
  return ehPaginado ? <CrudPagePaginada {...props} /> : <CrudPageCliente {...props} />;
}

// ============================================================================
// Versao legada (carrega tudo, filtra no client)
// ============================================================================

function CrudPageCliente<T extends { id: string }>({
  rotaCodigo,
  tabela,
  titulo,
  subtitulo,
  ordenarPor,
  ascendente,
  filtros,
  colunas,
  campos,
  textoBotaoNovo = 'Novo',
  mensagemVazia,
  permiteExcluir,
  antesDeSalvar,
}: CrudPageProps<T>) {
  const { podeLer, podeEscrever, podeExcluir } = usePermissao(rotaCodigo);
  const { itens, isLoading, criar, atualizar, excluir } = useCrud<T>(tabela, {
    ordenarPor,
    ascendente,
    filtros,
  });

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [excluindo, setExcluindo] = useState<T | null>(null);

  if (!podeLer) return <SemAcesso rotaCodigo={rotaCodigo} />;

  function abrirNovo() {
    setEditando(null);
    setDialogAberto(true);
  }

  function abrirEdicao(item: T) {
    setEditando(item);
    setDialogAberto(true);
  }

  async function handleSalvar(valores: Record<string, unknown>) {
    const eh: 'criar' | 'editar' = editando ? 'editar' : 'criar';
    const payload = antesDeSalvar ? antesDeSalvar(valores, eh) : valores;

    let ok: T | null = null;
    if (editando) {
      ok = await atualizar(editando.id, payload as Partial<T>);
    } else {
      ok = await criar(payload as Partial<T>);
    }
    if (ok) {
      setDialogAberto(false);
      setEditando(null);
    }
  }

  async function handleConfirmarExclusao() {
    if (!excluindo) return;
    const ok = await excluir(excluindo.id);
    if (ok) setExcluindo(null);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Cabecalho
        titulo={titulo}
        subtitulo={subtitulo}
        podeEscrever={podeEscrever}
        textoBotaoNovo={textoBotaoNovo}
        aoClicarNovo={abrirNovo}
      />

      <DataTable
        itens={itens}
        colunas={colunas}
        isLoading={isLoading}
        mensagemVazia={mensagemVazia}
        podeEditar={podeEscrever}
        podeExcluir={podeExcluir}
        aoEditar={abrirEdicao}
        aoExcluir={(item) => setExcluindo(item)}
        permiteExcluir={permiteExcluir}
      />

      <FormDialog<T extends Record<string, unknown> ? T : Record<string, unknown>>
        aberto={dialogAberto}
        titulo={editando ? `Editar ${titulo}` : `Novo ${textoBotaoNovo.toLowerCase()}`}
        campos={campos}
        valorInicial={editando as never}
        aoSalvar={handleSalvar}
        aoFechar={() => {
          setDialogAberto(false);
          setEditando(null);
        }}
      />

      <DialogoExclusao
        item={excluindo}
        aoConfirmar={handleConfirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}

// ============================================================================
// Versao paginada server-side (RPC ou tabela com range())
// ============================================================================

function CrudPagePaginada<T extends { id: string }>({
  rotaCodigo,
  tabela,
  titulo,
  subtitulo,
  ordenarPor,
  ascendente,
  filtros,
  colunas,
  campos,
  textoBotaoNovo = 'Novo',
  mensagemVazia,
  permiteExcluir,
  antesDeSalvar,
  rpcLista,
  paramsRpc,
  colunasBuscaServidor,
  tamanhoPagina,
  placeholderBusca,
}: CrudPageProps<T>) {
  const { podeLer, podeEscrever, podeExcluir } = usePermissao(rotaCodigo);

  const opcoesBase = {
    tamanho: tamanhoPagina ?? 50,
    ordenarPor,
    ascendente,
  };

  const lista = useListaPaginada<T>(
    rpcLista
      ? {
          ...opcoesBase,
          rpc: rpcLista,
          paramsRpc,
        }
      : {
          ...opcoesBase,
          tabela,
          colunasBusca: colunasBuscaServidor,
          igualdade: filtros,
        },
  );

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [excluindo, setExcluindo] = useState<T | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!podeLer) return <SemAcesso rotaCodigo={rotaCodigo} />;

  function abrirNovo() {
    setEditando(null);
    setDialogAberto(true);
  }

  function abrirEdicao(item: T) {
    setEditando(item);
    setDialogAberto(true);
  }

  async function handleSalvar(valores: Record<string, unknown>) {
    const eh: 'criar' | 'editar' = editando ? 'editar' : 'criar';
    const payload = antesDeSalvar ? antesDeSalvar(valores, eh) : valores;
    setSalvando(true);
    try {
      if (editando) {
        await crud<T>(tabela).update(editando.id, payload as Partial<T>);
        toast.success('Registro atualizado');
      } else {
        await crud<T>(tabela).create(payload as Partial<T>);
        toast.success('Registro criado');
      }
      setDialogAberto(false);
      setEditando(null);
      await lista.recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function handleConfirmarExclusao() {
    if (!excluindo) return;
    try {
      await crud<T>(tabela).remove(excluindo.id);
      toast.success('Registro excluido');
      setExcluindo(null);
      await lista.recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <Cabecalho
        titulo={titulo}
        subtitulo={subtitulo}
        podeEscrever={podeEscrever}
        textoBotaoNovo={textoBotaoNovo}
        aoClicarNovo={abrirNovo}
      />

      <DataTable
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia={mensagemVazia}
        podeEditar={podeEscrever}
        podeExcluir={podeExcluir}
        aoEditar={abrirEdicao}
        aoExcluir={(item) => setExcluindo(item)}
        permiteExcluir={permiteExcluir}
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca,
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      <FormDialog<T extends Record<string, unknown> ? T : Record<string, unknown>>
        aberto={dialogAberto}
        titulo={editando ? `Editar ${titulo}` : `Novo ${textoBotaoNovo.toLowerCase()}`}
        campos={campos}
        valorInicial={editando as never}
        aoSalvar={handleSalvar}
        aoFechar={() => {
          if (salvando) return;
          setDialogAberto(false);
          setEditando(null);
        }}
      />

      <DialogoExclusao
        item={excluindo}
        aoConfirmar={handleConfirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}

// ============================================================================
// Pedacos compartilhados
// ============================================================================

function Cabecalho({
  titulo,
  subtitulo,
  podeEscrever,
  textoBotaoNovo,
  aoClicarNovo,
}: {
  titulo: string;
  subtitulo?: string;
  podeEscrever: boolean;
  textoBotaoNovo: string;
  aoClicarNovo: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{titulo}</h1>
        {subtitulo && <p className="text-muted-foreground mt-1 text-sm">{subtitulo}</p>}
      </div>
      {podeEscrever && (
        <Button onClick={aoClicarNovo}>
          <Plus className="mr-1.5 h-4 w-4" />
          {textoBotaoNovo}
        </Button>
      )}
    </div>
  );
}

function DialogoExclusao<T>({
  item,
  aoConfirmar,
  aoCancelar,
}: {
  item: T | null;
  aoConfirmar: () => void | Promise<void>;
  aoCancelar: () => void;
}) {
  return (
    <AlertDialog open={!!item} onOpenChange={(o) => !o && aoCancelar()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao nao pode ser desfeita. O registro sera excluido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void aoConfirmar()}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
