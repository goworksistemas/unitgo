-- Normaliza file_type legado (application/pdf) e amplia constraint para MIME types do ML.

alter table public.ml_notas_fiscais
  drop constraint if exists ml_notas_fiscais_file_type_check;

update public.ml_notas_fiscais
set file_type = case
  when lower(file_type) like '%pdf%' then 'pdf'
  when lower(file_type) like '%xml%' then 'xml'
  else file_type
end
where file_type is not null;

alter table public.ml_notas_fiscais
  add constraint ml_notas_fiscais_file_type_check
  check (file_type is null or file_type in ('xml', 'pdf'));

-- Pack null no ML: usar order_id como chave (recomendação da API do ML).
update public.ml_pedidos
set ml_pack_id = ml_order_id
where ml_pack_id is null;
