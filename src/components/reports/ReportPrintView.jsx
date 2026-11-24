import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  FileBarChart2,
  Building2,
  BookOpen,
  Info,
  Layers
} from 'lucide-react';
import {
  REPORT_RESULT_GUIDELINES,
  MATURITY_LEVELS,
  ADHERENCE_RULES,
  getReportMetaByDiscipline,
  formatDeviationClassLabel,
  getPhotoSectionsForReport,
  calculateAdherenceLevel
} from '../../data/reportTemplateData';
import { calculateTopicBreakdown } from '../../data/emserhChecklistData';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';
import QrCodeSvg from '../common/QrCodeSvg';

export default function ReportPrintView({
  report,
  linkedOrder = null,
  clientLogoUrl = '',
  userProfile = null,
  onClose
}) {
  const [showCover, setShowCover] = useState(false);
  const [showTopicBreakdown, setShowTopicBreakdown] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    if (!report || typeof document === 'undefined') return undefined;
    document.body.classList.add('kivo-has-print-modal');
    return () => {
      document.body.classList.remove('kivo-has-print-modal');
    };
  }, [report]);

  if (!report) return null;

  const discipline = report.discipline || linkedOrder?.discipline || 'meio_ambiente';
  const reportMeta = getReportMetaByDiscipline(discipline);
  const aderencia = report.nivelAderencia || calculateAdherenceLevel(report.indiceConformidade);

  const formattedDate = report.dataHora
    ? new Date(report.dataHora).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Não informada';

  const topicBreakdown = useMemo(() => {
    if (Array.isArray(report.desempenhoTematico) && report.desempenhoTematico.length > 0) {
      return report.desempenhoTematico;
    }
    if (linkedOrder?.checklist?.length) {
      return Object.values(calculateTopicBreakdown(linkedOrder.checklist));
    }
    return [];
  }, [report.desempenhoTematico, linkedOrder]);

  const activePhotos = (report.registrosFotograficos || []).filter(
    (f) => f.incluirNoRelatorio !== false && Boolean(f.fotoUrl)
  );

  const reportSections = getPhotoSectionsForReport(report);
  const photosBySection = reportSections
    .map((sec) => ({
      section: sec,
      items: activePhotos.filter((f) => f.secao === sec)
    }))
    .filter((g) => g.items.length > 0);

  const content = (
    <div className="kivo-print-modal-root fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="kivo-print-modal-card bg-white text-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Barra Superior (Oculta na Impressão) */}
        <div className="no-print bg-[#111214] text-[#F4F4F5] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2024]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <FileBarChart2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-sm block leading-tight">{reportMeta.shortTitle} (A4)</span>
              <span className="text-[10px] text-[#34D399] font-mono">{report.codigoRelatorio}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowCover((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition ${
                showCover
                  ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
                  : 'bg-[#1C1D22] text-[#A1A1AA] border-[#2D2F36]'
              }`}
              title="Exibir ou ocultar capa executiva adicional na página 1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Capa Extra</span>
            </button>

            {topicBreakdown.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTopicBreakdown((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition ${
                  showTopicBreakdown
                    ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
                    : 'bg-[#1C1D22] text-[#A1A1AA] border-[#2D2F36]'
                }`}
                title="Incluir painel de desempenho por temática importado do checklist"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Temáticas Checklist</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowGuidelines((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition ${
                showGuidelines
                  ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
                  : 'bg-[#1C1D22] text-[#A1A1AA] border-[#2D2F36]'
              }`}
              title="Incluir tabelas de critérios e diretrizes metodológicas"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Tabelas 01/02/03</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir / Salvar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Executivo A4 */}
        <div className="kivo-print-scroll p-6 sm:p-10 overflow-y-auto space-y-8 text-sm bg-white print:p-4">
          {/* CAPA EXECUTIVA OPCIONAL (PÁGINA 1) */}
          {showCover && (
            <section className="kivo-print-break-after rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 p-6 sm:p-10 space-y-6">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-center gap-3">
                  <img src="/icon.svg" alt="Logo Kivo" className="w-11 h-11 rounded-xl shrink-0" />
                  <div>
                    <span className="text-base font-black tracking-tight text-slate-900 block leading-none">KIVO</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 font-semibold">
                      {reportMeta.documentSubtitle}
                    </span>
                  </div>
                </div>
                {clientLogoUrl && (
                  <img
                    src={sanitizeMediaUrl(clientLogoUrl)}
                    alt={`Logo ${report.clienteNome || 'Cliente'}`}
                    className="h-11 w-auto max-w-[140px] object-contain bg-white border border-slate-200 rounded-lg px-2 py-1"
                  />
                )}
              </div>

              <div className="space-y-2 py-2">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                  {reportMeta.shortTitle}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  {report.unidade || 'Unidade Auditada'}
                </h2>
                <p className="text-sm font-medium text-slate-600">
                  {report.clienteNome || 'Cliente'} • {report.cidade || 'Município não informado'}
                  {report.regional ? ` • ${report.regional}` : ''}
                </p>
              </div>

              {report.fachadaUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={sanitizeMediaUrl(report.fachadaUrl)}
                    alt="Fachada da Unidade"
                    className="w-full h-56 sm:h-64 object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Código</span>
                  <span className="font-mono font-bold text-slate-900">{report.codigoRelatorio}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Índice Geral</span>
                  <span className="font-mono font-black text-emerald-700 text-base">
                    {Number(report.indiceConformidade || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Aderência</span>
                  <span className="font-bold text-slate-900">{aderencia}</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] uppercase text-slate-500 font-semibold block">Emissão</span>
                  <span className="font-mono font-semibold text-slate-900">{formattedDate}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Responsável Técnico: <strong className="text-slate-900">{report.responsavel || userProfile?.name || 'Auditor Técnico'}</strong>
                </span>
                <span className="font-mono text-[11px] uppercase font-bold text-emerald-700">{report.status}</span>
              </div>
            </section>
          )}

          {/* Cabeçalho Institucional */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img src="/icon.svg" alt="Logo Kivo" className="w-10 h-10 rounded-lg shrink-0" />
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  {reportMeta.title}
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Kivo • Cliente: <strong className="text-slate-900">{report.clienteNome || 'Não informado'}</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {clientLogoUrl && (
                <img
                  src={sanitizeMediaUrl(clientLogoUrl)}
                  alt={`Logo ${report.clienteNome || 'Cliente'}`}
                  className="h-9 w-auto max-w-[110px] object-contain border border-slate-200 rounded px-1.5 py-0.5 bg-white"
                />
              )}
              <div className="text-left sm:text-right text-xs text-slate-600 font-mono space-y-0.5">
                <p className="font-bold text-slate-900 text-sm">{report.codigoRelatorio}</p>
                <p>Data/Hora: {formattedDate}</p>
                <p className="font-sans text-[11px] uppercase font-semibold text-emerald-700">{report.status}</p>
              </div>
            </div>
          </div>

          {/* 1. Dados da Unidade, Fachada e 8 Resultados */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5">
              1. Dados da Unidade e Resultados da Inspeção
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 grid grid-cols-2 gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Unidade</span>
                  <span className="font-bold text-slate-900">{report.unidade || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Data / Hora</span>
                  <span className="font-mono font-semibold text-slate-900">{formattedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Cidade</span>
                  <span className="font-semibold text-slate-800">{report.cidade || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Regional</span>
                  <span className="font-semibold text-slate-800">{report.regional || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Tipo de Inspeção</span>
                  <span className="font-semibold text-slate-800">{report.tipoInspecao || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Responsável</span>
                  <span className="font-semibold text-slate-800">{report.responsavel || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Gerência</span>
                  <span className="font-semibold text-slate-800">{report.gerencia || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Objetivo da Inspeção</span>
                  <span className="text-slate-700">{report.objetivo || '—'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 flex flex-col items-center justify-center min-h-[160px]">
                {report.fachadaUrl ? (
                  <>
                    <img
                      src={sanitizeMediaUrl(report.fachadaUrl)}
                      alt="Fachada da Unidade"
                      className="w-full h-36 object-cover rounded-lg border border-slate-200"
                    />
                    <span className="text-[10px] text-slate-500 mt-1.5 font-medium">Imagem da Fachada da Unidade</span>
                  </>
                ) : (
                  <div className="text-center text-slate-400 space-y-1">
                    <Building2 className="w-7 h-7 mx-auto opacity-60" />
                    <span className="text-[11px] block">Imagem da Fachada da Unidade</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Itens Avaliados</span>
                <span className="text-xl font-black font-mono text-slate-900">{report.itensAvaliados}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-emerald-700 font-semibold block">Conformidades</span>
                <span className="text-xl font-black font-mono text-emerald-800">{report.conformidades}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Desvios (Plano de Ação)</span>
                <span className="text-xl font-black font-mono text-slate-900">{report.desviosPlanoAcao}</span>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-rose-700 font-semibold block">{reportMeta.ncLabel}</span>
                <span className="text-xl font-black font-mono text-rose-800">{report.naoConformidades}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">{reportMeta.occurrenceLabel}</span>
                <span className="text-xl font-black font-mono text-slate-900">{report.ocorrenciasAmbientais}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Notificações</span>
                <span className="text-xl font-black font-mono text-slate-900">{report.notificacoes}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Interdições</span>
                <span className="text-xl font-black font-mono text-slate-900">{report.interdicoes}</span>
              </div>
              <div className="bg-slate-900 text-white rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-300 font-semibold block">Índice Geral (%)</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {Number(report.indiceConformidade || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </section>

          {/* Desempenho por Temática (Checklist) */}
          {showTopicBreakdown && topicBreakdown.length > 0 && (
            <section className="space-y-3 break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5">
                Desempenho por Temática do Checklist ({topicBreakdown.length} Áreas)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {topicBreakdown.map((t) => (
                  <div key={t.topic} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate" title={t.topic}>{t.topic}</span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          t.percent >= 85
                            ? 'text-emerald-700'
                            : t.percent >= 70
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {t.percent}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          t.percent >= 85 ? 'bg-emerald-600' : t.percent >= 70 ? 'bg-amber-500' : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, t.percent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-600">
                      <span>Sim: {t.sim}</span>
                      <span>Não: {t.nao}</span>
                      <span>N/A: {t.na}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Desvios */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-rose-600 pl-2.5">
              2. Desvios e Oportunidades de Melhoria ({(report.desvios || []).length})
            </h2>

            {(report.desvios || []).length === 0 ? (
              <div className="p-4 border border-slate-200 rounded-lg text-xs text-slate-500 italic bg-slate-50">
                Nenhum desvio ou oportunidade de melhoria registrado até o encerramento deste relatório.
              </div>
            ) : (
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border border-slate-300 w-10 text-center">Nº</th>
                    <th className="p-2 border border-slate-300">Descrição</th>
                    <th className="p-2 border border-slate-300">Classificação</th>
                    <th className="p-2 border border-slate-300">Tratativa</th>
                    <th className="p-2 border border-slate-300">Responsável</th>
                    <th className="p-2 border border-slate-300">Prazo</th>
                    <th className="p-2 border border-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.desvios.map((d, idx) => (
                    <tr key={idx} className="even:bg-slate-50 align-top">
                      <td className="p-2 border border-slate-300 text-center font-mono font-bold">{idx + 1}</td>
                      <td className="p-2 border border-slate-300 text-slate-800">{d.descricao}</td>
                      <td className="p-2 border border-slate-300 font-semibold text-slate-900">
                        {formatDeviationClassLabel(d.classificacao, discipline)}
                        {d.classificacao === 'Não Conformidade Ambiental' && d.severidadeNc
                          ? ` (${d.severidadeNc})`
                          : ''}
                      </td>
                      <td className="p-2 border border-slate-300 text-slate-700">{d.tratativa || '—'}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{d.responsavel || '—'}</td>
                      <td className="p-2 border border-slate-300 font-mono text-slate-700">{d.prazo || '—'}</td>
                      <td className="p-2 border border-slate-300 font-semibold">{d.status || 'Em Aberto'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* 3. Registro Fotográfico */}
          <section className="space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5">
              3. Registro Fotográfico ({activePhotos.length} evidências anexadas)
            </h2>

            {photosBySection.length === 0 ? (
              <div className="p-4 border border-slate-200 rounded-lg text-xs text-slate-500 italic bg-slate-50">
                Nenhuma evidência fotográfica anexada a este relatório.
              </div>
            ) : (
              photosBySection.map((group) => (
                <div key={group.section} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide bg-slate-900 text-white px-3 py-1.5 rounded">
                    Registro Fotográfico — {group.section}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {group.items.map((foto) => (
                      <div key={foto.ordem} className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 break-inside-avoid">
                        <img
                          src={sanitizeMediaUrl(foto.fotoUrl)}
                          alt={foto.legenda}
                          className="w-full h-48 object-cover rounded-lg border border-slate-200 bg-white"
                        />
                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                          {foto.ordem}. {foto.legenda}
                        </p>
                        {foto.observacao && <p className="text-[11px] text-slate-600">{foto.observacao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* 4. Conclusão */}
          <section className="space-y-3 break-inside-avoid border-t-2 border-slate-200 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-900 pl-2.5">
              4. Conclusão da Inspeção
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                  {reportMeta.adherenceShortTitle}
                </span>
                <span className="font-bold text-sm text-slate-900">{aderencia}</span>
                <span className="text-[11px] text-slate-500 block">
                  Índice apurado: {Number(report.indiceConformidade || 0).toFixed(1)}%
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Nível de Maturidade</span>
                <span className="font-bold text-sm text-slate-900">{report.nivelMaturidade || 'Em Desenvolvimento'}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
              {report.conclusaoTexto || 'Conclusão técnica não redigida.'}
            </div>
          </section>

          {/* Diretrizes Metodológicas Opcionais (Tabelas 01 e 02) */}
          {showGuidelines && (
            <section className="space-y-4 break-inside-avoid border-t-2 border-slate-200 pt-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-600 pl-2.5">
                Anexo — Diretrizes e Critérios de Classificação (Tabelas 01 e 02)
              </h2>

              <table className="w-full text-left text-xs border-collapse border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2 border border-slate-300 w-56">Indicador (Tabela 01)</th>
                    <th className="p-2 border border-slate-300">Critério de Preenchimento</th>
                  </tr>
                </thead>
                <tbody>
                  {REPORT_RESULT_GUIDELINES.map((g) => (
                    <tr key={g.key} className="even:bg-slate-50">
                      <td className="p-2 border border-slate-300 font-bold text-slate-900">{g.label}</td>
                      <td className="p-2 border border-slate-300 text-slate-700">{g.criterion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2 border border-slate-300">Índice de Conformidade</th>
                      <th className="p-2 border border-slate-300">Nível de Aderência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ADHERENCE_RULES.map((r) => (
                      <tr key={r.label} className="even:bg-slate-50">
                        <td className="p-2 border border-slate-300 font-mono font-bold">{r.range}</td>
                        <td className="p-2 border border-slate-300 font-semibold">{r.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table className="w-full text-left border-collapse border border-slate-300">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-2 border border-slate-300">Nível de Maturidade</th>
                      <th className="p-2 border border-slate-300">Critério</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MATURITY_LEVELS.map((m) => (
                      <tr key={m.value} className="even:bg-slate-50">
                        <td className="p-2 border border-slate-300 font-bold">{m.label}</td>
                        <td className="p-2 border border-slate-300 text-slate-700">{m.criterion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Assinaturas */}
          <section className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 break-inside-avoid text-center text-xs">
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
                  {report.responsavel || userProfile?.name || 'Responsável Técnico'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {userProfile?.registry || 'Auditor Técnico • RT'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="h-14" />
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-900">Gestor / Representante da Unidade</p>
                <p className="text-[11px] text-slate-500">{report.unidade || 'Unidade Auditada'}</p>
              </div>
            </div>
          </section>

          {report.publicEnabled && report.publicToken && typeof window !== 'undefined' ? (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                <p className="font-semibold text-slate-700">{reportMeta.shortTitle} • Gerado pelo sistema Kivo</p>
                <p>Validação digital online disponível em:</p>
                <p className="text-emerald-700 break-all">{`${window.location.origin}/laudo/${report.publicToken}`}</p>
              </div>
              <QrCodeSvg value={`${window.location.origin}/laudo/${report.publicToken}`} size={68} />
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
              {reportMeta.shortTitle} • Gerado pelo sistema Kivo
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
}
