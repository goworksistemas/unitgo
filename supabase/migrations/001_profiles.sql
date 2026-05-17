-- ============================================================
-- 001_profiles.sql
-- Tabela de perfis de usuário, vinculada ao auth.users do Supabase.
-- Execute no Supabase SQL Editor ou via Supabase CLI.
-- ============================================================

-- Extensão necessária para gen_random_uuid (já ativa no Supabase por padrão)
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Enum de papéis — expanda conforme os perfis do sistema forem definidos
-- ------------------------------------------------------------
create type public.user_role as enum (
  'admin',
  'user'
);

-- ------------------------------------------------------------
-- Tabela profiles
-- ------------------------------------------------------------
create table public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null,
  nome          text,
  avatar_url    text,
  role          public.user_role not null default 'user',
  ativo         boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Perfis de usuário — espelho de auth.users com dados de negócio.';

-- Índice útil para queries por email
create index profiles_email_idx on public.profiles(email);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

-- Qualquer usuário autenticado pode ver todos os perfis ativos
-- (necessário para selects de "solicitante", "comprador", etc.)
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (true);

-- Usuário pode atualizar apenas o próprio perfil (nome, avatar)
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert é feito somente pelo trigger (service_role / security definer)
-- Admins podem inserir via função RPC se necessário

-- ------------------------------------------------------------
-- Trigger: cria profile automaticamente ao signup
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
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
