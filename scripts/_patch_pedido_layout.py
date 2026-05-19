import re

path = r"c:\gitgw\supplygo\src\pages\compras\PedidoDetalhePage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "import { LayoutDetalheLinear, HeaderDetalhe, PropLinha, type SecaoDetalhe } from './_LayoutDetalhe'",
    """import { PropLinha } from './_LayoutDetalhe'
import {
  LayoutDetalheFocado, MetaChip, MetaSep, AlertaLinha, type PainelSecao,
} from './_LayoutDetalheFocado'""",
)

content = content.replace("const meta = PEDIDO_STATUS_META", "const statusMeta = PEDIDO_STATUS_META")
content = content.replace("${meta.badge}", "${statusMeta.badge}")
content = content.replace("${meta.dot}", "${statusMeta.dot}")
content = content.replace("{meta.label}", "{statusMeta.label}")

content = re.sub(
    r"  const alertas = ped\.status === 'cancelado'[\s\S]*?  \) : null\n",
    """  const alerta = ped.status === 'cancelado' && ped.motivo_cancelamento ? (
    <AlertaLinha tom="red">Cancelado: {ped.motivo_cancelamento}</AlertaLinha>
  ) : null

  const faixaMeta = (
    <>
      <MetaChip label="Fornecedor" destaque>
        {ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social ?? '—'}
      </MetaChip>
      <MetaSep />
      <MetaChip label="Empresa">{ped.empresa?.nome_fantasia ?? ped.empresa?.razao_social ?? '—'}</MetaChip>
      <MetaSep />
      <MetaChip label="Total" destaque>{formatMoney(total)}</MetaChip>
      {progresso > 0 && (
        <>
          <MetaSep />
          <MetaChip label="Recebido">{progresso.toFixed(0)}%</MetaChip>
        </>
      )}
    </>
  )

""",
    content,
    count=1,
)

content = re.sub(
    r"  // ── Tab \"Detalhes\"[\s\S]*?  const detalhes = \([\s\S]*?  \)\n\n  // ── Seções",
    """  const detalhes = (
    <dl className="space-y-2 text-sm">
      <PropLinha label="Comprador" icone={<UserIcon size={11} />}>
        {ped.comprador?.nome ?? ped.comprador?.email ?? '—'}
      </PropLinha>
      <PropLinha label="Aprovador" icone={<UserIcon size={11} />}>
        {ped.aprovador?.nome ?? ped.aprovador?.email ?? '—'}
      </PropLinha>
      <PropLinha label="Prazo entrega">
        {ped.prazo_entrega_dias ? `${ped.prazo_entrega_dias} dias` : '—'}
      </PropLinha>
      <PropLinha label="Condição pagto">{ped.condicao_pagamento ?? '—'}</PropLinha>
      {ped.observacoes && (
        <PropLinha label="Observações">
          <p className="whitespace-pre-wrap text-xs">{ped.observacoes}</p>
        </PropLinha>
      )}
    </dl>
  )

  const painelVinculos = (
    <div className="space-y-4 text-sm">
      {ped.cotacao && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">Cotação origem</p>
          <Link to={`/compras/cotacoes/${ped.cotacao.id}`} className="font-mono text-violet-700 dark:text-violet-300 hover:underline">
            {ped.cotacao.numero}
          </Link>
        </div>
      )}
      {scsOrigem.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">SCs origem</p>
          <ul className="space-y-1">
            {scsOrigem.map(s => (
              <li key={s.id}>
                <Link to={`/compras/solicitacoes/${s.id}`} className="font-mono text-emerald-700 hover:underline">{s.numero}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {recebimentos.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1">Recebimentos</p>
          <ul className="space-y-1 text-xs font-mono">
            {recebimentos.map(r => (
              <li key={r.id}>{r.numero} · {formatDateTime(r.data_recebimento)}</li>
            ))}
          </ul>
        </div>
      )}
      {ped.ml_pedido_id && <PainelMercadoLivre mlPedidoId={ped.ml_pedido_id} />}
    </div>
  )

  // ── Principal""",
    content,
    count=1,
)

content = content.replace("<motion", "<motion").replace("</div>", "</div>")
content = content.replace("<motion", "<div").replace("</div>", "</div>")

content = content.replace(
    """  // ── Seções (página linear, sem tabs) ──
  const secoes: SecaoDetalhe[] = [
    {
      id: 'itens',
      titulo: 'Itens',
      icone: <Table2 size={13} />,
      badge: itens.length,
      conteudo: (""",
    "  const tabelaItens = (",
)

content = re.sub(
    r"\n      \),\n    \},\n    \{\n      id: 'recebimentos',[\s\S]*?\n  \]\n\n  return \(\n    <LayoutDetalhe",
    """
  )

  const principal = (
    <>
      {ped.status === 'aguardando_aprovacao' && (
        <div className="border-b border-gray-200 dark:border-gray-800">
          <ComparativoCotacoesDoPedido pedido={ped} itens={itens} onRefresh={fetchData} />
        </div>
      )}
      {tabelaItens}
    </>
  )

  const painelSecoes: PainelSecao[] = [
    { id: 'historico', label: 'Histórico', badge: historico.length, conteudo: <HistoricoTimeline eventos={historico} /> },
    { id: 'vinculos', label: 'Vínculos', conteudo: painelVinculos },
    { id: 'detalhes', label: 'Detalhes', conteudo: detalhes },
  ]

  return (
    <>
      <LayoutDetalheFocado""",
    content,
    count=1,
)

content = content.replace("<motion", "<div").replace("</div>", "</div>")

content = content.replace(
    """      <LayoutDetalheFocado
      cabecalho={
        <HeaderDetalhe
          voltar={<BotaoVoltar fallback="/compras/pedidos" label="Voltar" />}
          icone={<ShoppingCart size={20} className="text-indigo-600 dark:text-indigo-400" />}
          iconeBg="bg-indigo-50 dark:bg-indigo-950/30"
          numero={ped.numero}
          subtitulo={`Criado ${formatDateTime(ped.created_at)}`}
          badges={badges}
          acoes={acoes}
          alertas={alertas}
        />
      }
      fluxo={
        <LinhaTempoProcesso
          pedidoId={ped.id}
          currentStep={['enviado','parcialmente_recebido','recebido'].includes(ped.status) ? 'recebimento' : 'pedido'}
          compacto
        />
      }
      tabs={tabs}
      abaInicial={ped.status === 'aguardando_aprovacao' ? 'comparativo' : 'itens'}
      sidebarOculta
    />
  )""",
    """      <LayoutDetalheFocado
        voltar={<BotaoVoltar fallback="/compras/pedidos" label="Voltar" />}
        titulo={ped.numero}
        subtitulo={ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social}
        badges={badges}
        acoes={acoes}
        meta={faixaMeta}
        alerta={alerta}
        fluxo={
          <LinhaTempoProcesso
            pedidoId={ped.id}
            currentStep={['enviado','parcialmente_recebido','recebido'].includes(ped.status) ? 'recebimento' : 'pedido'}
            compacto
          />
        }
        principal={principal}
        painelSecoes={painelSecoes}
      />
    </>
  )""",
)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("pedido ok")
