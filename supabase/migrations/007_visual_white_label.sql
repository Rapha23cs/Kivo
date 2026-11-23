-- =============================================================================
-- Kivo - Migration 007: White-label de Clientes (Logo para Laudos PDF)
-- =============================================================================

alter table public.clientes
  add column if not exists logo_url text;
