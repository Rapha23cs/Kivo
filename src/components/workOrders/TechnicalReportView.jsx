import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { calculateInspectionSummary, calculateTopicBreakdown, EMSERH_TOPICS } from '../../data/emserhChecklistData';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

export default function TechnicalReportView({ order, userProfile, onClose }) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const summary = calculateInspectionSummary(order.checklist || []);
  const topicBreakdown = calculateTopicBreakdown(order.checklist || []);
  const reportCode = `RIA-${order.id}-${new Date(order.createdAt || Date.now()).getFullYear()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-[#111214] text-[#F4F4F5] px-6 py-3.5 flex items-center justify-between border-b border-[#1F2024]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <FileText className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-[#F4F4F5]">Espelho do Checklist de Inspeção</span>
            <span className="text-xs bg-[#0D0E10] px-2.5 py-0.5 rounded-lg text-[#34D399] font-mono border border-[#232429]">
              {reportCode}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 text-sm bg-white print:p-0">
          {/* Header Institucional Kivo / Cliente */}
          <div className="border-b-2 border-emerald-700 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <img src="/icon.svg" alt="Logo Kivo" className="w-10 h-10 rounded-xl shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-sans leading-none">
                    KIVO
                  </h1>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mt-0.5">
                    Cliente: {order.clientName || order.hospitalName}
                  </span>
                </div>
              </div>
              <p className="text-xs text-emerald-800 mt-2 font-bold uppercase tracking-wider">
                Relatório Técnico de Checklist Ambiental
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5 font-mono">
              <p className="font-bold text-slate-900 text-sm">{reportCode}</p>
              <p>Data de Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* 1. DADOS DA INSPEÇÃO (PRÉ-CHECKLIST) */}
          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-700" />
              1. Dados Cadastrais da Inspeção
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Unidade:</span>
                <span className="font-bold text-slate-900 text-sm">{order.hospitalName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Regional:</span>
                <span className="font-bold text-slate-900">{order.regional}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Município:</span>
                <span className="font-bold text-slate-900">{order.municipio}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Data da Inspeção:</span>
                <span className="font-bold text-slate-900 font-mono">{order.scheduledDate}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Responsável pela Inspeção:</span>
                <span className="font-bold text-slate-900">{order.technicianName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Tipo de Inspeção:</span>
                <span className="font-bold text-emerald-800 uppercase">{order.inspectionType || 'Programada'}</span>
              </div>
            </div>
          </div>

          {/* 2. RESUMO DA INSPEÇÃO */}
          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-700" />
              2. Resumo da Inspeção (Apuração Automática)
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div className="p-2 border-r border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase">Total Avaliados (Sim + Não)</span>
                <span className="text-xl font-bold font-mono text-slate-900">{summary.totalAvaliados}</span>
              </div>
              <div className="p-2 border-r border-slate-200">
                <span className="text-[10px] font-semibold text-emerald-700 block uppercase">Em Conformidade (Sim)</span>
                <span className="text-xl font-bold font-mono text-emerald-700">{summary.totalSim}</span>
              </div>
              <div className="p-2 border-r border-slate-200">
                <span className="text-[10px] font-semibold text-rose-700 block uppercase">Total de Desvios (Não)</span>
                <span className="text-xl font-bold font-mono text-rose-700">{summary.totalNao}</span>
              </div>
              <div className="p-2 border-r border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 block uppercase">Não Aplicável (N/A)</span>
                <span className="text-xl font-bold font-mono text-slate-700">{summary.totalNA}</span>
              </div>
              <div className="p-2">
                <span className="text-[10px] font-semibold text-emerald-800 block uppercase">% de Conformidade</span>
                <span className="text-2xl font-black font-mono text-emerald-700">{summary.percentualConformidade}%</span>
              </div>
            </div>
          </div>

          {/* 3. DESEMPENHO CONSOLIDADO POR TEMÁTICA */}
          <div>
            <h3 className="font-bold text-slate-900 text-xs mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-700" />
              3. Desempenho Consolidado por Temática (11 Áreas Avaliadas)
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Temática</th>
                    <th className="py-2 px-2 text-center">Itens</th>
                    <th className="py-2 px-2 text-center text-emerald-800">Conformes (Sim)</th>
                    <th className="py-2 px-2 text-center text-rose-700">Desvios (Não)</th>
                    <th className="py-2 px-2 text-center text-slate-500">N/A</th>
                    <th className="py-2 px-3 text-right">Índice Conformidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {EMSERH_TOPICS.map((topic, i) => {
                    const b = topicBreakdown[topic];
                    if (!b || b.total === 0) return null;

                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">
                          {i + 1}. {topic}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600">{b.total}</td>
                        <td className="py-2 px-2 text-center font-bold text-emerald-700">{b.sim}</td>
                        <td className={`py-2 px-2 text-center font-bold ${b.nao > 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-400'}`}>
                          {b.nao}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-500">{b.na}</td>
                        <td className="py-2 px-3 text-right font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded ${
                            b.percent >= 80 ? 'bg-emerald-100 text-emerald-800' : b.percent >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {b.percent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. MATRIZ DE DESVIOS IDENTIFICADOS (REGRA 6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                4. Matriz de Desvios Identificados e Prazos ({summary.desviosCount})
              </h3>
              <span className="text-[11px] text-slate-500 italic">Itens marcados como 'Não'</span>
            </div>

            {summary.desviosCount === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center text-xs text-emerald-900">
                ✓ Nenhum desvio identificado nesta inspeção.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
                {summary.desvios.map((desvio, idx) => (
                  <div key={idx} className="p-3.5 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-700 uppercase px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px]">
                            {desvio.classification || 'Médio'}
                          </span>
                          <span className="font-semibold text-slate-800">{desvio.topic}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 mt-1">{desvio.question || desvio.item}</h4>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 shrink-0">
                        Prazo: {desvio.deadline || 'A definir'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                      <p><strong>Descrição / Observação:</strong> {desvio.observation || 'Não especificada'}</p>
                      <p className="text-slate-600"><strong>Responsável:</strong> {desvio.responsible || 'Não informado'}</p>
                    </div>

                    {desvio.evidenceUrl && (
                      <div className="flex items-center gap-2 pt-1">
                        <img src={sanitizeMediaUrl(desvio.evidenceUrl)} alt="Evidência" className="w-20 h-14 object-cover rounded border border-slate-300" />
                        <span className="text-[11px] text-slate-500">Registro fotográfico anexado.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloco Formal de Assinaturas */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 break-inside-avoid text-center text-xs">
            <div className="space-y-1">
              <div className="h-14 flex items-end justify-center">
                {userProfile?.signatureUrl && (
                  <img
                    src={sanitizeMediaUrl(userProfile.signatureUrl)}
                    alt="Assinatura do Responsável Técnico"
                    className="max-h-12 max-w-[180px] object-contain"
                  />
                )}
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">
                  {order.technicianName || userProfile?.name || 'Auditor Técnico'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {userProfile?.registry || 'Responsável Técnico (RT)'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-14" />
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Gestor / Responsável da Unidade</p>
                <p className="text-[11px] text-slate-500">{order.hospitalName || 'Unidade Auditada'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-slate-400 font-mono">
            Espelho de checklist gerado pelo sistema Kivo • {order.clientName || order.hospitalName}.
          </div>
        </div>
      </div>
    </div>
  );
}
