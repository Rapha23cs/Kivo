import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  Compass,
  Copy,
  ExternalLink,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Navigation,
  Plus,
  Route,
  Sparkles,
  Trash2,
  WifiOff
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import {
  MARANHAO_BOUNDS,
  MARANHAO_CENTER,
  MARANHAO_MUNICIPALITIES,
  findMaranhaoMunicipality,
  isWithinMaranhaoBounds,
  resolveUnitCoordinates
} from '../../data/maranhaoMunicipalities';
import { getExpiryStatus } from '../../supabase/operationsService';
import { copyTextToClipboard } from '../../utils/kivoHelpers';
import {
  buildGoogleMapsDirectionsUrl,
  buildRoutePoints,
  estimateOfflineRoute,
  fetchOsrmDrivingRoute,
  formatDurationPt,
  optimizeStopsOrder
} from '../../utils/maranhaoRouteUtils';

const PRIORITY_COLORS = {
  critical: { fill: '#F43F5E', label: 'Urgente (Agenda vencida / desvio crítico)' },
  warning: { fill: '#F59E0B', label: 'Atenção (Agenda ≤ 14d / alerta SST)' },
  ok: { fill: '#2EB88A', label: 'Em dia' },
  neutral: { fill: '#60A5FA', label: 'Sem histórico vinculado' }
};

function createMapPinIcon({ fill, badgeText = '', isOrigin = false }) {
  const size = badgeText || isOrigin ? 30 : 24;
  const ring = isOrigin ? '#FFFFFF' : '#0B0B0D';
  const badgeHtml = badgeText
    ? `<span style="font-family:monospace;font-size:11px;font-weight:800;color:#09090B;">${badgeText}</span>`
    : `<span style="width:7px;height:7px;border-radius:9999px;background:#09090B;"></span>`;

  return L.divIcon({
    className: 'kivo-route-pin-wrapper',
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fill};border:2.5px solid ${ring};box-shadow:0 4px 14px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;">${badgeHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

function buildSafePopupDom(unit, routeIndex, { onToggleStop, onNewOrderForUnit }) {
  const root = document.createElement('div');
  root.style.minWidth = '210px';
  root.style.fontFamily = 'Plus Jakarta Sans, system-ui, sans-serif';
  root.style.color = '#18181B';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.fontSize = '13px';
  title.style.marginBottom = '2px';
  title.textContent = unit.nome;
  root.appendChild(title);

  const meta = document.createElement('div');
  meta.style.fontSize = '11px';
  meta.style.color = '#52525B';
  meta.style.marginBottom = '6px';
  meta.textContent = `${unit.municipio || 'MA'} • ${unit.regional || 'Sem regional'}`;
  root.appendChild(meta);

  const statusLine = document.createElement('div');
  statusLine.style.fontSize = '11px';
  statusLine.style.marginBottom = '8px';
  statusLine.style.color = '#27272A';
  const details = [];
  if (unit.overdueSchedules > 0) details.push(`${unit.overdueSchedules} agenda vencida`);
  if (unit.soonSchedules > 0) details.push(`${unit.soonSchedules} agenda próxima`);
  if (unit.openCriticalDeviations > 0) details.push(`${unit.openCriticalDeviations} desvio(s) crítico(s)`);
  if (unit.sstWarnings > 0) details.push(`${unit.sstWarnings} alerta(s) SST`);
  statusLine.textContent =
    details.length > 0
      ? details.join(' • ')
      : `Precisão: ${unit.geo.precision === 'exata' ? 'GPS exato' : 'Centro do município'}`;
  root.appendChild(statusLine);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '6px';

  const routeBtn = document.createElement('button');
  routeBtn.type = 'button';
  routeBtn.style.flex = '1';
  routeBtn.style.padding = '5px 8px';
  routeBtn.style.borderRadius = '6px';
  routeBtn.style.border = 'none';
  routeBtn.style.cursor = 'pointer';
  routeBtn.style.fontSize = '11px';
  routeBtn.style.fontWeight = '600';
  routeBtn.style.background = routeIndex >= 0 ? '#FEE2E2' : '#10B981';
  routeBtn.style.color = routeIndex >= 0 ? '#991B1B' : '#052E16';
  routeBtn.textContent =
    routeIndex >= 0 ? `Remover (${routeIndex + 1}ª parada)` : '+ Adicionar à rota';
  routeBtn.addEventListener('click', () => onToggleStop(unit.id));
  actions.appendChild(routeBtn);

  if (onNewOrderForUnit) {
    const orderBtn = document.createElement('button');
    orderBtn.type = 'button';
    orderBtn.style.padding = '5px 8px';
    orderBtn.style.borderRadius = '6px';
    orderBtn.style.border = '1px solid #D4D4D8';
    orderBtn.style.cursor = 'pointer';
    orderBtn.style.fontSize = '11px';
    orderBtn.style.fontWeight = '600';
    orderBtn.style.background = '#FFFFFF';
    orderBtn.style.color = '#18181B';
    orderBtn.textContent = 'Vistoria';
    orderBtn.addEventListener('click', () => onNewOrderForUnit(unit));
    actions.appendChild(orderBtn);
  }

  root.appendChild(actions);
  return root;
}

export default function MaranhaoRoutesPlanner({
  units = [],
  orders = [],
  schedules = [],
  sstItems = [],
  onNewOrderForUnit
}) {
  const { toast } = useFeedback();

  const [regionalFilter, setRegionalFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('all'); // all | alerts | agenda_14d
  const [originMode, setOriginMode] = useState('none'); // none | city | gps
  const [originCityName, setOriginCityName] = useState('São Luís');
  const [gpsOrigin, setGpsOrigin] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [roundTrip, setRoundTrip] = useState(false);
  const [routeResult, setRouteResult] = useState(() => estimateOfflineRoute([]));
  const [routeLoading, setRouteLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const lastFittedKeyRef = useRef('');

  const enrichedUnits = useMemo(() => {
    const mapped = [];
    let unmappedCount = 0;

    units.forEach((unit) => {
      const geo = resolveUnitCoordinates(unit);
      if (!geo || !isWithinMaranhaoBounds(geo.lat, geo.lng)) {
        unmappedCount += 1;
        return;
      }

      const unitNameLower = (unit.nome || '').trim().toLowerCase();
      const unitSchedules = (schedules || []).filter(
        (s) =>
          s.ativo !== false &&
          ((s.unidadeId && s.unidadeId === unit.id) ||
            (s.unidadeNome || '').trim().toLowerCase() === unitNameLower)
      );

      let overdueSchedules = 0;
      let soonSchedules = 0;
      unitSchedules.forEach((s) => {
        const st = getExpiryStatus(s.proximaData);
        if (st.status === 'vencido' || st.status === 'vence_hoje') {
          overdueSchedules += 1;
        } else if (st.daysRemaining !== null && st.daysRemaining <= 14) {
          soonSchedules += 1;
        }
      });

      const unitOrders = (orders || []).filter(
        (o) =>
          (o.unidadeId && o.unidadeId === unit.id) ||
          (o.hospitalName || '').trim().toLowerCase() === unitNameLower
      );
      let openCriticalDeviations = 0;
      unitOrders.forEach((ord) => {
        (ord.checklist || []).forEach((it) => {
          if (
            (it.status === 'nao' || it.status === 'nao_conforme') &&
            it.actionStatus !== 'Concluído' &&
            (it.classification === 'Crítico' || it.classification === 'Grave')
          ) {
            openCriticalDeviations += 1;
          }
        });
      });

      const sstWarnings = (sstItems || []).filter((it) => {
        const sameUnit =
          (it.unidadeId && it.unidadeId === unit.id) ||
          (it.unidadeNome || '').trim().toLowerCase() === unitNameLower;
        if (!sameUnit || !it.dataValidade) return false;
        const st = getExpiryStatus(it.dataValidade);
        return (
          st.status === 'vencido' ||
          st.status === 'vence_hoje' ||
          st.status === 'alerta_30' ||
          st.status === 'alerta_60'
        );
      }).length;

      let priority = 'neutral';
      if (overdueSchedules > 0 || openCriticalDeviations > 0) {
        priority = 'critical';
      } else if (soonSchedules > 0 || sstWarnings > 0) {
        priority = 'warning';
      } else if (unitOrders.length > 0 || unitSchedules.length > 0) {
        priority = 'ok';
      }

      mapped.push({
        ...unit,
        geo,
        lat: geo.lat,
        lng: geo.lng,
        overdueSchedules,
        soonSchedules,
        openCriticalDeviations,
        sstWarnings,
        priority
      });
    });

    return { mapped, unmappedCount };
  }, [units, orders, schedules, sstItems]);

  const regionalOptions = useMemo(() => {
    const set = new Set();
    enrichedUnits.mapped.forEach((u) => u.regional && set.add(u.regional));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [enrichedUnits.mapped]);

  const visibleUnits = useMemo(() => {
    return enrichedUnits.mapped.filter((u) => {
      if (regionalFilter !== 'ALL' && u.regional !== regionalFilter) return false;
      if (priorityFilter === 'alerts') {
        return u.priority === 'critical' || u.priority === 'warning';
      }
      if (priorityFilter === 'agenda_14d') {
        return u.overdueSchedules > 0 || u.soonSchedules > 0;
      }
      return true;
    });
  }, [enrichedUnits.mapped, regionalFilter, priorityFilter]);

  const unitById = useMemo(
    () => new Map(enrichedUnits.mapped.map((u) => [u.id, u])),
    [enrichedUnits.mapped]
  );

  const selectedStops = useMemo(
    () => selectedIds.map((id) => unitById.get(id)).filter(Boolean),
    [selectedIds, unitById]
  );

  const resolvedOrigin = useMemo(() => {
    if (originMode === 'gps' && gpsOrigin) {
      return gpsOrigin;
    }
    if (originMode === 'city') {
      const city = findMaranhaoMunicipality(originCityName);
      if (city) {
        return {
          id: '__origin__',
          nome: `Partida: ${city.nome}`,
          label: city.nome,
          lat: city.lat,
          lng: city.lng
        };
      }
    }
    return null;
  }, [originMode, originCityName, gpsOrigin]);

  const routePoints = useMemo(
    () => buildRoutePoints(selectedStops, resolvedOrigin, { roundTrip }),
    [selectedStops, resolvedOrigin, roundTrip]
  );

  const toggleStop = (unitId) => {
    setSelectedIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const toggleStopRef = useRef(toggleStop);
  toggleStopRef.current = toggleStop;
  const newOrderRef = useRef(onNewOrderForUnit);
  newOrderRef.current = onNewOrderForUnit;

  // Inicializa o mapa Leaflet uma única vez travado no Maranhão
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return undefined;

    const map = L.map(container, {
      center: MARANHAO_CENTER,
      zoom: 6,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: MARANHAO_BOUNDS,
      maxBoundsViscosity: 0.9
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);

    routeLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const timer = window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
    };
  }, []);

  // Recalcula rota rodoviária (OSRM online com fallback automático offline)
  useEffect(() => {
    if (routePoints.length < 2) {
      setRouteResult(estimateOfflineRoute(routePoints));
      setRouteLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setRouteLoading(true);

    fetchOsrmDrivingRoute(routePoints, { signal: controller.signal })
      .then((res) => {
        setRouteResult(res);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setRouteResult(estimateOfflineRoute(routePoints));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      });

    return () => controller.abort();
  }, [routePoints]);

  // Atualiza marcadores e polilinha no Leaflet
  useEffect(() => {
    const map = mapRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;
    if (!map || !markersLayer || !routeLayer) return;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    if (resolvedOrigin) {
      const originMarker = L.marker([resolvedOrigin.lat, resolvedOrigin.lng], {
        icon: createMapPinIcon({ fill: '#818CF8', badgeText: 'P', isOrigin: true }),
        zIndexOffset: 500
      });
      originMarker.bindTooltip(resolvedOrigin.nome, { direction: 'top' });
      originMarker.addTo(markersLayer);
    }

    visibleUnits.forEach((unit) => {
      const routeIdx = selectedIds.indexOf(unit.id);
      const color = PRIORITY_COLORS[unit.priority]?.fill || '#60A5FA';
      const marker = L.marker([unit.lat, unit.lng], {
        icon: createMapPinIcon({
          fill: color,
          badgeText: routeIdx >= 0 ? String(routeIdx + 1) : ''
        }),
        zIndexOffset: routeIdx >= 0 ? 400 + routeIdx : 100
      });

      marker.bindPopup(() =>
        buildSafePopupDom(unit, routeIdx, {
          onToggleStop: (id) => toggleStopRef.current(id),
          onNewOrderForUnit: (u) => newOrderRef.current?.(u)
        })
      );
      marker.addTo(markersLayer);
    });

    if (routeResult.geometry?.length >= 2) {
      const isOsrm = routeResult.source === 'osrm';
      L.polyline(routeResult.geometry, {
        color: isOsrm ? '#34D399' : '#FBBF24',
        weight: isOsrm ? 4 : 3,
        opacity: 0.9,
        dashArray: isOsrm ? undefined : '8 6'
      }).addTo(routeLayer);
    }

    const fitTargets =
      routePoints.length >= 2
        ? routePoints.map((p) => [p.lat, p.lng])
        : visibleUnits.map((u) => [u.lat, u.lng]);
    const fitKey = `${fitTargets.map((p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join('|')}`;

    if (fitTargets.length > 0 && fitKey !== lastFittedKeyRef.current) {
      lastFittedKeyRef.current = fitKey;
      const bounds = L.latLngBounds(fitTargets);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12, animate: true });
    }
  }, [visibleUnits, selectedIds, resolvedOrigin, routeResult, routePoints]);

  const handleFitMaranhao = () => {
    const map = mapRef.current;
    if (!map) return;
    const targets =
      routePoints.length >= 2
        ? routePoints.map((p) => [p.lat, p.lng])
        : visibleUnits.map((u) => [u.lat, u.lng]);
    if (targets.length > 0) {
      map.fitBounds(L.latLngBounds(targets), { padding: [36, 36], maxZoom: 12, animate: true });
    } else {
      map.setView(MARANHAO_CENTER, 6, { animate: true });
    }
  };

  const handleUseGpsOrigin = () => {
    if (!navigator.geolocation) {
      toast.error({ title: 'GPS indisponível', message: 'Este navegador não suporta geolocalização.' });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        if (!isWithinMaranhaoBounds(lat, lng)) {
          toast.warning({
            title: 'Localização fora do Maranhão',
            message: 'Sua posição GPS atual está fora dos limites do Maranhão. Selecione uma cidade sede do MA.'
          });
          setOriginMode('city');
          return;
        }
        setGpsOrigin({
          id: '__origin__',
          nome: 'Partida: Minha localização (GPS)',
          label: 'GPS atual',
          lat,
          lng
        });
        setOriginMode('gps');
        toast.success({ title: 'Origem GPS definida', message: `${lat}, ${lng}` });
      },
      (err) => {
        setGpsLoading(false);
        toast.error({
          title: 'Não foi possível obter o GPS',
          message: err?.message || 'Verifique a permissão de localização do navegador.'
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOptimizeOrder = () => {
    if (selectedStops.length < 2) {
      toast.info({ message: 'Adicione pelo menos 2 unidades para otimizar a ordem do roteiro.' });
      return;
    }
    const optimized = optimizeStopsOrder(selectedStops, resolvedOrigin, { roundTrip });
    setSelectedIds(optimized.map((u) => u.id));
    toast.success({
      title: 'Rota otimizada',
      message: `${optimized.length} parada(s) ordenadas pela menor distância estimada.`
    });
  };

  const handleLoadFromAgenda = () => {
    const agendaStops = enrichedUnits.mapped.filter(
      (u) => u.overdueSchedules > 0 || u.soonSchedules > 0
    );
    if (agendaStops.length === 0) {
      toast.info({
        title: 'Nenhuma unidade pendente na Agenda',
        message: 'Não há vistorias vencidas ou previstas para os próximos 14 dias com localização.'
      });
      return;
    }
    const ordered =
      agendaStops.length >= 2
        ? optimizeStopsOrder(agendaStops, resolvedOrigin, { roundTrip })
        : agendaStops;
    setSelectedIds(ordered.map((u) => u.id));
    toast.success({
      title: 'Roteiro carregado da Agenda',
      message: `${ordered.length} unidade(s) com vencimento próximo ou em atraso.`
    });
  };

  const handleLoadVisibleUnits = () => {
    if (visibleUnits.length === 0) {
      toast.info({ message: 'Nenhuma unidade visível no filtro atual.' });
      return;
    }
    const ordered =
      visibleUnits.length >= 2
        ? optimizeStopsOrder(visibleUnits, resolvedOrigin, { roundTrip })
        : visibleUnits;
    setSelectedIds(ordered.map((u) => u.id));
    toast.success({
      title: 'Unidades carregadas na rota',
      message: `${ordered.length} unidade(s) adicionada(s) ao roteiro.`
    });
  };

  const moveStop = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const googleMapsUrl = buildGoogleMapsDirectionsUrl(routePoints);

  const handleCopyRouteText = async () => {
    if (selectedStops.length === 0) return;
    const lines = [
      `*ROTEIRO DE VISTORIAS — MARANHÃO (KIVO)*`,
      resolvedOrigin ? `• *Origem:* ${resolvedOrigin.label || resolvedOrigin.nome}` : null,
      `• *Paradas:* ${selectedStops.length} unidade(s)${roundTrip ? ' (ida e volta)' : ''}`,
      routeResult.totalDistanceKm > 0
        ? `• *Percurso estimado:* ${routeResult.totalDistanceKm} km (~${formatDurationPt(routeResult.totalDurationMinutes)})`
        : null,
      '',
      '*SEQUÊNCIA DE VISITAS*'
    ].filter((l) => l !== null);

    selectedStops.forEach((stop, idx) => {
      lines.push(
        `${idx + 1}. *${stop.nome}* — ${stop.municipio || 'MA'}${stop.regional ? ` (${stop.regional})` : ''}`
      );
    });

    if (googleMapsUrl) {
      lines.push('', `🗺️ Abrir no Google Maps: ${googleMapsUrl}`);
    }

    await copyTextToClipboard(lines.join('\n'));
    toast.success({ title: 'Roteiro copiado!', message: 'Pronto para compartilhar com a equipe.' });
  };

  return (
    <div className="space-y-4">
      {/* Barra de filtros e presets rápidos */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[#34D399] font-semibold mr-1">
            <MapIcon className="w-4 h-4" />
            <span>Rede no Maranhão ({enrichedUnits.mapped.length})</span>
          </div>

          <select
            value={regionalFilter}
            onChange={(e) => setRegionalFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="ALL">Todas as Regionais</option>
            {regionalOptions.map((reg) => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="all">Todas as Unidades</option>
            <option value="alerts">Com Alertas (Agenda / SST / Desvios)</option>
            <option value="agenda_14d">Agenda Próxima (≤ 14d ou Vencida)</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLoadFromAgenda}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#221A10] hover:bg-[#2E2212] text-[#FBBF24] border border-[#F59E0B]/40 rounded-lg font-medium transition"
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Puxar da Agenda (14d)
          </button>

          <button
            type="button"
            onClick={handleLoadVisibleUnits}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Filtradas ({visibleUnits.length})
          </button>
        </div>
      </div>

      {enrichedUnits.unmappedCount > 0 && (
        <div className="bg-[#18191D] border border-[#27282E] rounded-xl px-3.5 py-2 text-[11px] text-[#A1A1AA]">
          {enrichedUnits.unmappedCount} unidade(s) sem município maranhense reconhecido ficaram fora do mapa. Edite-as na aba anterior para definir o município ou marcar o pino manualmente.
        </div>
      )}

      {/* Grid Principal: Mapa Leaflet + Construtor de Roteiro */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Mapa Interativo do Maranhão */}
        <div className="xl:col-span-7 bg-[#141518] border border-[#232429] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-[#232429] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {Object.entries(PRIORITY_COLORS).map(([key, cfg]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block border border-[#09090B]"
                    style={{ backgroundColor: cfg.fill }}
                  />
                  {key === 'critical'
                    ? 'Urgente'
                    : key === 'warning'
                      ? 'Atenção'
                      : key === 'ok'
                        ? 'Em dia'
                        : 'Sem histórico'}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={handleFitMaranhao}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0D0E10] hover:bg-[#1C1D22] text-[#E4E4E7] border border-[#27282E] rounded-lg text-[11px] transition"
            >
              <Maximize2 className="w-3 h-3 text-[#34D399]" />
              Enquadrar
            </button>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[380px] sm:h-[480px] bg-[#0D0E10] z-0"
          />

          <div className="px-4 py-2 border-t border-[#232429] bg-[#0D0E10] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#71717A]">
            <span>Clique nos marcadores para adicionar/remover da rota ou iniciar uma vistoria.</span>
            {routePoints.length >= 2 && (
              <span className="inline-flex items-center gap-1 font-mono text-[#E4E4E7]">
                {routeResult.source === 'osrm' ? (
                  <>
                    <Route className="w-3.5 h-3.5 text-[#34D399]" />
                    Traçado rodoviário (OSRM)
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-[#FBBF24]" />
                    Estimativa offline (linha + fator rodoviário)
                  </>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Painel do Roteiro */}
        <div className="xl:col-span-5 bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Roteiro de Viagem (MA)</h3>
                <p className="text-[11px] text-[#71717A]">
                  Defina partida, otimize a sequência e exporte para o GPS
                </p>
              </div>
            </div>
            {selectedStops.length > 0 && (
              <Badge variant="success" size="sm">
                {selectedStops.length} parada(s)
              </Badge>
            )}
          </div>

          {/* Origem */}
          <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#E4E4E7] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#818CF8]" />
                Ponto de Partida
              </span>
              <button
                type="button"
                onClick={handleUseGpsOrigin}
                disabled={gpsLoading}
                className="inline-flex items-center gap-1 text-[11px] text-[#34D399] hover:underline disabled:opacity-50"
              >
                <LocateFixed className="w-3 h-3" />
                {gpsLoading ? 'Localizando...' : 'Usar meu GPS'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={originMode}
                onChange={(e) => setOriginMode(e.target.value)}
                className="bg-[#141518] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
              >
                <option value="none">Partir da 1ª unidade</option>
                <option value="city">Município sede (MA)</option>
                {gpsOrigin && <option value="gps">Meu GPS atual</option>}
              </select>

              {originMode === 'city' && (
                <>
                  <input
                    type="text"
                    list="kivo-route-origin-cities"
                    value={originCityName}
                    onChange={(e) => setOriginCityName(e.target.value)}
                    placeholder="Ex: São Luís"
                    className="bg-[#141518] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                  <datalist id="kivo-route-origin-cities">
                    {MARANHAO_MUNICIPALITIES.map((m) => (
                      <option key={m.codigoIbge} value={m.nome} />
                    ))}
                  </datalist>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#A1A1AA] cursor-pointer pt-0.5">
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(e) => setRoundTrip(e.target.checked)}
                className="accent-[#2EB88A] rounded"
              />
              Incluir retorno ao ponto de partida (ida e volta)
            </label>
          </div>

          {/* Métricas consolidadas do percurso */}
          {routePoints.length >= 2 && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2.5">
                <span className="text-[10px] text-[#71717A] block">Distância Total</span>
                <span className="font-mono font-bold text-base text-[#34D399]">
                  {routeLoading ? '...' : `${routeResult.totalDistanceKm} km`}
                </span>
              </div>
              <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2.5">
                <span className="text-[10px] text-[#71717A] block">Tempo Estimado</span>
                <span className="font-mono font-bold text-base text-[#F4F4F5]">
                  {routeLoading ? '...' : formatDurationPt(routeResult.totalDurationMinutes)}
                </span>
              </div>
            </div>
          )}

          {/* Lista de paradas ordenáveis */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#E4E4E7]">
                Sequência de Paradas
              </span>
              <div className="flex items-center gap-2">
                {selectedStops.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleOptimizeOrder}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg text-[11px] font-semibold transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    Otimizar ordem
                  </button>
                )}
                {selectedStops.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[#71717A] hover:text-[#FB7185] hover:bg-[#221216] rounded-lg text-[11px] transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {selectedStops.length === 0 ? (
              <div className="bg-[#0D0E10] border border-dashed border-[#27282E] rounded-xl p-5 text-center space-y-2">
                <p className="text-[#A1A1AA]">Nenhuma unidade selecionada na rota.</p>
                <p className="text-[11px] text-[#71717A]">
                  Clique nos pinos do mapa ou escolha unidades da lista rápida abaixo:
                </p>
                {visibleUnits.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 pt-1 max-h-28 overflow-y-auto">
                    {visibleUnits.slice(0, 8).map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleStop(u.id)}
                        className="px-2 py-1 rounded-md bg-[#141518] hover:bg-[#1E2025] border border-[#27282E] text-[11px] text-[#E4E4E7] transition"
                      >
                        + {u.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {selectedStops.map((stop, idx) => {
                  const legIdx = resolvedOrigin ? idx : idx - 1;
                  const leg = legIdx >= 0 ? routeResult.legs?.[legIdx] : null;
                  return (
                    <div
                      key={stop.id}
                      className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-[#2EB88A] text-[#09090B] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-[#F4F4F5] truncate">{stop.nome}</p>
                          <p className="text-[10px] text-[#71717A] truncate">
                            {stop.municipio} • {stop.regional}
                            {leg ? ` • +${leg.distanceKm} km (~${formatDurationPt(leg.durationMinutes)})` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveStop(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 text-[#71717A] hover:text-[#F4F4F5] disabled:opacity-30 rounded"
                          title="Subir na ordem"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStop(idx, 1)}
                          disabled={idx === selectedStops.length - 1}
                          className="p-1 text-[#71717A] hover:text-[#F4F4F5] disabled:opacity-30 rounded"
                          title="Descer na ordem"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStop(stop.id)}
                          className="p-1 text-[#71717A] hover:text-[#FB7185] rounded"
                          title="Remover da rota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Seleção rápida complementar quando já existem paradas */}
          {selectedStops.length > 0 && visibleUnits.some((u) => !selectedIds.includes(u.id)) && (
            <div className="pt-1 border-t border-[#1F2024]">
              <span className="text-[10px] text-[#71717A] block mb-1.5">
                Adicionar outra unidade visível:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {visibleUnits
                  .filter((u) => !selectedIds.includes(u.id))
                  .slice(0, 6)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleStop(u.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D0E10] hover:bg-[#1C1D22] border border-[#27282E] text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                    >
                      <Check className="w-2.5 h-2.5 text-[#34D399]" />
                      {u.nome}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Ações de saída (Google Maps + Copiar roteiro) */}
          <div className="pt-2 border-t border-[#1F2024] flex flex-col sm:flex-row gap-2">
            {googleMapsUrl ? (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir no Google Maps
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#1A1B20] text-[#71717A] rounded-lg cursor-not-allowed"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Selecione 2+ pontos
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyRouteText}
              disabled={selectedStops.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0D0E10] hover:bg-[#1C1D22] disabled:opacity-40 text-[#E4E4E7] border border-[#27282E] rounded-lg font-medium transition"
            >
              <Copy className="w-3.5 h-3.5 text-[#34D399]" />
              Copiar roteiro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
