-- =============================================================================
-- Kivo - Migration 003: Módulo Dedicado de Relatórios de Inspeção Ambiental
-- Baseado integralmente na estrutura interna do modelo de Relatório (36 slides)
-- =============================================================================

-- 1. RELATÓRIOS DE INSPEÇÃO (Capa, Dados Gerais, 8 Resultados e Conclusão)
create table if not exists public.relatorios_inspecao (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete set null default auth.uid(),
  cliente_id               uuid references public.clientes(id) on delete set null,
  inspecao_id              uuid references public.inspecoes(id) on delete set null,

  codigo_relatorio         text unique not null,
  cliente_nome             text,
  unidade                  text not null,
  data_hora                timestamptz not null default now(),
  cidade                   text,
  regional                 text,
  tipo_inspecao            text not null default 'Programada',
  objetivo                 text,
  responsavel              text not null,
  gerencia                 text,
  fachada_url              text,

  -- Resultados da Inspeção (Tabela 01 - 8 indicadores)
  itens_avaliados          integer not null default 0,
  conformidades            integer not null default 0,
  desvios_plano_acao       integer not null default 0,
  nao_conformidades        integer not null default 0,
  ocorrencias_ambientais   integer not null default 0,
  notificacoes             integer not null default 0,
  interdicoes              integer not null default 0,
  indice_conformidade      numeric(5,2) not null default 0,

  -- Conclusão da Inspeção (Tabela 02 e Item 7.3.4)
  nivel_aderencia          text check (nivel_aderencia in ('Baixa Aderência', 'Média Aderência', 'Alta Aderência')),
  nivel_maturidade         text check (nivel_maturidade in ('Inicial', 'Em Desenvolvimento', 'Consolidado')),
  pontos_positivos         text,
  sintese_desvios          text,
  conclusao_texto          text,

  status                   text not null default 'rascunho' check (status in ('rascunho', 'finalizado')),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists trg_relatorios_updated_at on public.relatorios_inspecao;
create trigger trg_relatorios_updated_at
  before update on public.relatorios_inspecao
  for each row execute function public.set_updated_at();

create index if not exists idx_relatorios_user_data
  on public.relatorios_inspecao (user_id, data_hora desc);

-- 2. TABELA DE DESVIOS E OPORTUNIDADES DE MELHORIA (Tabela 03)
create table if not exists public.relatorio_desvios (
  id             uuid primary key default gen_random_uuid(),
  relatorio_id   uuid not null references public.relatorios_inspecao(id) on delete cascade,
  numero         integer not null,
  descricao      text not null,
  classificacao  text not null check (
                   classificacao in (
                     'Desvio Pontual',
                     'Não Conformidade Ambiental',
                     'Ocorrência Ambiental',
                     'Notificação',
                     'Interdição'
                   )
                 ),
  severidade_nc  text check (severidade_nc in ('Menor', 'Maior')),
  tratativa      text,
  responsavel    text,
  prazo          text,
  status         text not null default 'Em Aberto'
                   check (status in ('Em Aberto', 'Em Andamento', 'Concluído')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists trg_relatorio_desvios_updated_at on public.relatorio_desvios;
create trigger trg_relatorio_desvios_updated_at
  before update on public.relatorio_desvios
  for each row execute function public.set_updated_at();

create index if not exists idx_relatorio_desvios_relatorio
  on public.relatorio_desvios (relatorio_id, numero);

-- 3. REGISTROS FOTOGRÁFICOS POR SEÇÃO TEMÁTICA (56 pontos + extras)
create table if not exists public.relatorio_registros_fotograficos (
  id                    uuid primary key default gen_random_uuid(),
  relatorio_id          uuid not null references public.relatorios_inspecao(id) on delete cascade,
  ordem                 integer not null,
  secao                 text not null,
  legenda               text not null,
  foto_url              text,
  observacao            text,
  incluir_no_relatorio  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

drop trigger if exists trg_relatorio_fotos_updated_at on public.relatorio_registros_fotograficos;
create trigger trg_relatorio_fotos_updated_at
  before update on public.relatorio_registros_fotograficos
  for each row execute function public.set_updated_at();

create index if not exists idx_relatorio_fotos_relatorio
  on public.relatorio_registros_fotograficos (relatorio_id, ordem);

-- =============================================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =============================================================================
alter table public.relatorios_inspecao enable row level security;
alter table public.relatorio_desvios enable row level security;
alter table public.relatorio_registros_fotograficos enable row level security;

drop policy if exists "Gerenciar proprios relatorios" on public.relatorios_inspecao;
create policy "Gerenciar proprios relatorios"
  on public.relatorios_inspecao for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Gerenciar desvios dos proprios relatorios" on public.relatorio_desvios;
create policy "Gerenciar desvios dos proprios relatorios"
  on public.relatorio_desvios for all
  to authenticated
  using (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "Gerenciar fotos dos proprios relatorios" on public.relatorio_registros_fotograficos;
create policy "Gerenciar fotos dos proprios relatorios"
  on public.relatorio_registros_fotograficos for all
  to authenticated
  using (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.relatorios_inspecao r
      where r.id = relatorio_id and r.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. STORAGE BUCKET PARA FACHADA E REGISTRO FOTOGRÁFICO
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('relatorios-midia', 'relatorios-midia', false)
on conflict (id) do nothing;

drop policy if exists "Relatorios midia leitura autenticada" on storage.objects;
create policy "Relatorios midia leitura autenticada"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Relatorios midia upload autenticado" on storage.objects;
create policy "Relatorios midia upload autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'relatorios-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Relatorios midia delete autenticado" on storage.objects;
create policy "Relatorios midia delete autenticado"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'relatorios-midia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
