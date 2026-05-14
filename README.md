# SupplyGo

Sistema interno de gestao de estoque, solicitacoes, entregas e compras para as unidades Gowork.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS 4
- **UI**: shadcn/ui (Radix primitives) + lucide-react
- **Backend**: Supabase (Postgres + Auth + Storage + RLS policies)
- **Acesso**: frontend conecta direto via `@supabase/supabase-js` (sem Edge Function)

## Instalacao

```bash
npm install
cp .env.example .env
# preencher VITE_SUPABASE_PROJECT_ID e VITE_SUPABASE_ANON_KEY
```

## Banco de dados

SQL na pasta [supabase/migrations/](supabase/migrations/), na ordem:

1. `000_drop_all.sql` — reset (opcional, so em ambiente novo)
2. `001_schema_completo.sql` — 42 tabelas + indices + funcoes + triggers + views + seed
3. `002_rls_e_auth.sql` — RLS, funcoes de permissao e trigger de cadastro

Rodar copiando e colando no Supabase SQL Editor.

## Executar

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de producao
npm run preview      # preview do build
```

## Primeira conta

A primeira conta cadastrada na tela `/signup` recebe automaticamente o perfil **DEV** (acesso total). Contas seguintes ficam sem perfil ate um administrador atribuir.

## Estrutura

```
src/
  components/       componentes React (auth, layout, shared, ui)
  contexts/         AuthContext, PerfilContext, ThemeContext
  hooks/            useInactivityLogout, usePermissao
  lib/              api.ts (cliente Supabase), format.ts, utils.ts
  pages/            Welcome, EmConstrucao
  types/            tipos TypeScript pt-camelCase
  utils/supabase/   client singleton
  App.tsx           BrowserRouter + ProtectedRoute
  main.tsx          entry point
supabase/migrations/  SQL de criacao do banco
DOCs/                 documentacao tecnica (tabelas, plano de acao)
```

## Documentacao

- [DOCs/tabelas.md](DOCs/tabelas.md) — schema completo do banco
- [DOCs/plano-acao.md](DOCs/plano-acao.md) — plano de implementacao em lotes
