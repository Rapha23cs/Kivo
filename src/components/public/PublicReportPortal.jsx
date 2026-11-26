import React, { useEffect, useState } from 'react';
import {
  Printer,
  ShieldCheck,
  Building2,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
  FileBarChart2,
  Lock,
  Clock
} from 'lucide-react';
import { ReportService } from '../../supabase/reportService';
import {
  getReportMetaByDiscipline,
  formatDeviationClassLabel,
  getPhotoSectionsForReport,
  calculateAdherenceLevel
} from '../../data/reportTemplateData';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';
import ImageLightboxModal from '../common/ImageLightboxModal';
import QrCodeSvg from '../common/QrCodeSvg';

export default function PublicReportPortal({ token, onBackToHome, onOpenLegal }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [pinRequired, setPinRequired] = useState(null); // { codigoRelatorio, unidade, invalidPin }
  const [pinInput, setPinInput] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [expiredInfo, setExpiredInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const loadPublic = async (pinValue = '') => {
    setErrorMsg('');
    setExpiredInfo(null);
    const res = await ReportService.fetchPublicReport(token, pinValue);
    if (!res) {
      setErrorMsg('Este link de laudo é inválido, foi revogado pelo auditor ou ainda não foi sincronizado com a nuvem.');
      setPinRequired(null);
      setReport(null);
      return;
    }
    if (res.expired) {
      setExpiredInfo(res);
      setPinRequired(null);
      setReport(null);
      return;
    }
    if (res.requiresPin) {
      setPinRequired({
        codigoRelatorio: res.codigoRelatorio || '',
        unidade: res.unidade || '',
        invalidPin: Boolean(res.invalidPin),
        rateLimited: Boolean(res.rateLimited),
        retryAfterSeconds: res.retryAfterSeconds || 0,
        remainingAttempts: typeof res.remainingAttempts === 'number' ? res.remainingAttempts : null
      });
      setReport(null);
      return;
    }
    setPinRequired(null);
    setReport(res);
    document.title = `${res.codigoRelatorio} — Laudo Técnico Kivo`;
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadPublic('')
      .catch(() => {
        if (!active) return;
        setErrorMsg('Não foi possível carregar o relatório público neste momento. Verifique sua conexão e tente novamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmitPin = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setPinSubmitting(true);
    try {
      await loadPublic(pinInput.trim());
    } catch {
      setErrorMsg('Falha ao validar código de acesso.');
    } finally {
      setPinSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-2xl bg-[#141518] border border-[#2EB88A]/40 flex items-center justify-center animate-pulse mb-4">
          <img src="/icon.svg" alt="Kivo" className="w-8 h-8" />
        </div>
        <p className="text-sm font-medium text-[#E4E4E7]">Carregando laudo técnico validado...</p>
        <p className="text-xs text-[#71717A] mt-1 font-mono">{token}</p>
      </div>
    );
  }

  if (expiredInfo) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111214] border border-[#232429] rounded-2xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#221A10] border border-[#F59E0B]/40 text-[#FBBF24] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#F4F4F5]">Link de laudo expirado</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            O prazo de validade configurado para este link compartilhado ({expiredInfo.codigoRelatorio || 'Laudo'}) encerrou. Solicite um novo link ao responsável técnico.
          </p>
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir para a página inicial do Kivo
          </button>
        </div>
      </div>
    );
  }

  if (pinRequired) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col items-center justify-center p-4">
        <form
          onSubmit={handleSubmitPin}
          className="w-full max-w-sm bg-[#111214] border border-[#232429] rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xl"
        >
          <div className="w-11 h-11 rounded-2xl bg-[#122620] border border-[#2EB88A]/40 text-[#34D399] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-base font-bold text-[#F4F4F5]">Laudo Protegido por Código PIN</h1>
            <p className="text-xs text-[#A1A1AA]">
              {pinRequired.unidade || pinRequired.codigoRelatorio || 'Documento Técnico'}
            </p>
          </div>
          <div>
            <input
              type="password"
              autoFocus
              disabled={pinRequired.rateLimited}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Digite o PIN informado pelo auditor"
              className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2.5 text-center font-mono text-sm tracking-widest text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none disabled:opacity-50"
            />
            {pinRequired.rateLimited ? (
              <p className="text-[11px] text-[#FBBF24] mt-1.5 text-center">
                Muitas tentativas incorretas. Por segurança, tente novamente em{' '}
                {Math.max(1, Math.ceil((pinRequired.retryAfterSeconds || 300) / 60))} minuto(s).
              </p>
            ) : (
              pinRequired.invalidPin && (
                <p className="text-[11px] text-[#FB7185] mt-1.5 text-center">
                  Código PIN incorreto.
                  {pinRequired.remainingAttempts !== null
                    ? ` Restam ${pinRequired.remainingAttempts} tentativa(s).`
                    : ' Tente novamente.'}
                </p>
              )
            )}
          </div>
          <button
            type="submit"
            disabled={pinSubmitting || pinRequired.rateLimited || !pinInput.trim()}
            className="w-full py-2.5 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold text-xs transition"
          >
            {pinSubmitting ? 'Validando...' : pinRequired.rateLimited ? 'Temporariamente bloqueado' : 'Desbloquear Laudo'}
          </button>
          <button
            type="button"
            onClick={onBackToHome}
            className="w-full py-1.5 text-[11px] text-[#71717A] hover:text-[#F4F4F5] transition"
          >
            Voltar ao Kivo
          </button>
        </form>
      </div>
    );
  }

  if (errorMsg || !report) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111214] border border-[#232429] rounded-2xl p-7 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#221216] border border-[#F43F5E]/40 text-[#FB7185] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#F4F4F5]">Laudo indisponível</h1>
          <p className="text-xs text-[#A1A1AA] leading-relaxed">{errorMsg}</p>
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold text-xs transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir para a página inicial do Kivo
          </button>
        </div>
      </div>
    );
  }

  const reportMeta = getReportMetaByDiscipline(report.discipline);
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

  const reportSections = getPhotoSectionsForReport(report);
  const photosBySection = reportSections
    .map((sec) => ({
      section: sec,
      items: activePhotos.filter((f) => f.secao === sec)
    }))
    .filter((g) => g.items.length > 0);

  const lightboxImages = [
    ...(report.fachadaUrl ? [{ url: report.fachadaUrl, title: 'Fachada da Unidade', subtitle: report.unidade }] : []),
    ...activePhotos.map((p) => ({
      url: p.fotoUrl,
      title: `${p.ordem}. ${p.legenda}`,
      subtitle: p.observacao || p.secao
    }))
  ];

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] print:bg-white print:text-slate-900">
      {/* Top Bar (Oculta na Impressão) */}
      <header className="no-print sticky top-0 z-30 bg-[#111214]/95 backdrop-blur-md border-b border-[#1F2024] px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-2 hover:opacity-90 transition"
              title="Conhecer o Kivo"
            >
              <img src="/icon.svg" alt="Logo Kivo" className="w-8 h-8 rounded-lg" />
              <div className="text-left hidden sm:block">
                <span className="font-bold text-sm text-[#F4F4F5] block leading-none">KIVO</span>
                <span className="text-[10px] text-[#34D399] font-mono">Portal do Laudo</span>
              </div>
            </button>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#122620] border border-[#2EB88A]/30 text-[#34D399] text-[11px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Documento Validado</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] text-xs font-semibold transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Documento Executivo */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8 print:p-0">
        <article className="bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-10 space-y-8 print:shadow-none print:rounded-none">
          {/* Cabeçalho do Laudo */}
          <div className="border-b-2 border-emerald-700 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5">
              <img src="/icon.svg" alt="Logo Kivo" className="w-11 h-11 rounded-xl shrink-0" />
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-emerald-700 mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Versão Oficial Compartilhada</span>
                </div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
                  {reportMeta.title}
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Kivo • Cliente: <strong className="text-slate-900">{report.clienteNome || 'Não informado'}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
              <div className="text-left sm:text-right text-xs text-slate-600 font-mono space-y-0.5">
                <p className="font-bold text-slate-900 text-sm">{report.codigoRelatorio}</p>
                <p className="inline-flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3" /> {formattedDate}
                </p>
                <p className="font-sans text-[11px] uppercase font-semibold text-emerald-700 block">
                  {report.status}
                </p>
              </div>
              {shareUrl && <QrCodeSvg value={shareUrl} size={68} />}
            </div>
          </div>

          {/* 1. Dados da Unidade + Fachada + 8 Indicadores */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5 flex items-center gap-1.5">
              <FileBarChart2 className="w-3.5 h-3.5 text-emerald-700" />
              1. Dados da Unidade e Resultados da Inspeção
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
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
                  <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {report.cidade || '—'}
                  </span>
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
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Responsável Técnico</span>
                  <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> {report.responsavel || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Gerência</span>
                  <span className="font-semibold text-slate-800">{report.gerencia || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">Objetivo</span>
                  <span className="text-slate-700">{report.objetivo || '—'}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl bg-slate-50 p-3 flex flex-col items-center justify-center min-h-[160px]">
                {report.fachadaUrl ? (
                  <>
                    <img
                      src={sanitizeMediaUrl(report.fachadaUrl)}
                      alt="Fachada da Unidade"
                      onClick={() => setLightboxIndex(0)}
                      className="w-full h-36 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition"
                      title="Clique para ampliar"
                    />
                    <span className="text-[10px] text-slate-500 mt-1.5 font-medium">Imagem da Fachada da Unidade</span>
                  </>
                ) : (
                  <div className="text-center text-slate-400 space-y-1">
                    <Building2 className="w-7 h-7 mx-auto opacity-60" />
                    <span className="text-[11px] block">Fachada não anexada</span>
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

          {/* Desempenho por Temática (quando presente em dados_extras) */}
          {Array.isArray(report.desempenhoTematico) && report.desempenhoTematico.length > 0 && (
            <section className="space-y-3 break-inside-avoid">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-emerald-600 pl-2.5">
                Desempenho por Temática do Checklist ({report.desempenhoTematico.length} Áreas)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {report.desempenhoTematico.map((t) => (
                  <div key={t.topic} className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate" title={t.topic}>{t.topic}</span>
                      <span className="font-mono font-bold text-emerald-700">{t.percent}%</span>
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

          {/* 2. Desvios e Oportunidades */}
          <section className="space-y-3 break-inside-avoid">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-rose-600 pl-2.5">
              2. Desvios e Oportunidades de Melhoria ({(report.desvios || []).length})
            </h2>

            {(report.desvios || []).length === 0 ? (
              <div className="p-4 border border-slate-200 rounded-lg text-xs text-slate-500 italic bg-slate-50">
                Nenhum desvio ou oportunidade de melhoria registrado até o encerramento deste relatório.
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                          {formatDeviationClassLabel(d.classificacao, report.discipline)}
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
              </div>
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
                    {group.items.map((foto) => {
                      const imgIdx = lightboxImages.findIndex((item) => item.url === foto.fotoUrl);
                      return (
                        <div key={foto.ordem} className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 break-inside-avoid">
                          <img
                            src={sanitizeMediaUrl(foto.fotoUrl)}
                            alt={foto.legenda}
                            onClick={() => imgIdx >= 0 && setLightboxIndex(imgIdx)}
                            className="w-full h-48 object-cover rounded-lg border border-slate-200 bg-white cursor-pointer hover:opacity-90 transition"
                            title="Clique para ampliar"
                          />
                          <p className="text-xs font-semibold text-slate-900 leading-snug">
                            {foto.ordem}. {foto.legenda}
                          </p>
                          {foto.observacao && <p className="text-[11px] text-slate-600">{foto.observacao}</p>}
                        </div>
                      );
                    })}
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
                <span className="text-[10px] uppercase font-semibold text-slate-500 block">{reportMeta.adherenceShortTitle}</span>
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

          <footer className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
            <span>Kivo • Portal Público de Validação Técnica</span>
            {onOpenLegal && (
              <div className="no-print flex items-center gap-3 font-sans">
                <button type="button" onClick={() => onOpenLegal('privacidade')} className="hover:underline">
                  Privacidade (LGPD)
                </button>
                <button type="button" onClick={() => onOpenLegal('suporte')} className="hover:underline">
                  Suporte Técnico
                </button>
              </div>
            )}
          </footer>
        </article>
      </main>

      <ImageLightboxModal
        isOpen={lightboxIndex >= 0}
        images={lightboxImages}
        currentIndex={lightboxIndex}
        onChangeIndex={setLightboxIndex}
        onClose={() => setLightboxIndex(-1)}
      />
    </div>
  );
}
