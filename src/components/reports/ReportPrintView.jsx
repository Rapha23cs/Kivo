import React from 'react';
import { X, Printer, FileBarChart2, Building2 } from 'lucide-react';
import { PHOTO_SECTIONS, calculateAdherenceLevel } from '../../data/reportTemplateData';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';
import QrCodeSvg from '../common/QrCodeSvg';

export default function ReportPrintView({ report, onClose }) {
  if (!report) return null;

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

  const activePhotos = (report.registrosFotograficos || []).filter(
    (f) => f.incluirNoRelatorio !== false && Boolean(f.fotoUrl)
  );

  const photosBySection = PHOTO_SECTIONS.map((sec) => ({
    section: sec,
    items: activePhotos.filter((f) => f.secao === sec)
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Barra Superior (Oculta na Impressão) */}
        <div className="no-print bg-[#111214] text-[#F4F4F5] px-6 py-3.5 flex items-center justify-between border-b border-[#1F2024]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <FileBarChart2 className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm">Relatório de Inspeção Ambiental</span>
            <span className="text-xs bg-[#0D0E10] px-2.5 py-0.5 rounded-lg text-[#34D399] font-mono border border-[#232429]">
              {report.codigoRelatorio}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Corpo Imprimível */}
        <div className="p-8 sm:p-10 overflow-y-auto space-y-8 text-sm bg-white print:p-4">
          {/* CABEÇALHO DO RELATÓRIO */}
          <div className="border-b-2 border-emerald-700 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                K
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">
                  RELATÓRIO DE INSPEÇÃO AMBIENTAL
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-1">
                  Kivo • Cliente: <strong className="text-slate-900">{report.clienteNome || 'Não informado'}</strong>
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600 font-mono space-y-0.5">
              <p className="font-bold text-slate-900 text-sm">{report.codigoRelatorio}</p>
              <p>Data/Hora: {formattedDate}</p>
              <p className="font-sans text-[11px] uppercase font-semibold text-emerald-700">{report.status}</p>
            </div>
          </div>

          {/* SLIDE 1: DADOS GERAIS + FACHADA + 8 RESULTADOS DA INSPEÇÃO */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5">
              1. Dados da Unidade e Resultados da Inspeção
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tabela de Dados da Inspeção */}
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

              {/* Imagem da Fachada da Unidade */}
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

            {/* Tabela dos 8 Resultados */}
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
                <span className="text-[10px] uppercase text-rose-700 font-semibold block">Não Conformidades</span>
                <span className="text-xl font-black font-mono text-rose-800">{report.naoConformidades}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase text-slate-500 font-semibold block">Ocorrências Ambientais</span>
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

          {/* SLIDE 3: TABELA DE DESVIOS E OPORTUNIDADES DE MELHORIA */}
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
                        {d.classificacao}
                        {d.classificacao === 'Não Conformidade Ambiental' && d.severidadeNc ? ` (${d.severidadeNc})` : ''}
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

          {/* SLIDES 5-32: REGISTROS FOTOGRÁFICOS */}
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
                        {foto.observacao && (
                          <p className="text-[11px] text-slate-600">{foto.observacao}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* SLIDES 33-35: CONCLUSÃO DA INSPEÇÃO */}
          <section className="space-y-3 break-inside-avoid border-t-2 border-slate-200 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-900 pl-2.5">
              4. Conclusão da Inspeção
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">Nível de Aderência Ambiental</span>
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

          {report.publicEnabled && report.publicToken && typeof window !== 'undefined' ? (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
              <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                <p className="font-semibold text-slate-700">
                  Relatório Técnico de Inspeção Ambiental • Gerado pelo sistema Kivo
                </p>
                <p>Validação digital online disponível em:</p>
                <p className="text-emerald-700 break-all">
                  {`${window.location.origin}/laudo/${report.publicToken}`}
                </p>
              </div>
              <QrCodeSvg value={`${window.location.origin}/laudo/${report.publicToken}`} size={68} />
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
              Relatório Técnico de Inspeção Ambiental • Gerado pelo sistema Kivo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
