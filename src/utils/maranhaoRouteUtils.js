const EARTH_RADIUS_KM = 6371;
const ROAD_TORTUOSITY_FACTOR = 1.24;
const AVG_HIGHWAY_KMH = 65;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(a, b) {
  if (!a || !b) return 0;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function routePathCost(anchorStart, orderedStops, roundTrip) {
  if (orderedStops.length === 0) return 0;
  let total = 0;
  let prev = anchorStart || orderedStops[0];
  const startIdx = anchorStart ? 0 : 1;

  for (let i = startIdx; i < orderedStops.length; i += 1) {
    total += haversineDistanceKm(prev, orderedStops[i]);
    prev = orderedStops[i];
  }

  if (roundTrip) {
    const endAnchor = anchorStart || orderedStops[0];
    total += haversineDistanceKm(prev, endAnchor);
  }
  return total;
}

/**
 * Otimiza a sequência de paradas (Nearest Neighbor + 2-opt) para menor distância no Maranhão.
 * Se `origin` for informado, ele permanece como ponto de partida fixo.
 * Sem `origin`, a primeira parada atual é mantida como partida.
 */
export function optimizeStopsOrder(stops = [], origin = null, { roundTrip = false } = {}) {
  if (!Array.isArray(stops) || stops.length <= 1) {
    return [...(stops || [])];
  }

  const fixedFirst = origin ? null : stops[0];
  const pool = origin ? [...stops] : stops.slice(1);
  if (pool.length <= 1) {
    return fixedFirst ? [fixedFirst, ...pool] : [...pool];
  }

  // 1. Nearest Neighbor a partir da âncora inicial
  const remaining = [...pool];
  const ordered = [];
  let current = origin || fixedFirst;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const dist = haversineDistanceKm(current, remaining[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    ordered.push(picked);
    current = picked;
  }

  // 2. Refinamento 2-opt sobre a lista móvel
  const anchorStart = origin || fixedFirst;
  let bestList = fixedFirst ? [fixedFirst, ...ordered] : ordered;
  let bestCost = routePathCost(origin, bestList, roundTrip);
  const startSwapIdx = fixedFirst ? 1 : 0;

  let improved = true;
  let passes = 0;
  while (improved && passes < 40) {
    improved = false;
    passes += 1;
    for (let i = startSwapIdx; i < bestList.length - 1; i += 1) {
      for (let j = i + 1; j < bestList.length; j += 1) {
        const candidate = [
          ...bestList.slice(0, i),
          ...bestList.slice(i, j + 1).reverse(),
          ...bestList.slice(j + 1)
        ];
        const candidateCost = routePathCost(origin ? anchorStart : null, candidate, roundTrip);
        if (candidateCost + 1e-6 < bestCost) {
          bestList = candidate;
          bestCost = candidateCost;
          improved = true;
        }
      }
    }
  }

  return bestList;
}

export function buildRoutePoints(stops = [], origin = null, { roundTrip = false } = {}) {
  const base = [];
  if (origin) base.push({ ...origin, isOrigin: true });
  stops.forEach((stop) => base.push({ ...stop, isOrigin: false }));
  if (roundTrip && base.length >= 2) {
    base.push({ ...base[0], isReturn: true });
  }
  return base;
}

export function estimateOfflineRoute(orderedPoints = []) {
  if (!Array.isArray(orderedPoints) || orderedPoints.length < 2) {
    return {
      source: 'offline_estimate',
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      legs: [],
      geometry: orderedPoints.map((p) => [p.lat, p.lng])
    };
  }

  const legs = [];
  let totalDistanceKm = 0;
  let totalDurationMinutes = 0;

  for (let i = 0; i < orderedPoints.length - 1; i += 1) {
    const from = orderedPoints[i];
    const to = orderedPoints[i + 1];
    const straight = haversineDistanceKm(from, to);
    const estKm = Number((straight * ROAD_TORTUOSITY_FACTOR).toFixed(1));
    const estMin = Math.max(1, Math.round((estKm / AVG_HIGHWAY_KMH) * 60));
    totalDistanceKm += estKm;
    totalDurationMinutes += estMin;
    legs.push({
      fromLabel: from.label || from.nome || 'Origem',
      toLabel: to.label || to.nome || 'Destino',
      distanceKm: estKm,
      durationMinutes: estMin
    });
  }

  return {
    source: 'offline_estimate',
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalDurationMinutes,
    legs,
    geometry: orderedPoints.map((p) => [Number(p.lat), Number(p.lng)])
  };
}

export async function fetchOsrmDrivingRoute(orderedPoints = [], { signal } = {}) {
  if (!Array.isArray(orderedPoints) || orderedPoints.length < 2) {
    return estimateOfflineRoute(orderedPoints);
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return estimateOfflineRoute(orderedPoints);
  }

  const coordsParam = orderedPoints
    .map((p) => `${Number(p.lng).toFixed(6)},${Number(p.lat).toFixed(6)}`)
    .join(';');

  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson&steps=false`,
      { signal }
    );
    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route || !Array.isArray(route.geometry?.coordinates)) {
      throw new Error('Sem geometria rodoviária');
    }

    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    const legs = (route.legs || []).map((leg, idx) => ({
      fromLabel: orderedPoints[idx]?.label || orderedPoints[idx]?.nome || `Ponto ${idx + 1}`,
      toLabel: orderedPoints[idx + 1]?.label || orderedPoints[idx + 1]?.nome || `Ponto ${idx + 2}`,
      distanceKm: Number(((leg.distance || 0) / 1000).toFixed(1)),
      durationMinutes: Math.max(1, Math.round((leg.duration || 0) / 60))
    }));

    return {
      source: 'osrm',
      totalDistanceKm: Number(((route.distance || 0) / 1000).toFixed(1)),
      totalDurationMinutes: Math.max(1, Math.round((route.duration || 0) / 60)),
      legs,
      geometry
    };
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    return estimateOfflineRoute(orderedPoints);
  }
}

export function buildGoogleMapsDirectionsUrl(orderedPoints = []) {
  if (!Array.isArray(orderedPoints) || orderedPoints.length < 2) return '';
  const fmt = (p) => `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`;
  const origin = fmt(orderedPoints[0]);
  const destination = fmt(orderedPoints[orderedPoints.length - 1]);
  const waypoints = orderedPoints.slice(1, -1).slice(0, 9).map(fmt);

  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving'
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function formatDurationPt(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}
