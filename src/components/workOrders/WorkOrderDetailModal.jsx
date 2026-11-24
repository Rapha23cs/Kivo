import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  FileBarChart2,
  Camera,
  Upload,
  Check,
  Building2,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Filter,
  AlertOctagon,
  Search,
  Trash2,
  FlaskConical,
  Droplets,
  Waves,
  Wind,
  Volume2,
  Flame,
  FileCheck,
  TreePine,
  GraduationCap,
  Sparkles,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  ArrowDown,
  ExternalLink,
  RotateCcw,
  Download,
  Share2,
  History
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import ImageLightboxModal from '../common/ImageLightboxModal';
import TechnicalReportView from './TechnicalReportView';
import { DataService } from '../../supabase/dataService';
import { calculateAdherenceLevel } from '../../data/reportTemplateData';
import {
  getOrderStatusMeta,
  formatDateTimeWatermark,
  exportCsvRows,
  buildExecutiveSummaryText,
  copyTextToClipboard,
  sanitizeMediaUrl
} from '../../utils/kivoHelpers';
import {
  EMSERH_ORIENTATIONS,
  EMSERH_TOPICS,
  EMSERH_TOPICS_CONFIG,
  EMSERH_CLASSIFICATIONS,
  calculateInspectionSummary,
  calculateTopicBreakdown
} from '../../data/emserhChecklistData';
import {
  RISK_PROBABILITIES,
  RISK_SEVERITIES,
  calculateRiskMatrix
} from '../../data/sstChecklistData';

// Helper de ícone por temática oficial
function TopicIcon({ topic, className = "w-4 h-4" }) {
  const config = EMSERH_TOPICS_CONFIG[topic];
  const iconName = config?.iconName;

  switch (iconName) {
    case 'Trash2':
      return <Trash2 className={className} />;
    case 'FlaskConical':
      return <FlaskConical className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'Waves':
      return <Waves className={className} />;
    case 'Wind':
      return <Wind className={className} />;
    case 'Volume2':
      return <Volume2 className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'FileCheck':
      return <FileCheck className={className} />;
    case 'Building2':
      return <Building2 className={className} />;
    case 'TreePine':
      return <TreePine className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    default:
      return <ShieldCheck className={className} />;
  }
}

export default function WorkOrderDetailModal({
  order,
  isOpen,
  onClose,
  onUpdateOrder,
  linkedReport,
  previousOrder,
  onOpenTechnicalReport,
  userProfile = null
}) {
  if (!isOpen || !order) return null;

  const { confirm, toast } = useFeedback();
  const resumeStorageKey = `kivo_resume_order_${order.id}`;
  const initialResume = useMemo(() => {
    try {
      const raw = localStorage.getItem(resumeStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [resumeStorageKey]);

  const [activeTab, setActiveTab] = useState(initialResume.activeTab || 'checklist'); // checklist, deviations
  const [currentOrder, setCurrentOrder] = useState(order);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOrientations, setShowOrientations] = useState(false);
  const [showOverviewPanel, setShowOverviewPanel] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [stampPhotos, setStampPhotos] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [saveBadgeText, setSaveBadgeText] = useState('Sincronizado');

  useEffect(() => {
    setCurrentOrder((prev) => {
      if (!prev || prev.id !== order.id) return order;
      if (order.supabaseId && prev.supabaseId !== order.supabaseId) {
        return { ...prev, supabaseId: order.supabaseId };
      }
      return prev;
    });
  }, [order]);
  
  // Filtros avançados do checklist
  const [selectedTopic, setSelectedTopic] = useState(initialResume.selectedTopic || 'ALL');
  const [statusFilter, setStatusFilter] = useState(initialResume.statusFilter || 'ALL'); // ALL, pending, sim, nao, na
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(
        resumeStorageKey,
        JSON.stringify({ activeTab, selectedTopic, statusFilter })
      );
    } catch {
      // ignora falha de armazenamento UI
    }
  }, [resumeStorageKey, activeTab, selectedTopic, statusFilter]);

  // Mapear desvios da vistoria anterior da mesma unidade (para reincidência e reinspeção)
  const previousDeviationsMap = useMemo(() => {
    const map = new Map();
    if (!previousOrder?.checklist) return map;
    previousOrder.checklist.forEach((it) => {
      if (it.status === 'nao' || it.status === 'nao_conforme') {
        map.set(Number(it.number), it);
      }
    });
    return map;
  }, [previousOrder]);

  // Calcular Resumo da Inspeção em tempo real
  const summary = useMemo(() => {
    return calculateInspectionSummary(currentOrder.checklist || []);
  }, [currentOrder.checklist]);

  // Breakdown por temática (total, conformes, desvios por tópico)
  const topicBreakdown = useMemo(() => {
    return calculateTopicBreakdown(currentOrder.checklist || []);
  }, [currentOrder.checklist]);

  const commitOrderUpdate = (updated) => {
    setCurrentOrder(updated);
    onUpdateOrder(updated);
    setSaveBadgeText(navigator.onLine === false ? 'Salvo offline ✓' : 'Salvo ✓');
  };

  const handleToggleComplete = async () => {
    if (currentOrder.status === 'completed') {
      commitOrderUpdate({ ...currentOrder, status: 'in_progress' });
      toast.info({ title: 'Vistoria reaberta', message: `${currentOrder.id} voltou para Em Andamento.` });
      return;
    }

    const missingRule6 = (currentOrder.checklist || []).filter(
      (i) => (i.status === 'nao' || i.status === 'nao_conforme') && (!i.observation?.trim() || !i.deadline?.trim())
    );
    const pendingCount = (currentOrder.checklist || []).filter((i) => !i.status).length;

    if (pendingCount > 0 || missingRule6.length > 0) {
      const alerts = [];
      if (pendingCount > 0) alerts.push(`${pendingCount} item(ns) ainda estão sem resposta (Pendentes)`);
      if (missingRule6.length > 0) alerts.push(`${missingRule6.length} desvio(s) sem observação ou prazo definido (Regra 6)`);

      const ok = await confirm({
        title: 'Revisar pendências antes de concluir?',
        message: `Identificamos pontos incompletos nesta inspeção: ${alerts.join(' e ')}. Deseja concluir mesmo assim?`,
        detail: currentOrder.hospitalName,
        confirmLabel: 'Concluir mesmo assim',
        cancelLabel: 'Voltar e revisar',
        variant: 'warning'
      });
      if (!ok) {
        if (pendingCount > 0) {
          setActiveTab('checklist');
          setStatusFilter('pending');
        }
        return;
      }
    }

    const completedOrder = {
      ...currentOrder,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    commitOrderUpdate(completedOrder);
    toast.success({
      title: 'Vistoria concluída',
      message: `${currentOrder.id} • Conformidade ${summary.percentualConformidade}%`,
      duration: 8000,
      action: onOpenTechnicalReport
        ? {
            label: linkedReport ? 'Continuar Relatório →' : 'Gerar Relatório →',
            onClick: () => onOpenTechnicalReport(completedOrder)
          }
        : undefined
    });
  };

  const handleChecklistStatusChange = (itemId, clickedStatus) => {
    const updatedChecklist = (currentOrder.checklist || []).map((item) => {
      if (item.id !== itemId) return item;
      // H3: clicar novamente no mesmo status limpa para pendente (null)
      const isSame = item.status === clickedStatus;
      const nextStatus = isSame ? null : clickedStatus;
      return {
        ...item,
        status: nextStatus,
        classification: nextStatus === 'nao' ? (item.classification || 'Médio') : item.classification,
        responsible: nextStatus === 'nao' ? (item.responsible || 'Gerência da Unidade / SCIH') : item.responsible,
        deadline: nextStatus === 'nao' ? (item.deadline || '15 dias') : item.deadline
      };
    });

    commitOrderUpdate({ ...currentOrder, checklist: updatedChecklist });
  };

  const handleBatchMarkPendingTopic = (targetStatus) => {
    if (selectedTopic === 'ALL') return;
    const prevSnapshot = currentOrder.checklist;
    let changedCount = 0;

    const updatedChecklist = (currentOrder.checklist || []).map((item) => {
      const itemTopic = item.topic || item.topicTitle;
      if (itemTopic !== selectedTopic || item.status) return item;
      changedCount += 1;
      return { ...item, status: targetStatus };
    });

    if (changedCount === 0) {
      toast.info({ message: 'Todos os itens desta temática já estão avaliados.' });
      return;
    }

    commitOrderUpdate({ ...currentOrder, checklist: updatedChecklist });
    toast.success({
      title: `${changedCount} item(ns) marcados como ${targetStatus === 'sim' ? 'Sim' : 'N/A'}`,
      message: selectedTopic,
      duration: 6000,
      action: {
        label: 'Desfazer',
        onClick: () => commitOrderUpdate({ ...currentOrder, checklist: prevSnapshot })
      }
    });
  };

  const handleImportPreviousDeviations = async () => {
    if (!previousOrder || previousDeviationsMap.size === 0) return;
    const prevSnapshot = currentOrder.checklist;
    let importedCount = 0;

    const updatedChecklist = (currentOrder.checklist || []).map((item) => {
      const prevDev = previousDeviationsMap.get(Number(item.number));
      if (!prevDev || item.status) return item;
      importedCount += 1;
      return {
        ...item,
        status: 'nao',
        classification: prevDev.classification || 'Médio',
        responsible: prevDev.responsible || 'Gerência da Unidade / SCIH',
        deadline: prevDev.deadline || '15 dias',
        observation: `[Reincidência de ${previousOrder.id}] ${prevDev.observation || ''}`.trim()
      };
    });

    if (importedCount === 0) {
      toast.info({
        message: 'Os itens com desvio na vistoria anterior já possuem resposta nesta inspeção.'
      });
      return;
    }

    commitOrderUpdate({ ...currentOrder, checklist: updatedChecklist });
    toast.success({
      title: `${importedCount} desvio(s) da vistoria anterior importados`,
      message: `Origem: ${previousOrder.id}`,
      duration: 6000,
      action: {
        label: 'Desfazer',
        onClick: () => commitOrderUpdate({ ...currentOrder, checklist: prevSnapshot })
      }
    });
  };

  const handleScrollToNextPending = () => {
    const nextPending = displayedItems.find((i) => !i.status) || checklistItems.find((i) => !i.status);
    if (!nextPending) {
      toast.success({ message: 'Nenhum item pendente restante!' });
      return;
    }
    const el = document.getElementById(`checklist-item-${nextPending.id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setSelectedTopic('ALL');
      setStatusFilter('pending');
    }
  };

  const handleCopySummary = async () => {
    const text = buildExecutiveSummaryText({
      code: currentOrder.id,
      clientName: currentOrder.clientName,
      unitName: currentOrder.hospitalName,
      regional: currentOrder.regional,
      municipio: currentOrder.municipio,
      date: currentOrder.scheduledDate,
      totalEvaluated: summary.totalAvaliados,
      totalConformities: summary.totalSim,
      conformityPercent: summary.percentualConformidade,
      adherenceLevel: calculateAdherenceLevel(summary.percentualConformidade),
      deviations: summary.desvios
    });
    await copyTextToClipboard(text);
    toast.success({
      title: 'Resumo copiado!',
      message: 'Pronto para colar no WhatsApp ou e-mail.'
    });
  };

  const handleExportDeviationsCsv = () => {
    if (summary.desvios.length === 0) return;
    exportCsvRows(
      ['Item', 'Temática', 'Requisito', 'Classificação', 'Anomalia', 'Responsável', 'Prazo'],
      summary.desvios.map((d) => [
        `#${d.number}`,
        d.topic || '',
        d.question || '',
        d.classification || 'Médio',
        d.observation || '',
        d.responsible || '',
        d.deadline || ''
      ]),
      `desvios-${currentOrder.id}.csv`
    );
    toast.success({ title: 'Planilha exportada', message: `desvios-${currentOrder.id}.csv` });
  };

  const handleChecklistFieldChange = (itemId, field, value) => {
    const updatedChecklist = (currentOrder.checklist || []).map(item => {
      if (item.id === itemId) {
        const nextItem = { ...item, [field]: value };
        if (field === 'riskProbability' || field === 'riskSeverity') {
          const risk = calculateRiskMatrix(
            field === 'riskProbability' ? value : item.riskProbability || 3,
            field === 'riskSeverity' ? value : item.riskSeverity || 3
          );
          nextItem.classification = risk.classification;
          if (!item.deadline) {
            nextItem.deadline = risk.suggestedDeadline;
          }
        }
        return nextItem;
      }
      return item;
    });

    commitOrderUpdate({ ...currentOrder, checklist: updatedChecklist });
  };

  const handleUploadItemPhoto = async (itemId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingItemId(itemId);
    try {
      const stamp = stampPhotos ? formatDateTimeWatermark(currentOrder.hospitalName) : '';
      const url = await DataService.uploadChecklistEvidence(file, currentOrder.id, itemId, stamp);
      if (url) {
        handleChecklistFieldChange(itemId, 'evidenceUrl', url);
        toast.success({
          title: 'Evidência anexada',
          message: navigator.onLine === false ? 'Salva offline para envio automático.' : 'Imagem salva com sucesso.'
        });
      }
    } finally {
      setUploadingItemId(null);
      e.target.value = '';
    }
  };

  // Filtragem avançada: Temática + Status de Resposta + Busca de Texto
  const displayedItems = useMemo(() => {
    return (currentOrder.checklist || []).filter(item => {
      // 1. Filtro por Temática
      const itemTopic = item.topic || item.topicTitle;
      const matchesTopic = selectedTopic === 'ALL' || itemTopic === selectedTopic;
      if (!matchesTopic) return false;

      // 2. Filtro por Status
      if (statusFilter === 'sim' && item.status !== 'sim' && item.status !== 'conforme') return false;
      if (statusFilter === 'nao' && item.status !== 'nao' && item.status !== 'nao_conforme') return false;
      if (statusFilter === 'na' && item.status !== 'na' && item.status !== 'nao_aplicavel') return false;
      if (statusFilter === 'pending' && Boolean(item.status)) return false;

      // 3. Filtro por Busca de Texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesText =
          (item.question && item.question.toLowerCase().includes(query)) ||
          (item.item && item.item.toLowerCase().includes(query)) ||
          (item.number && item.number.toString().includes(query)) ||
          (item.observation && item.observation.toLowerCase().includes(query)) ||
          (item.responsible && item.responsible.toLowerCase().includes(query));
        if (!matchesText) return false;
      }

      return true;
    });
  }, [currentOrder.checklist, selectedTopic, statusFilter, searchTerm]);

  // Contadores para os filtros de status
  const checklistItems = currentOrder.checklist || [];
  const countSim = checklistItems.filter(i => i.status === 'sim' || i.status === 'conforme').length;
  const countNao = checklistItems.filter(i => i.status === 'nao' || i.status === 'nao_conforme').length;
  const countNA = checklistItems.filter(i => i.status === 'na' || i.status === 'nao_aplicavel').length;
  const countPending = checklistItems.filter(i => !i.status).length;

  const lightboxImages = useMemo(() => {
    return checklistItems
      .filter((i) => Boolean(i.evidenceUrl))
      .map((i) => ({
        itemId: i.id,
        url: i.evidenceUrl,
        title: `Item #${i.number} • ${i.topic || ''}`,
        subtitle: i.question,
        observation: i.observation
      }));
  }, [checklistItems]);

  const openLightboxForItem = (itemId) => {
    const idx = lightboxImages.findIndex((img) => img.itemId === itemId);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const orderStatusMeta = getOrderStatusMeta(currentOrder.status);

  const modalContent = (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/85 backdrop-blur-sm">
        <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:w-[96vw] sm:max-w-[1440px] h-[100dvh] sm:h-[94dvh] rounded-none sm:rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all">

          {/* HEADER PRINCIPAL COMPACTO */}
          <div className="px-4 sm:px-5 py-3 border-b border-[#232429] bg-[#141518] flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="font-mono text-[11px] font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2 py-0.5 rounded border border-[#27282E] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#2EB88A]" />
                  {currentOrder.id}
                </span>
                <Badge variant={orderStatusMeta.variant} size="sm">
                  {orderStatusMeta.label}
                </Badge>
                <span className="text-[10px] font-medium text-[#34D399] bg-[#122620]/70 border border-[#2EB88A]/25 px-2 py-0.5 rounded">
                  {saveBadgeText}
                </span>
              </div>

              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-[#F4F4F5] tracking-tight truncate">
                  {currentOrder.title}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-[#71717A] flex-wrap">
                  <span className="flex items-center gap-1 text-[#A1A1AA] truncate">
                    <Building2 className="w-3 h-3 text-[#71717A] shrink-0" />
                    <strong className="text-[#E4E4E7] truncate">{currentOrder.hospitalName}</strong>
                  </span>
                  <span className="hidden sm:inline text-[#32343C]">•</span>
                  <span className="flex items-center gap-1 text-[#A1A1AA]">
                    <User className="w-3 h-3 text-[#71717A]" />
                    {currentOrder.technicianName}
                  </span>
                  <span className="hidden md:inline text-[#32343C]">•</span>
                  <span className="hidden md:inline text-[#71717A] font-mono">
                    {currentOrder.scheduledDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações Rápidas do Header */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {currentOrder.status !== 'completed' ? (
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] text-[#080A09] rounded-lg font-semibold text-xs transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  Concluir Vistoria
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  title="Clique para reabrir a vistoria"
                  className="text-[#34D399] hover:bg-[#173028] font-medium text-[11px] flex items-center gap-1 bg-[#122620] px-2.5 py-1 rounded-lg border border-[#2EB88A]/30 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Finalizada (Reabrir)
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowOverviewPanel(!showOverviewPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                  showOverviewPanel
                    ? 'bg-[#1E2025] text-[#34D399] border-[#2EB88A]/40'
                    : 'bg-[#1C1D22] text-[#A1A1AA] border-[#2D2F36] hover:text-[#F4F4F5]'
                }`}
                title="Exibir cabeçalho pré-checklist, resumo completo e 8 regras"
              >
                <Info className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="hidden sm:inline">Dados & Regras</span>
                {showOverviewPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1C1D22] text-[#F4F4F5] border border-[#2D2F36] hover:bg-[#25272E] rounded-lg transition"
                title="Visualizar espelho bruto por temática do checklist"
              >
                <FileText className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span className="hidden sm:inline">Espelho Checklist</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22] transition border border-transparent hover:border-[#27282E]"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PAINEL EXPANSÍVEL SOB DEMANDA: PRÉ-CHECKLIST + RESUMO 5 CARDS + 8 ORIENTAÇÕES */}
          {showOverviewPanel && (
            <div className="bg-[#0D0E10] border-b border-[#232429] max-h-[42vh] overflow-y-auto shrink-0 divide-y divide-[#232429]">
              {/* Pré-Checklist (6 campos) */}
              <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#71717A]" /> Unidade:
                  </span>
                  <span className="text-[#F4F4F5] font-medium truncate block" title={currentOrder.hospitalName}>
                    {currentOrder.hospitalName}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <Compass className="w-3 h-3 text-[#71717A]" /> Regional:
                  </span>
                  <span className="text-[#E4E4E7] font-medium block truncate">
                    {currentOrder.regional || "Regional Metropolitana"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#71717A]" /> Município:
                  </span>
                  <span className="text-[#A1A1AA] block truncate">
                    {currentOrder.municipio || "São Luís"}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#71717A]" /> Data da Inspeção:
                  </span>
                  <span className="text-[#F4F4F5] font-mono block">
                    {currentOrder.scheduledDate}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-[#71717A]" /> Responsável:
                  </span>
                  <span className="text-[#E4E4E7] font-medium truncate block">
                    {currentOrder.technicianName}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[#71717A] tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#71717A]" /> Tipo de Inspeção:
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium inline-block border ${
                    currentOrder.inspectionType === 'Programada'
                      ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                      : 'bg-[#1A1B20] text-[#E4E4E7] border-[#2D2F36]'
                  }`}>
                    {currentOrder.inspectionType || "Programada"}
                  </span>
                </div>
              </div>

              {/* Resumo Completo (5 Indicadores) */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#141518] border border-[#232429] rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-[#71717A] uppercase font-medium block">Total Avaliados</span>
                  <span className="text-lg font-bold font-mono text-[#F4F4F5]">{summary.totalAvaliados}</span>
                  <span className="text-[10px] text-[#71717A] block">Sim + Não</span>
                </div>
                <div className="bg-[#141518] border border-[#232429] rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-[#34D399] uppercase font-medium block">Conforme (Sim)</span>
                  <span className="text-lg font-bold font-mono text-[#34D399]">{summary.totalSim}</span>
                  <span className="text-[10px] text-[#71717A] block">Atende requisitos</span>
                </div>
                <div className={`border rounded-lg p-2.5 text-center ${summary.totalNao > 0 ? 'bg-[#181214] border-[#F43F5E]/30' : 'bg-[#141518] border-[#232429]'}`}>
                  <span className="text-[10px] text-[#FB7185] uppercase font-medium block">Desvios (Não)</span>
                  <span className="text-lg font-bold font-mono text-[#FB7185]">{summary.totalNao}</span>
                  <span className="text-[10px] text-[#71717A] block">{summary.totalNao > 0 ? 'Exige Plano de Ação' : 'Sem desvios'}</span>
                </div>
                <div className="bg-[#141518] border border-[#232429] rounded-lg p-2.5 text-center">
                  <span className="text-[10px] text-[#71717A] uppercase font-medium block">Não Aplicável (N/A)</span>
                  <span className="text-lg font-bold font-mono text-[#E4E4E7]">{summary.totalNA}</span>
                  <span className="text-[10px] text-[#71717A] block">Fora do escopo</span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-[#141518] border border-[#2EB88A]/30 rounded-lg p-2.5 text-center flex flex-col justify-center">
                  <span className="text-[10px] text-[#A1A1AA] font-medium uppercase tracking-wider block">% Conformidade</span>
                  <span className={`text-xl font-bold font-mono leading-tight ${
                    summary.percentualConformidade >= 80 ? 'text-[#34D399]' : summary.percentualConformidade >= 60 ? 'text-[#E4E4E7]' : 'text-[#FB7185]'
                  }`}>
                    {summary.percentualConformidade}%
                  </span>
                </div>
              </div>

              {/* 8 Orientações Oficiais */}
              <div className="bg-[#141518]">
                <button
                  type="button"
                  onClick={() => setShowOrientations(!showOrientations)}
                  className="w-full px-5 py-2 flex items-center justify-between text-xs text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                >
                  <span className="flex items-center gap-2 font-medium text-[#34D399]">
                    <Info className="w-3.5 h-3.5 text-[#2EB88A]" />
                    Orientações para Preenchimento do Checklist (8 Regras)
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#71717A]">
                    {showOrientations ? 'Ocultar' : 'Ver regras'}
                    {showOrientations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {showOrientations && (
                  <div className="px-5 pb-3 pt-1 text-xs space-y-1.5 bg-[#0D0E10]">
                    {EMSERH_ORIENTATIONS.map((orient, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-xs leading-relaxed ${
                          idx === 5
                            ? "bg-[#18191D] text-[#F4F4F5] border border-[#2EB88A]/30 font-medium flex items-start gap-2"
                            : "text-[#A1A1AA] bg-[#141518]"
                        }`}
                      >
                        {idx === 5 && <AlertTriangle className="w-4 h-4 text-[#2EB88A] shrink-0 mt-0.5" />}
                        <span>{orient}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BARRA DE ABAS + RESUMO COMPACTO EM 1 LINHA */}
          <div className="px-4 sm:px-5 border-b border-[#232429] flex flex-wrap items-center justify-between gap-3 bg-[#111214] shrink-0">
            <div className="flex gap-5 text-xs font-medium overflow-x-auto">
              <button
                onClick={() => setActiveTab('checklist')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'checklist'
                    ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Checklist de Inspeção</span>
                <span className="text-[10px] bg-[#1A1B20] text-[#A1A1AA] px-1.5 py-0.5 rounded font-mono border border-[#27282E]">
                  {checklistItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('deviations')}
                className={`py-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
                  activeTab === 'deviations'
                    ? 'border-[#F43F5E] text-[#FB7185] font-semibold'
                    : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Plano de Desvios</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  summary.desviosCount > 0 ? 'bg-[#221216] text-[#FB7185] border border-[#F43F5E]/30 font-semibold' : 'bg-[#1A1B20] text-[#71717A] border border-[#27282E]'
                }`}>
                  {summary.desviosCount}
                </span>
              </button>
            </div>

            {/* Resumo Numérico Compacto Sempre Visível (incluindo Mobile/Tablet) */}
            <button
              type="button"
              onClick={() => setShowOverviewPanel(!showOverviewPanel)}
              className="flex items-center justify-between md:justify-end gap-2.5 sm:gap-3 text-[11px] py-1.5 px-2.5 rounded-lg hover:bg-[#18191D] transition w-full md:w-auto border-t border-[#1F2024] md:border-t-0"
              title="Clique para ver resumo detalhado e cabeçalho pré-checklist"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-[#71717A] font-mono">
                  <strong className="text-[#E4E4E7]">{summary.totalAvaliados}</strong>/{checklistItems.length}
                </span>
                <span className="text-[#34D399] font-mono font-semibold">{summary.totalSim} Sim</span>
                <span className="text-[#FB7185] font-mono font-semibold">{summary.totalNao} Não</span>
                <span className="text-[#A1A1AA] font-mono">{summary.totalNA} N/A</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-14 sm:w-16 bg-[#18191D] rounded-full h-1.5 overflow-hidden border border-[#232429]">
                  <div
                    className={`h-full transition-all duration-300 ${
                      summary.percentualConformidade >= 80 ? 'bg-[#2EB88A]' : summary.percentualConformidade >= 60 ? 'bg-[#94A3B8]' : 'bg-[#E11D48]'
                    }`}
                    style={{ width: `${summary.percentualConformidade}%` }}
                  />
                </div>
                <span className={`font-mono font-bold ${
                  summary.percentualConformidade >= 80 ? 'text-[#34D399]' : summary.percentualConformidade >= 60 ? 'text-[#E4E4E7]' : 'text-[#FB7185]'
                }`}>
                  {summary.percentualConformidade}%
                </span>
              </div>
            </button>
          </div>

          {/* CORPO DO MODAL */}
          {activeTab === 'checklist' ? (
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-[#0D0E10]">

              {/* SIDEBAR LATERAL DE TEMÁTICAS (DESKTOP: TODAS AS 11 VISÍVEIS) */}
              <aside className="hidden lg:flex lg:w-72 shrink-0 flex-col border-r border-[#232429] bg-[#111214] min-h-0">
                <div className="px-4 py-2.5 border-b border-[#1F2024] flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                    Temáticas Oficiais (11)
                  </span>
                  <span className="text-[10px] font-mono text-[#71717A]">{checklistItems.length} itens</span>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTopic('ALL')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between border ${
                      selectedTopic === 'ALL'
                        ? 'bg-[#1E2025] border-[#2EB88A]/50 text-[#F4F4F5] font-semibold'
                        : 'bg-transparent border-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#17181B]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${selectedTopic === 'ALL' ? 'text-[#2EB88A]' : 'text-[#71717A]'}`} />
                      <span className="truncate">Todas as Temáticas</span>
                    </span>
                    <span className="text-[10px] bg-[#141518] px-1.5 py-0.5 rounded font-mono text-[#E4E4E7] border border-[#232429]">
                      {checklistItems.length}
                    </span>
                  </button>

                  {Object.keys(topicBreakdown).map((topic, i) => {
                    const b = topicBreakdown[topic];
                    const isSelected = selectedTopic === topic;
                    const config = EMSERH_TOPICS_CONFIG[topic];
                    const answered = (b?.sim || 0) + (b?.nao || 0) + (b?.na || 0);

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedTopic(topic)}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition flex flex-col gap-1.5 border text-left ${
                          isSelected
                            ? 'bg-[#1E2025] border-[#2EB88A]/50 text-[#F4F4F5] font-semibold'
                            : 'bg-transparent border-transparent text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#17181B]'
                        }`}
                        title={config?.description}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="flex items-center gap-2 min-w-0">
                            <TopicIcon topic={topic} className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#2EB88A]' : 'text-[#71717A]'}`} />
                            <span className="truncate">{config?.name || topic}</span>
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {b?.hasDesvios && (
                              <span
                                className="w-1.5 h-1.5 rounded-full bg-[#E11D48]"
                                title={`${b.nao} desvio(s)`}
                              />
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
                              answered === b?.total && b?.total > 0
                                ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                                : 'bg-[#141518] text-[#A1A1AA] border-[#232429]'
                            }`}>
                              {answered}/{b?.total || 0}
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1 bg-[#0D0E10] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              b?.hasDesvios ? 'bg-[#F43F5E]' : answered === b?.total && b?.total > 0 ? 'bg-[#2EB88A]' : 'bg-[#52525B]'
                            }`}
                            style={{ width: `${b?.total > 0 ? Math.round((answered / b.total) * 100) : 0}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* ÁREA PRINCIPAL DO CHECKLIST (BUSCA + FILTROS + ITENS) */}
              <div className="flex-1 min-w-0 flex flex-col min-h-0">
                {/* Barra de Filtros Compacta */}
                <div className="px-4 py-3 bg-[#141518] border-b border-[#232429] space-y-2.5 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                    {/* Dropdown de Temática para telas menores (< lg) */}
                    <div className="lg:hidden flex-1">
                      <select
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-xs text-[#F4F4F5] font-medium focus:border-[#2EB88A] focus:outline-none"
                      >
                        <option value="ALL" className="bg-[#141518]">
                          Todas as Temáticas ({checklistItems.length} itens)
                        </option>
                        {Object.keys(topicBreakdown).map((topic, idx) => {
                          const b = topicBreakdown[topic];
                          return (
                            <option key={idx} value={topic} className="bg-[#141518]">
                              {idx + 1}. {topic} ({b?.total || 0}{b?.nao > 0 ? ` • ${b.nao} desvios` : ''})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Campo de Busca Rápida */}
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-2 text-[#71717A]" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar item por termo (ex: FISPQ, resíduos, água, ETE)..."
                        className="w-full bg-[#0D0E10] border border-[#232429] hover:border-[#32343C] rounded-lg pl-9 pr-8 py-1.5 text-xs text-[#F4F4F5] placeholder-[#71717A] focus:border-[#2EB88A] focus:outline-none transition"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1.5 text-[#71717A] hover:text-[#F4F4F5] text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Sub-filtros de Status */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                          statusFilter === 'ALL'
                            ? 'bg-[#1E2025] text-[#F4F4F5] border-[#32343C]'
                            : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                        }`}
                      >
                        Todos ({checklistItems.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter('sim')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 border ${
                          statusFilter === 'sim'
                            ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
                            : 'border-transparent text-[#34D399]/80 hover:bg-[#1A1B20]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> Sim ({countSim})
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter('nao')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 border ${
                          statusFilter === 'nao'
                            ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40'
                            : 'border-transparent text-[#FB7185]/80 hover:bg-[#1A1B20]'
                        }`}
                      >
                        <XCircle className="w-3 h-3" /> Desvios ({countNao})
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter('na')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                          statusFilter === 'na'
                            ? 'bg-[#1E2025] text-[#F4F4F5] border-[#32343C]'
                            : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
                        }`}
                      >
                        N/A ({countNA})
                      </button>

                      <button
                        type="button"
                        onClick={() => setStatusFilter('pending')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition border ${
                          statusFilter === 'pending'
                            ? 'bg-[#1E2025] text-[#E4E4E7] border-[#32343C]'
                            : 'border-transparent text-[#A1A1AA] hover:bg-[#1A1B20]'
                        }`}
                      >
                        Pendentes ({countPending})
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#71717A] gap-2 flex-wrap">
                    <span className="truncate">
                      Exibindo <strong className="text-[#F4F4F5]">{displayedItems.length}</strong> de {checklistItems.length} itens
                      {selectedTopic !== 'ALL' && (
                        <> em <strong className="text-[#34D399]">{selectedTopic}</strong></>
                      )}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1.5 text-[11px] text-[#A1A1AA] cursor-pointer" title="Grava data, hora e unidade nas novas fotos enviadas">
                        <input
                          type="checkbox"
                          checked={stampPhotos}
                          onChange={(e) => setStampPhotos(e.target.checked)}
                          className="accent-[#2EB88A]"
                        />
                        Estampar data/unidade
                      </label>

                      {countPending > 0 && (
                        <button
                          type="button"
                          onClick={handleScrollToNextPending}
                          className="px-2.5 py-1 bg-[#18191D] hover:bg-[#23252C] text-[#E4E4E7] border border-[#2D2F36] rounded-md font-medium flex items-center gap-1 transition"
                        >
                          <ArrowDown className="w-3 h-3 text-[#34D399]" />
                          Próximo Pendente
                        </button>
                      )}

                      {selectedTopic !== 'ALL' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleBatchMarkPendingTopic('sim')}
                            className="px-2 py-1 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/30 rounded-md font-medium transition"
                            title="Marcar os itens ainda pendentes desta temática como Sim"
                          >
                            Pendentes = Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBatchMarkPendingTopic('na')}
                            className="px-2 py-1 bg-[#1A1B20] hover:bg-[#25272E] text-[#CBD5E1] border border-[#2D2F36] rounded-md font-medium transition"
                            title="Marcar os itens ainda pendentes desta temática como N/A"
                          >
                            Pendentes = N/A
                          </button>
                        </>
                      )}

                      {(selectedTopic !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTopic('ALL');
                            setStatusFilter('ALL');
                            setSearchTerm('');
                          }}
                          className="text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1 font-medium underline underline-offset-2 shrink-0"
                        >
                          <RotateCcw className="w-3 h-3" /> Limpar filtros
                        </button>
                      )}
                    </div>
                  </div>

                  {previousOrder && previousDeviationsMap.size > 0 && (
                    <div className="bg-[#0D0E10] border border-[#2D2F36] rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                      <span className="text-[#A1A1AA] flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                        Vistoria anterior encontrada (<strong className="font-mono text-[#F4F4F5]">{previousOrder.id}</strong>) com <strong className="text-[#FB7185]">{previousDeviationsMap.size} desvio(s)</strong> para comparação.
                      </span>
                      <button
                        type="button"
                        onClick={handleImportPreviousDeviations}
                        className="px-2.5 py-1 bg-[#1C1D22] hover:bg-[#25272E] text-[#34D399] border border-[#2EB88A]/30 rounded font-medium transition shrink-0 self-start sm:self-auto"
                      >
                        Importar desvios pendentes p/ reinspeção
                      </button>
                    </div>
                  )}
                </div>

                {/* LISTAGEM ROLÁVEL DOS ITENS COM MÁXIMO ESPAÇO */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {displayedItems.length === 0 ? (
                  <div className="bg-[#141518] border border-[#232429] rounded-xl p-8 text-center space-y-3">
                    <Filter className="w-8 h-8 text-[#71717A] mx-auto" />
                    <h4 className="text-[#F4F4F5] font-semibold text-sm">Nenhum item encontrado com os filtros atuais</h4>
                    <p className="text-xs text-[#71717A]">
                      Tente alterar a temática selecionada ou limpar os termos de busca.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTopic('ALL');
                        setStatusFilter('ALL');
                        setSearchTerm('');
                      }}
                      className="px-4 py-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] rounded-lg text-xs font-medium transition border border-[#2D2F36]"
                    >
                      Redefinir Filtros
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedItems.map((item, idx) => {
                      const isNao = item.status === 'nao' || item.status === 'nao_conforme';
                      const isSim = item.status === 'sim' || item.status === 'conforme';
                      const isNA = item.status === 'na' || item.status === 'nao_aplicavel';

                      return (
                        <div
                          id={`checklist-item-${item.id}`}
                          key={item.id || idx}
                          className={`bg-[#141518] border rounded-xl p-4 sm:p-5 space-y-3.5 transition-all ${
                            isNao
                              ? 'border-[#F43F5E]/40 bg-[#181214]'
                              : isSim
                              ? 'border-[#2EB88A]/30'
                              : 'border-[#232429] hover:border-[#32343C]'
                          }`}
                        >
                          {/* Topo do Card do Item */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                            <div className="space-y-1.5 flex-1">
                              
                              {/* Badges de Identificação e Temática */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-semibold text-[#F4F4F5] bg-[#1A1B20] px-2.5 py-0.5 rounded border border-[#27282E]">
                                  Item #{item.number || idx + 1}
                                </span>

                                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded border flex items-center gap-1.5 bg-[#0D0E10] text-[#A1A1AA] border-[#232429]">
                                  <TopicIcon topic={item.topic || item.topicTitle} className="w-3 h-3 text-[#2EB88A]" />
                                  {item.topic || item.topicTitle}
                                </span>

                                {previousDeviationsMap.has(Number(item.number)) && (
                                  <span
                                    className="text-[10px] font-medium px-2 py-0.5 rounded border bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30"
                                    title={`Teve desvio na vistoria anterior (${previousOrder?.id})`}
                                  >
                                    Desvio anterior
                                  </span>
                                )}

                                {isNao && item.classification && (
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider border ${
                                    item.classification === 'Crítico' || item.classification === 'Grave'
                                      ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40'
                                      : 'bg-[#1D1F26] text-[#E4E4E7] border-[#333640]'
                                  }`}>
                                    Desvio {item.classification}
                                  </span>
                                )}
                              </div>

                              {/* Pergunta / Requisito Normativo (Branco Gelo) */}
                              <h4 className="text-sm font-medium text-[#F4F4F5] leading-snug pt-0.5">
                                {item.question || item.item}
                              </h4>
                            </div>

                            {/* 3 Botões de Ação Rápida (Sim / Não / Não Aplicável) — otimizado para toque */}
                            <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center gap-1 shrink-0 sm:self-center bg-[#0D0E10] p-1 rounded-lg border border-[#232429]">
                              <button
                                type="button"
                                onClick={() => handleChecklistStatusChange(item.id, 'sim')}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition ${
                                  isSim
                                    ? 'bg-[#2EB88A] text-[#080A09]'
                                    : 'text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1C1D22]'
                                }`}
                                title="Marcar como Conforme"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sim
                              </button>

                              <button
                                type="button"
                                onClick={() => handleChecklistStatusChange(item.id, 'nao')}
                                className={`flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-md text-xs font-semibold transition ${
                                  isNao
                                    ? 'bg-[#E11D48] text-white'
                                    : 'text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1C1D22]'
                                }`}
                                title="Marcar como Não Conforme (Abre Regra 6)"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Não
                              </button>

                              <button
                                type="button"
                                onClick={() => handleChecklistStatusChange(item.id, 'na')}
                                className={`flex items-center justify-center px-2.5 py-2 sm:py-1.5 rounded-md text-xs font-medium transition ${
                                  isNA
                                    ? 'bg-[#27282E] text-[#F4F4F5]'
                                    : 'text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1C1D22]'
                                }`}
                                title="Não se aplica à realidade da unidade"
                              >
                                N/A
                              </button>
                            </div>
                          </div>

                          {/* REGRA 6: SE MARCADO COMO 'NÃO', EXIBE O PLANO DE AÇÃO OBRIGATÓRIO */}
                          {isNao && (
                            <div className="p-4 sm:p-5 bg-[#0D0E10] border border-[#F43F5E]/30 rounded-lg space-y-3.5 animate-fade-in">
                              <div className="flex items-center justify-between text-xs font-semibold text-[#FB7185] border-b border-[#232429] pb-2 flex-wrap gap-1">
                                <span className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-[#FB7185]" />
                                  Detalhamento Obrigatório do Desvio (Regra 6)
                                </span>
                                <span
                                  className="text-[10px] text-[#A1A1AA] font-normal cursor-help underline decoration-dotted"
                                  title="Leve: desvio formal • Médio: impacto moderado (15-30d) • Grave: risco elevado (48h-7d) • Crítico: risco iminente (24h)"
                                >
                                  Ver critérios (Leve a Crítico)
                                </span>
                              </div>

                              {/* Matriz de Risco SST (Probabilidade x Severidade) quando fluxo SST */}
                              {currentOrder.discipline === 'seguranca_trabalho' && (() => {
                                const risk = calculateRiskMatrix(item.riskProbability || 3, item.riskSeverity || 3);
                                return (
                                  <div className="bg-[#141518] border border-[#232429] rounded-lg p-3 space-y-2.5 text-xs">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <span className="font-semibold text-[#E4E4E7]">
                                        Matriz de Risco SST (Probabilidade × Severidade)
                                      </span>
                                      <span className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded border ${risk.badgeClass}`}>
                                        Grau {risk.score} • {risk.level} ({risk.classification})
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                      <div>
                                        <label className="block text-[11px] text-[#A1A1AA] mb-1">Probabilidade</label>
                                        <select
                                          value={item.riskProbability || 3}
                                          onChange={(e) => handleChecklistFieldChange(item.id, 'riskProbability', Number(e.target.value))}
                                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#F59E0B]"
                                        >
                                          {RISK_PROBABILITIES.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="block text-[11px] text-[#A1A1AA] mb-1">Severidade</label>
                                        <select
                                          value={item.riskSeverity || 3}
                                          onChange={(e) => handleChecklistFieldChange(item.id, 'riskSeverity', Number(e.target.value))}
                                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#F59E0B]"
                                        >
                                          {RISK_SEVERITIES.map((s) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <p className="text-[11px] text-[#71717A]">
                                      {risk.description} Prazo sugerido: <strong className="text-[#E4E4E7]">{risk.suggestedDeadline}</strong>.
                                    </p>
                                  </div>
                                );
                              })()}

                              {/* Linha 1: Classificação, Responsável e Prazo com Sugestões Rápidas */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                                <div>
                                  <label className="block text-[#A1A1AA] font-medium mb-1 flex items-center justify-between">
                                    <span>Classificação do Desvio *</span>
                                  </label>
                                  <select
                                    value={item.classification || 'Médio'}
                                    onChange={(e) => handleChecklistFieldChange(item.id, 'classification', e.target.value)}
                                    className="w-full bg-[#141518] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-medium focus:border-[#F43F5E] focus:outline-none"
                                  >
                                    {EMSERH_CLASSIFICATIONS.map(c => (
                                      <option key={c.value} value={c.value} className="bg-[#141518] text-[#F4F4F5]">{c.label}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[#A1A1AA] font-medium mb-1">
                                    Responsável pela Ação *
                                  </label>
                                  <input
                                    type="text"
                                    value={item.responsible || ''}
                                    onChange={(e) => handleChecklistFieldChange(item.id, 'responsible', e.target.value)}
                                    placeholder="Ex: SCIH / Manutenção / Direção"
                                    className="w-full bg-[#141518] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] placeholder-[#71717A] focus:border-[#F43F5E] focus:outline-none"
                                  />
                                  {/* Atalhos Rápidos de Responsável */}
                                  <div className="flex gap-1.5 mt-1 text-[10px] text-[#71717A] flex-wrap">
                                    {['SCIH / Biossegurança', 'Manutenção', 'Almoxarifado', 'Direção'].map(resp => (
                                      <button
                                        key={resp}
                                        type="button"
                                        onClick={() => handleChecklistFieldChange(item.id, 'responsible', resp)}
                                        className="hover:text-[#F4F4F5] hover:underline"
                                      >
                                        +{resp}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[#A1A1AA] font-medium mb-1">
                                    Prazo para Regularização *
                                  </label>
                                  <input
                                    type="text"
                                    value={item.deadline || ''}
                                    onChange={(e) => handleChecklistFieldChange(item.id, 'deadline', e.target.value)}
                                    placeholder="Ex: 24h, 7 dias, 30 dias"
                                    className="w-full bg-[#141518] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] placeholder-[#71717A] focus:border-[#F43F5E] focus:outline-none"
                                  />
                                  {/* Atalhos Rápidos de Prazo */}
                                  <div className="flex gap-1.5 mt-1 text-[10px] text-[#71717A] flex-wrap">
                                    {['24h', '48h', '7 dias', '15 dias', '30 dias'].map(prazo => (
                                      <button
                                        key={prazo}
                                        type="button"
                                        onClick={() => handleChecklistFieldChange(item.id, 'deadline', prazo)}
                                        className="hover:text-[#F4F4F5] hover:underline"
                                      >
                                        +{prazo}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Linha 2: Descrição da Não Conformidade & Evidência Fotográfica */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                                <div className="sm:col-span-2">
                                  <label className="block text-[#A1A1AA] font-medium mb-1">
                                    Observações / Descrição da Anomalia Identificada *
                                  </label>
                                  <textarea
                                    rows={3}
                                    value={item.observation || ''}
                                    onChange={(e) => handleChecklistFieldChange(item.id, 'observation', e.target.value)}
                                    placeholder="Descreva detalhadamente o desvio encontrado in loco para inclusão no Laudo Oficial..."
                                    className="w-full bg-[#141518] border border-[#27282E] rounded-lg p-3 text-[#F4F4F5] placeholder-[#71717A] focus:border-[#F43F5E] focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[#A1A1AA] font-medium mb-1">
                                    Evidência Fotográfica (Checklist & Relatório)
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] rounded-lg border border-[#2D2F36] text-xs font-medium transition cursor-pointer">
                                      <Camera className="w-3.5 h-3.5 text-[#2EB88A]" />
                                      <span>{uploadingItemId === item.id ? 'Enviando...' : 'Câmera'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={(e) => handleUploadItemPhoto(item.id, e)}
                                        className="hidden"
                                      />
                                    </label>
                                    <label className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] rounded-lg border border-[#2D2F36] text-xs font-medium transition cursor-pointer">
                                      <Upload className="w-3.5 h-3.5 text-[#34D399]" />
                                      <span>{item.evidenceUrl ? 'Trocar' : 'Arquivo'}</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleUploadItemPhoto(item.id, e)}
                                        className="hidden"
                                      />
                                    </label>
                                  </div>

                                  {item.evidenceUrl && (
                                    <div className="mt-2 p-2 bg-[#141518] rounded-lg border border-[#232429] flex items-center gap-2.5">
                                      <img
                                        src={sanitizeMediaUrl(item.evidenceUrl)}
                                        alt="Evidência"
                                        onClick={() => openLightboxForItem(item.id)}
                                        className="w-14 h-12 object-cover rounded border border-[#27282E] shrink-0 cursor-pointer hover:opacity-85 transition"
                                        title="Clique para ampliar no visualizador"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[11px] text-[#34D399] font-medium block truncate">
                                          Foto Anexada ✓
                                        </span>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => openLightboxForItem(item.id)}
                                            className="text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5] underline"
                                          >
                                            Ampliar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleChecklistFieldChange(item.id, 'evidenceUrl', '')}
                                            className="text-[10px] text-[#FB7185] hover:underline"
                                          >
                                            Remover
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Observação simples + Evidência fotográfica opcional para itens SIM ou N/A */}
                          {!isNao && (
                            <div className="pt-1 space-y-2">
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <input
                                  type="text"
                                  value={item.observation || ''}
                                  onChange={(e) => handleChecklistFieldChange(item.id, 'observation', e.target.value)}
                                  placeholder="Adicionar nota técnica ou observação pontual para este item..."
                                  className="flex-1 bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-xs text-[#E4E4E7] placeholder-[#71717A] focus:border-[#2EB88A] focus:outline-none"
                                />
                                <label
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#18191D] hover:bg-[#22242A] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#27282E] rounded-lg text-[11px] font-medium transition cursor-pointer shrink-0"
                                  title="Anexar fotografia para o registro fotográfico do Relatório Técnico"
                                >
                                  <Upload className="w-3.5 h-3.5 text-[#34D399]" />
                                  <span>
                                    {uploadingItemId === item.id
                                      ? 'Enviando...'
                                      : item.evidenceUrl
                                        ? 'Substituir Foto'
                                        : 'Anexar Foto'}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUploadItemPhoto(item.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              {item.evidenceUrl && (
                                <div className="p-2 bg-[#0D0E10] rounded-lg border border-[#232429] flex items-center gap-2.5">
                                <img
                                  src={sanitizeMediaUrl(item.evidenceUrl)}
                                  alt="Evidência"
                                  onClick={() => openLightboxForItem(item.id)}
                                  className="w-12 h-10 object-cover rounded border border-[#27282E] shrink-0 cursor-pointer hover:opacity-85 transition"
                                />
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] text-[#34D399] font-medium block truncate">
                                    Evidência anexada (pronta para o Relatório)
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => openLightboxForItem(item.id)}
                                      className="text-[10px] text-[#A1A1AA] hover:text-[#F4F4F5] underline"
                                    >
                                      Ampliar
                                    </button>
                                      <button
                                        type="button"
                                        onClick={() => handleChecklistFieldChange(item.id, 'evidenceUrl', '')}
                                        className="text-[10px] text-[#FB7185] hover:underline"
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-[#0D0E10]">

            {/* TAB: DESVIOS IDENTIFICADOS (VISÃO CONSOLIDADA COM PLANO DE AÇÃO) */}
            {activeTab === 'deviations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#F4F4F5] text-sm flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4 text-[#FB7185]" />
                      Plano de Ação dos Desvios Identificados ({summary.desviosCount})
                    </h3>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      Itens que exigem plano de correção imediata e acompanhamento (Regra 6)
                    </p>
                  </div>
                  {summary.desviosCount > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleExportDeviationsCsv}
                        className="px-3 py-1.5 bg-[#1C1D22] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium hover:bg-[#25272E] transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-[#34D399]" />
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReportModal(true)}
                        className="px-3 py-1.5 bg-[#221216] text-[#FB7185] border border-[#F43F5E]/30 rounded-lg text-xs font-medium hover:bg-[#2E161B] transition flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Visualizar Matriz no Laudo
                      </button>
                    </div>
                  )}
                </div>

                {summary.desviosCount === 0 ? (
                  <div className="p-10 bg-[#141518] border border-[#232429] rounded-xl text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-[#34D399] mx-auto" />
                    <h4 className="font-semibold text-[#F4F4F5] text-base">Nenhum desvio identificado até o momento</h4>
                    <p className="text-xs text-[#71717A] max-w-md mx-auto">
                      Todos os itens avaliados nesta vistoria ambiental estão em conformidade com os requisitos aplicáveis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {summary.desvios.map((desvio, idx) => (
                      <div
                        key={idx}
                        className="bg-[#141518] border border-[#F43F5E]/30 rounded-xl p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${
                                desvio.classification === 'Crítico'
                                  ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40'
                                  : 'bg-[#1A1B20] text-[#E4E4E7] border-[#2D2F36]'
                              }`}>
                                Desvio {desvio.classification || 'Médio'}
                              </span>
                              <span className="text-xs font-medium text-[#34D399] flex items-center gap-1">
                                <TopicIcon topic={desvio.topic || desvio.topicTitle} className="w-3.5 h-3.5" />
                                {desvio.topic || desvio.topicTitle}
                              </span>
                            </div>
                            <h4 className="text-sm font-medium text-[#F4F4F5] mt-1">
                              {desvio.question || desvio.item}
                            </h4>
                          </div>

                          <div className="shrink-0">
                            <span className="text-xs font-mono font-medium text-[#E4E4E7] bg-[#0D0E10] px-3 py-1.5 rounded-lg border border-[#232429] block">
                              Prazo: {desvio.deadline || 'A definir'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-[#0D0E10] p-3.5 rounded-lg border border-[#232429] text-xs space-y-1 text-[#A1A1AA]">
                          <p>
                            <strong className="text-[#FB7185] font-medium">Anomalia Encontrada:</strong> {desvio.observation || 'Não especificada'}
                          </p>
                          <p className="text-[#71717A]">
                            <strong className="text-[#E4E4E7] font-medium">Responsável Designado:</strong> {desvio.responsible || 'Gerência da Unidade'}
                          </p>
                        </div>

                        {desvio.evidenceUrl && (
                          <div className="flex items-center gap-3 pt-1">
                            <img
                              src={sanitizeMediaUrl(desvio.evidenceUrl)}
                              alt="Evidência"
                              onClick={() => openLightboxForItem(desvio.id)}
                              className="w-16 h-12 object-cover rounded-lg border border-[#232429] cursor-pointer hover:opacity-85 transition"
                              title="Clique para ampliar"
                            />
                            <span className="text-xs text-[#71717A]">
                              Registro fotográfico anexado ao laudo para auditoria.
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          )}

          {/* FAB Contextual Mobile (Próximo item pendente no checklist) */}
          {activeTab === 'checklist' && countPending > 0 && (
            <button
              type="button"
              onClick={handleScrollToNextPending}
              className="sm:hidden fixed bottom-16 right-4 z-50 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-bold text-xs shadow-2xl border border-[#34D399]"
              title="Rolar até o próximo item pendente"
            >
              <ArrowDown className="w-4 h-4" />
              <span>Próx. ({countPending})</span>
            </button>
          )}

          {/* FAIXA DE TRANSIÇÃO PÓS-CHECKLIST (Quando concluída) */}
          {currentOrder.status === 'completed' && onOpenTechnicalReport && (
            <div className="px-4 py-2 bg-[#122620] border-t border-[#2EB88A]/30 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center gap-2 text-[#E4E4E7] min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
                <span className="truncate">
                  <strong className="text-[#34D399]">Checklist concluído</strong> • {summary.totalAvaliados} avaliados, {summary.desviosCount} desvio(s) e {lightboxImages.length} foto(s) prontos para importar no Relatório Técnico.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenTechnicalReport(currentOrder)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg text-xs transition shrink-0"
              >
                <span>{linkedReport ? 'Continuar Relatório' : 'Avançar para Relatório'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* RODAPÉ DO MODAL */}
          <div className="px-3 sm:px-4 py-2.5 border-t border-[#1F2024] bg-[#111214] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 pb-safe">
            <div className="text-xs text-[#71717A] hidden sm:flex items-center gap-2">
              <span className="font-semibold text-[#34D399]">KIVO</span>
              <span>• {currentOrder.clientName || currentOrder.hospitalName}</span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopySummary}
                className="px-3 py-1.5 bg-[#1C1D22] hover:bg-[#23252C] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                title="Copiar resumo formatado para WhatsApp / E-mail"
              >
                <Share2 className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="hidden md:inline">Resumo WhatsApp</span>
              </button>
              {onOpenTechnicalReport && (
                <button
                  type="button"
                  onClick={() => {
                    if (!linkedReport && summary.totalAvaliados === 0) {
                      setActiveTab('checklist');
                      toast.info({
                        title: 'Preencha o checklist primeiro',
                        message: 'Avalie pelo menos um item do checklist desta vistoria antes de gerar o relatório técnico.'
                      });
                      return;
                    }
                    onOpenTechnicalReport(currentOrder);
                  }}
                  className="px-3.5 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                >
                  <FileBarChart2 className="w-3.5 h-3.5" />
                  <span>
                    {linkedReport ? `Continuar Relatório (${linkedReport.codigoRelatorio})` : 'Gerar Relatório Técnico'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3.5 py-1.5 bg-[#1C1D22] hover:bg-[#23252C] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                title="Espelho bruto de todos os itens e pontuações do checklist"
              >
                <FileText className="w-3.5 h-3.5 text-[#A1A1AA]" />
                <span>Espelho Checklist</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Report View Modal */}
      {showReportModal && (
        <TechnicalReportView
          order={currentOrder}
          userProfile={userProfile}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Visualizador Lightbox de Evidências */}
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
