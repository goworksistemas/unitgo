-- ============================================================================
-- 011_alcadas_simplificadas.sql
-- Simplifica alcadas_aprovacao para conter apenas (aprovador, valor_limite).
-- Remove escopo, faixa minima, perfil_aprovador e tabela N:N com departamentos.
-- ============================================================================

-- 1) Drop tabela N:N e indice/policies relacionados
DROP TABLE IF EXISTS public.alcadas_aprovacao_departamentos CASCADE;
DROP INDEX IF EXISTS public.idx_alcadas_ativo;

-- 2) Drop constraints antigas (nomes do 001_schema_completo.sql)
ALTER TABLE public.alcadas_aprovacao DROP CONSTRAINT IF EXISTS chk_alcadas_escopo;
ALTER TABLE public.alcadas_aprovacao DROP CONSTRAINT IF EXISTS chk_alcadas_aprovador;
ALTER TABLE public.alcadas_aprovacao DROP CONSTRAINT IF EXISTS chk_alcadas_faixa;
ALTER TABLE public.alcadas_aprovacao DROP CONSTRAINT IF EXISTS chk_alcadas_valor;

-- 3) Drop colunas obsoletas
ALTER TABLE public.alcadas_aprovacao DROP COLUMN IF EXISTS escopo;
ALTER TABLE public.alcadas_aprovacao DROP COLUMN IF EXISTS valor_limite_min;
ALTER TABLE public.alcadas_aprovacao DROP COLUMN IF EXISTS perfil_aprovador;

-- 4) Renomear valor_limite_max para valor_limite (mais claro: "aprova ate este valor")
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'alcadas_aprovacao'
       AND column_name = 'valor_limite_max'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'alcadas_aprovacao'
       AND column_name = 'valor_limite'
  ) THEN
    ALTER TABLE public.alcadas_aprovacao RENAME COLUMN valor_limite_max TO valor_limite;
  END IF;
END $$;

-- 5) Garantir usuario_id NOT NULL
UPDATE public.alcadas_aprovacao SET ativo = false WHERE usuario_id IS NULL;
DELETE FROM public.alcadas_aprovacao WHERE usuario_id IS NULL;
ALTER TABLE public.alcadas_aprovacao ALTER COLUMN usuario_id SET NOT NULL;

-- 6) Nova constraint
ALTER TABLE public.alcadas_aprovacao
  ADD CONSTRAINT chk_alcadas_valor CHECK (valor_limite IS NULL OR valor_limite > 0);

-- 7) Recriar indice
CREATE INDEX IF NOT EXISTS idx_alcadas_ativo
  ON public.alcadas_aprovacao(ativo, valor_limite);

-- 8) Recarregar PostgREST
NOTIFY pgrst, 'reload schema';
