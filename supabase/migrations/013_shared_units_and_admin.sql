-- =============================================================================
-- Kivo - Migration 013: Unidades Compartilhadas + Perfil Admin do Sistema
-- 1. Tabela public.user_roles + função public.is_admin() + backfill Admin
-- 2. Unidades comuns entre todos os usuários autenticados (exclusão só Admin)
-- 3. Acesso administrativo do Admin em inspeções, relatórios e storage,
--    mantendo os dados dos demais usuários isolados entre si
-- =============================================================================

-- 1. PAPÉIS DE USUÁRIO (CONTROLE SERVER-SIDE VIA RLS)
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text not null default '',
  full_name  text,
  role       text not null default 'auditor' check (role in ('admin', 'auditor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.sync_user_role_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_default_role text := case
    when v_email = 'raphael.csa23@gmail.com' then 'admin'
    else 'auditor'
  end;
begin
  insert into public.user_roles (user_id, email, full_name, role)
  values (new.id, v_email, v_name, v_default_role)
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_roles.full_name),
    role = case
      when excluded.email = 'raphael.csa23@gmail.com' then 'admin'
      else public.user_roles.role
    end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_auth_user_sync_role on auth.users;
create trigger trg_auth_user_sync_role
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_user_role_from_auth();

-- Backfill de usuários existentes no auth.users (promove raphael.csa23@gmail.com a admin)
insert into public.user_roles (user_id, email, full_name, role)
select
  u.id,
  lower(trim(coalesce(u.email, ''))),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
  case
    when lower(trim(coalesce(u.email, ''))) = 'raphael.csa23@gmail.com' then 'admin'
    else 'auditor'
  end
from auth.users u
on conflict (user_id) do update set
  email = excluded.email,
  full_name = coalesce(excluded.full_name, public.user_roles.full_name),
  role = case
    when excluded.email = 'raphael.csa23@gmail.com' then 'admin'
    else public.user_roles.role
  end;

alter table public.user_roles enable row level security;

drop policy if exists "Ler proprio papel ou todos como admin" on public.user_roles;
create policy "Ler proprio papel ou todos como admin"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Apenas admin gerencia papeis" on public.user_roles;
create policy "Apenas admin gerencia papeis"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.admin_set_user_role(p_target_user_id uuid, p_role text)
returns public.user_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_roles%rowtype;
  v_admin_count int;
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

  return v_row;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- 2. UNIDADES COMPARTILHADAS ENTRE USUÁRIOS (EXCLUSÃO RESTRITA A ADMIN)
do $$
declare
  rec record;
  v_keep_id uuid;
begin
  -- Deduplicar eventuais unidades repetidas entre usuários antes de tornar o catálogo único globalmente
  for rec in
    select lower(trim(coalesce(cliente_nome, ''))) as norm_cli,
           lower(trim(nome)) as norm_nome
    from public.unidades
    group by 1, 2
    having count(*) > 1
  loop
    select id into v_keep_id
    from public.unidades
    where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
      and lower(trim(nome)) = rec.norm_nome
    order by
      case when geocode_precision = 'exata' then 0 else 1 end,
      created_at asc
    limit 1;

    update public.inspecoes
    set unidade_id = v_keep_id
    where unidade_id in (
      select id from public.unidades
      where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
        and lower(trim(nome)) = rec.norm_nome
        and id <> v_keep_id
    );

    update public.relatorios_inspecao
    set unidade_id = v_keep_id
    where unidade_id in (
      select id from public.unidades
      where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
        and lower(trim(nome)) = rec.norm_nome
        and id <> v_keep_id
    );

    if to_regclass('public.vistorias_agenda') is not null then
      update public.vistorias_agenda
      set unidade_id = v_keep_id
      where unidade_id in (
        select id from public.unidades
        where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
          and lower(trim(nome)) = rec.norm_nome
          and id <> v_keep_id
      );
    end if;

    if to_regclass('public.sst_vencimentos') is not null then
      update public.sst_vencimentos
      set unidade_id = v_keep_id
      where unidade_id in (
        select id from public.unidades
        where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
          and lower(trim(nome)) = rec.norm_nome
          and id <> v_keep_id
      );
    end if;

    delete from public.unidades
    where lower(trim(coalesce(cliente_nome, ''))) = rec.norm_cli
      and lower(trim(nome)) = rec.norm_nome
      and id <> v_keep_id;
  end loop;
end $$;

-- Remover unicidade por user_id para evitar unidades duplicadas entre usuários
alter table public.unidades
  drop constraint if exists unidades_user_id_cliente_nome_nome_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'unidades_cliente_nome_nome_key'
  ) then
    alter table public.unidades
      add constraint unidades_cliente_nome_nome_key unique (cliente_nome, nome);
  end if;
end $$;

create or replace function public.preserve_unidade_creator()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(old.user_id, new.user_id, auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_unidades_preserve_creator on public.unidades;
create trigger trg_unidades_preserve_creator
  before update on public.unidades
  for each row execute function public.preserve_unidade_creator();

drop policy if exists "Gerenciar proprias unidades" on public.unidades;
drop policy if exists "Unidades leitura compartilhada" on public.unidades;
drop policy if exists "Unidades insercao autenticada" on public.unidades;
drop policy if exists "Unidades atualizacao compartilhada" on public.unidades;
drop policy if exists "Apenas admins podem excluir unidades" on public.unidades;

create policy "Unidades leitura compartilhada"
  on public.unidades for select
  to authenticated
  using (true);

create policy "Unidades insercao autenticada"
  on public.unidades for insert
  to authenticated
  with check (auth.uid() = coalesce(user_id, auth.uid()));

create policy "Unidades atualizacao compartilhada"
  on public.unidades for update
  to authenticated
  using (true)
  with check (true);

create policy "Apenas admins podem excluir unidades"
  on public.unidades for delete
  to authenticated
  using (public.is_admin());

-- 3. ACESSO ADMINISTRATIVO (ADMIN) EM INSPEÇÕES, RELATÓRIOS E MÍDIAS
-- Demais usuários continuam vendo/editando/excluindo APENAS os próprios registros.
drop policy if exists "Gerenciar proprias inspecoes" on public.inspecoes;
create policy "Gerenciar proprias inspecoes"
  on public.inspecoes for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Gerenciar respostas das proprias inspecoes" on public.inspecao_respostas;
create policy "Gerenciar respostas das proprias inspecoes"
  on public.inspecao_respostas for all
  to authenticated
  using (
    exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id
        and (i.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id
        and (i.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Gerenciar proprios relatorios" on public.relatorios_inspecao;
create policy "Gerenciar proprios relatorios"
  on public.relatorios_inspecao for all
  to authenticated
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Gerenciar desvios dos proprios relatorios" on public.relatorio_desvios;
create policy "Gerenciar desvios dos proprios relatorios"
  on public.relatorio_desvios for all
  to authenticated
  using (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "Gerenciar fotos dos proprios relatorios" on public.relatorio_registros_fotograficos;
create policy "Gerenciar fotos dos proprios relatorios"
  on public.relatorio_registros_fotograficos for all
  to authenticated
  using (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  );

-- Storage: liberar leitura/gestão ao Admin nas pastas de outros usuários
drop policy if exists "Evidencias leitura autenticada" on storage.objects;
create policy "Evidencias leitura autenticada"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vistoria-evidencias'
    and (
      public.is_admin()
      or exists (
        select 1 from public.inspecoes i
        where i.id::text = (storage.foldername(name))[1]
          and i.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Evidencias upload autenticado" on storage.objects;
create policy "Evidencias upload autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vistoria-evidencias'
    and (
      public.is_admin()
      or exists (
        select 1 from public.inspecoes i
        where i.id::text = (storage.foldername(name))[1]
          and i.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Evidencias delete autenticado" on storage.objects;
create policy "Evidencias delete autenticado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vistoria-evidencias'
    and (
      public.is_admin()
      or exists (
        select 1 from public.inspecoes i
        where i.id::text = (storage.foldername(name))[1]
          and i.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Relatorios midia leitura autenticada" on storage.objects;
create policy "Relatorios midia leitura autenticada"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "Relatorios midia upload autenticado" on storage.objects;
create policy "Relatorios midia upload autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'relatorios-midia'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "Relatorios midia update autenticado" on storage.objects;
create policy "Relatorios midia update autenticado"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'relatorios-midia'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

drop policy if exists "Relatorios midia delete autenticado" on storage.objects;
create policy "Relatorios midia delete autenticado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Atualizar RPC sync_relatorio_completo para atualizar por id quando Admin edita relatório de outro usuário
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
  v_target_id uuid;
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

  v_target_id := nullif(trim(coalesce(p_header->>'id', '')), '')::uuid;

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

  if v_target_id is not null then
    update public.relatorios_inspecao r set
      cliente_id = coalesce(nullif(p_header->>'cliente_id', '')::uuid, r.cliente_id),
      inspecao_id = nullif(p_header->>'inspecao_id', '')::uuid,
      unidade_id = nullif(p_header->>'unidade_id', '')::uuid,
      disciplina = v_disciplina,
      cliente_nome = nullif(p_header->>'cliente_nome', ''),
      unidade = coalesce(nullif(p_header->>'unidade', ''), 'Unidade Atendida'),
      data_hora = coalesce(nullif(p_header->>'data_hora', '')::timestamptz, now()),
      cidade = nullif(p_header->>'cidade', ''),
      regional = nullif(p_header->>'regional', ''),
      tipo_inspecao = coalesce(nullif(p_header->>'tipo_inspecao', ''), 'Programada'),
      objetivo = nullif(p_header->>'objetivo', ''),
      responsavel = coalesce(nullif(p_header->>'responsavel', ''), 'Auditor Técnico'),
      gerencia = nullif(p_header->>'gerencia', ''),
      fachada_url = nullif(p_header->>'fachada_url', ''),
      itens_avaliados = coalesce((p_header->>'itens_avaliados')::int, 0),
      conformidades = coalesce((p_header->>'conformidades')::int, 0),
      desvios_plano_acao = coalesce((p_header->>'desvios_plano_acao')::int, 0),
      nao_conformidades = coalesce((p_header->>'nao_conformidades')::int, 0),
      ocorrencias_ambientais = coalesce((p_header->>'ocorrencias_ambientais')::int, 0),
      notificacoes = coalesce((p_header->>'notificacoes')::int, 0),
      interdicoes = coalesce((p_header->>'interdicoes')::int, 0),
      indice_conformidade = coalesce((p_header->>'indice_conformidade')::numeric, 0),
      nivel_aderencia = nullif(p_header->>'nivel_aderencia', ''),
      nivel_maturidade = nullif(p_header->>'nivel_maturidade', ''),
      pontos_positivos = nullif(p_header->>'pontos_positivos', ''),
      sintese_desvios = nullif(p_header->>'sintese_desvios', ''),
      conclusao_texto = nullif(p_header->>'conclusao_texto', ''),
      status = coalesce(nullif(p_header->>'status', ''), 'rascunho'),
      public_token = coalesce(nullif(p_header->>'public_token', '')::uuid, r.public_token),
      public_enabled = coalesce((p_header->>'public_enabled')::boolean, false),
      public_shared_at = coalesce(nullif(p_header->>'public_shared_at', '')::timestamptz, r.public_shared_at),
      public_expires_at = case
        when p_header ? 'public_expires_at' then v_expires_at
        else r.public_expires_at
      end,
      public_pin_hash = case
        when v_pin is not null then v_pin_hash
        when v_pin_action = 'clear' then null
        else r.public_pin_hash
      end,
      dados_extras = v_dados_extras,
      updated_at = now()
    where r.id = v_target_id
      and (r.user_id = v_uid or public.is_admin())
    returning r.id into v_relatorio_id;
  end if;

  if v_relatorio_id is null then
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
  end if;

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
