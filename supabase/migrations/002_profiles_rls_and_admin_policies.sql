-- ============================================================
-- 002_profiles_rls_and_admin_policies.sql
-- Corrige policies de RLS da tabela profiles:
--   - Remove policies conflitantes criadas manualmente
--   - Garante GRANTs corretos para o role authenticated
--   - Cria função get_my_role() sem recursão para policies de admin
--   - Recria policies limpas para select, update e admin
-- ============================================================

-- ------------------------------------------------------------
-- Remove policies avulsas criadas fora de migration
-- ------------------------------------------------------------
drop policy if exists "select_own_profile"          on public.profiles;
drop policy if exists "update_own_profile"           on public.profiles;
drop policy if exists "admin_select_all_profiles"    on public.profiles;
drop policy if exists "admin_update_all_profiles"    on public.profiles;
drop policy if exists "usuario pode ver proprio perfil"      on public.profiles;
drop policy if exists "usuario pode atualizar proprio perfil" on public.profiles;
drop policy if exists "admin pode ver todos os perfis"       on public.profiles;
drop policy if exists "admin pode atualizar todos os perfis" on public.profiles;

-- Remove policies da migration 001 para recriar com nomes padronizados
drop policy if exists "profiles_select"      on public.profiles;
drop policy if exists "profiles_update_own"  on public.profiles;

-- ------------------------------------------------------------
-- GRANTs — necessários além das policies
-- ------------------------------------------------------------
grant select, update on public.profiles to authenticated;

-- ------------------------------------------------------------
-- Função auxiliar: retorna o role do usuário logado
-- Usa SECURITY DEFINER para evitar recursão nas policies de RLS
-- ------------------------------------------------------------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.profiles where id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Policies de SELECT
-- Todo usuário autenticado pode ver todos os perfis
-- (necessário para selects de solicitante, comprador, etc.)
-- ------------------------------------------------------------
create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

-- ------------------------------------------------------------
-- Policies de UPDATE
-- Usuário comum: só o próprio perfil (nome, avatar_url)
-- Admin: qualquer perfil (nome, role, ativo)
-- ------------------------------------------------------------
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- Trigger: cria profile automaticamente ao signup
-- (recria para garantir idempotência)
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
