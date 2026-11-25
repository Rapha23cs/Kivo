import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Navigation, RotateCcw, Search } from 'lucide-react';
import {
  MARANHAO_BOUNDS,
  MARANHAO_CENTER,
  findMaranhaoMunicipality,
  isWithinMaranhaoBounds
} from '../../data/maranhaoMunicipalities';

function roundCoord(value) {
  return Number(Number(value).toFixed(6));
}

function createUnitPinIcon(precision) {
  const fill = precision === 'exata' ? '#2EB88A' : '#F59E0B';
  return L.divIcon({
    className: 'kivo-leaflet-pin-wrapper',
    html: `<div style="width:26px;height:26px;border-radius:9999px 9999px 9999px 0;transform:rotate(-45deg);background:${fill};border:2.5px solid #0B0B0D;box-shadow:0 4px 12px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#0B0B0D;transform:rotate(45deg);"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });
}

export default function MaranhaoUnitLocationPicker({
  municipio = '',
  endereco = '',
  latitude = null,
  longitude = null,
  geocodePrecision = 'municipio',
  onChange
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState('');

  const matchedCity = findMaranhaoMunicipality(municipio);
  const hasValidCoord =
    latitude !== null &&
    latitude !== '' &&
    longitude !== null &&
    longitude !== '' &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  const displayLat = hasValidCoord ? Number(latitude) : matchedCity?.lat ?? null;
  const displayLng = hasValidCoord ? Number(longitude) : matchedCity?.lng ?? null;

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapRef.current) return undefined;

    const initialCenter =
      displayLat !== null && displayLng !== null
        ? [displayLat, displayLng]
        : MARANHAO_CENTER;
    const initialZoom = displayLat !== null && displayLng !== null ? (geocodePrecision === 'exata' ? 14 : 11) : 6;

    const map = L.map(container, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 6,
      maxZoom: 18,
      maxBounds: MARANHAO_BOUNDS,
      maxBoundsViscosity: 0.9,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18
    }).addTo(map);

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      if (!isWithinMaranhaoBounds(lat, lng)) {
        setFeedback('Selecione um ponto dentro dos limites do Estado do Maranhão.');
        return;
      }
      setFeedback('');
      onChangeRef.current?.({
        latitude: roundCoord(lat),
        longitude: roundCoord(lng),
        geocodePrecision: 'exata'
      });
    });

    mapRef.current = map;
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (displayLat === null || displayLng === null) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const pos = [displayLat, displayLng];
    const effectivePrecision = hasValidCoord ? geocodePrecision || 'exata' : 'municipio';
    const icon = createUnitPinIcon(effectivePrecision);

    if (!markerRef.current) {
      const marker = L.marker(pos, { draggable: true, icon }).addTo(map);
      marker.on('dragend', () => {
        const nextPos = marker.getLatLng();
        if (!isWithinMaranhaoBounds(nextPos.lat, nextPos.lng)) {
          setFeedback('O marcador deve permanecer dentro do Estado do Maranhão.');
          marker.setLatLng(pos);
          return;
        }
        setFeedback('');
        onChangeRef.current?.({
          latitude: roundCoord(nextPos.lat),
          longitude: roundCoord(nextPos.lng),
          geocodePrecision: 'exata'
        });
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(pos);
      markerRef.current.setIcon(icon);
    }

    const targetZoom = Math.max(map.getZoom(), effectivePrecision === 'exata' ? 14 : 11);
    map.setView(pos, targetZoom, { animate: true });
  }, [displayLat, displayLng, geocodePrecision, hasValidCoord]);

  const handleCenterOnMunicipality = () => {
    if (!matchedCity) {
      setFeedback('Informe um município válido do Maranhão para centralizar.');
      return;
    }
    setFeedback('');
    onChange?.({
      latitude: matchedCity.lat,
      longitude: matchedCity.lng,
      geocodePrecision: 'municipio'
    });
    if (mapRef.current) {
      mapRef.current.setView([matchedCity.lat, matchedCity.lng], 12, { animate: true });
    }
  };

  const handleGeocodeAddress = async () => {
    if (navigator.onLine === false) {
      setFeedback('Sem conexão no momento. Clique diretamente no mapa para posicionar o pino offline.');
      return;
    }
    const parts = [endereco?.trim(), municipio?.trim(), 'Maranhão', 'Brasil'].filter(Boolean);
    if (parts.length < 3) {
      setFeedback('Preencha Município e Endereço antes de buscar no mapa.');
      return;
    }

    setSearching(true);
    setFeedback('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'br',
        viewbox: '-48.95,-0.95,-41.6,-10.65',
        bounded: '1',
        q: parts.join(', ')
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'pt-BR'
        }
      });
      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}`);
      }
      const results = await res.json();
      const valid = (Array.isArray(results) ? results : []).find((item) =>
        isWithinMaranhaoBounds(Number(item.lat), Number(item.lon))
      );
      if (!valid) {
        setFeedback('Endereço não localizado com precisão. Ajuste clicando ou arrastando o pino no mapa.');
        return;
      }
      const lat = roundCoord(valid.lat);
      const lng = roundCoord(valid.lon);
      onChange?.({
        latitude: lat,
        longitude: lng,
        geocodePrecision: 'exata'
      });
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 16, { animate: true });
      }
      setFeedback('Localização encontrada! Arraste o pino se precisar de ajuste fino.');
    } catch {
      setFeedback('Não foi possível consultar o endereço online agora. Clique no mapa para marcar manualmente.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="sm:col-span-2 bg-[#0D0E10] border border-[#232429] rounded-xl p-3.5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Navigation className="w-4 h-4 text-[#34D399] shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#F4F4F5] block">
              Geolocalização no Maranhão (MA)
            </span>
            <span className="text-[11px] text-[#71717A] block truncate">
              Clique no mapa ou arraste o marcador para definir o ponto exato para rotas.
            </span>
          </div>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 self-start sm:self-center ${
            hasValidCoord && geocodePrecision === 'exata'
              ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
              : displayLat !== null
                ? 'bg-[#261D0D] text-[#FBBF24] border-[#F59E0B]/40'
                : 'bg-[#18191D] text-[#71717A] border-[#27282E]'
          }`}
        >
          {hasValidCoord && geocodePrecision === 'exata'
            ? 'Coordenada exata'
            : displayLat !== null
              ? 'Centro do município (aprox.)'
              : 'Sem coordenada'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGeocodeAddress}
          disabled={searching}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141518] hover:bg-[#1E2025] disabled:opacity-50 text-[#F4F4F5] border border-[#2D2F36] rounded-lg text-[11px] font-medium transition"
        >
          <Search className="w-3.5 h-3.5 text-[#34D399]" />
          {searching ? 'Buscando endereço...' : 'Buscar endereço no MA'}
        </button>

        <button
          type="button"
          onClick={handleCenterOnMunicipality}
          disabled={!matchedCity}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#141518] hover:bg-[#1E2025] disabled:opacity-40 text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-[11px] font-medium transition"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#FBBF24]" />
          Centralizar em {matchedCity ? matchedCity.nome : 'Município'}
        </button>

        {hasValidCoord && (
          <button
            type="button"
            onClick={() => {
              setFeedback('');
              onChange?.({
                latitude: null,
                longitude: null,
                geocodePrecision: 'municipio'
              });
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[#A1A1AA] hover:text-[#FB7185] hover:bg-[#221216] rounded-lg text-[11px] transition ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Resetar
          </button>
        )}
      </div>

      <div
        ref={mapContainerRef}
        className="w-full h-52 sm:h-60 rounded-lg overflow-hidden border border-[#27282E] bg-[#141518] z-0"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[10px] text-[#71717A] mb-1">Latitude (WGS84)</label>
          <input
            type="number"
            step="0.000001"
            value={hasValidCoord ? latitude : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange?.({ latitude: null, longitude, geocodePrecision: 'municipio' });
                return;
              }
              const parsed = Number(raw);
              onChange?.({
                latitude: Number.isFinite(parsed) ? parsed : null,
                longitude,
                geocodePrecision: 'exata'
              });
            }}
            placeholder={matchedCity ? String(matchedCity.lat) : '-2.53073'}
            className="w-full bg-[#141518] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#71717A] mb-1">Longitude (WGS84)</label>
          <input
            type="number"
            step="0.000001"
            value={hasValidCoord ? longitude : ''}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                onChange?.({ latitude, longitude: null, geocodePrecision: 'municipio' });
                return;
              }
              const parsed = Number(raw);
              onChange?.({
                latitude,
                longitude: Number.isFinite(parsed) ? parsed : null,
                geocodePrecision: 'exata'
              });
            }}
            placeholder={matchedCity ? String(matchedCity.lng) : '-44.3068'}
            className="w-full bg-[#141518] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
          />
        </div>
      </div>

      {feedback && (
        <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
          {feedback}
        </p>
      )}
    </div>
  );
}
