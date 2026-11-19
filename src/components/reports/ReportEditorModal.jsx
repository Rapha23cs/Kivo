import React, { useState, useEffect, useRef } from 'react';
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
  Link2
} from 'lucide-react';
import Badge from '../common/Badge';
import ReportPrintView from './ReportPrintView';
import {
  REPORT_RESULT_GUIDELINES,
  DEVIATION_CLASSIFICATIONS,
  DEVIATION_STATUS_OPTIONS,
  MATURITY_LEVELS,
  ADHERENCE_RULES,
  PHOTO_SECTIONS,
  calculateAdherenceLevel,
  calculateConformityIndex,
  suggestMaturityLevel,
  summarizeDeviationsByClass,
  buildDefaultConclusionText
} from '../../data/reportTemplateData';
import { ReportService } from '../../supabase/reportService';

export default function ReportEditorModal({
  report,
  isOpen,
  onClose,
  onSaveReport,
  onLocalDraftUpdate,
  linkedOrder,
  userProfile
}) {
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
  const [selectedPhotoSection, setSelectedPhotoSection] = useState(
    initialResume.selectedPhotoSection || PHOTO_SECTIONS[0]
  );
  const [showOnlyWithPhotos, setShowOnlyWithPhotos] = useState(false);
  const [showTable01Rules, setShowTable01Rules] = useState(false);
  const [showTable03Rules, setShowTable03Rules] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [saving, setSaving] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState('idle'); // idle | saving | saved
  const [showPrintView, setShowPrintView] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

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
    if (resumed.activeTab) setActiveTab(resumed.activeTab);
    if (resumed.selectedPhotoSection) setSelectedPhotoSection(resumed.selectedPhotoSection);
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
      const url = await ReportService.uploadImage(file, draft.codigoRelatorio, 'fachada');
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
      const url = await ReportService.uploadImage(file, draft.codigoRelatorio, `item-${ordem}`);
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
          secao: selectedPhotoSection,
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
      indiceConformidade: draft.indiceConformidade,
      nivelAderencia: draft.nivelAderencia,
      nivelMaturidade: draft.nivelMaturidade,
      pontosPositivos: draft.pontosPositivos,
      sinteseDesvios: draft.sinteseDesvios
    });
    updateField('conclusaoTexto', text);
  };

  const handleSave = async (targetStatus) => {
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
    } finally {
      setSaving(false);
    }
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

  const photos = draft.registrosFotograficos || [];
  const attachedCount = photos.filter((f) => Boolean(f.fotoUrl)).length;
  const filteredPhotos = photos.filter((f) => {
    const matchSec = f.secao === selectedPhotoSection;
    const matchFilled = !showOnlyWithPhotos || Boolean(f.fotoUrl);
    return matchSec && matchFilled;
  });

  const aderenciaAtual = draft.nivelAderencia || calculateAdherenceLevel(draft.indiceConformidade);

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-3 bg-black/85 backdrop-blur-sm">
        <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:w-[96vw] sm:max-w-[1440px] h-[100dvh] sm:h-[94dvh] rounded-none sm:rounded-xl shadow-2xl overflow-hidden flex flex-col">

          {/* HEADER */}
          <div className="px-4 sm:px-5 py-3 border-b border-[#232429] bg-[#141518] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-[11px] font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2.5 py-1 rounded border border-[#27282E] shrink-0">
                {draft.codigoRelatorio}
              </span>
              <Badge variant={draft.status === 'finalizado' ? 'success' : 'warning'} size="sm">
                {draft.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
              </Badge>
              {(linkedOrder || draft.inspecaoCodigo) && (
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-[#34D399] bg-[#122620] px-2 py-0.5 rounded border border-[#2EB88A]/30 shrink-0">
                  <Link2 className="w-3 h-3" />
                  {linkedOrder?.id || draft.inspecaoCodigo}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#F4F4F5] truncate">
                  Relatório de Inspeção Ambiental — {draft.unidade || 'Nova Unidade'}
                </h2>
                <p className="text-[11px] text-[#71717A] truncate">
                  Cliente: <strong className="text-[#A1A1AA]">{draft.clienteNome || 'Não definido'}</strong> • Responsável: {draft.responsavel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {linkedOrder && (
                <button
                  type="button"
                  onClick={handleSyncFromChecklist}
                  title={`Atualizar resultados, desvios e fotos com os dados atuais de ${linkedOrder.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sincronizar Checklist</span>
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
                onClick={() => setShowPrintView(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg transition"
              >
                <Printer className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="hidden sm:inline">Visualizar / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22] transition"
              >
                <X className="w-5 h-5" />
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
              {/* Sidebar das 5 Seções Fotográficas (horizontal em mobile/tablet, lateral em desktop) */}
              <aside className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[#232429] bg-[#111214] p-2.5">
                <div className="hidden lg:block px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#71717A] mb-1">
                  Blocos Fotográficos (5 Seções)
                </div>
                <div className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-y-auto pb-1 lg:pb-0">
                  {PHOTO_SECTIONS.map((sec) => {
                    const secItems = photos.filter((f) => f.secao === sec);
                    const secFilled = secItems.filter((f) => Boolean(f.fotoUrl)).length;
                    const active = selectedPhotoSection === sec;
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
                    <h3 className="font-semibold text-[#F4F4F5]">{selectedPhotoSection}</h3>
                    <p className="text-[11px] text-[#71717A]">
                      Anexe as evidências fotográficas nos pontos correspondentes (apenas itens com foto são exibidos no PDF final).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-semibold text-[#34D399] bg-[#122620] px-2 py-0.5 rounded border border-[#2EB88A]/30">
                            Registro #{slot.ordem}
                          </span>
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
                                src={slot.fotoUrl}
                                alt={slot.legenda}
                                className="w-full h-40 object-cover rounded-lg border border-[#232429]"
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
                            <label className="cursor-pointer flex flex-col items-center gap-2 text-center py-4">
                              <Camera className="w-6 h-6 text-[#71717A]" />
                              <span className="text-xs text-[#A1A1AA] font-medium">
                                {uploadingKey === `slot-${slot.ordem}` ? 'Enviando imagem...' : 'Clique para anexar imagem'}
                              </span>
                              <span className="text-[10px] text-[#71717A]">JPG, PNG ou captura de campo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleUploadPhotoSlot(slot.ordem, e)}
                              />
                            </label>
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
                              src={draft.fachadaUrl}
                              alt="Fachada da Unidade"
                              className="w-full h-44 object-cover rounded-lg border border-[#232429]"
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
                        <label className="text-[10px] uppercase font-medium text-[#FB7185] block mb-1">Não Conformidades Ambientais</label>
                        <input
                          type="number"
                          min="0"
                          value={draft.naoConformidades}
                          onChange={(e) => updateField('naoConformidades', Number(e.target.value))}
                          className="w-full bg-[#141518] border border-[#27282E] rounded px-2.5 py-1.5 text-base font-mono font-bold text-[#FB7185] focus:border-[#2EB88A] focus:outline-none"
                        />
                      </div>

                      <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                        <label className="text-[10px] uppercase font-medium text-[#A1A1AA] block mb-1">Ocorrências Ambientais</label>
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
                    <div className="flex items-center gap-2">
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
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2.5 py-0.5 rounded border border-[#27282E]">
                              Desvio Nº {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDeviation(idx)}
                              className="text-[#71717A] hover:text-[#FB7185] flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remover
                            </button>
                          </div>

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
                                  <option key={c.value} value={c.value}>{c.label}</option>
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
                        Classificação do Nível de Aderência Ambiental
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
                        Nível de Maturidade da Gestão Ambiental
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
                        rows={8}
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

          {/* RODAPÉ */}
          <div className="px-4 py-2.5 border-t border-[#1F2024] bg-[#111214] flex items-center justify-between gap-3 shrink-0 text-xs pb-safe">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#71717A] truncate">
                Kivo • Relatório ({draft.clienteNome || 'Multi-Cliente'})
              </span>
              {autoSaveState === 'saving' && (
                <span className="text-[11px] text-[#FBBF24] font-medium shrink-0">• Salvando rascunho...</span>
              )}
              {autoSaveState === 'saved' && (
                <span className="text-[11px] text-[#34D399] font-medium shrink-0">• Salvo automaticamente ✓</span>
              )}
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition shrink-0"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {showPrintView && (
        <ReportPrintView report={draft} onClose={() => setShowPrintView(false)} />
      )}
    </>
  );
}
