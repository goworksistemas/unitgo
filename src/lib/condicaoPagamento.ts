/**
 * Helpers para condicoes de pagamento.
 *
 * - PERIODICIDADE_DIAS: mapa periodicidade nomeada -> intervalo_dias
 * - simularParcelas(condicao, dataEmissao, valorTotal): retorna array de parcelas
 * - resumoCondicao(condicao): texto curto descrevendo a condicao
 */
import type {
  CondicaoPagamento,
  PeriodicidadeCondicaoPagamento,
  TipoCondicaoPagamento,
} from '@/types';

export const PERIODICIDADE_DIAS: Record<
  Exclude<PeriodicidadeCondicaoPagamento, 'customizada'>,
  number
> = {
  diaria: 1,
  semanal: 7,
  quinzenal: 15,
  mensal: 30,
  bimestral: 60,
  trimestral: 90,
  semestral: 180,
  anual: 365,
};

export const PERIODICIDADE_LABEL: Record<PeriodicidadeCondicaoPagamento, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
  customizada: 'Customizada',
};

export const TIPO_CONDICAO_LABEL: Record<TipoCondicaoPagamento, string> = {
  a_vista: 'A vista',
  parcelado: 'Parcelado',
  recorrente: 'Recorrente',
};

export interface ParcelaSimulada {
  numero: number;
  vencimento: Date;
  valor: number;
}

export function simularParcelas(
  condicao: Pick<
    CondicaoPagamento,
    'tipo' | 'qtdParcelas' | 'intervaloDias' | 'primeiroVencDias' | 'ehIndefinido'
  >,
  dataEmissao: Date,
  valorTotal: number,
  /** Quantas parcelas mostrar quando a condicao e' recorrente indefinido. */
  janelaIndefinido = 12,
): ParcelaSimulada[] {
  if (condicao.tipo === 'a_vista') {
    return [{ numero: 1, vencimento: new Date(dataEmissao), valor: valorTotal }];
  }

  const qtd =
    condicao.tipo === 'recorrente' && condicao.ehIndefinido
      ? janelaIndefinido
      : (condicao.qtdParcelas ?? 1);

  if (qtd <= 0) return [];

  // Para recorrente: cada "parcela" e' uma cobranca cheia (nao divide).
  // Para parcelado: divide o total entre as parcelas.
  const valorParcela =
    condicao.tipo === 'recorrente' ? valorTotal : valorTotal / qtd;

  const parcelas: ParcelaSimulada[] = [];
  for (let i = 0; i < qtd; i++) {
    const venc = new Date(dataEmissao);
    venc.setDate(
      venc.getDate() + condicao.primeiroVencDias + i * condicao.intervaloDias,
    );
    parcelas.push({
      numero: i + 1,
      vencimento: venc,
      valor: round2(valorParcela),
    });
  }

  // Ajusta diferenca de centavos na ultima parcela (parcelado)
  if (condicao.tipo === 'parcelado' && parcelas.length > 1) {
    const somaParcial = parcelas
      .slice(0, -1)
      .reduce((acc, p) => acc + p.valor, 0);
    parcelas[parcelas.length - 1].valor = round2(valorTotal - somaParcial);
  }

  return parcelas;
}

export function resumoCondicao(c: CondicaoPagamento): string {
  if (c.tipo === 'a_vista') return 'A vista (no ato)';

  const periodicidade =
    c.periodicidade && c.periodicidade !== 'customizada'
      ? PERIODICIDADE_LABEL[c.periodicidade].toLowerCase()
      : `a cada ${c.intervaloDias}d`;

  if (c.tipo === 'parcelado') {
    return `${c.qtdParcelas}x ${periodicidade}, 1a em ${c.primeiroVencDias}d`;
  }

  // recorrente
  if (c.ehIndefinido) {
    return `Recorrente ${periodicidade} (sem fim)${c.primeiroVencDias > 0 ? `, 1a em ${c.primeiroVencDias}d` : ''}`;
  }
  return `Recorrente ${periodicidade} x ${c.qtdParcelas}${c.primeiroVencDias > 0 ? `, 1a em ${c.primeiroVencDias}d` : ''}`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
