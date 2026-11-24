import { describe, it, expect, beforeEach } from 'vitest';
import { calculateInspectionSummary, calculateTopicBreakdown } from '../data/emserhChecklistData';
import {
  calculateAdherenceLevel,
  calculateConformityIndex,
  suggestMaturityLevel,
  summarizeDeviationsByClass,
  getReportMetaByDiscipline,
  formatDeviationClassLabel,
  getPhotoSectionsForReport,
  buildDefaultConclusionText
} from '../data/reportTemplateData';
import { ReportService, buildPublicReportUrl } from '../supabase/reportService';

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

describe('Checklist & Regras de Negócio de Relatórios', () => {
  beforeEach(() => {
    globalThis.localStorage = createMemoryStorage();
    globalThis.window = { location: { origin: 'https://kivo.app' } };
  });

  it('calcula resumo de checklist desconsiderando itens N/A', () => {
    const checklist = [
      { id: '1', number: 1, topic: 'Gestão de Resíduos', status: 'sim' },
      { id: '2', number: 2, topic: 'Gestão de Resíduos', status: 'nao', classification: 'Crítico', observation: 'Falta tampa' },
      { id: '3', number: 3, topic: 'Água', status: 'na' },
      { id: '4', number: 4, topic: 'Água', status: null }
    ];
    const summary = calculateInspectionSummary(checklist);
    expect(summary.totalAvaliados).toBe(2);
    expect(summary.totalSim).toBe(1);
    expect(summary.totalNao).toBe(1);
    expect(summary.totalNA).toBe(1);
    expect(summary.percentualConformidade).toBe(50);
    expect(summary.desviosCount).toBe(1);

    const breakdown = calculateTopicBreakdown(checklist);
    expect(breakdown['Gestão de Resíduos'].percent).toBe(50);
    expect(breakdown['Água'].na).toBe(1);
  });

  it('calcula índice de conformidade, aderência e maturidade conforme Tabela 02', () => {
    expect(calculateConformityIndex(19, 20)).toBe(95);
    expect(calculateConformityIndex(0, 0)).toBe(0);
    expect(calculateAdherenceLevel(69.9)).toBe('Baixa Aderência');
    expect(calculateAdherenceLevel(70)).toBe('Média Aderência');
    expect(calculateAdherenceLevel(85)).toBe('Média Aderência');
    expect(calculateAdherenceLevel(85.1)).toBe('Alta Aderência');

    expect(suggestMaturityLevel([])).toBe('Consolidado');
    expect(
      suggestMaturityLevel([{ classificacao: 'Desvio Pontual', status: 'Em Aberto' }])
    ).toBe('Em Desenvolvimento');
    expect(
      suggestMaturityLevel([
        { classificacao: 'Não Conformidade Ambiental', severidadeNc: 'Maior', status: 'Em Aberto' }
      ])
    ).toBe('Inicial');
    expect(
      suggestMaturityLevel([
        { classificacao: 'Não Conformidade Ambiental', severidadeNc: 'Maior', status: 'Concluído' }
      ])
    ).toBe('Em Desenvolvimento');
  });

  it('importa dados do checklist ambiental no buildFromOrder e preserva edições no syncFromOrder', () => {
    const order = {
      id: 'OS-2026-ENV1',
      discipline: 'meio_ambiente',
      clientName: 'EMSERH',
      hospitalName: 'Hospital Regional',
      municipio: 'São Luís',
      regional: 'Metropolitana',
      scheduledDate: '2026-11-24',
      completedAt: '2026-11-24T14:30:00Z',
      technicianName: 'Ana Silva',
      checklist: [
        {
          id: 'item-1',
          number: 1,
          topic: 'Gestão de Resíduos',
          question: 'Segregação adequada?',
          status: 'sim',
          evidenceUrl: 'https://cdn.example.com/foto1.jpg'
        },
        {
          id: 'item-2',
          number: 2,
          topic: 'Gestão de Resíduos',
          question: 'Coletores identificados?',
          status: 'nao',
          classification: 'Crítico',
          responsible: 'Manutenção',
          deadline: '2026-12-01',
          observation: 'Coletores sem etiqueta',
          actionStatus: 'Em Andamento',
          resolutionNote: 'Compra solicitada',
          evidenceUrl: 'https://cdn.example.com/foto2.jpg',
          afterPhotoUrl: 'https://cdn.example.com/after2.jpg'
        }
      ]
    };

    const built = ReportService.buildFromOrder(order, { name: 'Ana Silva' });
    expect(built.discipline).toBe('meio_ambiente');
    expect(built.itensAvaliados).toBe(2);
    expect(built.conformidades).toBe(1);
    expect(built.naoConformidades).toBe(1);
    expect(built.desvios).toHaveLength(1);
    expect(built.desvios[0].status).toBe('Em Andamento');
    expect(built.desvios[0].tratativa).toContain('Compra solicitada');
    expect(built.desvios[0].depoisFotoUrl).toBe('https://cdn.example.com/after2.jpg');
    expect(built.desempenhoTematico.length).toBeGreaterThan(0);

    // Slot 1 recebeu foto do item #1; item #2 (sem slot fixo) virou extra na seção Gestão de Resíduos
    const slot1 = built.registrosFotograficos.find((f) => f.ordem === 1);
    const extra2 = built.registrosFotograficos.find((f) => f.checklistItemNumber === 2);
    expect(slot1.fotoUrl).toBe('https://cdn.example.com/foto1.jpg');
    expect(extra2.fotoUrl).toBe('https://cdn.example.com/foto2.jpg');
    expect(extra2.secao).toBe('Gestão de Resíduos');

    // Simular edição manual de tratativa/conclusão e re-sincronizar
    const customized = {
      ...built,
      conclusaoTexto: 'Texto personalizado pelo auditor.',
      desvios: [
        ...built.desvios,
        { numero: 2, descricao: 'Desvio manual adicionado', classificacao: 'Desvio Pontual', status: 'Em Aberto' }
      ]
    };
    const synced = ReportService.syncFromOrder(customized, order, { name: 'Ana Silva' });
    expect(synced.conclusaoTexto).toBe('Texto personalizado pelo auditor.');
    expect(synced.desvios).toHaveLength(2);
    expect(summarizeDeviationsByClass(synced.desvios).desviosPlanoAcao).toBe(1);
  });

  it('suporta vistorias SST com blocos dinâmicos por NR, rótulos adaptados e URL pública ?laudo=', () => {
    const sstOrder = {
      id: 'OS-2026-SST1',
      discipline: 'seguranca_trabalho',
      clientName: 'Fábrica Norte',
      hospitalName: 'Planta Industrial A',
      municipio: 'Imperatriz',
      regional: 'Sul',
      scheduledDate: '2026-11-24',
      checklist: [
        {
          id: 'sst-1',
          number: 1,
          topic: 'NR-06 — EPIs',
          nrCode: 'NR-06',
          question: 'Uso de EPIs válidos?',
          status: 'nao',
          classification: 'Grave',
          observation: 'Falta protetor auricular',
          evidenceUrl: 'https://cdn.example.com/epi.jpg'
        },
        {
          id: 'sst-2',
          number: 2,
          topic: 'NR-23 — Incêndio',
          nrCode: 'NR-23',
          question: 'Extintores desobstruídos?',
          status: 'sim'
        }
      ]
    };

    const sstReport = ReportService.buildFromOrder(sstOrder, { name: 'Carlos RT' });
    expect(sstReport.discipline).toBe('seguranca_trabalho');
    expect(getReportMetaByDiscipline('seguranca_trabalho').title).toContain('SEGURANÇA DO TRABALHO');
    expect(formatDeviationClassLabel('Não Conformidade Ambiental', 'seguranca_trabalho')).toBe('Não Conformidade SST');
    expect(getPhotoSectionsForReport(sstReport)).toEqual(['NR-06 — EPIs']);
    expect(sstReport.registrosFotograficos).toHaveLength(1);
    expect(sstReport.conclusaoTexto).toContain('segurança do trabalho');

    const url = buildPublicReportUrl('a13d72a3-2207-4d7c-9caf-0cdb549b3767');
    expect(url).toBe('https://kivo.app/?laudo=a13d72a3-2207-4d7c-9caf-0cdb549b3767');

    const conclusion = buildDefaultConclusionText({
      discipline: 'seguranca_trabalho',
      indiceConformidade: 90,
      nivelAderencia: 'Alta Aderência',
      nivelMaturidade: 'Em Desenvolvimento'
    });
    expect(conclusion).toContain('Alta');
    expect(conclusion).toContain('Segurança e Saúde no Trabalho');
  });
});
