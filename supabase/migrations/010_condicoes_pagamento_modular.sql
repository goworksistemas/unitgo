-- ============================================================================
-- 010_condicoes_pagamento_modular.sql
-- Reestrutura `condicoes_pagamento` para um modelo modular com:
--   tipo (a_vista | parcelado | recorrente)
--   periodicidade (diaria, semanal, ..., anual, customizada) — NULL se a_vista
--   intervalo_dias (calculado pela periodicidade ou livre se customizada)
--   qtd_parcelas (NULL se recorrente indefinido)
--   primeiro_venc_dias (dias entre emissao e 1a parcela)
--   eh_indefinido (so recorrente — sem data fim)
-- ============================================================================

-- 1) Limpar restricoes antigas (idempotente)
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_tipo;
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_a_vista;
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_parcelado;
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_recorrente;
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_periodicidade;
ALTER TABLE public.condicoes_pagamento DROP CONSTRAINT IF EXISTS chk_cp_intervalo_periodicidade;

-- 2) Drop coluna antiga
ALTER TABLE public.condicoes_pagamento DROP COLUMN IF EXISTS dias;

-- 3) Adicionar colunas novas (idempotente via IF NOT EXISTS — PG 9.6+)
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS tipo               text    NOT NULL DEFAULT 'a_vista';
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS periodicidade      text;
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS intervalo_dias     int     NOT NULL DEFAULT 0;
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS qtd_parcelas       int;
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS primeiro_venc_dias int     NOT NULL DEFAULT 0;
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS eh_indefinido      boolean NOT NULL DEFAULT false;
ALTER TABLE public.condicoes_pagamento ADD COLUMN IF NOT EXISTS atualizado_em      timestamptz NOT NULL DEFAULT now();

-- 4) CHECK constraints
ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_tipo
  CHECK (tipo IN ('a_vista','parcelado','recorrente'));

ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_periodicidade
  CHECK (
    periodicidade IS NULL
    OR periodicidade IN ('diaria','semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual','customizada')
  );

-- 5) Coerencia entre tipo e periodicidade
ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_a_vista CHECK (
  tipo <> 'a_vista' OR (
    qtd_parcelas IS NOT NULL AND qtd_parcelas = 1
    AND primeiro_venc_dias = 0
    AND intervalo_dias = 0
    AND eh_indefinido = false
    AND periodicidade IS NULL
  )
);

ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_parcelado CHECK (
  tipo <> 'parcelado' OR (
    qtd_parcelas IS NOT NULL AND qtd_parcelas >= 1
    AND eh_indefinido = false
    AND periodicidade IS NOT NULL
  )
);

ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_recorrente CHECK (
  tipo <> 'recorrente' OR (
    periodicidade IS NOT NULL
    AND (eh_indefinido = true OR (qtd_parcelas IS NOT NULL AND qtd_parcelas >= 1))
  )
);

-- 6) Forca intervalo_dias coerente com periodicidade nomeada
ALTER TABLE public.condicoes_pagamento ADD CONSTRAINT chk_cp_intervalo_periodicidade CHECK (
  periodicidade IS NULL
  OR periodicidade = 'customizada'
  OR (periodicidade = 'diaria'      AND intervalo_dias = 1)
  OR (periodicidade = 'semanal'     AND intervalo_dias = 7)
  OR (periodicidade = 'quinzenal'   AND intervalo_dias = 15)
  OR (periodicidade = 'mensal'      AND intervalo_dias = 30)
  OR (periodicidade = 'bimestral'   AND intervalo_dias = 60)
  OR (periodicidade = 'trimestral'  AND intervalo_dias = 90)
  OR (periodicidade = 'semestral'   AND intervalo_dias = 180)
  OR (periodicidade = 'anual'       AND intervalo_dias = 365)
);

-- 7) Trigger para atualizado_em
CREATE OR REPLACE FUNCTION public.fn_set_atualizado_em() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_condicoes_pagamento_atualizado ON public.condicoes_pagamento;
CREATE TRIGGER trg_condicoes_pagamento_atualizado
  BEFORE UPDATE ON public.condicoes_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_atualizado_em();

-- 8) Recarregar PostgREST
NOTIFY pgrst, 'reload schema';
