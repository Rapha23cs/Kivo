-- =============================================================================
-- Kivo - Migration 014: Hardening de Segurança v3
-- 1. Visibilidade global de audit_logs para Admin + auditoria de unidades/papéis
-- 2. Proteção anti-brute-force (rate limit) no PIN de links públicos
-- 3. Imutabilidade de created_at e criador original em unidades compartilhadas
-- =============================================================================

-- 1. VISIBILIDADE DE LOGS PARA ADMIN + AUDITORIA DE UNIDADES E PAPÉIS
drop policy if exists "Ler proprios logs de auditoria" on public.audit_logs;
create policy "Ler proprios logs de auditoria"
  on public.audit_logs for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create or replace function public.fn_audit_unidades_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if tg_op = 'INSERT' then
    v_uid := coalesce(auth.uid(), new.user_id);
    if v_uid is not null then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (
        v_uid,
        'unit.created',
        'unidade',
        coalesce(new.codigo, new.id::text),
        jsonb_build_object('nome', new.nome, 'cliente', new.cliente_nome, 'municipio', new.municipio)
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    v_uid := coalesce(auth.uid(), old.user_id);
    if v_uid is not null then
      insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
      values (
        v_uid,
        'unit.deleted',
        'unidade',
        coalesce(old.codigo, old.id::text),
        jsonb_build_object('nome', old.nome, 'cliente', old.cliente_nome, 'municipio', old.municipio)
      );
    end if;
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_unidades on public.unidades;
create trigger trg_audit_unidades
  after insert or delete on public.unidades
  for each row execute function public.fn_audit_unidades_events();

create or replace function public.admin_set_user_role(p_target_user_id uuid, p_role text)
returns public.user_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_roles%rowtype;
  v_admin_count int;
  v_actor uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar papéis de usuários.';
  end if;

  if p_role not in ('admin', 'auditor') then
    raise exception 'Papel inválido: use admin ou auditor.';
  end if;

  if p_role = 'auditor' then
    select count(*) into v_admin_count
    from public.user_roles
    where role = 'admin' and user_id <> p_target_user_id;

    if v_admin_count = 0 then
      raise exception 'O sistema precisa manter pelo menos um administrador ativo.';
    end if;
  end if;

  update public.user_roles
  set role = p_role, updated_at = now()
  where user_id = p_target_user_id
  returning * into v_row;

  if not found then
    raise exception 'Usuário não encontrado em user_roles.';
  end if;

  if v_actor is not null then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (
      v_actor,
      'user_role.changed',
      'user_role',
      v_row.user_id::text,
      jsonb_build_object('email', v_row.email, 'role', p_role)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 2. PROTEÇÃO ANTI-BRUTE-FORCE NO PIN DE LINKS PÚBLICOS DE LAUDOS
create table if not exists public.public_pin_attempts (
  public_token    uuid primary key,
  failed_attempts int not null default 0,
  last_failed_at  timestamptz,
  locked_until    timestamptz
);

alter table public.public_pin_attempts enable row level security;
revoke all on table public.public_pin_attempts from public, anon, authenticated;

create or replace function public.get_public_report(p_token uuid, p_pin text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.relatorios_inspecao%rowtype;
  v_attempt public.public_pin_attempts%rowtype;
  v_desvios jsonb;
  v_fotos jsonb;
  v_pin_clean text;
  v_next_attempts int;
  v_locked_until timestamptz;
  v_retry_seconds int;
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
    select *
    into v_attempt
    from public.public_pin_attempts
    where public_token = p_token;

    if found and v_attempt.locked_until is not null and v_attempt.locked_until > now() then
      v_retry_seconds := greatest(1, ceil(extract(epoch from (v_attempt.locked_until - now())))::int);
      return jsonb_build_object(
        'requiresPin', true,
        'rateLimited', true,
        'retryAfterSeconds', v_retry_seconds,
        'codigoRelatorio', v_row.codigo_relatorio,
        'unidade', v_row.unidade
      );
    end if;

    v_pin_clean := nullif(trim(coalesce(p_pin, '')), '');
    if v_pin_clean is null then
      return jsonb_build_object(
        'requiresPin', true,
        'codigoRelatorio', v_row.codigo_relatorio,
        'unidade', v_row.unidade
      );
    end if;

    if v_row.public_pin_hash <> crypt(v_pin_clean, v_row.public_pin_hash) then
      v_next_attempts := case
        when v_attempt.last_failed_at is not null and v_attempt.last_failed_at < now() - interval '15 minutes' then 1
        else coalesce(v_attempt.failed_attempts, 0) + 1
      end;

      v_locked_until := case
        when v_next_attempts >= 5 then now() + interval '5 minutes'
        else null
      end;

      insert into public.public_pin_attempts (public_token, failed_attempts, last_failed_at, locked_until)
      values (p_token, v_next_attempts, now(), v_locked_until)
      on conflict (public_token) do update set
        failed_attempts = excluded.failed_attempts,
        last_failed_at = excluded.last_failed_at,
        locked_until = excluded.locked_until;

      return jsonb_build_object(
        'requiresPin', true,
        'invalidPin', true,
        'rateLimited', (v_locked_until is not null),
        'retryAfterSeconds', case when v_locked_until is not null then 300 else null end,
        'remainingAttempts', greatest(0, 5 - v_next_attempts),
        'codigoRelatorio', v_row.codigo_relatorio,
        'unidade', v_row.unidade
      );
    end if;

    delete from public.public_pin_attempts where public_token = p_token;
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

-- 3. PRESERVAR CRIADOR E DATA DE CRIAÇÃO NAS UNIDADES COMPARTILHADAS
create or replace function public.preserve_unidade_creator()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(old.user_id, new.user_id, auth.uid());
  new.created_at := coalesce(old.created_at, new.created_at);
  return new;
end;
$$;
