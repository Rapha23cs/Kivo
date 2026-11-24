-- =============================================================================
-- Kivo - Migration 011: Hardening Avançado de Segurança
-- 1. Expiração e PIN opcional para Links Públicos de Laudos
-- 2. Restrição de MIME types e tamanho máximo no bucket relatorios-midia
-- 3. Trilha de Auditoria Imutável (audit_logs) + Triggers automáticos
-- =============================================================================

create extension if not exists pgcrypto;

-- 1. Expiração e PIN hash no compartilhamento público
alter table public.relatorios_inspecao
  add column if not exists public_expires_at timestamptz,
  add column if not exists public_pin_hash text;

create or replace function public.sync_relatorio_completo(
  p_header jsonb,
  p_desvios jsonb default '[]'::jsonb,
  p_fotos jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_codigo text;
  v_relatorio_id uuid;
  v_disciplina text;
  v_dados_extras jsonb;
  v_pin text;
  v_pin_action text;
  v_pin_hash text;
  v_expires_at timestamptz;
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

  v_dados_extras := case
    when jsonb_typeof(p_header->'dados_extras') = 'object' then p_header->'dados_extras'
    else '{}'::jsonb
  end;

  v_pin := nullif(trim(coalesce(p_header->>'public_pin', '')), '');
  v_pin_action := coalesce(nullif(trim(p_header->>'public_pin_action'), ''), 'keep');
  v_expires_at := nullif(trim(coalesce(p_header->>'public_expires_at', '')), '')::timestamptz;

  if v_pin is not null then
    v_pin_hash := crypt(v_pin, gen_salt('bf'));
  else
    v_pin_hash := null;
  end if;

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
    public_shared_at,
    public_expires_at,
    public_pin_hash,
    dados_extras
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
    nullif(p_header->>'nivel_aderencia', ''),
    nullif(p_header->>'nivel_maturidade', ''),
    nullif(p_header->>'pontos_positivos', ''),
    nullif(p_header->>'sintese_desvios', ''),
    nullif(p_header->>'conclusao_texto', ''),
    coalesce(nullif(p_header->>'status', ''), 'rascunho'),
    nullif(p_header->>'public_token', '')::uuid,
    coalesce((p_header->>'public_enabled')::boolean, false),
    nullif(p_header->>'public_shared_at', '')::timestamptz,
    v_expires_at,
    v_pin_hash,
    v_dados_extras
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
    public_token = coalesce(excluded.public_token, relatorios_inspecao.public_token),
    public_enabled = excluded.public_enabled,
    public_shared_at = coalesce(excluded.public_shared_at, relatorios_inspecao.public_shared_at),
    public_expires_at = case
      when p_header ? 'public_expires_at' then v_expires_at
      else relatorios_inspecao.public_expires_at
    end,
    public_pin_hash = case
      when v_pin is not null then v_pin_hash
      when v_pin_action = 'clear' then null
      else relatorios_inspecao.public_pin_hash
    end,
    dados_extras = excluded.dados_extras,
    updated_at = now()
  returning id into v_relatorio_id;

  delete from public.relatorio_desvios where relatorio_id = v_relatorio_id;

  if jsonb_typeof(p_desvios) = 'array' and jsonb_array_length(p_desvios) > 0 then
    insert into public.relatorio_desvios (
      relatorio_id, numero, descricao, classificacao, severidade_nc, tratativa, responsavel, prazo, status
    )
    select
      v_relatorio_id,
      (elem->>'numero')::int,
      coalesce(elem->>'descricao', ''),
      coalesce(elem->>'classificacao', 'Desvio Pontual'),
      nullif(elem->>'severidade_nc', ''),
      nullif(elem->>'tratativa', ''),
      nullif(elem->>'responsavel', ''),
      nullif(elem->>'prazo', ''),
      coalesce(elem->>'status', 'Em Aberto')
    from jsonb_array_elements(p_desvios) as elem;
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

drop function if exists public.get_public_report(uuid);

create or replace function public.get_public_report(p_token uuid, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.relatorios_inspecao%rowtype;
  v_desvios jsonb;
  v_fotos jsonb;
  v_pin_clean text;
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

  if v_row.public_expires_at is not null and v_row.public_expires_at < now() then
    return jsonb_build_object(
      'expired', true,
      'codigoRelatorio', v_row.codigo_relatorio,
      'publicExpiresAt', v_row.public_expires_at
    );
  end if;

  if v_row.public_pin_hash is not null then
    v_pin_clean := nullif(trim(coalesce(p_pin, '')), '');
    if v_pin_clean is null then
      return jsonb_build_object(
        'requiresPin', true,
        'codigoRelatorio', v_row.codigo_relatorio,
        'unidade', v_row.unidade
      );
    end if;
    if v_row.public_pin_hash <> crypt(v_pin_clean, v_row.public_pin_hash) then
      return jsonb_build_object(
        'requiresPin', true,
        'invalidPin', true,
        'codigoRelatorio', v_row.codigo_relatorio,
        'unidade', v_row.unidade
      );
    end if;
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
    'discipline', coalesce(v_row.disciplina, 'meio_ambiente'),
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
    'publicExpiresAt', v_row.public_expires_at,
    'hasPublicPin', (v_row.public_pin_hash is not null),
    'desempenhoTematico', coalesce(v_row.dados_extras->'desempenhoTematico', '[]'::jsonb),
    'itensNaoAplicaveis', coalesce((v_row.dados_extras->>'itensNaoAplicaveis')::int, 0),
    'desvios', v_desvios,
    'registrosFotograficos', v_fotos
  );
end;
$$;

revoke all on function public.get_public_report(uuid, text) from public;
grant execute on function public.get_public_report(uuid, text) to anon, authenticated;

-- 2. Restrição de tamanho (10 MB) e tipos MIME permitidos no bucket privado relatorios-midia
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'relatorios-midia';

-- 3. Trilha de Auditoria Imutável (append-only)
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  action      text not null,
  entity_type text not null,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Ler proprios logs de auditoria" on public.audit_logs;
create policy "Ler proprios logs de auditoria"
  on public.audit_logs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Inserir proprios logs de auditoria" on public.audit_logs;
create policy "Inserir proprios logs de auditoria"
  on public.audit_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists idx_audit_logs_user_created
  on public.audit_logs (user_id, created_at desc);

create or replace function public.fn_audit_critical_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if tg_table_name = 'relatorios_inspecao' then
    v_uid := coalesce(new.user_id, old.user_id);
    if tg_op = 'DELETE' then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (v_uid, 'report.deleted', 'relatorio', old.codigo_relatorio, jsonb_build_object('unidade', old.unidade));
      return old;
    end if;

    if tg_op = 'UPDATE' then
      if old.status is distinct from new.status then
        insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
        values (v_uid, 'report.status_changed', 'relatorio', new.codigo_relatorio, jsonb_build_object('from', old.status, 'to', new.status, 'unidade', new.unidade));
      end if;
      if old.public_enabled is distinct from new.public_enabled then
        insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
        values (
          v_uid,
          case when new.public_enabled then 'report.public_enabled' else 'report.public_revoked' end,
          'relatorio',
          new.codigo_relatorio,
          jsonb_build_object('expires_at', new.public_expires_at, 'has_pin', (new.public_pin_hash is not null))
        );
      end if;
    elsif tg_op = 'INSERT' then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (v_uid, 'report.created', 'relatorio', new.codigo_relatorio, jsonb_build_object('unidade', new.unidade, 'status', new.status));
    end if;
    return new;
  elsif tg_table_name = 'inspecoes' then
    v_uid := coalesce(new.user_id, old.user_id);
    if tg_op = 'DELETE' then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (v_uid, 'inspection.deleted', 'inspecao', old.codigo_kivo, jsonb_build_object('unidade', old.hospital_name));
      return old;
    end if;
    if tg_op = 'UPDATE' and old.status is distinct from new.status then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (v_uid, 'inspection.status_changed', 'inspecao', new.codigo_kivo, jsonb_build_object('from', old.status, 'to', new.status, 'unidade', new.hospital_name));
    end if;
    return new;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_relatorios on public.relatorios_inspecao;
create trigger trg_audit_relatorios
  after insert or update or delete on public.relatorios_inspecao
  for each row execute function public.fn_audit_critical_events();

drop trigger if exists trg_audit_inspecoes on public.inspecoes;
create trigger trg_audit_inspecoes
  after update or delete on public.inspecoes
  for each row execute function public.fn_audit_critical_events();
