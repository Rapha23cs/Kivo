-- =============================================================================
-- Kivo - Migration 006: Portal Público de Laudos Compartilháveis + Contato
-- =============================================================================

-- 1. Campos de compartilhamento público controlado no relatório
alter table public.relatorios_inspecao
  add column if not exists public_token uuid unique,
  add column if not exists public_enabled boolean not null default false,
  add column if not exists public_shared_at timestamptz;

create index if not exists idx_relatorios_public_token
  on public.relatorios_inspecao (public_token)
  where public_enabled = true and public_token is not null;

-- 2. Atualiza RPC transacional sync_relatorio_completo para persistir public_token/enabled
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

-- 3. RPC pública somente-leitura por token exclusivo (não expõe user_id nem outros laudos)
create or replace function public.get_public_report(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.relatorios_inspecao%rowtype;
  v_desvios jsonb;
  v_fotos jsonb;
begin
  if p_token is null then
    return null;
  end if;

  select *
  into v_row
  from public.relatorios_inspecao
  where public_token = p_token
    and public_enabled = true
  limit 1;

  if not found then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'numero', d.numero,
        'descricao', d.descricao,
        'classificacao', d.classificacao,
        'severidadeNc', d.severidade_nc,
        'tratativa', d.tratativa,
        'responsavel', d.responsavel,
        'prazo', d.prazo,
        'status', d.status
      )
      order by d.numero
    ),
    '[]'::jsonb
  )
  into v_desvios
  from public.relatorio_desvios d
  where d.relatorio_id = v_row.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'ordem', f.ordem,
        'secao', f.secao,
        'legenda', f.legenda,
        'fotoUrl', f.foto_url,
        'observacao', f.observacao,
        'incluirNoRelatorio', f.incluir_no_relatorio
      )
      order by f.ordem
    ),
    '[]'::jsonb
  )
  into v_fotos
  from public.relatorio_registros_fotograficos f
  where f.relatorio_id = v_row.id
    and f.incluir_no_relatorio = true
    and f.foto_url is not null
    and f.foto_url <> '';

  return jsonb_build_object(
    'codigoRelatorio', v_row.codigo_relatorio,
    'clienteNome', coalesce(v_row.cliente_nome, ''),
    'unidade', v_row.unidade,
    'dataHora', v_row.data_hora,
    'cidade', coalesce(v_row.cidade, ''),
    'regional', coalesce(v_row.regional, ''),
    'tipoInspecao', coalesce(v_row.tipo_inspecao, 'Programada'),
    'objetivo', coalesce(v_row.objetivo, ''),
    'responsavel', v_row.responsavel,
    'gerencia', coalesce(v_row.gerencia, ''),
    'fachadaUrl', coalesce(v_row.fachada_url, ''),
    'itensAvaliados', v_row.itens_avaliados,
    'conformidades', v_row.conformidades,
    'desviosPlanoAcao', v_row.desvios_plano_acao,
    'naoConformidades', v_row.nao_conformidades,
    'ocorrenciasAmbientais', v_row.ocorrencias_ambientais,
    'notificacoes', v_row.notificacoes,
    'interdicoes', v_row.interdicoes,
    'indiceConformidade', v_row.indice_conformidade,
    'nivelAderencia', v_row.nivel_aderencia,
    'nivelMaturidade', v_row.nivel_maturidade,
    'pontosPositivos', coalesce(v_row.pontos_positivos, ''),
    'sinteseDesvios', coalesce(v_row.sintese_desvios, ''),
    'conclusaoTexto', coalesce(v_row.conclusao_texto, ''),
    'status', v_row.status,
    'publicToken', v_row.public_token,
    'publicEnabled', v_row.public_enabled,
    'publicSharedAt', v_row.public_shared_at,
    'desvios', v_desvios,
    'registrosFotograficos', v_fotos
  );
end;
$$;

revoke all on function public.get_public_report(uuid) from public;
grant execute on function public.get_public_report(uuid) to anon, authenticated;

-- 4. Tabela de solicitações de contato/demonstração da Landing Page pública
create table if not exists public.contatos_demonstracao (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  email       text not null,
  empresa     text,
  mensagem    text,
  origem      text not null default 'landing_page',
  created_at  timestamptz not null default now()
);

alter table public.contatos_demonstracao enable row level security;

drop policy if exists "Visitante pode enviar solicitacao de contato" on public.contatos_demonstracao;
create policy "Visitante pode enviar solicitacao de contato"
  on public.contatos_demonstracao for insert
  to anon, authenticated
  with check (
    length(trim(nome)) between 2 and 120
    and length(trim(email)) between 5 and 180
  );
