-- =============================================================================
-- Kivo - Migration 002: Estrutura Multi-Cliente (EMSERH como um dos clientes)
-- =============================================================================

-- 1. Cadastro de Clientes (Empresas / Redes Hospitalares / Órgãos)
create table if not exists public.clientes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null default auth.uid(),
  codigo     text,
  nome       text not null,
  segmento   text default 'Hospitalar / Saúde',
  ativo      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, nome)
);

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
  before update on public.clientes
  for each row execute function public.set_updated_at();

alter table public.clientes enable row level security;

drop policy if exists "Gerenciar proprios clientes" on public.clientes;
create policy "Gerenciar proprios clientes"
  on public.clientes for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Vincular inspeções a um Cliente contratante
alter table public.inspecoes
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null,
  add column if not exists cliente_nome text;

create index if not exists idx_inspecoes_cliente
  on public.inspecoes (cliente_id, data_inspecao desc);
