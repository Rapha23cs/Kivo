-- =============================================================================
-- Kivo - Migration 015: Autorização de Acesso de Usuários pelo Admin
-- 1. Colunas access_status ('pending' | 'approved' | 'blocked'), approved_at, approved_by em user_roles
-- 2. Novos cadastros iniciam como 'pending' (Admin raphael.csa23@gmail.com sempre 'approved')
--    e contas pré-existentes no backfill preservam acesso 'approved'
-- 3. Função public.is_authorized_user() aplicada em todas as políticas RLS e Storage
-- 4. RPC public.admin_set_user_access(uuid, text) com auditoria em audit_logs
-- =============================================================================

-- 1. ESTRUTURA DE APROVAÇÃO EM public.user_roles
alter table public.user_roles
  add column if not exists access_status text,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null;

-- Backfill: usuários já existentes antes da migration 015 permanecem aprovados;
-- qualquer novo usuário inserido depois iniciará com default 'pending'.
update public.user_roles
set
  access_status = 'approved',
  approved_at = coalesce(approved_at, now())
where access_status is null;

alter table public.user_roles
  alter column access_status set default 'pending',
  alter column access_status set not null;

alter table public.user_roles
  drop constraint if exists user_roles_access_status_check;

alter table public.user_roles
  add constraint user_roles_access_status_check
  check (access_status in ('pending', 'approved', 'blocked'));

create index if not exists idx_user_roles_access_status
  on public.user_roles (access_status, created_at desc);

-- 2. FUNÇÕES DE VERIFICAÇÃO SERVER-SIDE
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
      and access_status = 'approved'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_authorized_user()
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
      and (role = 'admin' or access_status = 'approved')
      and access_status <> 'blocked'
  );
$$;

revoke all on function public.is_authorized_user() from public;
grant execute on function public.is_authorized_user() to authenticated;

-- 3. TRIGGER DE SINCRONIZAÇÃO DE NOVOS USUÁRIOS (INICIAM COMO 'pending')
create or replace function public.sync_user_role_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(coalesce(new.email, '')));
  v_name  text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
  v_is_master_admin boolean := (v_email = 'raphael.csa23@gmail.com');
  v_default_role text := case when v_is_master_admin then 'admin' else 'auditor' end;
  v_default_status text := case when v_is_master_admin then 'approved' else 'pending' end;
begin
  insert into public.user_roles (user_id, email, full_name, role, access_status, approved_at)
  values (
    new.id,
    v_email,
    v_name,
    v_default_role,
    v_default_status,
    case when v_default_status = 'approved' then now() else null end
  )
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.user_roles.full_name),
    role = case
      when excluded.email = 'raphael.csa23@gmail.com' then 'admin'
      else public.user_roles.role
    end,
    access_status = case
      when excluded.email = 'raphael.csa23@gmail.com' then 'approved'
      else public.user_roles.access_status
    end,
    approved_at = case
      when excluded.email = 'raphael.csa23@gmail.com' then coalesce(public.user_roles.approved_at, now())
      else public.user_roles.approved_at
    end,
    updated_at = now();
  return new;
end;
$$;

-- Garantir também que usuários em auth.users sem registro em user_roles tenham entrada criada
insert into public.user_roles (user_id, email, full_name, role, access_status, approved_at)
select
  u.id,
  lower(trim(coalesce(u.email, ''))),
  nullif(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
  case
    when lower(trim(coalesce(u.email, ''))) = 'raphael.csa23@gmail.com' then 'admin'
    else 'auditor'
  end,
  'approved',
  now()
from auth.users u
on conflict (user_id) do nothing;

-- 4. RPC ADMINISTRATIVA PARA AUTORIZAR / BLOQUEAR / REVISAR ACESSO DE USUÁRIOS
create or replace function public.admin_set_user_access(p_target_user_id uuid, p_status text)
returns public.user_roles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_roles%rowtype;
  v_target public.user_roles%rowtype;
  v_active_admin_count int;
  v_actor uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem autorizar ou bloquear usuários.';
  end if;

  if p_status not in ('pending', 'approved', 'blocked') then
    raise exception 'Status inválido: use pending, approved ou blocked.';
  end if;

  select * into v_target
  from public.user_roles
  where user_id = p_target_user_id;

  if not found then
    raise exception 'Usuário não encontrado em user_roles.';
  end if;

  if v_target.role = 'admin' and p_status <> 'approved' then
    if p_target_user_id = v_actor then
      raise exception 'Você não pode bloquear ou revogar seu próprio acesso administrativo.';
    end if;

    select count(*) into v_active_admin_count
    from public.user_roles
    where role = 'admin'
      and access_status = 'approved'
      and user_id <> p_target_user_id;

    if v_active_admin_count = 0 then
      raise exception 'O sistema precisa manter pelo menos um administrador ativo.';
    end if;
  end if;

  update public.user_roles
  set
    access_status = p_status,
    approved_at = case when p_status = 'approved' then now() else null end,
    approved_by = case when p_status = 'approved' then v_actor else null end,
    updated_at = now()
  where user_id = p_target_user_id
  returning * into v_row;

  if v_actor is not null then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
    values (
      v_actor,
      case
        when p_status = 'approved' then 'user_access.approved'
        when p_status = 'blocked' then 'user_access.blocked'
        else 'user_access.pending'
      end,
      'user_access',
      v_row.user_id::text,
      jsonb_build_object('email', v_row.email, 'access_status', p_status)
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.admin_set_user_access(uuid, text) from public;
grant execute on function public.admin_set_user_access(uuid, text) to authenticated;

-- 5. BLOQUEIO SERVER-SIDE VIA RLS PARA USUÁRIOS NÃO AUTORIZADOS (pending / blocked)
-- Catálogos base
drop policy if exists "Ler tematicas autenticadas" on public.tematicas;
create policy "Ler tematicas autenticadas"
  on public.tematicas for select
  to authenticated
  using (public.is_authorized_user());

drop policy if exists "Ler itens modelo autenticados" on public.checklist_itens_modelo;
create policy "Ler itens modelo autenticados"
  on public.checklist_itens_modelo for select
  to authenticated
  using (public.is_authorized_user());

-- Clientes
drop policy if exists "Gerenciar proprios clientes" on public.clientes;
create policy "Gerenciar proprios clientes"
  on public.clientes for all
  to authenticated
  using (public.is_authorized_user() and auth.uid() = user_id)
  with check (public.is_authorized_user() and auth.uid() = user_id);

-- Unidades compartilhadas (apenas usuários autorizados leem/editam; exclusão segue só Admin)
drop policy if exists "Unidades leitura compartilhada" on public.unidades;
create policy "Unidades leitura compartilhada"
  on public.unidades for select
  to authenticated
  using (public.is_authorized_user());

drop policy if exists "Unidades insercao autenticada" on public.unidades;
create policy "Unidades insercao autenticada"
  on public.unidades for insert
  to authenticated
  with check (public.is_authorized_user() and auth.uid() = coalesce(user_id, auth.uid()));

drop policy if exists "Unidades atualizacao compartilhada" on public.unidades;
create policy "Unidades atualizacao compartilhada"
  on public.unidades for update
  to authenticated
  using (public.is_authorized_user())
  with check (public.is_authorized_user());

-- Inspeções & Respostas
drop policy if exists "Gerenciar proprias inspecoes" on public.inspecoes;
create policy "Gerenciar proprias inspecoes"
  on public.inspecoes for all
  to authenticated
  using (public.is_authorized_user() and (auth.uid() = user_id or public.is_admin()))
  with check (public.is_authorized_user() and (auth.uid() = user_id or public.is_admin()));

drop policy if exists "Gerenciar respostas das proprias inspecoes" on public.inspecao_respostas;
create policy "Gerenciar respostas das proprias inspecoes"
  on public.inspecao_respostas for all
  to authenticated
  using (
    public.is_authorized_user()
    and exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id
        and (i.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    public.is_authorized_user()
    and exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id
        and (i.user_id = auth.uid() or public.is_admin())
    )
  );

-- Relatórios, Desvios & Fotos
drop policy if exists "Gerenciar proprios relatorios" on public.relatorios_inspecao;
create policy "Gerenciar proprios relatorios"
  on public.relatorios_inspecao for all
  to authenticated
  using (public.is_authorized_user() and (auth.uid() = user_id or public.is_admin()))
  with check (public.is_authorized_user() and (auth.uid() = user_id or public.is_admin()));

drop policy if exists "Gerenciar desvios dos proprios relatorios" on public.relatorio_desvios;
create policy "Gerenciar desvios dos proprios relatorios"
  on public.relatorio_desvios for all
  to authenticated
  using (
    public.is_authorized_user()
    and exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    public.is_authorized_user()
    and exists (
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
    public.is_authorized_user()
    and exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  )
  with check (
    public.is_authorized_user()
    and exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  );

-- Templates, Agenda & Vencimentos SST
drop policy if exists "Gerenciar proprios templates" on public.checklist_templates;
create policy "Gerenciar proprios templates"
  on public.checklist_templates for all
  to authenticated
  using (public.is_authorized_user() and auth.uid() = user_id)
  with check (public.is_authorized_user() and auth.uid() = user_id);

drop policy if exists "Gerenciar propria agenda" on public.vistorias_agenda;
create policy "Gerenciar propria agenda"
  on public.vistorias_agenda for all
  to authenticated
  using (public.is_authorized_user() and auth.uid() = user_id)
  with check (public.is_authorized_user() and auth.uid() = user_id);

drop policy if exists "Gerenciar proprios vencimentos SST" on public.sst_vencimentos;
create policy "Gerenciar proprios vencimentos SST"
  on public.sst_vencimentos for all
  to authenticated
  using (public.is_authorized_user() and auth.uid() = user_id)
  with check (public.is_authorized_user() and auth.uid() = user_id);

-- Trilha de Auditoria
drop policy if exists "Ler proprios logs de auditoria" on public.audit_logs;
create policy "Ler proprios logs de auditoria"
  on public.audit_logs for select
  to authenticated
  using (public.is_authorized_user() and (auth.uid() = user_id or public.is_admin()));

drop policy if exists "Inserir proprios logs de auditoria" on public.audit_logs;
create policy "Inserir proprios logs de auditoria"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_authorized_user() and auth.uid() = user_id);

-- Storage (vistoria-evidencias & relatorios-midia)
drop policy if exists "Evidencias leitura autenticada" on storage.objects;
create policy "Evidencias leitura autenticada"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vistoria-evidencias'
    and public.is_authorized_user()
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
    and public.is_authorized_user()
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
    and public.is_authorized_user()
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
    and public.is_authorized_user()
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
    and public.is_authorized_user()
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
    and public.is_authorized_user()
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  )
  with check (
    bucket_id = 'relatorios-midia'
    and public.is_authorized_user()
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
    and public.is_authorized_user()
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );
