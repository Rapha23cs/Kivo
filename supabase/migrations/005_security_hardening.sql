-- =============================================================================
-- Kivo - Migration 005: Hardening de Segurança, RLS, Storage e RPC Transacional
-- =============================================================================

-- 1. Unicidade por usuário (evita colisão global de códigos entre auditores)
alter table public.inspecoes
  drop constraint if exists inspecoes_codigo_kivo_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'inspecoes_user_codigo_kivo_key'
  ) then
    alter table public.inspecoes
      add constraint inspecoes_user_codigo_kivo_key unique (user_id, codigo_kivo);
  end if;
end $$;

alter table public.relatorios_inspecao
  drop constraint if exists relatorios_inspecao_codigo_relatorio_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'relatorios_user_codigo_relatorio_key'
  ) then
    alter table public.relatorios_inspecao
      add constraint relatorios_user_codigo_relatorio_key unique (user_id, codigo_relatorio);
  end if;
end $$;

-- 2. Política UPDATE no bucket relatorios-midia (necessária para uploads com upsert: true)
drop policy if exists "Relatorios midia update autenticado" on storage.objects;
create policy "Relatorios midia update autenticado"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'relatorios-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. RPC transacional para gravar Relatório + Desvios + Fotos atomicamente
create or replace function public.sync_relatorio_completo(
  p_header jsonb,
  p_desvios jsonb default '[]'::jsonb,
  p_fotos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text;
  v_relatorio_id uuid;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_codigo := nullif(trim(p_header->>'codigo_relatorio'), '');
  if v_codigo is null then
    raise exception 'codigo_relatorio é obrigatório.';
  end if;

  insert into public.relatorios_inspecao (
    user_id,
    cliente_id,
    inspecao_id,
    unidade_id,
    codigo_relatorio,
    cliente_nome,
    unidade,
    data_hora,
    cidade,
    regional,
    tipo_inspecao,
    objetivo,
    responsavel,
    gerencia,
    fachada_url,
    itens_avaliados,
    conformidades,
    desvios_plano_acao,
    nao_conformidades,
    ocorrencias_ambientais,
    notificacoes,
    interdicoes,
    indice_conformidade,
    nivel_aderencia,
    nivel_maturidade,
    pontos_positivos,
    sintese_desvios,
    conclusao_texto,
    status
  )
  values (
    v_uid,
    nullif(p_header->>'cliente_id', '')::uuid,
    nullif(p_header->>'inspecao_id', '')::uuid,
    nullif(p_header->>'unidade_id', '')::uuid,
    v_codigo,
    nullif(p_header->>'cliente_nome', ''),
    coalesce(nullif(p_header->>'unidade', ''), 'Unidade Atendida'),
    coalesce(nullif(p_header->>'data_hora', '')::timestamptz, now()),
    nullif(p_header->>'cidade', ''),
    nullif(p_header->>'regional', ''),
    coalesce(nullif(p_header->>'tipo_inspecao', ''), 'Programada'),
    nullif(p_header->>'objetivo', ''),
    coalesce(nullif(p_header->>'responsavel', ''), 'Auditor Técnico'),
    nullif(p_header->>'gerencia', ''),
    nullif(p_header->>'fachada_url', ''),
    coalesce((p_header->>'itens_avaliados')::int, 0),
    coalesce((p_header->>'conformidades')::int, 0),
    coalesce((p_header->>'desvios_plano_acao')::int, 0),
    coalesce((p_header->>'nao_conformidades')::int, 0),
    coalesce((p_header->>'ocorrencias_ambientais')::int, 0),
    coalesce((p_header->>'notificacoes')::int, 0),
    coalesce((p_header->>'interdicoes')::int, 0),
    coalesce((p_header->>'indice_conformidade')::numeric, 0),
    coalesce(nullif(p_header->>'nivel_aderencia', ''), 'Baixa Aderência'),
    coalesce(nullif(p_header->>'nivel_maturidade', ''), 'Em Desenvolvimento'),
    nullif(p_header->>'pontos_positivos', ''),
    nullif(p_header->>'sintese_desvios', ''),
    nullif(p_header->>'conclusao_texto', ''),
    case when p_header->>'status' = 'finalizado' then 'finalizado' else 'rascunho' end
  )
  on conflict (user_id, codigo_relatorio) do update set
    cliente_id = excluded.cliente_id,
    inspecao_id = excluded.inspecao_id,
    unidade_id = excluded.unidade_id,
    cliente_nome = excluded.cliente_nome,
    unidade = excluded.unidade,
    data_hora = excluded.data_hora,
    cidade = excluded.cidade,
    regional = excluded.regional,
    tipo_inspecao = excluded.tipo_inspecao,
    objetivo = excluded.objetivo,
    responsavel = excluded.responsavel,
    gerencia = excluded.gerencia,
    fachada_url = excluded.fachada_url,
    itens_avaliados = excluded.itens_avaliados,
    conformidades = excluded.conformidades,
    desvios_plano_acao = excluded.desvios_plano_acao,
    nao_conformidades = excluded.nao_conformidades,
    ocorrencias_ambientais = excluded.ocorrencias_ambientais,
    notificacoes = excluded.notificacoes,
    interdicoes = excluded.interdicoes,
    indice_conformidade = excluded.indice_conformidade,
    nivel_aderencia = excluded.nivel_aderencia,
    nivel_maturidade = excluded.nivel_maturidade,
    pontos_positivos = excluded.pontos_positivos,
    sintese_desvios = excluded.sintese_desvios,
    conclusao_texto = excluded.conclusao_texto,
    status = excluded.status
  returning id into v_relatorio_id;

  delete from public.relatorio_desvios where relatorio_id = v_relatorio_id;

  if jsonb_typeof(p_desvios) = 'array' and jsonb_array_length(p_desvios) > 0 then
    insert into public.relatorio_desvios (
      relatorio_id, numero, descricao, classificacao, severidade_nc, tratativa, responsavel, prazo, status
    )
    select
      v_relatorio_id,
      coalesce((elem->>'numero')::int, ord::int),
      trim(elem->>'descricao'),
      coalesce(nullif(elem->>'classificacao', ''), 'Desvio Pontual'),
      nullif(elem->>'severidade_nc', ''),
      nullif(elem->>'tratativa', ''),
      nullif(elem->>'responsavel', ''),
      nullif(elem->>'prazo', ''),
      coalesce(nullif(elem->>'status', ''), 'Em Aberto')
    from jsonb_array_elements(p_desvios) with ordinality as t(elem, ord)
    where nullif(trim(elem->>'descricao'), '') is not null;
  end if;

  delete from public.relatorio_registros_fotograficos where relatorio_id = v_relatorio_id;

  if jsonb_typeof(p_fotos) = 'array' and jsonb_array_length(p_fotos) > 0 then
    insert into public.relatorio_registros_fotograficos (
      relatorio_id, ordem, secao, legenda, foto_url, observacao, incluir_no_relatorio
    )
    select
      v_relatorio_id,
      (elem->>'ordem')::int,
      coalesce(elem->>'secao', 'Geral'),
      coalesce(elem->>'legenda', 'Registro fotográfico'),
      nullif(elem->>'foto_url', ''),
      nullif(elem->>'observacao', ''),
      coalesce((elem->>'incluir_no_relatorio')::boolean, true)
    from jsonb_array_elements(p_fotos) as elem;
  end if;

  return jsonb_build_object(
    'id', v_relatorio_id,
    'inspecao_id', nullif(p_header->>'inspecao_id', '')
  );
end;
$$;
