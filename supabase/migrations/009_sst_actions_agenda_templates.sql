-- =============================================================================
-- Kivo - Migration 009: Checklist JSON (SST/Custom/AntesxDepois), Templates,
-- Agenda Recorrente e Inventário de Vencimentos SST
-- =============================================================================

-- 1. Colunas adicionais em inspecoes para suportar checklists SST modulares,
-- templates personalizados e evidências Antes x Depois sem perder compatibilidade
alter table public.inspecoes
  add column if not exists checklist_json jsonb,
  add column if not exists template_id text,
  add column if not exists nr_modules jsonb,
  add column if not exists schedule_id uuid;

-- 2. Templates Personalizados de Checklist
create table if not exists public.checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  nome        text not null,
  disciplina  text not null default 'meio_ambiente' check (disciplina in ('meio_ambiente', 'seguranca_trabalho')),
  descricao   text,
  itens       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_checklist_templates_updated_at on public.checklist_templates;
create trigger trg_checklist_templates_updated_at
  before update on public.checklist_templates
  for each row execute function public.set_updated_at();

alter table public.checklist_templates enable row level security;

drop policy if exists "Gerenciar proprios templates" on public.checklist_templates;
create policy "Gerenciar proprios templates"
  on public.checklist_templates for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_templates_user
  on public.checklist_templates (user_id, updated_at desc);

-- 3. Agenda e Programação de Vistorias Recorrentes
create table if not exists public.vistorias_agenda (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade default auth.uid(),
  unidade_id       uuid references public.unidades(id) on delete set null,
  unidade_nome     text not null,
  cliente_nome     text,
  regional         text,
  municipio        text,
  disciplina       text not null default 'meio_ambiente' check (disciplina in ('meio_ambiente', 'seguranca_trabalho')),
  template_id      text,
  nr_modules       jsonb,
  periodicidade    text not null default 'Mensal' check (periodicidade in ('Única', 'Semanal', 'Quinzenal', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral', 'Anual')),
  proxima_data     date not null,
  ultima_execucao  date,
  observacoes      text,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists trg_vistorias_agenda_updated_at on public.vistorias_agenda;
create trigger trg_vistorias_agenda_updated_at
  before update on public.vistorias_agenda
  for each row execute function public.set_updated_at();

alter table public.vistorias_agenda enable row level security;

drop policy if exists "Gerenciar propria agenda" on public.vistorias_agenda;
create policy "Gerenciar propria agenda"
  on public.vistorias_agenda for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_agenda_user_data
  on public.vistorias_agenda (user_id, proxima_data asc);

-- 4. Inventário de Vencimentos SST por Unidade (Extintores, AVCB, EPIs, ASOs, NRs, Laudos)
create table if not exists public.sst_vencimentos (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade default auth.uid(),
  unidade_id         uuid references public.unidades(id) on delete set null,
  unidade_nome       text not null,
  cliente_nome       text,
  categoria          text not null,
  item_nome          text not null,
  codigo_patrimonio  text,
  data_ultima        date,
  data_validade      date not null,
  responsavel        text,
  observacoes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

drop trigger if exists trg_sst_vencimentos_updated_at on public.sst_vencimentos;
create trigger trg_sst_vencimentos_updated_at
  before update on public.sst_vencimentos
  for each row execute function public.set_updated_at();

alter table public.sst_vencimentos enable row level security;

drop policy if exists "Gerenciar proprios vencimentos SST" on public.sst_vencimentos;
create policy "Gerenciar proprios vencimentos SST"
  on public.sst_vencimentos for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_sst_vencimentos_user_validade
  on public.sst_vencimentos (user_id, data_validade asc);
