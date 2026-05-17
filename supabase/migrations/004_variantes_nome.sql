-- Adiciona campo nome livre à variante
-- Usado quando não há atributos ou quando o usuário quer nomear explicitamente
alter table public.prd_variantes
  add column nome text;

comment on column public.prd_variantes.nome is 'Nome/descrição livre da variante (ex: "Vermelho G", "Padrão"). Opcional quando atributos já descrevem a variante.';
