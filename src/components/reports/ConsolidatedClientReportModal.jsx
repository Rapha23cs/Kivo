import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Building2, BarChart3, ShieldAlert } from 'lucide-react';
import { calculateInspectionSummary } from '../../data/emserhChecklistData';
import { getDisciplineMeta } from '../../data/workflowsConfig';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

export default function ConsolidatedClientReportModal({
  isOpen,
  onClose,
  clients = [],
  orders = [],
  reports = [],
  userProfile = null
}) {
  const availableClients = useMemo(() => {
    const names = new Set();
    clients.forEach((c) => c?.nome && names.add(c.nome));
    orders.forEach((o) => o?.clientName && names.add(o.clientName));
    reports.forEach((r) => r?.clienteNome && names.add(r.clienteNome));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [clients, orders, reports]);

  const [selectedClient, setSelectedClient] = useState(availableClients[0] || '');
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');
  const [periodMonth, setPeriodMonth] = useState(''); // '' = Todos ou 'YYYY-MM'

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;
    document.body.classList.add('kivo-has-print-modal');
    return () => {
      document.body.classList.remove('kivo-has-print-modal');
    };
  }, [isOpen]);

  const activeClientName = selectedClient || availableClients[0] || 'Todos os Clientes';
  const clientRecord = clients.find(
    (c) => (c.nome || '').trim().toLowerCase() === activeClientName.trim().toLowerCase()
  );

  const filteredOrders = orders.filter((ord) => {
    const sameClient =
      !selectedClient || (ord.clientName || '').toLowerCase() === selectedClient.toLowerCase();
    const sameDisc =
      disciplineFilter === 'ALL' || (ord.discipline || 'meio_ambiente') === disciplineFilter;
    const sameMonth =
      !periodMonth || String(ord.scheduledDate || ord.createdAt || '').startsWith(periodMonth);
    return sameClient && sameDisc && sameMonth;
  });

  const unitRows = useMemo(() => {
    const map = new Map();
    filteredOrders.forEach((ord) => {
      const unitKey = ord.hospitalName || 'Unidade';
      const s = calculateInspectionSummary(ord.checklist || []);
      const existing = map.get(unitKey) || {
        unidade: unitKey,
        regional: ord.regional || '',
        municipio: ord.municipio || '',
        vistorias: 0,
        avaliados: 0,
        conformes: 0,
        desvios: 0,
        baixados: 0,
        criticos: 0,
        ultimaData: ''
      };
      const crit = (s.desvios || []).filter(
        (d) => d.classification === 'Crítico' || d.classification === 'Grave'
      ).length;
      const done = (s.desvios || []).filter((d) => d.actionStatus === 'Concluído').length;

      existing.vistorias += 1;
      existing.avaliados += s.totalAvaliados;
      existing.conformes += s.totalSim;
      existing.desvios += s.desviosCount;
      existing.baixados += done;
      existing.criticos += crit;
      if (!existing.ultimaData || String(ord.scheduledDate) > existing.ultimaData) {
        existing.ultimaData = ord.scheduledDate || '';
      }
      map.set(unitKey, existing);
    });

    return Array.from(map.values())
      .map((u) => ({
        ...u,
        indice: u.avaliados > 0 ? Math.round((u.conformes / u.avaliados) * 100) : 0
      }))
      .sort((a, b) => a.indice - b.indice || b.desvios - a.desvios);
  }, [filteredOrders]);

  const totals = useMemo(() => {
    const totalAval = unitRows.reduce((acc, u) => acc + u.avaliados, 0);
    const totalConf = unitRows.reduce((acc, u) => acc + u.conformes, 0);
    const totalDesv = unitRows.reduce((acc, u) => acc + u.desvios, 0);
    const totalBaix = unitRows.reduce((acc, u) => acc + u.baixados, 0);
    const totalCrit = unitRows.reduce((acc, u) => acc + u.criticos, 0);
    return {
      unidades: unitRows.length,
      vistorias: filteredOrders.length,
      indiceGeral: totalAval > 0 ? Math.round((totalConf / totalAval) * 100) : 0,
      desvios: totalDesv,
      baixados: totalBaix,
      criticos: totalCrit
    };
  }, [unitRows, filteredOrders.length]);

  const topCriticalDeviations = useMemo(() => {
    const list = [];
    filteredOrders.forEach((ord) => {
      (ord.checklist || []).forEach((it) => {
        if (
          (it.status === 'nao' || it.status === 'nao_conforme') &&
          it.actionStatus !== 'Concluído'
        ) {
          list.push({
            orderCode: ord.id,
            unidade: ord.hospitalName,
            discipline: ord.discipline || 'meio_ambiente',
            number: it.number,
            classification: it.classification || 'Médio',
            question: it.question,
            observation: it.observation,
            deadline: it.deadline
          });
        }
      });
    });
    const rank = { Crítico: 4, Grave: 3, Médio: 2, Leve: 1 };
    return list.sort((a, b) => (rank[b.classification] || 0) - (rank[a.classification] || 0)).slice(0, 12);
  }, [filteredOrders]);

  if (!isOpen) return null;

  const content = (
    <div className="kivo-print-modal-root fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="kivo-print-modal-card bg-white text-slate-900 w-full max-w-5xl rounded-none sm:rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[100dvh] sm:max-h-[94dvh] flex flex-col">
        {/* Toolbar de Filtros + Impressão (oculta na impressão) */}
        <div className="no-print bg-[#111214] text-[#F4F4F5] px-4 sm:px-6 py-3.5 border-b border-[#1F2024] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm block leading-tight">
                Relatório Gerencial Consolidado por Rede / Cliente
              </span>
              <span className="text-[11px] text-[#71717A]">
                Comparativo multi-unidade para diretoria e acompanhamento executivo
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
            >
              <option value="">Todos os Clientes</option>
              {availableClients.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
            >
              <option value="ALL">Meio Ambiente + SST</option>
              <option value="meio_ambiente">Meio Ambiente</option>
              <option value="seguranca_trabalho">Segurança do Trabalho</option>
            </select>

            <input
              type="month"
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              title="Filtrar por mês (vazio = todo período)"
              className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[#F4F4F5] font-mono focus:outline-none focus:border-[#2EB88A]"
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Consolidado */}
        <div className="kivo-print-scroll p-6 sm:p-10 overflow-y-auto space-y-8 bg-white print:p-4 text-xs">
          {/* Cabeçalho */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="Logo Kivo" className="w-10 h-10 rounded-lg" />
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                  RELATÓRIO GERENCIAL CONSOLIDADO MULTI-UNIDADE
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Cliente: <strong className="text-slate-900">{activeClientName}</strong> • Emissão:{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {clientRecord?.logoUrl && (
              <img
                src={sanitizeMediaUrl(clientRecord.logoUrl)}
                alt={activeClientName}
                className="h-10 w-auto max-w-[130px] object-contain border border-slate-200 rounded px-2 py-1"
              />
            )}
          </div>

          {/* KPIs Gerais da Rede */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Unidades</span>
              <span className="text-xl font-black font-mono text-slate-900">{totals.unidades}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Vistorias</span>
              <span className="text-xl font-black font-mono text-slate-900">{totals.vistorias}</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-[10px] uppercase text-emerald-700 font-semibold block">Conformidade Rede</span>
              <span className="text-xl font-black font-mono text-emerald-800">{totals.indiceGeral}%</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <span className="text-[10px] uppercase text-rose-700 font-semibold block">Desvios (Crít./Grav.)</span>
              <span className="text-xl font-black font-mono text-rose-800">
                {totals.desvios} ({totals.criticos})
              </span>
            </div>
            <div className="bg-slate-900 text-white rounded-xl p-3">
              <span className="text-[10px] uppercase text-slate-300 font-semibold block">Ações Baixadas</span>
              <span className="text-xl font-black font-mono text-emerald-400">
                {totals.baixados}/{totals.desvios}
              </span>
            </div>
          </div>

          {/* Comparativo por Unidade */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" />
              1. Ranking de Desempenho por Unidade ({unitRows.length})
            </h2>

            {unitRows.length === 0 ? (
              <p className="p-6 text-center text-slate-500 border border-slate-200 rounded-lg bg-slate-50">
                Nenhuma vistoria encontrada para os filtros selecionados.
              </p>
            ) : (
              <table className="w-full text-left border border-slate-300 border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2 border border-slate-300">Unidade</th>
                    <th className="p-2 border border-slate-300">Município / Regional</th>
                    <th className="p-2 border border-slate-300 text-center">Vistorias</th>
                    <th className="p-2 border border-slate-300 text-center">Itens Aval.</th>
                    <th className="p-2 border border-slate-300 text-center">Desvios (Baixados)</th>
                    <th className="p-2 border border-slate-300 text-center">Índice Geral</th>
                  </tr>
                </thead>
                <tbody>
                  {unitRows.map((u) => (
                    <tr key={u.unidade} className="even:bg-slate-50">
                      <td className="p-2 border border-slate-300 font-semibold text-slate-900">{u.unidade}</td>
                      <td className="p-2 border border-slate-300 text-slate-600">
                        {u.municipio} {u.regional ? `• ${u.regional}` : ''}
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono">{u.vistorias}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono">{u.avaliados}</td>
                      <td className="p-2 border border-slate-300 text-center font-mono">
                        {u.desvios} ({u.baixados} ok)
                      </td>
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">
                        <span className={u.indice >= 80 ? 'text-emerald-700' : u.indice >= 60 ? 'text-amber-700' : 'text-rose-700'}>
                          {u.indice}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Top Desvios Pendentes da Rede */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-rose-600 pl-2.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              2. Principais Pendências em Aberto na Rede ({topCriticalDeviations.length})
            </h2>

            {topCriticalDeviations.length === 0 ? (
              <p className="p-4 text-slate-500 border border-slate-200 rounded-lg bg-slate-50 italic">
                Nenhuma pendência em aberto para este recorte.
              </p>
            ) : (
              <div className="space-y-2">
                {topCriticalDeviations.map((d, i) => (
                  <div key={`${d.orderCode}-${d.number}-${i}`} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">
                        {d.unidade} • {d.orderCode} #{d.number} ({getDisciplineMeta(d.discipline).shortLabel})
                      </span>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {d.classification} • Prazo: {d.deadline || 'A definir'}
                      </span>
                    </div>
                    <p className="text-slate-700">{d.observation || d.question}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Kivo • Relatório Consolidado ({userProfile?.name || 'RT'})</span>
            <span>{userProfile?.registry || ''}</span>
          </footer>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
}
