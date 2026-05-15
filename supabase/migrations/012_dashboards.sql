-- ============================================================================
-- 012_dashboards.sql
-- Registra o modulo `dashboards` em rotas_sistema e libera tudo para o perfil
-- DEV. Esta migracao nao cria objetos de banco — todas as views ja foram
-- criadas em 001_schema_completo.sql (secao 16).
-- ============================================================================

-- 1) Inserir as 6 rotas do modulo `dashboards`
INSERT INTO public.rotas_sistema (caminho, codigo, nome, descricao, modulo, icone, ordem) VALUES
  ('/dashboards',                            'dashboards.visao-geral',             'Visao Geral',                  'Painel inicial com KPIs do sistema',                              'dashboards', 'layout-dashboard', 1),
  ('/dashboards/estoques-abaixo-minimo',     'dashboards.estoques-abaixo-minimo',  'Estoques Abaixo do Minimo',    'Itens que precisam de ressuprimento (view estoques_abaixo_minimo)','dashboards', 'alert-triangle',   2),
  ('/dashboards/emprestimos-atrasados',      'dashboards.emprestimos-atrasados',   'Emprestimos Atrasados',        'Emprestimos com prazo vencido (view emprestimos_atrasados)',       'dashboards', 'clock-alert',      3),
  ('/dashboards/contratos-vencendo',         'dashboards.contratos-vencendo',      'Contratos Vencendo',           'Contratos vencendo em 30d ou saldo abaixo de 10%',                'dashboards', 'file-warning',     4),
  ('/dashboards/pedidos-aguardando',         'dashboards.pedidos-aguardando',      'Pedidos Aguardando',           'Pedidos de compra aguardando aprovacao por alcada',                'dashboards', 'hourglass',        5),
  ('/dashboards/tempo-etapas',               'dashboards.tempo-etapas',            'Tempo por Etapa',              'Tempo medio em cada etapa das solicitacoes (gargalos)',           'dashboards', 'timer',            6)
ON CONFLICT (codigo) DO UPDATE SET
  caminho   = EXCLUDED.caminho,
  nome      = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  modulo    = EXCLUDED.modulo,
  icone     = EXCLUDED.icone,
  ordem     = EXCLUDED.ordem;

-- 2) Vincular ao perfil DEV (acesso total)
INSERT INTO public.perfis_acesso_rotas (perfil_id, rota_id, pode_ler, pode_escrever, pode_excluir, pode_aprovar)
SELECT
  (SELECT id FROM public.perfis_acesso WHERE codigo = 'DEV'),
  r.id,
  true, true, true, true
FROM public.rotas_sistema r
WHERE r.modulo = 'dashboards'
ON CONFLICT (perfil_id, rota_id) DO UPDATE SET
  pode_ler      = EXCLUDED.pode_ler,
  pode_escrever = EXCLUDED.pode_escrever,
  pode_excluir  = EXCLUDED.pode_excluir,
  pode_aprovar  = EXCLUDED.pode_aprovar;

-- 3) Vincular ao perfil ADMIN (somente leitura — dashboards sao informativos)
INSERT INTO public.perfis_acesso_rotas (perfil_id, rota_id, pode_ler, pode_escrever, pode_excluir, pode_aprovar)
SELECT
  (SELECT id FROM public.perfis_acesso WHERE codigo = 'ADMIN'),
  r.id,
  true, false, false, false
FROM public.rotas_sistema r
WHERE r.modulo = 'dashboards'
ON CONFLICT (perfil_id, rota_id) DO UPDATE SET
  pode_ler      = EXCLUDED.pode_ler,
  pode_escrever = EXCLUDED.pode_escrever,
  pode_excluir  = EXCLUDED.pode_excluir,
  pode_aprovar  = EXCLUDED.pode_aprovar;

-- 4) Recarregar PostgREST
NOTIFY pgrst, 'reload schema';
