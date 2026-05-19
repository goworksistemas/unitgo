-- ============================================================================
-- 021_atendimento_automatico_sc.sql
--
-- Fecha o ciclo do processo de compras: quando os pedidos são totalmente
-- recebidos, os itens da SC viram "atendido" automaticamente e, quando todos
-- os itens ativos de uma SC estão atendidos, a SC vira "atendida".
--
-- Antes desta migration, o trigger existente (atualizar_recebimento_pedido)
-- atualizava apenas:
--   - cmp_pedidos_compra_itens.status_item  (recebido/parcial/pendente)
--   - cmp_pedidos_compra.status             (recebido/parcial)
--
-- O item da SC ficava preso em 'em_pedido' e a SC ficava em 'aprovada'
-- (etapa "Compra") mesmo após todos os recebimentos serem concluídos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- recalcular_status_sc_item(p_sc_item_id)
--
-- Soma as quantidades pedidas e recebidas em todos os itens de pedido ATIVOS
-- (não cancelados, em pedidos não cancelados) que apontam para o item da SC.
-- Define o status_item da SC:
--   - 'atendido'  se total_recebido >= total_pedido e houver ao menos 1 pedido
--   - 'em_pedido' se houver pedidos ativos mas ainda não atendido
--   - inalterado  se não houver pedidos (mantém 'pendente'/'em_cotacao')
-- Nunca toca em itens da SC cancelados.
-- ----------------------------------------------------------------------------
create or replace function public.recalcular_status_sc_item(p_sc_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qtd_pedida_total   numeric := 0;
  v_qtd_recebida_total numeric := 0;
  v_qtd_pedidos        integer := 0;
  v_status_atual       text;
begin
  if p_sc_item_id is null then return; end if;

  select status_item into v_status_atual
    from public.cmp_solicitacoes_compra_itens
   where id = p_sc_item_id;

  if v_status_atual is null or v_status_atual = 'cancelado' then return; end if;

  select coalesce(sum(pi.quantidade), 0),
         coalesce(sum(pi.quantidade_recebida), 0),
         count(*)
    into v_qtd_pedida_total, v_qtd_recebida_total, v_qtd_pedidos
    from public.cmp_pedidos_compra_itens pi
    join public.cmp_pedidos_compra p on p.id = pi.pedido_id
   where pi.solicitacao_item_id = p_sc_item_id
     and pi.status_item <> 'cancelado'
     and p.status         <> 'cancelado';

  if v_qtd_pedidos = 0 then return; end if;

  if v_qtd_pedida_total > 0 and v_qtd_recebida_total >= v_qtd_pedida_total then
    update public.cmp_solicitacoes_compra_itens
       set status_item = 'atendido'
     where id = p_sc_item_id
       and status_item <> 'atendido';
  else
    update public.cmp_solicitacoes_compra_itens
       set status_item = 'em_pedido'
     where id = p_sc_item_id
       and status_item not in ('em_pedido','cancelado');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- recalcular_status_sc(p_sc_id)
--
-- Define o status da SC:
--   - 'atendida' se TODOS os itens ativos estiverem 'atendido'
--   - mantém status atual em outros casos
--   - se a SC estava 'atendida' e algum item deixou de estar, volta para 'aprovada'
-- Só atua em SCs em 'aprovada' ou 'atendida' (não mexe em aguardando/reprovada/cancelada).
-- ----------------------------------------------------------------------------
create or replace function public.recalcular_status_sc(p_sc_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_atual text;
  v_total        integer;
  v_atendidos    integer;
begin
  if p_sc_id is null then return; end if;

  select status into v_status_atual
    from public.cmp_solicitacoes_compra
   where id = p_sc_id;

  if v_status_atual not in ('aprovada','atendida') then return; end if;

  select count(*),
         count(*) filter (where status_item = 'atendido')
    into v_total, v_atendidos
    from public.cmp_solicitacoes_compra_itens
   where solicitacao_id = p_sc_id
     and status_item <> 'cancelado';

  if v_total = 0 then return; end if;

  if v_atendidos = v_total then
    update public.cmp_solicitacoes_compra
       set status = 'atendida'
     where id = p_sc_id
       and status <> 'atendida';
  else
    update public.cmp_solicitacoes_compra
       set status = 'aprovada'
     where id = p_sc_id
       and status = 'atendida';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger em cmp_pedidos_compra_itens
-- Quando qualquer mudança em itens de pedido (insert/update/delete), recalcular
-- o item da SC vinculado e o status da SC.
-- ----------------------------------------------------------------------------
create or replace function public.tg_pi_atualiza_sc_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sc_item_id uuid;
  v_sc_id      uuid;
begin
  v_sc_item_id := coalesce(new.solicitacao_item_id, old.solicitacao_item_id);

  if v_sc_item_id is null then
    return coalesce(new, old);
  end if;

  perform public.recalcular_status_sc_item(v_sc_item_id);

  select solicitacao_id into v_sc_id
    from public.cmp_solicitacoes_compra_itens
   where id = v_sc_item_id;

  if v_sc_id is not null then
    perform public.recalcular_status_sc(v_sc_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists cmp_pi_atualiza_sc_item on public.cmp_pedidos_compra_itens;

create trigger cmp_pi_atualiza_sc_item
  after insert or update or delete on public.cmp_pedidos_compra_itens
  for each row execute function public.tg_pi_atualiza_sc_item();

-- ----------------------------------------------------------------------------
-- Trigger em cmp_pedidos_compra
-- Quando o pedido muda de status (ex.: cancelado), recalcular todos os itens
-- da SC que estão vinculados aos itens deste pedido.
-- ----------------------------------------------------------------------------
create or replace function public.tg_p_atualiza_scs_vinculadas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  if (TG_OP = 'UPDATE' and new.status is not distinct from old.status) then
    return new;
  end if;

  for r in
    select distinct sci.solicitacao_id, sci.id as sc_item_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens sci on sci.id = pi.solicitacao_item_id
     where pi.pedido_id = coalesce(new.id, old.id)
  loop
    perform public.recalcular_status_sc_item(r.sc_item_id);
    perform public.recalcular_status_sc(r.solicitacao_id);
  end loop;

  return coalesce(new, old);
end;
$$;

drop trigger if exists cmp_p_atualiza_scs_vinculadas on public.cmp_pedidos_compra;

create trigger cmp_p_atualiza_scs_vinculadas
  after update or delete on public.cmp_pedidos_compra
  for each row execute function public.tg_p_atualiza_scs_vinculadas();

-- ============================================================================
-- BACKFILL — corrige dados existentes que ficaram presos no estado errado
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select distinct solicitacao_item_id
      from public.cmp_pedidos_compra_itens
     where solicitacao_item_id is not null
  loop
    perform public.recalcular_status_sc_item(r.solicitacao_item_id);
  end loop;
end$$;

do $$
declare
  r record;
begin
  for r in
    select id
      from public.cmp_solicitacoes_compra
     where status in ('aprovada','atendida')
  loop
    perform public.recalcular_status_sc(r.id);
  end loop;
end$$;
