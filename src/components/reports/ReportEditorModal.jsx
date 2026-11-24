import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Printer,
  Building2,
  ClipboardCheck,
  AlertOctagon,
  Camera,
  FileCheck2,
  Plus,
  Trash2,
  Sparkles,
  Upload,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  Link2,
  Download,
  Share2,
  Globe,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Layers
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import ImageLightboxModal from '../common/ImageLightboxModal';
import ReportPrintView from './ReportPrintView';
import {
  REPORT_RESULT_GUIDELINES,
  DEVIATION_CLASSIFICATIONS,
  DEVIATION_STATUS_OPTIONS,
  MATURITY_LEVELS,
  ADHERENCE_RULES,
  PHOTO_SECTIONS,
  CHECKLIST_TO_REPORT_PHOTO_SLOT,
  getReportMetaByDiscipline,
  formatDeviationClassLabel,
  getPhotoSectionsForReport,
  calculateAdherenceLevel,
  calculateConformityIndex,
  suggestMaturityLevel,
  summarizeDeviationsByClass,
  buildDefaultConclusionText
} from '../../data/reportTemplateData';
import { calculateTopicBreakdown, calculateInspectionSummary } from '../../data/emserhChecklistData';
import { getDisciplineMeta } from '../../data/workflowsConfig';
import { ReportService, buildPublicReportUrl } from '../../supabase/reportService';
import {
  formatDateTimeWatermark,
  exportCsvRows,
  buildExecutiveSummaryText,
  copyTextToClipboard,
  sanitizeMediaUrl
} from '../../utils/kivoHelpers';

export default function ReportEditorModal({
  report,
  isOpen,
  onClose,
  onSaveReport,
  onLocalDraftUpdate,
  linkedOrder,
  orders = [],
  units = [],
  userProfile,
  clientLogoUrl = ''
}) {
  const { toast, confirm } = useFeedback();
  const resumeStorageKey = report?.codigoRelatorio
    ? `kivo_resume_report_${report.codigoRelatorio}`
    : null;

  const getInitialResume = () => {
    if (!resumeStorageKey) return {};
    try {
      const raw = localStorage.getItem(resumeStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const initialResume = getInitialResume();
  const [draft, setDraft] = useState(report);
  const [activeTab, setActiveTab] = useState(initialResume.activeTab || 'cover'); // cover | deviations | photos | conclusion
  const initialSections = getPhotoSectionsForReport(report);
  const [selectedPhotoSection, setSelectedPhotoSection] = useState(
    initialResume.selectedPhotoSection && initialSections.includes(initialResume.selectedPhotoSection)
      ? initialResume.selectedPhotoSection
      : initialSections[0]
  );
  const [showOnlyWithPhotos, setShowOnlyWithPhotos] = useState(false);
  const [showTable01Rules, setShowTable01Rules] = useState(false);
  const [showTable03Rules, setShowTable03Rules] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState('idle'); // idle | saving | saved
  const [showPrintView, setShowPrintView] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');
  const [selectedLinkOrderId, setSelectedLinkOrderId] = useState('');
  const [stampPhotos, setStampPhotos] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const latestDraftRef = useRef(report);
  const isDirtyRef = useRef(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    setDraft(report);
    latestDraftRef.current = report;
    isDirtyRef.current = false;
    setAutoSaveState('idle');
    setSyncNotice('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const resumed = getInitialResume();
    const nextSections = getPhotoSectionsForReport(report);
    if (resumed.activeTab) setActiveTab(resumed.activeTab);
    if (resumed.selectedPhotoSection && nextSections.includes(resumed.selectedPhotoSection)) {
      setSelectedPhotoSection(resumed.selectedPhotoSection);
    } else if (nextSections[0]) {
      setSelectedPhotoSection(nextSections[0]);
    }
  }, [report?.codigoRelatorio, report?.id]);

  useEffect(() => {
    if (!resumeStorageKey) return;
    try {
      localStorage.setItem(
        resumeStorageKey,
        JSON.stringify({ activeTab, selectedPhotoSection })
      );
    } catch {
      // ignora erro de armazenamento UI
    }
  }, [resumeStorageKey, activeTab, selectedPhotoSection]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (isDirtyRef.current && latestDraftRef.current) {
        ReportService.saveDraftLocal(latestDraftRef.current);
      }
    };
  }, []);

  if (!isOpen || !draft) return null;

  const scheduleAutoSave = (nextDraft, { immediate = false } = {}) => {
    latestDraftRef.current = nextDraft;
    isDirtyRef.current = true;
    const { nextList } = ReportService.saveDraftLocal(nextDraft);
    onLocalDraftUpdate?.(nextList);
    setAutoSaveState('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    const runCloudSave = async () => {
      try {
        await onSaveReport(latestDraftRef.current);
        isDirtyRef.current = false;
        setAutoSaveState('saved');
      } catch {
        setAutoSaveState('saved');
      }
    };

    if (immediate) {
      runCloudSave();
    } else {
      debounceTimerRef.current = setTimeout(runCloudSave, 1000);
    }
  };

  const applyDraftUpdate = (updater, options = {}) => {
    setDraft((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      scheduleAutoSave(next, options);
      return next;
    });
  };

  const handleSyncFromChecklist = () => {
    if (!linkedOrder) return;
    const synced = ReportService.syncFromOrder(draft, linkedOrder, userProfile);
    applyDraftUpdate(synced, { immediate: true });
    setSyncNotice(`Métricas, desvios e evidências sincronizados com o checklist ${linkedOrder.id}.`);
  };

  const eligibleOrdersToLink = (orders || []).filter((ord) =>
    (ord.checklist || []).some((i) => i.status === 'sim' || i.status === 'nao' || i.status === 'nao_conforme' || i.status === 'na')
  );

  const handleLinkInspection = () => {
    const targetOrder = eligibleOrdersToLink.find((o) => o.id === selectedLinkOrderId);
    if (!targetOrder) {
      toast.info({ message: 'Selecione uma vistoria com checklist preenchido para vincular.' });
      return;
    }
    const baseLinked = {
      ...draft,
      inspecaoId: targetOrder.supabaseId || null,
      inspecaoCodigo: targetOrder.id,
      unidadeId: draft.unidadeId || targetOrder.unidadeId || null,
      clienteNome: draft.clienteNome || targetOrder.clientName || '',
      unidade: draft.unidade || targetOrder.hospitalName || '',
      cidade: draft.cidade || targetOrder.municipio || '',
      regional: draft.regional || targetOrder.regional || ''
    };
    const synced = ReportService.syncFromOrder(baseLinked, targetOrder, userProfile);
    applyDraftUpdate(synced, { immediate: true });
    setSyncNotice(`Relatório vinculado à vistoria ${targetOrder.id} com dados do checklist importados.`);
  };

  const updateField = (field, value) => {
    applyDraftUpdate((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'itensAvaliados' || field === 'conformidades') {
        const indice = calculateConformityIndex(
          field === 'conformidades' ? value : next.conformidades,
          field === 'itensAvaliados' ? value : next.itensAvaliados
        );
        next.indiceConformidade = indice;
        next.nivelAderencia = calculateAdherenceLevel(indice);
      }
      return next;
    });
  };

  const handleRecalcFromDeviations = (nextDesvios) => {
    const counts = summarizeDeviationsByClass(nextDesvios);
    const suggestedMat = suggestMaturityLevel(nextDesvios);
    applyDraftUpdate((prev) => ({
      ...prev,
      desvios: nextDesvios,
      ...counts,
      nivelMaturidade: suggestedMat
    }));
  };

  const handleAddDeviation = () => {
    const next = [
      ...(draft.desvios || []),
      {
        numero: (draft.desvios?.length || 0) + 1,
        descricao: '',
        classificacao: 'Desvio Pontual',
        severidadeNc: '',
        tratativa: 'Plano de Ação Corretiva',
        responsavel: '',
        prazo: '',
        status: 'Em Aberto'
      }
    ];
    handleRecalcFromDeviations(next);
  };

  const handleDeviationChange = (idx, field, value) => {
    const next = (draft.desvios || []).map((d, i) => {
      if (i !== idx) return d;
      const updated = { ...d, [field]: value };
      if (field === 'classificacao') {
        const cfg = DEVIATION_CLASSIFICATIONS.find((c) => c.value === value);
        if (cfg && !d.tratativa) {
          updated.tratativa = cfg.defaultTratativa;
        }
        if (value === 'Não Conformidade Ambiental' && !updated.severidadeNc) {
          updated.severidadeNc = 'Menor';
        }
      }
      return updated;
    });
    handleRecalcFromDeviations(next);
  };

  const handleRemoveDeviation = (idx) => {
    const next = (draft.desvios || [])
      .filter((_, i) => i !== idx)
      .map((d, i) => ({ ...d, numero: i + 1 }));
    handleRecalcFromDeviations(next);
  };

  const handleUploadFacade = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey('facade');
    try {
      const stamp = stampPhotos ? formatDateTimeWatermark(draft.unidade) : '';
      const url = await ReportService.uploadImage(file, draft.codigoRelatorio, 'fachada', stamp);
      updateField('fachadaUrl', url);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleUploadPhotoSlot = async (ordem, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(`slot-${ordem}`);
    try {
      const stamp = stampPhotos ? formatDateTimeWatermark(draft.unidade) : '';
      const url = await ReportService.uploadImage(file, draft.codigoRelatorio, `item-${ordem}`, stamp);
      applyDraftUpdate(
        (prev) => ({
          ...prev,
          registrosFotograficos: prev.registrosFotograficos.map((f) =>
            f.ordem === ordem ? { ...f, fotoUrl: url, incluirNoRelatorio: true } : f
          )
        }),
        { immediate: true }
      );
    } finally {
      setUploadingKey(null);
    }
  };

  const handlePhotoFieldChange = (ordem, field, value) => {
    applyDraftUpdate((prev) => ({
      ...prev,
      registrosFotograficos: prev.registrosFotograficos.map((f) =>
        f.ordem === ordem ? { ...f, [field]: value } : f
      )
    }));
  };

  const handleAddExtraPhoto = () => {
    const maxOrder = Math.max(56, ...(draft.registrosFotograficos || []).map((f) => f.ordem));
    applyDraftUpdate((prev) => ({
      ...prev,
      registrosFotograficos: [
        ...(prev.registrosFotograficos || []),
        {
          ordem: maxOrder + 1,
          secao: activePhotoSection,
          legenda: 'Registro fotográfico complementar da inspeção',
          fotoUrl: '',
          observacao: '',
          incluirNoRelatorio: true
        }
      ]
    }));
  };

  const handleGenerateConclusion = () => {
    const text = buildDefaultConclusionText({
      discipline: draft.discipline || linkedOrder?.discipline || 'meio_ambiente',
      indiceConformidade: draft.indiceConformidade,
      nivelAderencia: draft.nivelAderencia,
      nivelMaturidade: draft.nivelMaturidade,
      pontosPositivos: draft.pontosPositivos,
      sinteseDesvios: draft.sinteseDesvios
    });
    updateField('conclusaoTexto', text);
  };

  const handleSave = async (targetStatus) => {
    if (targetStatus === 'finalizado') {
      const current = latestDraftRef.current;
      if (!current.inspecaoId && !current.inspecaoCodigo) {
        toast.error({
          title: 'Vistoria obrigatória',
          message: 'Vincule uma vistoria com checklist preenchido no topo deste relatório antes de finalizar.'
        });
        return;
      }
      const missing = [];
      if (!current.unidade?.trim()) missing.push('Unidade');
      if (!current.responsavel?.trim()) missing.push('Responsável');
      if (!current.conclusaoTexto?.trim()) missing.push('Texto de Conclusão');
      if (missing.length > 0) {
        const ok = await confirm({
          title: 'Campos pendentes antes de finalizar',
          message: `Os seguintes campos do relatório ainda estão vazios: ${missing.join(', ')}. Deseja finalizar mesmo assim?`,
          detail: current.codigoRelatorio,
          confirmLabel: 'Finalizar mesmo assim',
          cancelLabel: 'Voltar e completar',
          variant: 'warning'
        });
        if (!ok) return;
      }
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSaving(true);
    try {
      const payload = {
        ...latestDraftRef.current,
        status: targetStatus || latestDraftRef.current.status
      };
      latestDraftRef.current = payload;
      await onSaveReport(payload);
      isDirtyRef.current = false;
      setDraft(payload);
      setAutoSaveState('saved');
      toast.success({
        title:
          payload.status === 'finalizado'
            ? linkedOrder
              ? 'Relatório e vistoria concluídos'
              : 'Relatório finalizado'
            : 'Rascunho salvo',
        message: `${payload.codigoRelatorio}${payload.unidade ? ` • ${payload.unidade}` : ''}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopySummary = async () => {
    const text = buildExecutiveSummaryText({
      code: draft.codigoRelatorio,
      clientName: draft.clienteNome,
      unitName: draft.unidade,
      regional: draft.regional,
      municipio: draft.cidade,
      date: draft.dataHora ? new Date(draft.dataHora).toLocaleDateString('pt-BR') : '',
      totalEvaluated: draft.itensAvaliados,
      totalConformities: draft.conformidades,
      conformityPercent: Number(draft.indiceConformidade || 0).toFixed(1),
      adherenceLevel: draft.nivelAderencia || calculateAdherenceLevel(draft.indiceConformidade),
      deviations: draft.desvios || []
    });
    await copyTextToClipboard(text);
    toast.success({ title: 'Resumo copiado!', message: 'Pronto para colar no WhatsApp ou e-mail.' });
  };

  const handleTogglePublicShare = async () => {
    setSharingLoading(true);
    try {
      const nextEnabled = !draft.publicEnabled;
      const result = await ReportService.setPublicShare(latestDraftRef.current, nextEnabled);
      if (!result) return;

      latestDraftRef.current = result.report;
      isDirtyRef.current = false;
      setDraft(result.report);
      onLocalDraftUpdate?.(ReportService.getReports());

      if (nextEnabled) {
        await copyTextToClipboard(result.shareUrl);
        toast.success({
          title: 'Link público ativado e copiado!',
          message: 'O cliente já pode visualizar este laudo online ou pelo QR Code do PDF.'
        });
      } else {
        toast.info({
          title: 'Compartilhamento público desativado',
          message: 'O link anterior não exibirá mais este relatório.'
        });
      }
    } catch (err) {
      toast.error({
        title: 'Erro ao atualizar link público',
        message: err?.message || 'Verifique sua conexão e tente novamente.'
      });
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!draft.publicToken) return;
    const shareUrl = buildPublicReportUrl(draft.publicToken);
    await copyTextToClipboard(shareUrl);
    toast.success({ title: 'Link público copiado!', message: shareUrl });
  };

  const handleExportDeviationsCsv = () => {
    const list = draft.desvios || [];
    if (list.length === 0) return;
    exportCsvRows(
      ['Nº', 'Descrição', 'Classificação', 'Severidade NC', 'Tratativa', 'Responsável', 'Prazo', 'Status'],
      list.map((d, idx) => [
        d.numero || idx + 1,
        d.descricao || '',
        d.classificacao || '',
        d.severidadeNc || '',
        d.tratativa || '',
        d.responsavel || '',
        d.prazo || '',
        d.status || ''
      ]),
      `relatorio-desvios-${draft.codigoRelatorio}.csv`
    );
    toast.success({ title: 'Planilha exportada', message: `relatorio-desvios-${draft.codigoRelatorio}.csv` });
  };

  const handleCloseModal = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (isDirtyRef.current && latestDraftRef.current) {
      try {
        await onSaveReport(latestDraftRef.current);
        isDirtyRef.current = false;
      } catch {
        // já salvo localmente via saveDraftLocal
      }
    }
    onClose();
  };

  const effectiveDiscipline = draft.discipline || linkedOrder?.discipline || 'meio_ambiente';
  const reportMeta = getReportMetaByDiscipline(effectiveDiscipline);
  const disciplineMeta = getDisciplineMeta(effectiveDiscipline);

  const photos = draft.registrosFotograficos || [];
  const photoSections = React.useMemo(() => getPhotoSectionsForReport(draft), [draft]);
  const activePhotoSection = photoSections.includes(selectedPhotoSection)
    ? selectedPhotoSection
    : photoSections[0] || PHOTO_SECTIONS[0];

  const attachedCount = photos.filter((f) => Boolean(f.fotoUrl)).length;
  const filteredPhotos = photos.filter((f) => {
    const matchSec = f.secao === activePhotoSection;
    const matchFilled = !showOnlyWithPhotos || Boolean(f.fotoUrl);
    return matchSec && matchFilled;
  });

  const topicBreakdown = React.useMemo(() => {
    if (Array.isArray(draft.desempenhoTematico) && draft.desempenhoTematico.length > 0) {
      return draft.desempenhoTematico;
    }
    if (linkedOrder?.checklist?.length) {
      return Object.values(calculateTopicBreakdown(linkedOrder.checklist));
    }
    return [];
  }, [draft.desempenhoTematico, linkedOrder]);

  const linkedSummary = React.useMemo(() => {
    return linkedOrder?.checklist?.length ? calculateInspectionSummary(linkedOrder.checklist) : null;
  }, [linkedOrder]);

  const aderenciaAtual = draft.nivelAderencia || calculateAdherenceLevel(draft.indiceConformidade);

  // Slots ligados a itens marcados como 'Não' no checklist vinculado (H1)
  const deviationSlotOrders = React.useMemo(() => {
    const set = new Set();
    photos.forEach((p) => {
      if (p.checklistItemNumber) {
        const matchedDev = (draft.desvios || []).some(
          (d) => Number(d.checklistItemNumber) === Number(p.checklistItemNumber)
        );
        if (matchedDev) set.add(p.ordem);
      }
    });
    (linkedOrder?.checklist || []).forEach((it) => {
      if (it.status === 'nao' || it.status === 'nao_conforme') {
        const slot = CHECKLIST_TO_REPORT_PHOTO_SLOT[Number(it.number)];
        if (slot) set.add(slot);
      }
    });
    return set;
  }, [linkedOrder, photos, draft.desvios]);

  const jumpToPhotoSlot = (slotOrdem) => {
    const found = photos.find((p) => Number(p.ordem) === Number(slotOrdem));
    if (found?.secao) {
      setSelectedPhotoSection(found.secao);
    }
    setActiveTab('photos');
  };

  const STEP_TABS = ['cover', 'deviations', 'photos', 'conclusion'];
  const currentStepIdx = Math.max(0, STEP_TABS.indexOf(activeTab));

  const lightboxImages = React.useMemo(() => {
    const imgs = [];
    if (draft.fachadaUrl) {
      imgs.push({
        key: 'facade',
        url: draft.fachadaUrl,
        title: 'Fachada da Unidade',
        subtitle: draft.unidade || 'Capa do Relatório'
      });
    }
    photos
      .filter((p) => Boolean(p.fotoUrl))
      .forEach((p) => {
        imgs.push({
          key: `slot-${p.ordem}`,
          url: p.fotoUrl,
          title: `Registro #${p.ordem} • ${p.secao}`,
          subtitle: p.legenda,
          observation: p.observacao
        });
      });
    return imgs;
  }, [draft.fachadaUrl, draft.unidade, photos]);

  const openLightboxByKey = (key) => {
    const idx = lightboxImages.findIndex((i) => i.key === key);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const modalContent = (
    <>
      <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/85 backdrop-blur-sm">
        <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:w-[96vw] sm:max-w-[1440px] h-[100dvh] sm:h-[94dvh] rounded-none sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">

          {/* HEADER */}
          <div className="px-4 sm:px-5 py-3 border-b border-[#232429] bg-[#141518] flex flex-col gap-2.5 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                <span className="font-mono text-[11px] font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2.5 py-1 rounded border border-[#27282E] shrink-0">
                  {draft.codigoRelatorio}
                </span>
                <Badge variant={draft.status === 'finalizado' ? 'success' : 'warning'} size="sm">
                  {draft.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                </Badge>
                {(linkedOrder || draft.inspecaoCodigo) && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#34D399] bg-[#122620] px-2 py-0.5 rounded border border-[#2EB88A]/30 shrink-0">
                    <Link2 className="w-3 h-3" />
                    {linkedOrder?.id || draft.inspecaoCodigo}
                  </span>
                )}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#A1A1AA] shrink-0">
                  {disciplineMeta.shortLabel}
                </span>

                <div className="min-w-[220px] flex-1">
                  <h2 className="text-sm sm:text-base font-bold text-[#F4F4F5] truncate">
                    {reportMeta.shortTitle} — {draft.unidade || 'Nova Unidade'}
                  </h2>
                  <p className="text-[11px] text-[#71717A] truncate">
                    Cliente: <strong className="text-[#A1A1AA]">{draft.clienteNome || 'Não definido'}</strong> • Responsável: {draft.responsavel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22] transition shrink-0"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end pt-1 border-t border-[#1F2024]/60">
              {linkedOrder && (
                <button
                  type="button"
                  onClick={handleSyncFromChecklist}
                  title={`Atualizar resultados, desvios e fotos com os dados atuais de ${linkedOrder.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sincronizar Checklist</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSave('rascunho')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-[#A1A1AA]" />
                {saving ? 'Salvando...' : 'Salvar Rascunho'}
              </button>

              <button
                type="button"
                onClick={() => handleSave('finalizado')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finalizar Relatório
              </button>

              <button
                type="button"
                onClick={handleTogglePublicShare}
                disabled={sharingLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition disabled:opacity-50 ${
                  draft.publicEnabled
                    ? 'bg-[#122620] hover:bg-[#17322A] text-[#34D399] border-[#2EB88A]/40'
                    : 'bg-[#1C1D22] hover:bg-[#25272E] text-[#E4E4E7] border-[#2D2F36]'
                }`}
                title={draft.publicEnabled ? 'Portal público ativo (clique para desativar)' : 'Gerar link público somente leitura para o cliente'}
              >
                <Globe className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="hidden sm:inline">
                  {sharingLoading ? 'Atualizando...' : draft.publicEnabled ? 'Link Ativo' : 'Link Cliente'}
                </span>
              </button>

              {draft.publicEnabled && draft.publicToken && (
                <button
                  type="button"
                  onClick={handleCopyPublicLink}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#34D399] border border-[#2EB88A]/30 rounded-lg transition"
                  title="Copiar link do portal público para enviar ao cliente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Copiar URL</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#E4E4E7] border border-[#2D2F36] rounded-lg transition"
                title="Copiar resumo executivo para WhatsApp / E-mail"
              >
                <Share2 className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="hidden sm:inline">Resumo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintView(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg transition"
              >
                <Printer className="w-3.5 h-3.5 text-[#34D399]" />
                <span>Visualizar PDF</span>
              </button>
            </div>
          </div>

          {/* AVISO DE SINCRONIZAÇÃO */}
          {syncNotice && (
            <div className="px-4 sm:px-5 py-2 bg-[#122620] border-b border-[#2EB88A]/30 flex items-center justify-between gap-3 text-xs text-[#34D399] shrink-0">
              <span>{syncNotice}</span>
              <button
                type="button"
                onClick={() => setSyncNotice('')}
                className="text-[11px] text-[#A1A1AA] hover:text-[#F4F4F5]"
              >
                Dispensar
              </button>
            </div>
          )}

          {/* RESUMO DO QUE FOI IMPORTADO DO CHECKLIST (FLUXO PÓS-CHECKLIST) */}
          {linkedOrder && (
            <div className="px-4 sm:px-5 py-2 bg-[#0D0E10] border-b border-[#1F2024] flex flex-wrap items-center justify-between gap-2 text-[11px] shrink-0">
              <div className="flex items-center gap-2 flex-wrap text-[#A1A1AA]">
                <span className="inline-flex items-center gap-1 font-semibold text-[#34D399]">
                  <Layers className="w-3.5 h-3.5" />
                  Importado do Checklist {linkedOrder.id}:
                </span>
                <span className="font-mono text-[#E4E4E7]">
                  {linkedSummary ? linkedSummary.totalAvaliados : draft.itensAvaliados} avaliados
                </span>
                <span>•</span>
                <span className="font-mono text-[#34D399]">
                  {linkedSummary ? linkedSummary.totalSim : draft.conformidades} Sim
                </span>
                <span>•</span>
                <span className="font-mono text-[#FB7185]">
                  {linkedSummary ? linkedSummary.totalNao : (draft.desvios || []).length} desvios
                </span>
                <span>•</span>
                <span className="font-mono text-[#A1A1AA]">
                  {linkedSummary ? linkedSummary.totalNA : draft.itensNaoAplicaveis || 0} N/A
                </span>
                <span>•</span>
                <span className="font-mono text-[#E4E4E7]">
                  {attachedCount} foto(s) no relatório
                </span>
                {topicBreakdown.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#A1A1AA]">{topicBreakdown.length} áreas avaliadas</span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleSyncFromChecklist}
                className="text-[11px] font-medium text-[#34D399] hover:underline flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                Reimportar tudo do checklist
              </button>
            </div>
          )}

          {/* VÍNCULO OBRIGATÓRIO COM VISTORIA (Para relatórios legados sem inspeção) */}
          {!linkedOrder && !draft.inspecaoId && !draft.inspecaoCodigo && (
            <div className="px-4 sm:px-5 py-2.5 bg-[#221A10] border-b border-[#F59E0B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-[#FBBF24] shrink-0">
              <span>
                Este relatório ainda não está vinculado a uma vistoria. Selecione uma inspeção com checklist preenchido para continuar:
              </span>
              {eligibleOrdersToLink.length > 0 ? (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedLinkOrderId}
                    onChange={(e) => setSelectedLinkOrderId(e.target.value)}
                    className="bg-[#0D0E10] border border-[#332614] rounded-lg px-2.5 py-1 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A] max-w-[230px]"
                  >
                    <option value="">Selecionar vistoria...</option>
                    {eligibleOrdersToLink.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        {ord.id} — {ord.hospitalName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLinkInspection}
                    className="px-3 py-1 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg text-xs transition"
                  >
                    Vincular
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-medium text-[#E4E4E7]">
                  Nenhuma vistoria com checklist respondido encontrada ainda.
                </span>
              )}
            </div>
          )}

          {/* ABAS + INDICADOR COMPACTO */}
          <div className="px-4 sm:px-5 border-b border-[#232429] flex flex-wrap items-center justify-between gap-3 bg-[#111214] shrink-0">
            <div className="flex gap-5 text-xs font-medium overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('cover')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'cover'
                    ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>1. Capa & Resultados</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deviations')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'deviations'
                    ? 'border-[#F43F5E] text-[#FB7185] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>2. Desvios & Melhorias</span>
                <span className="text-[10px] bg-[#1A1B20] text-[#A1A1AA] px-1.5 py-0.5 rounded font-mono border border-[#27282E]">
                  {(draft.desvios || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'photos'
                    ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>3. Registro Fotográfico</span>
                <span className="text-[10px] bg-[#1A1B20] text-[#34D399] px-1.5 py-0.5 rounded font-mono border border-[#27282E]">
                  {attachedCount}/{photos.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('conclusion')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'conclusion'
                    ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>4. Conclusão & Aderência</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#71717A]">
                Índice: <strong className="text-[#34D399]">{Number(draft.indiceConformidade || 0).toFixed(1)}%</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-[#141518] border border-[#232429] text-[#E4E4E7] font-sans">
                {aderenciaAtual}
              </span>
            </div>
          </div>

          {/* CORPO DAS ABAS */}
          {activeTab === 'photos' ? (
            /* ABA 3: REGISTRO FOTOGRÁFICO EM 2 COLUNAS (56 PONTOS DOS SLIDES 5-32) */
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#0D0E10]">
              {/* Sidebar das Seções Fotográficas (horizontal em mobile/tablet, lateral em desktop) */}
              <aside className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[#232429] bg-[#111214] p-2.5">
                <div className="hidden lg:block px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1">
                  Blocos Fotográficos ({photoSections.length} Seções)
                </div>
                <div className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-y-auto pb-1 lg:pb-0">
                  {photoSections.map((sec) => {
                    const secItems = photos.filter((f) => f.secao === sec);
                    const secFilled = secItems.filter((f) => Boolean(f.fotoUrl)).length;
                    const active = activePhotoSection === sec;
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setSelectedPhotoSection(sec)}
                        className={`shrink-0 lg:w-full px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between gap-2 border text-left whitespace-nowrap lg:whitespace-normal ${
                          active
                            ? 'bg-[#1E2025] border-[#2EB88A]/50 text-[#F4F4F5] font-semibold'
                            : 'border-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#17181B]'
                        }`}
                      >
                        <span className="truncate">{sec}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border shrink-0 ${
                          secFilled > 0
                            ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                            : 'bg-[#141518] text-[#71717A] border-[#232429]'
                        }`}>
                          {secFilled}/{secItems.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Grid 2 por linha como nos slides do Relatório.pptx */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                <div className="px-4 py-3 bg-[#141518] border-b border-[#232429] flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                  <div>
                    <h3 className="font-semibold text-[#F4F4F5]">{activePhotoSection}</h3>
                    <p className="text-[11px] text-[#71717A]">
                      Anexe as evidências fotográficas nos pontos correspondentes (apenas itens marcados com foto são exibidos no PDF A4 final).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stampPhotos}
                        onChange={(e) => setStampPhotos(e.target.checked)}
                        className="accent-[#2EB88A]"
                      />
                      Estampar data/unidade
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyWithPhotos}
                        onChange={(e) => setShowOnlyWithPhotos(e.target.checked)}
                        className="accent-[#2EB88A]"
                      />
                      Mostrar apenas com foto
                    </label>
                    <button
                      type="button"
                      onClick={handleAddExtraPhoto}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg text-[11px] font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#34D399]" />
                      Foto Extra
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPhotos.map((slot) => (
                      <div key={slot.ordem} className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-semibold text-[#34D399] bg-[#122620] px-2 py-0.5 rounded border border-[#2EB88A]/30">
                              Registro #{slot.ordem}
                            </span>
                            {deviationSlotOrders.has(slot.ordem) && (
                              <span className="text-[10px] font-medium bg-[#221216] text-[#FB7185] border border-[#F43F5E]/40 px-2 py-0.5 rounded">
                                Desvio no Checklist
                              </span>
                            )}
                          </div>
                          <label className="flex items-center gap-1.5 text-[11px] text-[#A1A1AA] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={slot.incluirNoRelatorio !== false}
                              onChange={(e) => handlePhotoFieldChange(slot.ordem, 'incluirNoRelatorio', e.target.checked)}
                              className="accent-[#2EB88A]"
                            />
                            Incluir no PDF
                          </label>
                        </div>

                        {/* Área da Foto */}
                        <div className="border border-dashed border-[#2D2F36] bg-[#0D0E10] rounded-lg p-3 flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
                          {slot.fotoUrl ? (
                            <div className="w-full space-y-2">
                              <img
                                src={sanitizeMediaUrl(slot.fotoUrl)}
                                alt={slot.legenda}
                                onClick={() => openLightboxByKey(`slot-${slot.ordem}`)}
                                className="w-full h-40 object-cover rounded-lg border border-[#232429] cursor-pointer hover:opacity-90 transition"
                                title="Clique para ampliar"
                              />
                              <div className="flex items-center justify-between text-[11px]">
                                <label className="text-[#34D399] hover:underline cursor-pointer flex items-center gap-1">
                                  <Upload className="w-3 h-3" /> Substituir foto
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleUploadPhotoSlot(slot.ordem, e)}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handlePhotoFieldChange(slot.ordem, 'fotoUrl', '')}
                                  className="text-[#FB7185] hover:underline"
                                >
                                  Remover foto
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2.5 text-center py-3 w-full">
                              <Camera className="w-6 h-6 text-[#71717A]" />
                              <span className="text-xs text-[#A1A1AA] font-medium">
                                {uploadingKey === `slot-${slot.ordem}` ? 'Enviando imagem...' : 'Anexar fotografia'}
                              </span>
                              <div className="flex items-center gap-2">
                                <label className="px-2.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-lg text-[11px] text-[#F4F4F5] font-medium cursor-pointer transition flex items-center gap-1">
                                  <Camera className="w-3 h-3 text-[#34D399]" />
                                  Câmera
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => handleUploadPhotoSlot(slot.ordem, e)}
                                  />
                                </label>
                                <label className="px-2.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-lg text-[11px] text-[#F4F4F5] font-medium cursor-pointer transition flex items-center gap-1">
                                  <Upload className="w-3 h-3 text-[#34D399]" />
                                  Arquivo
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleUploadPhotoSlot(slot.ordem, e)}
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[10px] uppercase font-medium text-[#71717A] mb-1">Legenda</label>
                            <textarea
                              rows={2}
                              value={slot.legenda}
                              onChange={(e) => handlePhotoFieldChange(slot.ordem, 'legenda', e.target.value)}
                              className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            value={slot.observacao || ''}
                            onChange={(e) => handlePhotoFieldChange(slot.ordem, 'observacao', e.target.value)}
                            placeholder="Observação complementar da foto (opcional)..."
                            className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5 text-xs text-[#A1A1AA] placeholder-[#71717A] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0D0E10]">

              {/* ABA 1: CAPA & RESULTADOS DA INSPEÇÃO (SLIDES 1 E 2) */}
              {activeTab === 'cover' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Dados da Capa */}
                    <div className="lg:col-span-2 bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4 text-xs">
                      <h3 className="font-semibold text-[#F4F4F5] text-sm border-b border-[#1F2024] pb-2.5">
                        Identificação da Inspeção Ambiental
                      </h3>

                      {units.length > 0 && (
                        <div className="bg-[#0D0E10] border border-[#2EB88A]/30 rounded-lg p-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-[11px] font-medium text-[#34D399] shrink-0">
                            Preencher por Unidade:
                          </span>
                          <select
                            value={draft.unidadeId || ''}
                            onChange={(e) => {
                              const found = units.find((u) => u.id === e.target.value);
                              if (!found) return;
                              applyDraftUpdate((prev) => ({
                                ...prev,
                                unidadeId: found.id,
                                clienteNome: found.clienteNome || prev.clienteNome,
                                unidade: found.nome || prev.unidade,
                                cidade: found.municipio || prev.cidade,
                                regional: found.regional || prev.regional
                              }));
                            }}
                            className="flex-1 bg-[#141518] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          >
                            <option value="">-- Selecionar unidade cadastrada (opcional) --</option>
                            {units.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.nome} {u.clienteNome ? `(${u.clienteNome})` : ''} — {u.municipio}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Cliente Contratante *</label>
                          <input
                            type="text"
                            value={draft.clienteNome || ''}
                            onChange={(e) => updateField('clienteNome', e.target.value)}
                            placeholder="Ex: EMSERH, Rede Privada..."
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Unidade *</label>
                          <input
                            type="text"
                            value={draft.unidade || ''}
                            onChange={(e) => updateField('unidade', e.target.value)}
                            placeholder="Nome da unidade inspecionada"
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Data / Hora *</label>
                          <input
                            type="datetime-local"
                            value={draft.dataHora || ''}
                            onChange={(e) => updateField('dataHora', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Cidade</label>
                          <input
                            type="text"
                            value={draft.cidade || ''}
                            onChange={(e) => updateField('cidade', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Regional</label>
                          <input
                            type="text"
                            value={draft.regional || ''}
                            onChange={(e) => updateField('regional', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Tipo de Inspeção</label>
                          <select
                            value={draft.tipoInspecao || 'Programada'}
                            onChange={(e) => updateField('tipoInspecao', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          >
                            <option value="Programada">Programada</option>
                            <option value="Não Programada">Não Programada</option>
                            <option value="Extraordinária">Extraordinária</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Responsável *</label>
                          <input
                            type="text"
                            value={draft.responsavel || ''}
                            onChange={(e) => updateField('responsavel', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[#A1A1AA] font-medium mb-1">Gerência</label>
                          <input
                            type="text"
                            value={draft.gerencia || ''}
                            onChange={(e) => updateField('gerencia', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[#A1A1AA] font-medium mb-1">Objetivo da Inspeção</label>
                          <textarea
                            rows={2}
                            value={draft.objetivo || ''}
                            onChange={(e) => updateField('objetivo', e.target.value)}
                            className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Imagem da Fachada da Unidade */}
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 flex flex-col justify-between space-y-3 text-xs">
                      <h3 className="font-semibold text-[#F4F4F5] text-sm border-b border-[#1F2024] pb-2.5">
                        Imagem da Fachada da Unidade
                      </h3>

                      <div className="flex-1 border border-dashed border-[#2D2F36] bg-[#0D0E10] rounded-xl p-4 flex flex-col items-center justify-center min-h-[210px]">
                        {draft.fachadaUrl ? (
                          <div className="w-full space-y-2.5">
                            <img
                              src={sanitizeMediaUrl(draft.fachadaUrl)}
                              alt="Fachada da Unidade"
                              onClick={() => openLightboxByKey('facade')}
                              className="w-full h-44 object-cover rounded-lg border border-[#232429] cursor-pointer hover:opacity-90 transition"
                              title="Clique para ampliar"
                            />
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="text-[#34D399] hover:underline cursor-pointer flex items-center gap-1">
                                <Upload className="w-3 h-3" /> Trocar fachada
                                <input type="file" accept="image/*" className="hidden" onChange={handleUploadFacade} />
                              </label>
                              <button
                                type="button"
                                onClick={() => updateField('fachadaUrl', '')}
                                className="text-[#FB7185] hover:underline"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="cursor-pointer text-center space-y-2 py-6">
                            <Building2 className="w-8 h-8 text-[#71717A] mx-auto" />
                            <span className="text-xs font-medium text-[#A1A1AA] block">
                              {uploadingKey === 'facade' ? 'Enviando fachada...' : 'Enviar Foto da Fachada'}
                            </span>
                            <span className="text-[11px] text-[#71717A] block">Exibida na capa do relatório</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadFacade} />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Resultados da Inspeção (8 Indicadores + Tabela 01 Slide 2) */}
                  <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2024] pb-3">
                      <div>
                        <h3 className="font-semibold text-[#F4F4F5] text-sm flex items-center gap-2">
                          <ClipboardCheck className="w-4 h-4 text-[#34D399]" />
                          Resultados da Inspeção (Consolidado Oficial)
                        </h3>
                        <p className="text-[11px] text-[#71717A]">
                          Fórmula: Índice de Conformidade (%) = (Conformidades / Itens Avaliados) × 100
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTable01Rules(!showTable01Rules)}
                        className="flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F4F4F5]"
                      >
                        <Info className="w-3.5 h-3.5 text-[#34D399]" />
                        Critérios (Tabela 01)
                        {showTable01Rules ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {showTable01Rules && (
                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-[#18191D] text-[#71717A] uppercase text-[10px]">
                            <tr>
                              <th className="py-2 px-3">Campo</th>
                              <th className="py-2 px-3">Critério de Preenchimento</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1F2024]">
                            {REPORT_RESULT_GUIDELINES.map((g) => (
                              <tr key={g.key}>
                                <td className="py-2 px-3 font-medium text-[#F4F4F5] whitespace-nowrap">{g.label}</td>
                                <td className="py-2 px-3 text-[#A1A1AA]">{g.criterion}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#71717A] block mb-1">Itens Avaliados</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.itensAvaliados}
                          onChange={(e) => updateField('itensAvaliados', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#34D399] block mb-1">Conformidades</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.conformidades}
                          onChange={(e) => updateField('conformidades', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#34D399] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#A1A1AA] block mb-1">Desvios com Plano de Ação</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.desviosPlanoAcao}
                          onChange={(e) => updateField('desviosPlanoAcao', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#FB7185] block mb-1">{reportMeta.ncLabel}</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.naoConformidades}
                          onChange={(e) => updateField('naoConformidades', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#FB7185] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#A1A1AA] block mb-1">{reportMeta.occurrenceLabel}</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.ocorrenciasAmbientais}
                          onChange={(e) => updateField('ocorrenciasAmbientais', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#A1A1AA] block mb-1">Notificações</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.notificacoes}
                          onChange={(e) => updateField('notificacoes', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#FB7185] block mb-1">Interdições</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.interdicoes}
                          onChange={(e) => updateField('interdicoes', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#FB7185] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#122620] border border-[#2EB88A]/40 rounded-lg p-3 flex flex-col justify-center">
                        <span className="text-[10px] uppercase font-semibold text-[#34D399] block">Índice Geral (%)</span>
                        <span className="text-2xl font-bold font-mono text-[#F4F4F5]">
                          {Number(draft.indiceConformidade || 0).toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-[#34D399]">{aderenciaAtual}</span>
                      </div>
                    </div>
                  </div>

                  {/* Desempenho por Temática importado diretamente do Checklist */}
                  {topicBreakdown.length > 0 && (
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2024] pb-2.5">
                        <div>
                          <h3 className="font-semibold text-[#F4F4F5] text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-[#34D399]" />
                            Desempenho por Temática (Importado do Checklist)
                          </h3>
                          <p className="text-[11px] text-[#71717A]">
                            Consolidação automática das {topicBreakdown.length} áreas avaliadas na vistoria de origem.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                        {topicBreakdown.map((t) => (
                          <div
                            key={t.topic}
                            className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[#F4F4F5] truncate" title={t.topic}>
                                {t.topic}
                              </span>
                              <span
                                className={`font-mono font-bold text-xs shrink-0 ${
                                  t.percent >= 85
                                    ? 'text-[#34D399]'
                                    : t.percent >= 70
                                    ? 'text-[#FBBF24]'
                                    : 'text-[#FB7185]'
                                }`}
                              >
                                {t.percent}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#1A1B20] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  t.percent >= 85
                                    ? 'bg-[#2EB88A]'
                                    : t.percent >= 70
                                    ? 'bg-[#F59E0B]'
                                    : 'bg-[#F43F5E]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, t.percent))}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-[#71717A]">
                              <span>Sim: <strong className="text-[#34D399]">{t.sim}</strong></span>
                              <span>Não: <strong className={t.nao > 0 ? 'text-[#FB7185]' : 'text-[#A1A1AA]'}>{t.nao}</strong></span>
                              <span>N/A: {t.na}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ABA 2: TABELA DE DESVIOS E OPORTUNIDADES DE MELHORIA (SLIDES 3 E 4) */}
              {activeTab === 'deviations' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#F4F4F5] text-sm flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-[#FB7185]" />
                        Desvios e Oportunidades de Melhoria
                      </h3>
                      <p className="text-xs text-[#71717A]">
                        As alterações nesta tabela atualizam automaticamente os contadores da Capa e o Nível de Maturidade.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(draft.desvios || []).length > 0 && (
                        <button
                          type="button"
                          onClick={handleExportDeviationsCsv}
                          className="px-3 py-1.5 bg-[#141518] border border-[#232429] rounded-lg text-xs text-[#E4E4E7] hover:text-[#F4F4F5] flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-[#34D399]" />
                          Exportar CSV
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowTable03Rules(!showTable03Rules)}
                        className="px-3 py-1.5 bg-[#141518] border border-[#232429] rounded-lg text-xs text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1.5"
                      >
                        <Info className="w-3.5 h-3.5 text-[#34D399]" />
                        Diretrizes (Tabela 03)
                      </button>
                      <button
                        type="button"
                        onClick={handleAddDeviation}
                        className="px-3.5 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg text-xs flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Desvio
                      </button>
                    </div>
                  </div>

                  {showTable03Rules && (
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 text-xs text-[#A1A1AA] space-y-1.5">
                      <p><strong className="text-[#F4F4F5]">Fluxo de Encaminhamento:</strong></p>
                      <p>• <strong className="text-[#E4E4E7]">Desvio Pontual</strong> → Tratado diretamente por Plano de Ação.</p>
                      <p>• <strong className="text-[#FB7185]">Não Conformidade Ambiental</strong> → Segue Procedimento de Gestão de Não Conformidades e Ações Corretivas (Menor ou Maior).</p>
                      <p>• <strong className="text-[#E4E4E7]">Ocorrência Ambiental</strong> → Segue Procedimento de Gestão de Ocorrências Ambientais.</p>
                      <p>• <strong className="text-[#FB7185]">Notificação / Interdição</strong> → Registro formal de notificação ou interdição durante a inspeção.</p>
                    </div>
                  )}

                  {(draft.desvios || []).length === 0 ? (
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-10 text-center space-y-3">
                      <AlertOctagon className="w-8 h-8 text-[#71717A] mx-auto" />
                      <p className="text-sm font-medium text-[#F4F4F5]">Nenhum desvio registrado na tabela</p>
                      <p className="text-xs text-[#71717A]">
                        Permanecendo em branco, indica ausência de desvios até o encerramento do relatório.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddDeviation}
                        className="px-4 py-2 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] text-[#F4F4F5] rounded-lg text-xs font-medium"
                      >
                        + Registrar primeiro desvio
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {draft.desvios.map((d, idx) => (
                        <div key={idx} className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2.5 py-0.5 rounded border border-[#27282E]">
                                Desvio Nº {idx + 1}
                              </span>
                              {d.tematica && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                                  {d.nrCode ? `${d.nrCode} • ` : ''}{d.tematica}
                                </span>
                              )}
                              {d.depoisFotoUrl && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                                  Plano de Ação com Evidência Depois
                                </span>
                              )}
                              {d.fotoSlotOrdem && (
                                <button
                                  type="button"
                                  onClick={() => jumpToPhotoSlot(d.fotoSlotOrdem)}
                                  className="text-[10px] font-mono text-[#34D399] hover:underline flex items-center gap-1"
                                >
                                  <Camera className="w-3 h-3" />
                                  Bloco Foto #{d.fotoSlotOrdem}
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDeviation(idx)}
                              className="text-[#71717A] hover:text-[#FB7185] flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remover
                            </button>
                          </div>

                          {d.evidenciaFotoUrl && (
                            <div className="flex items-center gap-3 bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                              <img
                                src={sanitizeMediaUrl(d.evidenciaFotoUrl)}
                                alt={`Evidência Desvio ${idx + 1}`}
                                onClick={() => d.fotoSlotOrdem && openLightboxByKey(`slot-${d.fotoSlotOrdem}`)}
                                className="w-14 h-11 object-cover rounded border border-[#27282E] cursor-pointer shrink-0"
                              />
                              <span className="text-[11px] text-[#A1A1AA]">
                                Evidência fotográfica importada automaticamente do checklist para este desvio.
                              </span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <label className="block text-[#A1A1AA] mb-1">Descrição (Item + Local verificado) *</label>
                              <textarea
                                rows={2}
                                value={d.descricao}
                                onChange={(e) => handleDeviationChange(idx, 'descricao', e.target.value)}
                                placeholder="Descrição objetiva do desvio observado..."
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-1.5 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[#A1A1AA] mb-1">Classificação *</label>
                              <select
                                value={d.classificacao}
                                onChange={(e) => handleDeviationChange(idx, 'classificacao', e.target.value)}
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                              >
                                {DEVIATION_CLASSIFICATIONS.map((c) => (
                                  <option key={c.value} value={c.value}>
                                    {formatDeviationClassLabel(c.value, effectiveDiscipline)}
                                  </option>
                                ))}
                              </select>
                              {d.classificacao === 'Não Conformidade Ambiental' && (
                                <select
                                  value={d.severidadeNc || 'Menor'}
                                  onChange={(e) => handleDeviationChange(idx, 'severidadeNc', e.target.value)}
                                  className="w-full mt-1.5 bg-[#0D0E10] border border-[#F43F5E]/40 rounded-lg px-3 py-1.5 text-[#FB7185] focus:outline-none"
                                >
                                  <option value="Menor">Severidade: NC Menor</option>
                                  <option value="Maior">Severidade: NC Maior</option>
                                </select>
                              )}
                            </div>

                            <div>
                              <label className="block text-[#A1A1AA] mb-1">Status</label>
                              <select
                                value={d.status || 'Em Aberto'}
                                onChange={(e) => handleDeviationChange(idx, 'status', e.target.value)}
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                              >
                                {DEVIATION_STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-[#A1A1AA] mb-1">Tratativa</label>
                              <input
                                type="text"
                                value={d.tratativa || ''}
                                onChange={(e) => handleDeviationChange(idx, 'tratativa', e.target.value)}
                                placeholder="Ação corretiva ou de contenção proposta..."
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[#A1A1AA] mb-1">Responsável</label>
                              <input
                                type="text"
                                value={d.responsavel || ''}
                                onChange={(e) => handleDeviationChange(idx, 'responsavel', e.target.value)}
                                placeholder="Nome / Área"
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[#A1A1AA] mb-1">Prazo</label>
                              <input
                                type="text"
                                value={d.prazo || ''}
                                onChange={(e) => handleDeviationChange(idx, 'prazo', e.target.value)}
                                placeholder="Ex: 30/11/2026 ou 15 dias"
                                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:border-[#2EB88A] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ABA 4: CONCLUSÃO DA INSPEÇÃO + ADERÊNCIA & MATURIDADE (SLIDES 33 A 35) */}
              {activeTab === 'conclusion' && (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Escala de Aderência Ambiental (Slides 34 e 35) */}
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-3">
                      <h3 className="font-semibold text-[#F4F4F5] text-sm">
                        {reportMeta.adherenceTitle}
                      </h3>
                      <p className="text-[#71717A] text-[11px]">
                        Calculado automaticamente pelo Índice Geral de Conformidade ({Number(draft.indiceConformidade || 0).toFixed(1)}%).
                      </p>

                      <div className="space-y-2">
                        {ADHERENCE_RULES.map((rule) => {
                          const active = aderenciaAtual === rule.label;
                          return (
                            <div
                              key={rule.label}
                              className={`p-3 rounded-lg border flex items-center justify-between ${
                                active
                                  ? 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                                  : 'bg-[#0D0E10] border-[#232429] text-[#71717A]'
                              }`}
                            >
                              <span className="font-semibold">{rule.label}</span>
                              <span className="font-mono text-[11px]">{rule.range}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Nível de Maturidade (Tabela 02 Slide 34) */}
                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-3">
                      <h3 className="font-semibold text-[#F4F4F5] text-sm">
                        {reportMeta.maturityTitle}
                      </h3>
                      <div className="space-y-2">
                        {MATURITY_LEVELS.map((m) => {
                          const selected = draft.nivelMaturidade === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              onClick={() => updateField('nivelMaturidade', m.value)}
                              className={`w-full text-left p-3 rounded-lg border transition space-y-0.5 ${
                                selected
                                  ? 'bg-[#1E2025] border-[#2EB88A]/50 text-[#F4F4F5]'
                                  : 'bg-[#0D0E10] border-[#232429] text-[#A1A1AA] hover:border-[#32343C]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{m.label}</span>
                                {selected && <span className="text-[10px] text-[#34D399] font-mono">Selecionado</span>}
                              </div>
                              <p className="text-[11px] text-[#71717A] leading-snug">{m.criterion}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Pontos Positivos e Síntese de Desvios */}
                  <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#A1A1AA] font-medium mb-1">
                          Pontos Positivos (práticas em conformidade destacadas)
                        </label>
                        <textarea
                          rows={3}
                          value={draft.pontosPositivos || ''}
                          onChange={(e) => updateField('pontosPositivos', e.target.value)}
                          placeholder="Ex: a segregação adequada dos resíduos, o armazenamento correto dos produtos químicos com FDS disponível e o PGRSS atualizado..."
                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg p-3 text-[#F4F4F5] placeholder-[#71717A] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#A1A1AA] font-medium mb-1">
                          Síntese dos Desvios Identificados (temas/categorias)
                        </label>
                        <textarea
                          rows={3}
                          value={draft.sinteseDesvios || ''}
                          onChange={(e) => updateField('sinteseDesvios', e.target.value)}
                          placeholder="Ex: gestão de resíduos, manutenção preventiva de geradores e reservatórios de água potável..."
                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg p-3 text-[#F4F4F5] placeholder-[#71717A] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#1F2024]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="font-semibold text-[#F4F4F5] text-sm">
                          Texto Final de Conclusão da Inspeção
                        </label>
                        <button
                          type="button"
                          onClick={handleGenerateConclusion}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg text-xs font-medium transition"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Gerar Texto Automático (Modelo Padrão)
                        </button>
                      </div>

                      <textarea
                        rows={6}
                        value={draft.conclusaoTexto || ''}
                        onChange={(e) => updateField('conclusaoTexto', e.target.value)}
                        placeholder="Redija ou gere automaticamente a conclusão com base no índice de conformidade, maturidade, pontos positivos e desvios..."
                        className="w-full bg-[#0D0E10] border border-[#27282E] rounded-xl p-4 text-xs text-[#E4E4E7] leading-relaxed focus:border-[#2EB88A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RODAPÉ COM NAVEGAÇÃO GUIADA POR ETAPAS */}
          <div className="px-4 py-2.5 border-t border-[#1F2024] bg-[#111214] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs pb-safe">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#71717A] truncate">
                Etapa {currentStepIdx + 1}/4 • {draft.clienteNome || 'Multi-Cliente'}
              </span>
              {autoSaveState === 'saving' && (
                <span className="text-[11px] text-[#FBBF24] font-medium shrink-0">• Salvando rascunho...</span>
              )}
              {autoSaveState === 'saved' && (
                <span className="text-[11px] text-[#34D399] font-medium shrink-0">• Salvo automaticamente ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {currentStepIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(STEP_TABS[currentStepIdx - 1])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#E4E4E7] border border-[#2D2F36] rounded-lg transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Etapa Anterior</span>
                </button>
              )}
              {currentStepIdx < STEP_TABS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(STEP_TABS[currentStepIdx + 1])}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition"
                >
                  <span>Próxima Etapa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPrintView(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Visualizar PDF</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-3.5 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition shrink-0"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPrintView && (
        <ReportPrintView
          report={draft}
          linkedOrder={linkedOrder}
          clientLogoUrl={clientLogoUrl}
          userProfile={userProfile}
          onClose={() => setShowPrintView(false)}
        />
      )}

      <ImageLightboxModal
        isOpen={lightboxIndex >= 0}
        images={lightboxImages}
        currentIndex={Math.max(0, lightboxIndex)}
        onChangeIndex={setLightboxIndex}
        onClose={() => setLightboxIndex(-1)}
      />
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
}
