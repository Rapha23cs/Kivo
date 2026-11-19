-- =============================================================================
-- Kivo - Módulo de Inspeção Ambiental Oficial (EMSERH)
-- Migration 001: Temáticas (11), Itens Modelo (63), Inspeções, Respostas & Views
-- Alvo: Supabase Cloud (PostgreSQL 15+)
-- =============================================================================

create extension if not exists pgcrypto;

-- Função utilitária para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. TEMÁTICAS OFICIAIS (11 ÁREAS)
-- =============================================================================
create table if not exists public.tematicas (
  id         smallint generated always as identity primary key,
  slug       text unique not null,
  nome       text unique not null,
  nome_curto text not null,
  icone      text not null,
  descricao  text,
  ordem      smallint not null unique
);

-- =============================================================================
-- 2. ITENS MODELO DO CHECKLIST (63 REQUISITOS OFICIAIS)
-- =========================================================
create table if not exists public.checklist_itens_modelo (
  id          smallint generated always as identity primary key,
  codigo      text unique not null,      -- ex: 'item-1' .. 'item-63'
  tematica_id smallint not null references public.tematicas(id) on delete restrict,
  numero      smallint not null unique,  -- 1 a 63
  pergunta    text not null,
  ativo       boolean not null default true
);

create index if not exists idx_itens_modelo_tematica
  on public.checklist_itens_modelo (tematica_id, numero);

-- =============================================================================
-- 3. INSPEÇÕES (Cabeçalho Pré-Checklist + Controle de Sincronização)
-- =============================================================================
create table if not exists public.inspecoes (
  id                      uuid primary key default gen_random_uuid(),
  codigo_kivo             text unique not null, -- ex: 'OS-2026-EMSERH-01'
  user_id                 uuid references auth.users(id) on delete set null default auth.uid(),

  -- Cabeçalho oficial Pré-Checklist EMSERH
  unidade                 text not null,
  regional                text not null,
  municipio               text not null,
  data_inspecao           date not null default current_date,
  responsavel_inspecao    text not null,
  tipo_inspecao           text not null check (tipo_inspecao in ('Programada', 'Não Programada')),

  status                  text not null default 'in_progress'
                            check (status in ('open', 'in_progress', 'completed')),

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

drop trigger if exists trg_inspecoes_updated_at on public.inspecoes;
create trigger trg_inspecoes_updated_at
  before update on public.inspecoes
  for each row execute function public.set_updated_at();

create index if not exists idx_inspecoes_user_status
  on public.inspecoes (user_id, status);

-- =============================================================================
-- 4. RESPOSTAS DA INSPEÇÃO (N:N + Regra 6 para Desvios 'nao')
-- =============================================================================
create table if not exists public.inspecao_respostas (
  id             uuid primary key default gen_random_uuid(),
  inspecao_id    uuid not null references public.inspecoes(id) on delete cascade,
  item_modelo_id smallint not null references public.checklist_itens_modelo(id) on delete restrict,

  status         text check (status in ('sim', 'nao', 'na')), -- null = pendente

  -- Regra 6: preenchidos somente quando status = 'nao'
  classificacao  text check (classificacao in ('Leve', 'Médio', 'Grave', 'Crítico')),
  responsavel    text,
  prazo          text,
  observacao     text,
  evidencia_path text, -- caminho no Supabase Storage (bucket 'vistoria-evidencias')

  updated_at     timestamptz not null default now(),
  unique (inspecao_id, item_modelo_id)
);

drop trigger if exists trg_respostas_updated_at on public.inspecao_respostas;
create trigger trg_respostas_updated_at
  before update on public.inspecao_respostas
  for each row execute function public.set_updated_at();

create index if not exists idx_respostas_inspecao_status
  on public.inspecao_respostas (inspecao_id, status);

-- =============================================================================
-- 5. VIEWS PARA O FRONT-END (Filtros por Temática + Resumo Pós-Checklist)
-- =============================================================================
create or replace view public.vw_resumo_tematicas_inspecao
with (security_invoker = true)
as
select
  i.id as inspecao_id,
  t.id as tematica_id,
  t.slug,
  t.nome,
  t.nome_curto,
  t.icone,
  t.ordem,
  count(m.id)::int as total_itens,
  count(r.id) filter (where r.status = 'sim')::int as total_sim,
  count(r.id) filter (where r.status = 'nao')::int as total_nao,
  count(r.id) filter (where r.status = 'na')::int as total_na,
  (count(m.id) - count(r.id) filter (where r.status is not null))::int as pendentes,
  coalesce(bool_or(r.status = 'nao'), false) as tem_desvio
from public.inspecoes i
cross join public.tematicas t
join public.checklist_itens_modelo m
  on m.tematica_id = t.id and m.ativo = true
left join public.inspecao_respostas r
  on r.inspecao_id = i.id and r.item_modelo_id = m.id
group by i.id, t.id, t.slug, t.nome, t.nome_curto, t.icone, t.ordem
order by t.ordem;

create or replace view public.vw_resumo_geral_inspecao
with (security_invoker = true)
as
select
  i.id as inspecao_id,
  i.codigo_kivo,
  count(m.id)::int as total_itens,
  count(r.id) filter (where r.status in ('sim', 'nao'))::int as total_avaliados,
  count(r.id) filter (where r.status = 'sim')::int as total_sim,
  count(r.id) filter (where r.status = 'nao')::int as total_nao,
  count(r.id) filter (where r.status = 'na')::int as total_na,
  case
    when count(r.id) filter (where r.status in ('sim', 'nao')) > 0 then
      round(
        (count(r.id) filter (where r.status = 'sim')::numeric /
         count(r.id) filter (where r.status in ('sim', 'nao'))::numeric) * 100
      )::int
    else 0
  end as percentual_conformidade
from public.inspecoes i
cross join public.checklist_itens_modelo m
left join public.inspecao_respostas r
  on r.inspecao_id = i.id and r.item_modelo_id = m.id
where m.ativo = true
group by i.id, i.codigo_kivo;

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.tematicas enable row level security;
alter table public.checklist_itens_modelo enable row level security;
alter table public.inspecoes enable row level security;
alter table public.inspecao_respostas enable row level security;

drop policy if exists "Ler tematicas autenticadas" on public.tematicas;
create policy "Ler tematicas autenticadas"
  on public.tematicas for select
  to authenticated
  using (true);

drop policy if exists "Ler itens modelo autenticados" on public.checklist_itens_modelo;
create policy "Ler itens modelo autenticados"
  on public.checklist_itens_modelo for select
  to authenticated
  using (true);

drop policy if exists "Gerenciar proprias inspecoes" on public.inspecoes;
create policy "Gerenciar proprias inspecoes"
  on public.inspecoes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Gerenciar respostas das proprias inspecoes" on public.inspecao_respostas;
create policy "Gerenciar respostas das proprias inspecoes"
  on public.inspecao_respostas for all
  to authenticated
  using (
    exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.inspecoes i
      where i.id = inspecao_id and i.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 7. STORAGE BUCKET PARA EVIDÊNCIAS FOTOGRÁFICAS (Regra 8)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('vistoria-evidencias', 'vistoria-evidencias', false)
on conflict (id) do nothing;

drop policy if exists "Evidencias leitura autenticada" on storage.objects;
create policy "Evidencias leitura autenticada"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.inspecoes i
      where i.id::text = (storage.foldername(name))[1]
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "Evidencias upload autenticado" on storage.objects;
create policy "Evidencias upload autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.inspecoes i
      where i.id::text = (storage.foldername(name))[1]
        and i.user_id = auth.uid()
    )
  );

drop policy if exists "Evidencias delete autenticado" on storage.objects;
create policy "Evidencias delete autenticado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'vistoria-evidencias'
    and exists (
      select 1 from public.inspecoes i
      where i.id::text = (storage.foldername(name))[1]
        and i.user_id = auth.uid()
    )
  );
