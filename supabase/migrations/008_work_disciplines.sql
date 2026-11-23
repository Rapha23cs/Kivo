-- =============================================================================
-- Kivo - Migration 008: Fluxos de Trabalho Multi-Disciplina
-- (Meio Ambiente e Segurança do Trabalho)
-- =============================================================================

alter table public.inspecoes
  add column if not exists disciplina text not null default 'meio_ambiente'
  check (disciplina in ('meio_ambiente', 'seguranca_trabalho'));

alter table public.relatorios_inspecao
  add column if not exists disciplina text not null default 'meio_ambiente'
  check (disciplina in ('meio_ambiente', 'seguranca_trabalho'));

create index if not exists idx_inspecoes_user_disciplina
  on public.inspecoes (user_id, disciplina);

create index if not exists idx_relatorios_user_disciplina
  on public.relatorios_inspecao (user_id, disciplina);

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
  v_disciplina text;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.';
  end if;

  v_codigo := nullif(trim(p_header->>'codigo_relatorio'), '');
  if v_codigo is null then
    raise exception 'codigo_relatorio é obrigatório.';
  end if;

  v_disciplina := case
    when p_header->>'disciplina' = 'seguranca_trabalho' then 'seguranca_trabalho'
    else 'meio_ambiente'
  end;

  insert into public.relatorios_inspecao (
    user_id,
    cliente_id,
    inspecao_id,
    unidade_id,
    disciplina,
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
    status,
    public_token,
    public_enabled,
    public_shared_at
  )
  values (
    v_uid,
    nullif(p_header->>'cliente_id', '')::uuid,
    nullif(p_header->>'inspecao_id', '')::uuid,
    nullif(p_header->>'unidade_id', '')::uuid,
    v_disciplina,
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
    case when p_header->>'status' = 'finalizado' then 'finalizado' else 'rascunho' end,
    nullif(p_header->>'public_token', '')::uuid,
    coalesce((p_header->>'public_enabled')::boolean, false),
    nullif(p_header->>'public_shared_at', '')::timestamptz
  )
  on conflict (user_id, codigo_relatorio) do update set
    cliente_id = excluded.cliente_id,
    inspecao_id = excluded.inspecao_id,
    unidade_id = excluded.unidade_id,
    disciplina = excluded.disciplina,
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
    status = excluded.status,
    public_token = excluded.public_token,
    public_enabled = excluded.public_enabled,
    public_shared_at = excluded.public_shared_at
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
