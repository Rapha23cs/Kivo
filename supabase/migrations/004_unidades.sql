-- =============================================================================
-- Kivo - Migration 004: Cadastro Dedicado de Unidades por Cliente
-- =============================================================================

create table if not exists public.unidades (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null default auth.uid(),
  cliente_id        uuid references public.clientes(id) on delete set null,
  cliente_nome      text not null default '',
  codigo            text,
  nome              text not null,
  tipo              text not null default 'Hospital',
  regional          text not null,
  municipio         text not null,
  uf                text default 'MA',
  endereco          text,
  responsavel_local text,
  contato_local     text,
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, cliente_nome, nome)
);

drop trigger if exists trg_unidades_updated_at on public.unidades;
create trigger trg_unidades_updated_at
  before update on public.unidades
  for each row execute function public.set_updated_at();

create index if not exists idx_unidades_user_cliente
  on public.unidades (user_id, cliente_nome, nome);

alter table public.unidades enable row level security;

drop policy if exists "Gerenciar proprias unidades" on public.unidades;
create policy "Gerenciar proprias unidades"
  on public.unidades for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.inspecoes
  add column if not exists unidade_id uuid references public.unidades(id) on delete set null;

alter table public.relatorios_inspecao
  add column if not exists unidade_id uuid references public.unidades(id) on delete set null;
