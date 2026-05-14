/**
 * CrudPage — orquestrador generico para listagens CRUD.
 *
 * Junta useCrud + DataTable + FormDialog + AlertDialog de confirmacao.
 * Cada CRUD vira ~30-50 linhas de configuracao na pagina.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { useCrud } from '@/hooks/useCrud';
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
  antesDeSalvar?: (valores: Record<string, unknown>, eh: 'criar' | 'editar') => Record<string, unknown>;
}

export function CrudPage<T extends { id: string }>({
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

  if (!podeLer) {
    return <SemAcesso rotaCodigo={rotaCodigo} />;
  }

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
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          {subtitulo && <p className="text-sm text-muted-foreground mt-1">{subtitulo}</p>}
        </div>
        {podeEscrever && (
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            {textoBotaoNovo}
          </Button>
        )}
      </div>

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

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
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
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
