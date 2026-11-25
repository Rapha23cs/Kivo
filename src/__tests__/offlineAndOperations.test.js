import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineStore } from '../offline/offlineStore';
import { OperationsService, computeNextScheduleDate, getExpiryStatus } from '../supabase/operationsService';
import { SyncEngine } from '../offline/syncEngine';
import { DataService } from '../supabase/dataService';
import {
  MARANHAO_MUNICIPALITIES,
  findMaranhaoMunicipality,
  isWithinMaranhaoBounds,
  resolveUnitCoordinates
} from '../data/maranhaoMunicipalities';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

describe('Fila Offline, Agenda Recorrente e Vencimentos SST', () => {
  beforeEach(async () => {
    globalThis.localStorage = createMemoryStorage();
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true
    });
    OperationsService.clearLocalCaches();
    await OfflineStore.clearAllDataCaches();
  });

  it('calcula próximas datas da agenda recorrente corretamente', () => {
    expect(computeNextScheduleDate('2026-01-10', 'Semanal')).toBe('2026-01-17');
    expect(computeNextScheduleDate('2026-01-10', 'Quinzenal')).toBe('2026-01-25');
    expect(computeNextScheduleDate('2026-01-10', 'Mensal')).toBe('2026-02-10');
    expect(computeNextScheduleDate('2026-01-10', 'Trimestral')).toBe('2026-04-10');
    expect(computeNextScheduleDate('2026-01-10', 'Anual')).toBe('2027-01-10');
  });

  it('classifica status de vencimento SST (vencido, hoje, alerta e em dia)', () => {
    const today = new Date();
    const fmt = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    expect(getExpiryStatus('').status).toBe('indefinido');
    expect(getExpiryStatus(fmt(-5)).status).toBe('vencido');
    expect(getExpiryStatus(fmt(0)).status).toBe('vence_hoje');
    expect(getExpiryStatus(fmt(10)).status).toBe('alerta_30');
    expect(getExpiryStatus(fmt(45)).status).toBe('alerta_60');
    expect(getExpiryStatus(fmt(120)).status).toBe('em_dia');
  });

  it('enfileira templates, agenda e itens SST no OfflineStore quando salvos offline', async () => {
    const tpls = await OperationsService.saveTemplate({
      nome: 'Checklist Caldeiras',
      disciplina: 'seguranca_trabalho',
      itens: [{ topic: 'NR-13', question: 'Válvula de segurança testada?' }]
    });
    expect(tpls).toHaveLength(1);

    const schedules = await OperationsService.saveSchedule({
      unidadeNome: 'Hospital Central',
      periodicidade: 'Mensal',
      proximaData: '2026-12-01'
    });
    expect(schedules).toHaveLength(1);

    const sst = await OperationsService.saveSstItem({
      unidadeNome: 'Hospital Central',
      categoria: 'Extintor de Incêndio',
      itemNome: 'Extintor CO2 Bloco A',
      dataValidade: '2027-03-01'
    });
    expect(sst).toHaveLength(1);

    const idx = OfflineStore.getPendingIndex();
    expect(idx.upsertTemplates).toHaveLength(1);
    expect(idx.upsertSchedules).toHaveLength(1);
    expect(idx.upsertSstItems).toHaveLength(1);
    expect(OfflineStore.getPendingCount()).toBe(3);

    // Excluir offline move de upsert para delete
    await OperationsService.deleteSchedule(schedules[0].id);
    expect(OfflineStore.getPendingIndex().upsertSchedules).toHaveLength(0);
    expect(OfflineStore.getPendingIndex().deleteSchedules).toHaveLength(1);
  });

  it('registra e limpa erros de diagnóstico de sincronização sem quebrar flushQueue offline', async () => {
    await OfflineStore.recordSyncError('order', 'OS-123', 'Falha de rede');
    expect(OfflineStore.getSyncErrors()).toHaveLength(1);
    expect(OfflineStore.getSyncErrors()[0].message).toBe('Falha de rede');

    OfflineStore.clearSyncError('order', 'OS-123');
    expect(OfflineStore.getSyncErrors()).toHaveLength(0);

    const res = await SyncEngine.flushQueue();
    expect(res.synced).toBe(0);
    expect(Array.isArray(res.templates)).toBe(true);
    expect(Array.isArray(res.schedules)).toBe(true);
    expect(Array.isArray(res.sstItems)).toBe(true);
  });

  it('cobre os 217 municípios do Maranhão e resolve coordenadas com fallback automático', async () => {
    expect(MARANHAO_MUNICIPALITIES).toHaveLength(217);
    expect(MARANHAO_MUNICIPALITIES.every((m) => isWithinMaranhaoBounds(m.lat, m.lng))).toBe(true);

    const saoLuis = findMaranhaoMunicipality('Sao Luis - MA');
    expect(saoLuis?.nome).toBe('São Luís');

    const approx = resolveUnitCoordinates({ municipio: 'Imperatriz' });
    expect(approx?.precision).toBe('municipio');
    expect(approx?.lat).toBeLessThan(0);

    const saved = await DataService.saveUnit({
      clienteNome: 'EMSERH',
      nome: 'Hospital Macrorregional',
      regional: 'Caxias',
      municipio: 'Caxias'
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].geocodePrecision).toBe('municipio');
    expect(isWithinMaranhaoBounds(saved[0].latitude, saved[0].longitude)).toBe(true);
  });
});
