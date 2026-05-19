import re

path = r"c:\gitgw\supplygo\src\pages\compras\CotacaoDetalhePage.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    """  // ── Seções (página linear, sem tabs) ──
  const secoes: SecaoDetalhe[] = [
    {
      id: 'comparativo',
      titulo: 'Comparativo de cotações',
      icone: <Table2 size={13} />,
      conteudo: """,
    "  const principal = ",
)

content = re.sub(
    r"\n      \}\)\(\),\n    \},\n    \{[\s\S]*?\n  \]\n\n  return \(",
    """
      })()

  const painelSecoes: PainelSecao[] = [
    { id: 'historico', label: 'Histórico', badge: historico.length, conteudo: <HistoricoTimeline eventos={historico} /> },
    { id: 'vinculos', label: 'Vínculos', badge: scsVinc.length + pedidosVinc.length || undefined, conteudo: painelVinculos },
    { id: 'detalhes', label: 'Detalhes', conteudo: detalhes },
  ]

  return (""",
    content,
    count=1,
)

old_return = """      <LayoutDetalheLinear
        cabecalho={
          <HeaderDetalhe
            voltar={<BotaoVoltar fallback="/compras/cotacoes" label="Voltar" />}
            icone={<Trophy size={20} className="text-violet-600 dark:text-violet-400" />}
            iconeBg="bg-violet-50 dark:bg-violet-950/30"
            numero={cot.numero}
            subtitulo={cot.titulo}
            badges={badges}
            acoes={acoes}
            alertas={alertas}
          />
        }
        fluxo={<LinhaTempoProcesso cotacaoId={cot.id} currentStep="cotacao" compacto />}
        secoes={secoes}
      />"""

new_return = """      <LayoutDetalheFocado
        voltar={<BotaoVoltar fallback="/compras/cotacoes" label="Voltar" />}
        titulo={cot.numero}
        subtitulo={cot.titulo}
        badges={badges}
        acoes={acoes}
        meta={faixaMeta}
        alerta={alerta}
        fluxo={<LinhaTempoProcesso cotacaoId={cot.id} currentStep="cotacao" compacto />}
        principal={principal}
        painelSecoes={painelSecoes}
      />"""

content = content.replace(old_return, new_return)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("patched ok")
