-- ============================================================
-- 015_refatora_fluxo_aprovacao.sql
--
-- Refatora o fluxo de aprovação:
--   ANTES: Cotação tinha aprovação de orçamento pela diretoria → gerava pedido aprovado.
--   AGORA: Cotação termina em "vencedor_escolhido" pelo comprador.
--          O PEDIDO é gerado em "aguardando_aprovacao" e quem aprova é a
--          pessoa definida pela ALÇADA por valor.
--
-- Migra dados existentes:
--   * cmp_cotacoes.status = 'aguardando_aprovacao_orcamento' → 'vencedor_escolhido'
--   * cmp_cotacoes.status = 'orcamento_aprovado'             → 'encerrada'
--   * cmp_pedidos_compra.status default = 'aguardando_aprovacao'
-- ============================================================

-- 1. Migra dados das cotações existentes
update public.cmp_cotacoes
   set status = 'vencedor_escolhido'
 where status = 'aguardando_aprovacao_orcamento';

update public.cmp_cotacoes
   set status = 'encerrada'
 where status = 'orcamento_aprovado';

-- 2. Substitui constraint de status da cotação
alter table public.cmp_cotacoes
  drop constraint if exists cmp_cotacoes_status_check;

alter table public.cmp_cotacoes
  add constraint cmp_cotacoes_status_check
    check (status in (
      'aberta',
      'respondida',
      'vencedor_escolhido',
      'encerrada',
      'cancelada'
    ));

comment on column public.cmp_cotacoes.status is
  'aberta → respondida → vencedor_escolhido → encerrada. A aprovação acontece no PEDIDO, não na cotação.';

-- 3. Pedido nasce em "aguardando_aprovacao" (default antes era "aprovado")
alter table public.cmp_pedidos_compra
  alter column status set default 'aguardando_aprovacao';
