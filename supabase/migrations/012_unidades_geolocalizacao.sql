-- =============================================================================
-- Kivo - Migration 012: Geolocalização das Unidades (Maranhão)
-- =============================================================================

alter table public.unidades
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geocode_precision text default 'municipio';

comment on column public.unidades.latitude is 'Latitude decimal da unidade (WGS84), ex: -2.53073';
comment on column public.unidades.longitude is 'Longitude decimal da unidade (WGS84), ex: -44.3068';
comment on column public.unidades.geocode_precision is 'Origem da coordenada: exata | manual | municipio';
