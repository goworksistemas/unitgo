-- Migration: Fila de atribuição de compradores
-- Execute no Supabase SQL Editor para habilitar a fila de solicitações sem comprador
-- Compradores veem a fila completa e podem atribuir solicitações a si mesmos
--
-- Para Realtime (atualização em tempo real quando outro comprador pegar uma solicitação):
-- Supabase Dashboard > Database > Replication > habilitar "purchase_requests"

-- Adicionar colunas comprador_id e atribuido_em
ALTER TABLE purchase_requests
  ADD COLUMN IF NOT EXISTS comprador_id UUID,
  ADD COLUMN IF NOT EXISTS atribuido_em TIMESTAMP WITH TIME ZONE;

-- Índice para filtrar por comprador
CREATE INDEX IF NOT EXISTS idx_purchase_requests_comprador ON purchase_requests(comprador_id);

-- Nota: As policies RLS do spec (comprador_fila, comprador_atribuir) usam auth.uid().
-- Este projeto usa service_role nas Edge Functions, então as policies atuais
-- (service_role_all) já permitem todas as operações. Se futuramente usar
-- autenticação direta no Supabase com RLS, descomente e adapte:

/*
-- Comprador vê: sem atribuição OU atribuído a ele mesmo
CREATE POLICY "comprador_fila" ON purchase_requests
  FOR SELECT TO authenticated
  USING (
    comprador_id IS NULL
    OR comprador_id = auth.uid()
  );

-- Comprador pode atribuir a si mesmo
CREATE POLICY "comprador_atribuir" ON purchase_requests
  FOR UPDATE TO authenticated
  USING (comprador_id IS NULL OR comprador_id = auth.uid())
  WITH CHECK (comprador_id = auth.uid());
*/
