-- ============================================================
-- 016_remove_rascunho.sql
-- Remove o status 'rascunho' do sistema:
--   - cmp_solicitacoes_compra: SC nasce já em 'aguardando_aprovacao'
--   - cmp_pedidos_compra: pedido continua nascendo em 'aguardando_aprovacao'
--     (já não usa rascunho, só ficou no check constraint)
-- Migra dados existentes em rascunho → aguardando_aprovacao
-- ============================================================

-- 1. SC: migra rascunhos pra "aguardando_aprovacao"
update public.cmp_solicitacoes_compra
   set status = 'aguardando_aprovacao',
       enviada_em = coalesce(enviada_em, created_at)
 where status = 'rascunho';

-- 2. SC: substitui check constraint
alter table public.cmp_solicitacoes_compra
  drop constraint if exists cmp_solicitacoes_compra_status_check;

alter table public.cmp_solicitacoes_compra
  add constraint cmp_solicitacoes_compra_status_check
    check (status in (
      'aguardando_aprovacao',
      'aprovada',
      'reprovada',
      'cancelada',
      'atendida'
    ));

-- 3. SC: novo default
alter table public.cmp_solicitacoes_compra
  alter column status set default 'aguardando_aprovacao';

-- 4. SC: ajusta policy de INSERT (removendo 'rascunho')
drop policy if exists "cmp_sc_insert" on public.cmp_solicitacoes_compra;

create policy "cmp_sc_insert"
  on public.cmp_solicitacoes_compra for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and status = 'aguardando_aprovacao'
  );

-- 5. SC: ajusta policy de DELETE (não tem mais rascunho — só admin deleta)
drop policy if exists "cmp_sc_delete" on public.cmp_solicitacoes_compra;

create policy "cmp_sc_delete"
  on public.cmp_solicitacoes_compra for delete to authenticated
  using (public.get_my_role() = 'admin');

-- 6. Pedido: tira 'rascunho' do check (default já era aguardando_aprovacao)
update public.cmp_pedidos_compra
   set status = 'aguardando_aprovacao'
 where status = 'rascunho';

alter table public.cmp_pedidos_compra
  drop constraint if exists cmp_pedidos_compra_status_check;

alter table public.cmp_pedidos_compra
  add constraint cmp_pedidos_compra_status_check
    check (status in (
      'aguardando_aprovacao',
      'aprovado',
      'enviado',
      'parcialmente_recebido',
      'recebido',
      'cancelado'
    ));
