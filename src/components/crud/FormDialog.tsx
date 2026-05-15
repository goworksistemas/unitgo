/**
 * FormDialog — modal generico de criacao/edicao de registros.
 *
 * Recebe uma lista de `campos` declarativos e renderiza inputs apropriados.
 * Tipos suportados:
 *  - text         (input simples)
 *  - textarea
 *  - number       (input type=number, retorna number)
 *  - boolean      (switch)
 *  - select       (select com opcoes { valor, label })
 *  - multi-select (checkboxes vertical, retorna array)
 *  - array-text   (chips: digite + Enter para adicionar)
 */
import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

export interface OpcaoSelect {
  valor: string;
  label: string;
}

export interface CampoForm {
  nome: string;
  label: string;
  tipo: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multi-select' | 'array-text';
  placeholder?: string;
  obrigatorio?: boolean;
  /** Para select/multi-select. */
  opcoes?: OpcaoSelect[];
  /** Permite valor null/vazio em select (usar para FK opcionais). */
  permiteVazio?: boolean;
  /** Funcao de validacao customizada. Retorna mensagem de erro ou null. */
  validar?: (valor: unknown) => string | null;
  /** Mascarar para mostrar (ex: CNPJ formatado). Apenas display. */
  formatar?: (valor: unknown) => string;
  /** Span de coluna em grid (1 ou 2). Default: 1. */
  span?: 1 | 2;
  /** Campo somente leitura (mostra valor mas nao permite editar). */
  readonly?: boolean;
  /** Texto auxiliar abaixo do input. */
  ajuda?: string;
}

interface FormDialogProps<T> {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  campos: CampoForm[];
  /** Valor inicial (undefined = criando). */
  valorInicial?: Partial<T>;
  aoSalvar: (valores: Record<string, unknown>) => Promise<void> | void;
  aoFechar: () => void;
  /** Conteudo extra renderizado abaixo dos campos. */
  filhos?: ReactNode;
}

export function FormDialog<T extends object>({
  aberto,
  titulo,
  descricao,
  campos,
  valorInicial,
  aoSalvar,
  aoFechar,
  filhos,
}: FormDialogProps<T>) {
  const [valores, setValores] = useState<Record<string, unknown>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  // Reseta o estado quando o dialog abre
  useEffect(() => {
    if (aberto) {
      const inicial: Record<string, unknown> = {};
      for (const campo of campos) {
        const v = (valorInicial as Record<string, unknown> | undefined)?.[campo.nome];
        if (v !== undefined) {
          inicial[campo.nome] = v;
        } else {
          // Defaults por tipo
          if (campo.tipo === 'boolean') inicial[campo.nome] = false;
          else if (campo.tipo === 'multi-select') inicial[campo.nome] = [];
          else if (campo.tipo === 'array-text') inicial[campo.nome] = [];
          else inicial[campo.nome] = '';
        }
      }
      setValores(inicial);
      setErros({});
    }
  }, [aberto, valorInicial, campos]);

  function setValor(nome: string, valor: unknown) {
    setValores((prev) => ({ ...prev, [nome]: valor }));
    setErros((prev) => {
      const { [nome]: _removed, ...resto } = prev;
      return resto;
    });
  }

  function validar(): boolean {
    const novosErros: Record<string, string> = {};
    for (const campo of campos) {
      const v = valores[campo.nome];
      if (campo.obrigatorio) {
        const vazio =
          v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
        if (vazio) {
          novosErros[campo.nome] = 'Obrigatorio';
          continue;
        }
      }
      if (campo.validar) {
        const msg = campo.validar(v);
        if (msg) novosErros[campo.nome] = msg;
      }
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function handleSalvar() {
    if (!validar()) return;

    // Sanitizar: strings vazias -> null em campos opcionais (compativel com banco)
    const payload: Record<string, unknown> = {};
    for (const campo of campos) {
      let v = valores[campo.nome];
      if (campo.tipo === 'number') {
        if (v === '' || v === null || v === undefined) {
          v = null;
        } else {
          const n = Number(v);
          v = Number.isNaN(n) ? null : n;
        }
      } else if (campo.tipo === 'text' || campo.tipo === 'textarea') {
        if (v === '' && !campo.obrigatorio) v = null;
      } else if (campo.tipo === 'select') {
        if (v === '' && campo.permiteVazio) v = null;
      }
      payload[campo.nome] = v;
    }

    setSalvando(true);
    try {
      await aoSalvar(payload);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {descricao && <DialogDescription>{descricao}</DialogDescription>}
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <div
              key={campo.nome}
              className={`space-y-1.5 ${campo.span === 2 ? 'sm:col-span-2' : ''}`}
            >
              <Label>
                {campo.label}
                {campo.obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
              </Label>

              {renderCampo(campo, valores[campo.nome], (v) => setValor(campo.nome, v))}

              {campo.ajuda && <p className="text-muted-foreground text-xs">{campo.ajuda}</p>}
              {erros[campo.nome] && <p className="text-xs text-red-500">{erros[campo.nome]}</p>}
            </div>
          ))}
        </div>

        {filhos}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Renderizadores por tipo
// ============================================================================

function renderCampo(campo: CampoForm, valor: unknown, aoMudar: (v: unknown) => void): ReactNode {
  if (campo.readonly) {
    return (
      <div className="border-input bg-muted/40 text-muted-foreground rounded-md border px-3 py-2 text-sm">
        {campo.formatar ? campo.formatar(valor) : String(valor ?? '')}
      </div>
    );
  }

  switch (campo.tipo) {
    case 'textarea':
      return (
        <Textarea
          value={(valor as string) ?? ''}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={campo.placeholder}
          rows={3}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={(valor as string | number | null) ?? ''}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={campo.placeholder}
        />
      );

    case 'boolean':
      return (
        <div className="flex items-center pt-1">
          <Switch checked={Boolean(valor)} onCheckedChange={aoMudar} />
        </div>
      );

    case 'select': {
      const v = (valor as string | null | undefined) ?? '';
      return (
        <Select
          value={v === '' ? undefined : v}
          onValueChange={(novo) => aoMudar(novo === '__vazio__' ? null : novo)}
        >
          <SelectTrigger>
            <SelectValue placeholder={campo.placeholder ?? 'Selecione...'} />
          </SelectTrigger>
          <SelectContent>
            {campo.permiteVazio && (
              <SelectItem value="__vazio__">
                <span className="text-muted-foreground">— nenhum —</span>
              </SelectItem>
            )}
            {campo.opcoes?.map((op) => (
              <SelectItem key={op.valor} value={op.valor}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case 'multi-select': {
      const selecionados = Array.isArray(valor) ? (valor as string[]) : [];
      return (
        <div className="border-input max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-3">
          {campo.opcoes?.length === 0 && (
            <p className="text-muted-foreground text-xs">Sem opcoes disponiveis</p>
          )}
          {campo.opcoes?.map((op) => {
            const checked = selecionados.includes(op.valor);
            return (
              <label
                key={op.valor}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(novo) => {
                    if (novo === true) {
                      aoMudar([...selecionados, op.valor]);
                    } else {
                      aoMudar(selecionados.filter((s) => s !== op.valor));
                    }
                  }}
                />
                <span>{op.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    case 'array-text': {
      const itens = Array.isArray(valor) ? (valor as string[]) : [];
      return <ChipInput valores={itens} aoMudar={aoMudar} placeholder={campo.placeholder} />;
    }

    case 'text':
    default:
      return (
        <Input
          type="text"
          value={(valor as string) ?? ''}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={campo.placeholder}
        />
      );
  }
}

function ChipInput({
  valores,
  aoMudar,
  placeholder,
}: {
  valores: string[];
  aoMudar: (v: string[]) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState('');

  function adicionar() {
    const t = texto.trim();
    if (!t) return;
    if (valores.includes(t)) {
      setTexto('');
      return;
    }
    aoMudar([...valores, t]);
    setTexto('');
  }

  function remover(idx: number) {
    aoMudar(valores.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder={placeholder ?? 'Digite e pressione Enter'}
        />
        <Button type="button" variant="outline" onClick={adicionar}>
          Adicionar
        </Button>
      </div>
      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valores.map((v, i) => (
            <Badge key={`${v}-${i}`} variant="secondary" className="gap-1">
              {v}
              <button type="button" onClick={() => remover(i)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
