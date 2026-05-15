/**
 * ComboboxFK — select com busca server-side para FKs grandes.
 *
 * Indicado para tabelas com muitos registros (itens, fornecedores, usuarios)
 * onde nao faz sentido carregar o universo inteiro num <Select>.
 *
 * Uso:
 *   <ComboboxFK
 *     valor={itemId}
 *     aoMudar={setItemId}
 *     rpc="fn_listar_itens"
 *     campoLabel="nome"
 *     paramsRpc={{ ativo: true }}
 *     placeholder="Selecione um item"
 *   />
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useOpcoesFKBusca } from '@/hooks/useOpcoesFK';

interface ComboboxFKProps {
  /** Valor selecionado (id em UUID). */
  valor: string | null | undefined;
  /** Callback de mudanca (null = limpou selecao). */
  aoMudar: (v: string | null) => void;
  /** Nome da RPC `fn_listar_*` usada para buscar. */
  rpc: string;
  /** Campo do registro usado como label (ex: 'nome'). */
  campoLabel: string;
  /** Parametros extras enviados ao RPC. */
  paramsRpc?: Record<string, unknown>;
  placeholder?: string;
  /** Texto exibido quando nao ha selecao. */
  textoVazio?: string;
  /** Permitir limpar a selecao. Default true. */
  permiteVazio?: boolean;
  /** Desabilita o controle. */
  disabled?: boolean;
  /**
   * Label imediato a exibir quando ja temos `valor` selecionado mas as opcoes
   * ainda nao foram carregadas (ex: editar registro existente). Opcional.
   */
  labelInicial?: string;
  className?: string;
}

export function ComboboxFK({
  valor,
  aoMudar,
  rpc,
  campoLabel,
  paramsRpc,
  placeholder = 'Selecione...',
  textoVazio = 'Nenhum resultado',
  permiteVazio = true,
  disabled,
  labelInicial,
  className,
}: ComboboxFKProps) {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');

  const { opcoes, isLoading, total } = useOpcoesFKBusca({
    rpc,
    campoLabel,
    paramsRpc,
    busca: termo,
  });

  const [labelSelecionado, setLabelSelecionado] = useState<string | null>(labelInicial ?? null);

  // Quando recebermos opcoes, tentamos resolver o label do valor selecionado.
  useEffect(() => {
    if (!valor) {
      setLabelSelecionado(null);
      return;
    }
    const achado = opcoes.find((o) => o.valor === valor);
    if (achado) setLabelSelecionado(achado.label);
  }, [valor, opcoes]);

  // Quando abrimos o popover sem termo, garantimos uma primeira carga.
  useEffect(() => {
    if (aberto && !termo) setTermo('');
  }, [aberto, termo]);

  const opcoesMostradas = useMemo(() => opcoes, [opcoes]);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate', !valor && 'text-muted-foreground')}>
            {valor ? (labelSelecionado ?? '...') : placeholder}
          </span>
          <div className="ml-2 flex items-center gap-1">
            {permiteVazio && valor && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar selecao"
                className="hover:bg-muted rounded p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  aoMudar(null);
                  setLabelSelecionado(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    aoMudar(null);
                    setLabelSelecionado(null);
                  }
                }}
              >
                <X className="h-3.5 w-3.5 opacity-60" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Buscar..." value={termo} onValueChange={setTermo} />
          <CommandList>
            {isLoading && (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
              </div>
            )}
            {!isLoading && opcoesMostradas.length === 0 && (
              <CommandEmpty>{textoVazio}</CommandEmpty>
            )}
            {!isLoading && opcoesMostradas.length > 0 && (
              <CommandGroup>
                {opcoesMostradas.map((op) => (
                  <CommandItem
                    key={op.valor}
                    value={op.valor}
                    onSelect={() => {
                      aoMudar(op.valor);
                      setLabelSelecionado(op.label);
                      setAberto(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        valor === op.valor ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {op.label}
                  </CommandItem>
                ))}
                {total > opcoesMostradas.length && (
                  <div className="text-muted-foreground border-t px-3 py-2 text-center text-xs">
                    Mostrando {opcoesMostradas.length} de {total}. Refine a busca para encontrar
                    mais.
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
