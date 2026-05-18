import { supabase } from '@/lib/supabase'
import type {
  CmpCotacao, CmpCotacaoEscolha, CmpCotacaoFornecedor, CmpCotacaoItem,
} from '@/types/database'

interface GerarOpcoes {
  cotacao: Pick<CmpCotacao, 'id' | 'empresa_id' | 'comprador_id'>
  itens: CmpCotacaoItem[]
  fornecedores: (CmpCotacaoFornecedor & { fornecedor_id: string })[]
  escolhas: CmpCotacaoEscolha[]
}

export interface GerarResultado {
  pedidos_gerados: { id: string; fornecedor_id: string; aprovador_id: string | null; alcada_id: string | null; valor_total: number }[]
}

/**
 * Gera N pedidos (1 por fornecedor vencedor) a partir das escolhas de uma cotação.
 * Cada pedido nasce em "aguardando_aprovacao" e o aprovador é definido pela ALÇADA por valor.
 * Marca os itens da SC origem como "em_pedido" e a cotação como "encerrada".
 */
export async function gerarPedidosDaCotacao({
  cotacao, itens, fornecedores, escolhas,
}: GerarOpcoes): Promise<GerarResultado> {
  // Agrupa escolhas por fornecedor
  const porFornecedor: Record<string, {
    cfId: string; fornecedorId: string;
    prazo: number | null; condicao: string | null;
    linhas: { escolha: CmpCotacaoEscolha; item: CmpCotacaoItem }[]
  }> = {}

  for (const esc of escolhas) {
    const cf = fornecedores.find(f => f.id === esc.cotacao_fornecedor_id)
    const item = itens.find(i => i.id === esc.cotacao_item_id)
    if (!cf || !item) continue
    if (!porFornecedor[cf.fornecedor_id]) {
      porFornecedor[cf.fornecedor_id] = {
        cfId: cf.id,
        fornecedorId: cf.fornecedor_id,
        prazo: cf.prazo_entrega_dias,
        condicao: cf.condicao_pagamento,
        linhas: [],
      }
    }
    porFornecedor[cf.fornecedor_id].linhas.push({ escolha: esc, item })
  }

  const resultados: GerarResultado['pedidos_gerados'] = []

  for (const grupo of Object.values(porFornecedor)) {
    const valor = grupo.linhas.reduce((s, l) => s + Number(l.item.quantidade) * Number(l.escolha.preco_final_unitario), 0)

    // Resolve alçada por valor
    const { data: aprovadorAlcadaId } = await supabase.rpc('get_aprovador_alcada', {
      p_empresa_id: cotacao.empresa_id,
      p_valor: valor,
    })
    let alcadaId: string | null = null
    if (aprovadorAlcadaId) {
      const { data: alcada } = await supabase.from('cmp_alcadas_aprovacao')
        .select('id')
        .eq('empresa_id', cotacao.empresa_id)
        .eq('aprovador_id', aprovadorAlcadaId)
        .lte('valor_min', valor)
        .or(`valor_max.is.null,valor_max.gte.${valor}`)
        .eq('ativo', true)
        .order('ordem').order('valor_min', { ascending: false })
        .limit(1).maybeSingle()
      alcadaId = alcada?.id ?? null
    }

    const { data: ped, error: pedErr } = await supabase.from('cmp_pedidos_compra').insert({
      empresa_id: cotacao.empresa_id,
      fornecedor_id: grupo.fornecedorId,
      cotacao_id: cotacao.id,
      comprador_id: cotacao.comprador_id,
      prazo_entrega_dias: grupo.prazo,
      condicao_pagamento: grupo.condicao,
      status: 'aguardando_aprovacao',
      aprovador_id: aprovadorAlcadaId,  // sugestão de aprovador (pela alçada)
      alcada_id: alcadaId,
    }).select('id').single()
    if (pedErr || !ped) throw pedErr ?? new Error('Falha ao criar pedido')

    await supabase.from('cmp_pedidos_compra_itens').insert(
      grupo.linhas.map((l, idx) => ({
        pedido_id: ped.id,
        linha: idx + 1,
        cotacao_item_id: l.item.id,
        solicitacao_item_id: l.item.solicitacao_item_id,
        produto_id: l.item.produto_id,
        variante_id: l.item.variante_id,
        unidade_medida_id: l.item.unidade_medida_id,
        quantidade: l.item.quantidade,
        preco_unitario: l.escolha.preco_final_unitario,
        observacao: l.item.observacao,
      }))
    )

    // Marca os itens da SC origem como 'em_pedido'
    const scItemIds = grupo.linhas
      .map(l => l.item.solicitacao_item_id)
      .filter(Boolean) as string[]
    if (scItemIds.length > 0) {
      await supabase.from('cmp_solicitacoes_compra_itens')
        .update({ status_item: 'em_pedido' })
        .in('id', scItemIds)
    }

    resultados.push({
      id: ped.id,
      fornecedor_id: grupo.fornecedorId,
      aprovador_id: aprovadorAlcadaId,
      alcada_id: alcadaId,
      valor_total: valor,
    })
  }

  // Encerra a cotação
  await supabase.from('cmp_cotacoes')
    .update({ status: 'encerrada' })
    .eq('id', cotacao.id)

  return { pedidos_gerados: resultados }
}
