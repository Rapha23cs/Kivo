import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Search,
  Upload,
  Building2,
  User,
  Calendar,
  ExternalLink,
  Check,
  Camera,
  ArrowRightLeft,
  ShieldAlert
} from 'lucide-react';
import Badge from '../common/Badge';
import ImageLightboxModal from '../common/ImageLightboxModal';
import { useFeedback } from '../common/FeedbackProvider';
import { DataService } from '../../supabase/dataService';
import { getDisciplineMeta, WORK_DISCIPLINES } from '../../data/workflowsConfig';
import { calculateRiskMatrix } from '../../data/sstChecklistData';
import { sanitizeMediaUrl, formatDateTimeWatermark, exportCsvRows } from '../../utils/kivoHelpers';

const ACTION_STATUS_OPTIONS = ['Em Aberto', 'Em Andamento', 'Concluído'];

export default function ActionPlansModule({ orders = [], onUpdateOrder, onOpenOrder }) {
  const { toast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDENTES'); // ALL | PENDENTES | Em Aberto | Em Andamento | Concluído
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [uploadingKey, setUploadingKey] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [lightboxState, setLightboxState] = useState({ images: [], index: -1 });

  const allActions = useMemo(() => {
    const list = [];
    orders.forEach((order) => {
      (order.checklist || []).forEach((item) => {
        if (item.status !== 'nao' && item.status !== 'nao_conforme') return;
        const actionStatus = item.actionStatus || 'Em Aberto';
        const isSst = (order.discipline || 'meio_ambiente') === 'seguranca_trabalho';
        const riskInfo = isSst
          ? calculateRiskMatrix(item.riskProbability || 3, item.riskSeverity || 3)
          : null;
        list.push({
          key: `${order.id}::${item.id}`,
          order,
          item,
          discipline: order.discipline || 'meio_ambiente',
          actionStatus,
          classification: item.classification || riskInfo?.classification || 'Médio',
          riskInfo
        });
      });
    });

    const severityRank = { Crítico: 4, Grave: 3, Médio: 2, Leve: 1 };
    return list.sort((a, b) => {
      const doneA = a.actionStatus === 'Concluído' ? 1 : 0;
      const doneB = b.actionStatus === 'Concluído' ? 1 : 0;
      if (doneA !== doneB) return doneA - doneB;
      return (severityRank[b.classification] || 0) - (severityRank[a.classification] || 0);
    });
  }, [orders]);

  const counts = useMemo(() => {
    const open = allActions.filter((a) => a.actionStatus === 'Em Aberto').length;
    const progress = allActions.filter((a) => a.actionStatus === 'Em Andamento').length;
    const done = allActions.filter((a) => a.actionStatus === 'Concluído').length;
    const critical = allActions.filter(
      (a) => a.actionStatus !== 'Concluído' && (a.classification === 'Crítico' || a.classification === 'Grave')
    ).length;
    return { total: allActions.length, open, progress, done, critical };
  }, [allActions]);

  const filteredActions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allActions.filter((entry) => {
      if (statusFilter === 'PENDENTES' && entry.actionStatus === 'Concluído') return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'PENDENTES' && entry.actionStatus !== statusFilter) {
        return false;
      }
      if (disciplineFilter !== 'ALL' && entry.discipline !== disciplineFilter) return false;
      if (severityFilter !== 'ALL' && entry.classification !== severityFilter) return false;
      if (!q) return true;
      return (
        entry.order.id.toLowerCase().includes(q) ||
        (entry.order.hospitalName || '').toLowerCase().includes(q) ||
        (entry.order.clientName || '').toLowerCase().includes(q) ||
        (entry.item.question || '').toLowerCase().includes(q) ||
        (entry.item.observation || '').toLowerCase().includes(q) ||
        (entry.item.responsible || '').toLowerCase().includes(q)
      );
    });
  }, [allActions, searchTerm, statusFilter, disciplineFilter, severityFilter]);

  const updateActionItem = (order, itemId, patch) => {
    const updatedChecklist = (order.checklist || []).map((it) =>
      it.id === itemId ? { ...it, ...patch } : it
    );
    onUpdateOrder({ ...order, checklist: updatedChecklist });
  };

  const handleUploadAfterPhoto = async (entry, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingKey(entry.key);
    try {
      const stamp = formatDateTimeWatermark(`${entry.order.hospitalName} • DEPOIS`);
      const url = await DataService.uploadChecklistEvidence(
        file,
        entry.order.id,
        `${entry.item.id}-after`,
        stamp
      );
      updateActionItem(entry.order, entry.item.id, {
        afterPhotoUrl: url,
        actionStatus: entry.actionStatus === 'Em Aberto' ? 'Concluído' : entry.actionStatus,
        resolvedAt: new Date().toISOString()
      });
      toast.success({
        title: 'Evidência "Depois" anexada',
        message: `Item #${entry.item.number} (${entry.order.hospitalName})`
      });
    } catch (err) {
      toast.error({ title: 'Falha ao enviar foto', message: err?.message || 'Tente novamente.' });
    } finally {
      setUploadingKey(null);
    }
  };

  const handleExportCsv = () => {
    if (filteredActions.length === 0) return;
    exportCsvRows(
      ['Vistoria', 'Fluxo', 'Cliente', 'Unidade', 'Item', 'Requisito', 'Severidade', 'Anomalia', 'Responsável', 'Prazo', 'Status', 'Tratativa / Baixa'],
      filteredActions.map((e) => [
        e.order.id,
        getDisciplineMeta(e.discipline).label,
        e.order.clientName || '',
        e.order.hospitalName || '',
        `#${e.item.number}`,
        e.item.question || '',
        e.classification,
        e.item.observation || '',
        e.item.responsible || '',
        e.item.deadline || '',
        e.actionStatus,
        e.item.resolutionNote || ''
      ]),
      `planos-de-acao-kivo-${new Date().toISOString().split('T')[0]}.csv`
    );
    toast.success({ title: 'Planilha exportada', message: `${filteredActions.length} plano(s) de ação.` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F4F4F5] tracking-tight">
            Central de Planos de Ação (5W2H &amp; Antes × Depois)
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Acompanhe todas as não conformidades identificadas nas vistorias, defina tratativas e registre fotos de comprovação pós-correção
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredActions.length === 0}
          className="px-3.5 py-2 bg-[#141518] hover:bg-[#1C1D22] disabled:opacity-40 text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition self-start sm:self-auto"
        >
          Exportar Planilha (CSV)
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Em Aberto</span>
          <span className="text-2xl font-bold font-mono text-[#FB7185] mt-1 block">{counts.open}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Críticos / Graves Pendentes</span>
          <span className="text-2xl font-bold font-mono text-[#FBBF24] mt-1 block">{counts.critical}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Em Andamento</span>
          <span className="text-2xl font-bold font-mono text-[#E4E4E7] mt-1 block">{counts.progress}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Concluídos (Baixados)</span>
          <span className="text-2xl font-bold font-mono text-[#34D399] mt-1 block">{counts.done}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por unidade, código, requisito, anomalia ou responsável..."
            className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg pl-9 pr-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="PENDENTES">Apenas Pendentes</option>
            <option value="ALL">Todos os Status</option>
            {ACTION_STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="ALL">Todos os Fluxos</option>
            {WORK_DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="ALL">Todas Severidades</option>
            <option value="Crítico">Crítico</option>
            <option value="Grave">Grave</option>
            <option value="Médio">Médio</option>
            <option value="Leve">Leve</option>
          </select>
        </div>
      </div>

      {/* Lista de Planos de Ação */}
      {filteredActions.length === 0 ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-12 text-center space-y-2.5">
          <CheckCircle2 className="w-10 h-10 text-[#34D399] mx-auto opacity-80" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">Nenhum plano de ação neste filtro</h3>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            Itens marcados como "Não" durante os checklists de Meio Ambiente ou Segurança do Trabalho aparecem automaticamente aqui para acompanhamento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((entry) => {
            const { order, item, actionStatus, classification, riskInfo } = entry;
            const isExpanded = expandedKey === entry.key;
            const statusVariant =
              actionStatus === 'Concluído' ? 'success' : actionStatus === 'Em Andamento' ? 'warning' : 'danger';

            return (
              <div
                key={entry.key}
                className="bg-[#141518] border border-[#232429] hover:border-[#2D2F36] rounded-xl p-4 sm:p-5 space-y-3 transition"
              >
                {/* Cabeçalho do Desvio */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#34D399] bg-[#0D0E10] px-2 py-0.5 rounded border border-[#232429]">
                        {order.id} • #{item.number}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#A1A1AA]">
                        {getDisciplineMeta(entry.discipline).shortLabel}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          classification === 'Crítico' || classification === 'Grave'
                            ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40'
                            : 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30'
                        }`}
                      >
                        {classification}
                      </span>
                      {riskInfo && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${riskInfo.badgeClass}`}>
                          Risco {riskInfo.level} ({riskInfo.score})
                        </span>
                      )}
                      <Badge variant={statusVariant} size="sm">
                        {actionStatus}
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-[#F4F4F5] leading-snug">
                      {item.question}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#71717A]">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {order.hospitalName} {order.clientName ? `(${order.clientName})` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        Resp.: <strong className="text-[#E4E4E7]">{item.responsible || 'A definir'}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Prazo: <strong className="text-[#E4E4E7]">{item.deadline || 'A definir'}</strong>
                      </span>
                    </div>

                    {item.observation && (
                      <p className="text-xs text-[#E4E4E7] bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-2">
                        <strong className="text-[#FB7185]">Anomalia:</strong> {item.observation}
                      </p>
                    )}
                  </div>

                  {/* Controles Rápidos */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 text-xs">
                    <select
                      value={actionStatus}
                      onChange={(e) => {
                        const nextSt = e.target.value;
                        updateActionItem(order, item.id, {
                          actionStatus: nextSt,
                          resolvedAt: nextSt === 'Concluído' ? new Date().toISOString() : item.resolvedAt || ''
                        });
                        toast.success({ title: `Status atualizado: ${nextSt}`, message: `${order.id} #${item.number}` });
                      }}
                      className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                    >
                      {ACTION_STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setExpandedKey(isExpanded ? null : entry.key)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg font-medium transition"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Antes × Depois</span>
                    </button>

                    {onOpenOrder && (
                      <button
                        type="button"
                        onClick={() => onOpenOrder(order)}
                        className="p-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#2D2F36] rounded-lg transition"
                        title="Abrir Checklist da Vistoria"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Painel Expandido Antes x Depois */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#1F2024] space-y-3 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ANTES */}
                      <div className="bg-[#0D0E10] border border-[#F43F5E]/30 rounded-xl p-3.5 space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#FB7185] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Antes (Desvio Constatado)
                        </span>
                        {item.evidenceUrl ? (
                          <img
                            src={sanitizeMediaUrl(item.evidenceUrl)}
                            alt="Evidência Antes"
                            onClick={() =>
                              setLightboxState({
                                images: [
                                  { url: item.evidenceUrl, title: `ANTES • ${order.id} #${item.number}`, subtitle: item.observation },
                                  ...(item.afterPhotoUrl
                                    ? [{ url: item.afterPhotoUrl, title: `DEPOIS • ${order.id} #${item.number}`, subtitle: item.resolutionNote }]
                                    : [])
                                ],
                                index: 0
                              })
                            }
                            className="w-full h-44 object-cover rounded-lg border border-[#232429] cursor-pointer hover:opacity-90 transition"
                          />
                        ) : (
                          <div className="h-44 rounded-lg border border-dashed border-[#27282E] flex items-center justify-center text-[11px] text-[#71717A]">
                            Sem foto registrada na vistoria inicial
                          </div>
                        )}
                      </div>

                      {/* DEPOIS */}
                      <div className="bg-[#0D0E10] border border-[#2EB88A]/40 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#34D399] flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Depois (Evidência da Correção)
                          </span>
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-md text-[11px] font-medium cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>
                              {uploadingKey === entry.key
                                ? 'Enviando...'
                                : item.afterPhotoUrl
                                  ? 'Trocar Foto'
                                  : 'Anexar Depois'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadAfterPhoto(entry, e)}
                            />
                          </label>
                        </div>

                        {item.afterPhotoUrl ? (
                          <img
                            src={sanitizeMediaUrl(item.afterPhotoUrl)}
                            alt="Evidência Depois"
                            onClick={() => {
                              const imgs = [
                                ...(item.evidenceUrl
                                  ? [{ url: item.evidenceUrl, title: `ANTES • ${order.id} #${item.number}`, subtitle: item.observation }]
                                  : []),
                                { url: item.afterPhotoUrl, title: `DEPOIS • ${order.id} #${item.number}`, subtitle: item.resolutionNote }
                              ];
                              setLightboxState({ images: imgs, index: imgs.length - 1 });
                            }}
                            className="w-full h-44 object-cover rounded-lg border border-[#232429] cursor-pointer hover:opacity-90 transition"
                          />
                        ) : (
                          <div className="h-44 rounded-lg border border-dashed border-[#27282E] flex flex-col items-center justify-center text-[11px] text-[#71717A] gap-1.5">
                            <Camera className="w-5 h-5 opacity-60" />
                            <span>Envie uma fotografia comprovando a regularização</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[#A1A1AA] font-medium mb-1">
                          Descrição da Tratativa / Correção Executada
                        </label>
                        <input
                          type="text"
                          value={item.resolutionNote || ''}
                          onChange={(e) => updateActionItem(order, item.id, { resolutionNote: e.target.value })}
                          placeholder="Descreva a ação corretiva executada para baixar este desvio..."
                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[#A1A1AA] font-medium mb-1">
                          Prazo / Responsável
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.deadline || ''}
                            onChange={(e) => updateActionItem(order, item.id, { deadline: e.target.value })}
                            placeholder="Prazo"
                            className="w-1/2 bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                          />
                          <input
                            type="text"
                            value={item.responsible || ''}
                            onChange={(e) => updateActionItem(order, item.id, { responsible: e.target.value })}
                            placeholder="Responsável"
                            className="w-1/2 bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ImageLightboxModal
        isOpen={lightboxState.index >= 0}
        images={lightboxState.images}
        currentIndex={Math.max(0, lightboxState.index)}
        onChangeIndex={(idx) => setLightboxState((prev) => ({ ...prev, index: idx }))}
        onClose={() => setLightboxState({ images: [], index: -1 })}
      />
    </div>
  );
}
