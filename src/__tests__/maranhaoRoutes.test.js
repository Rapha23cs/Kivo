import { describe, it, expect } from 'vitest';
import { findMaranhaoMunicipality } from '../data/maranhaoMunicipalities';
import {
  buildGoogleMapsDirectionsUrl,
  buildRoutePoints,
  estimateOfflineRoute,
  fetchOsrmDrivingRoute,
  formatDurationPt,
  haversineDistanceKm,
  optimizeStopsOrder
} from '../utils/maranhaoRouteUtils';

describe('Motor de Rotas — Estado do Maranhão', () => {
  const saoLuis = findMaranhaoMunicipality('São Luís');
  const rosario = findMaranhaoMunicipality('Rosário');
  const bacabal = findMaranhaoMunicipality('Bacabal');
  const imperatriz = findMaranhaoMunicipality('Imperatriz');

  it('calcula distância geodésica realista entre municípios do Maranhão', () => {
    const dist = haversineDistanceKm(saoLuis, imperatriz);
    expect(dist).toBeGreaterThan(450);
    expect(dist).toBeLessThan(530);
  });

  it('otimiza sequência de paradas mantendo o ponto de partida fixo', () => {
    const origin = { id: 'origin-slz', nome: 'Sede São Luís', ...saoLuis };
    const stopsZigzag = [
      { id: 'imp', nome: 'Unidade Imperatriz', ...imperatriz },
      { id: 'ros', nome: 'Unidade Rosário', ...rosario },
      { id: 'bac', nome: 'Unidade Bacabal', ...bacabal }
    ];

    const optimized = optimizeStopsOrder(stopsZigzag, origin);
    expect(optimized.map((s) => s.id)).toEqual(['ros', 'bac', 'imp']);
  });

  it('gera estimativa offline com trechos, retorno opcional e URL do Google Maps', () => {
    const points = buildRoutePoints(
      [
        { id: 'ros', nome: 'Rosário', ...rosario },
        { id: 'bac', nome: 'Bacabal', ...bacabal }
      ],
      { id: 'slz', nome: 'São Luís', label: 'São Luís', ...saoLuis },
      { roundTrip: true }
    );

    expect(points).toHaveLength(4);
    const offline = estimateOfflineRoute(points);
    expect(offline.source).toBe('offline_estimate');
    expect(offline.legs).toHaveLength(3);
    expect(offline.totalDistanceKm).toBeGreaterThan(300);

    const mapsUrl = buildGoogleMapsDirectionsUrl(points);
    expect(mapsUrl).toContain('https://www.google.com/maps/dir/?');
    expect(mapsUrl).toContain('waypoints=');
    expect(mapsUrl).toContain('travelmode=driving');
  });

  it('faz fallback automático para estimativa offline em fetchOsrmDrivingRoute sem rede', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true
    });

    const route = await fetchOsrmDrivingRoute([saoLuis, rosario, bacabal]);
    expect(route.source).toBe('offline_estimate');
    expect(route.legs).toHaveLength(2);
    expect(formatDurationPt(45)).toBe('45 min');
    expect(formatDurationPt(120)).toBe('2h');
    expect(formatDurationPt(135)).toBe('2h 15min');
  });
});
