/**
 * Hook usePermissao — atalho conveniente para checar permissoes em uma rota.
 *
 * Uso:
 *   const { podeLer, podeEscrever, podeExcluir, podeAprovar } = usePermissao('admin.usuarios');
 *
 *   if (!podeLer) return <SemAcesso />;
 *   <Button disabled={!podeEscrever}>Salvar</Button>
 */
import { usePerfil } from '@/contexts/PerfilContext';

interface PermissaoResult {
  podeLer: boolean;
  podeEscrever: boolean;
  podeExcluir: boolean;
  podeAprovar: boolean;
  /** True se o usuario tem QUALQUER uma das flags (ou seja: rota visivel). */
  qualquerPermissao: boolean;
}

export function usePermissao(rotaCodigo: string): PermissaoResult {
  const { rotaPermitida } = usePerfil();
  const rota = rotaPermitida(rotaCodigo);

  const podeLer = rota?.podeLer === true;
  const podeEscrever = rota?.podeEscrever === true;
  const podeExcluir = rota?.podeExcluir === true;
  const podeAprovar = rota?.podeAprovar === true;

  return {
    podeLer,
    podeEscrever,
    podeExcluir,
    podeAprovar,
    qualquerPermissao: podeLer || podeEscrever || podeExcluir || podeAprovar,
  };
}
