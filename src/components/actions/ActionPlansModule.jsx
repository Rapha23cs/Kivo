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
  ShieldAlert,
  Grid,
  Columns2
} from 'lucide-react';
import Badge from '../common/Badge';
import ImageLightboxModal from '../common/ImageLightboxModal';
import { useFeedback } from '../common/FeedbackProvider';
import { DataService } from '../../supabase/dataService';
import { getDisciplineMeta, WORK_DISCIPLINES } from '../../data/workflowsConfig';
import { calculateRiskMatrix } from '../../data/sstChecklistData';
import { sanitizeMediaUrl, formatDateTimeWatermark, exportCsvRows } from '../../utils/kivoHelpers';

const ACTION_STATUS_OPTIONS = ['Em Aberto', 'Em Andamento', 'Concluído'];

function getHeatmapCellStyle(score) {
  if (score >= 20) return 'bg-[#F43F5E]/25 border-[#F43F5E]/60';
  if (score >= 13) return 'bg-[#F97316]/25 border-[#FB923C]/55';
  if (score >= 7) return 'bg-[#F59E0B]/20 border-[#FBBF24]/50';
  if (score >= 4) return 'bg-[#0EA5E9]/20 border-[#38BDF8]/45';
  return 'bg-[#122620] border-[#2EB88A]/40';
}

export default function ActionPlansModule({ orders = [], onUpdateOrder, onOpenOrder }) {
  const { toast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDENTES'); // ALL | PENDENTES | Em Aberto | Em Andamento | Concluído
  const [disciplineFilter, setDisciplineFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showRiskMatrix, setShowRiskMatrix] = useState(false);
  const [riskCellFilter, setRiskCellFilter] = useState(null);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [expandedKey, setExpandedKey] = useState(null);
  const [compareMode, setCompareMode] = useState('split'); // split | slider
  const [sliderPos, setSliderPos] = useState(50);
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

  const sstMatrixCounts = useMemo(() => {
    const grid = {};
    allActions.forEach((entry) => {
      if (entry.discipline !== 'seguranca_trabalho') return;
      if (statusFilter === 'PENDENTES' && entry.actionStatus === 'Concluído') return;
      const p = Math.min(5, Math.max(1, Number(entry.item.riskProbability) || 3));
      const s = Math.min(5, Math.max(1, Number(entry.item.riskSeverity) || 3));
      const k = `${p}-${s}`;
      grid[k] = (grid[k] || 0) + 1;
    });
    return grid;
  }, [allActions, statusFilter]);

  const hasSstActions = useMemo(
    () => allActions.some((a) => a.discipline === 'seguranca_trabalho'),
    [allActions]
  );

  const filteredActions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allActions.filter((entry) => {
      if (statusFilter === 'PENDENTES' && entry.actionStatus === 'Concluído') return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'PENDENTES' && entry.actionStatus !== statusFilter) {
        return false;
      }
      if (disciplineFilter !== 'ALL' && entry.discipline !== disciplineFilter) return false;
      if (severityFilter !== 'ALL' && entry.classification !== severityFilter) return false;
      if (riskCellFilter) {
        if (entry.discipline !== 'seguranca_trabalho') return false;
        const p = Math.min(5, Math.max(1, Number(entry.item.riskProbability) || 3));
        const s = Math.min(5, Math.max(1, Number(entry.item.riskSeverity) || 3));
        if (p !== riskCellFilter.p || s !== riskCellFilter.s) return false;
      }
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
  }, [allActions, searchTerm, statusFilter, disciplineFilter, severityFilter, riskCellFilter]);

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

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {hasSstActions && (
            <button
              type="button"
              onClick={() => setShowRiskMatrix((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 border rounded-lg text-xs font-medium transition ${
                showRiskMatrix || riskCellFilter
                  ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40'
                  : 'bg-[#141518] hover:bg-[#1C1D22] text-[#E4E4E7] border-[#2D2F36]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Matriz de Risco 5×5
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredActions.length === 0}
            className="px-3.5 py-2 bg-[#141518] hover:bg-[#1C1D22] disabled:opacity-40 text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
          >
            Exportar Planilha (CSV)
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
        <div className="kivo-card kivo-card-interactive p-4 sm:p-5 rounded-2xl">
          <span className="text-[#71717A] text-[11px] font-semibold uppercase tracking-wider block">Em Aberto</span>
          <span className="text-2xl font-bold font-mono kivo-tabular text-[#FB7185] mt-1.5 block">{counts.open}</span>
        </div>
        <div className="kivo-card kivo-card-interactive p-4 sm:p-5 rounded-2xl">
          <span className="text-[#71717A] text-[11px] font-semibold uppercase tracking-wider block">Críticos / Graves</span>
          <span className="text-2xl font-bold font-mono kivo-tabular text-[#FBBF24] mt-1.5 block">{counts.critical}</span>
        </div>
        <div className="kivo-card kivo-card-interactive p-4 sm:p-5 rounded-2xl">
          <span className="text-[#71717A] text-[11px] font-semibold uppercase tracking-wider block">Em Andamento</span>
          <span className="text-2xl font-bold font-mono kivo-tabular text-[#E4E4E7] mt-1.5 block">{counts.progress}</span>
        </div>
        <div className="kivo-card kivo-card-interactive p-4 sm:p-5 rounded-2xl">
          <span className="text-[#71717A] text-[11px] font-semibold uppercase tracking-wider block">Concluídos</span>
          <span className="text-2xl font-bold font-mono kivo-tabular text-[#34D399] mt-1.5 block">{counts.done}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="kivo-card rounded-2xl p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por unidade, código, requisito, anomalia ou responsável..."
            className="w-full bg-[#0D0E10] border border-[#232429] rounded-xl pl-9 pr-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#232429] rounded-xl px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
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
            className="bg-[#0D0E10] border border-[#232429] rounded-xl px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="ALL">Todos os Fluxos</option>
            {WORK_DISCIPLINES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#0D0E10] border border-[#232429] rounded-xl px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
          >
            <option value="ALL">Todas Severidades</option>
            <option value="Crítico">Crítico</option>
            <option value="Grave">Grave</option>
            <option value="Médio">Médio</option>
            <option value="Leve">Leve</option>
          </select>

          {(searchTerm.trim() !== '' || statusFilter !== 'PENDENTES' || disciplineFilter !== 'ALL' || severityFilter !== 'ALL' || riskCellFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('PENDENTES');
                setDisciplineFilter('ALL');
                setSeverityFilter('ALL');
                setRiskCellFilter(null);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#221216] text-[#FB7185] border border-[#F43F5E]/30 hover:opacity-90 font-medium transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Matriz Visual 5x5 (Heatmap SST) */}
      {showRiskMatrix && (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 sm:p-5 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-[#F4F4F5]">
                Matriz de Risco SST (Probabilidade × Severidade)
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Clique em uma célula para filtrar os desvios daquela faixa de risco ({statusFilter === 'PENDENTES' ? 'apenas pendentes' : 'todos'}).
              </p>
            </div>
            {riskCellFilter && (
              <button
                type="button"
                onClick={() => setRiskCellFilter(null)}
                className="px-2.5 py-1 bg-[#221216] text-[#FB7185] border border-[#F43F5E]/40 rounded-lg text-[11px] font-medium"
              >
                Filtro P{riskCellFilter.p} × S{riskCellFilter.s} • Limpar
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[340px] space-y-1.5 text-xs">
              {[5, 4, 3, 2, 1].map((p) => (
                <div key={p} className="grid grid-cols-6 gap-1.5 items-center">
                  <span className="font-mono text-[10px] text-[#A1A1AA] font-semibold text-right pr-2">
                    P{p}
                  </span>
                  {[1, 2, 3, 4, 5].map((s) => {
                    const score = p * s;
                    const qty = sstMatrixCounts[`${p}-${s}`] || 0;
                    const isSelected = riskCellFilter?.p === p && riskCellFilter?.s === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setRiskCellFilter((prev) =>
                            prev?.p === p && prev?.s === s ? null : { p, s }
                          )
                        }
                        className={`h-11 rounded-lg border flex flex-col items-center justify-center transition ${getHeatmapCellStyle(score)} ${
                          isSelected ? 'ring-2 ring-[#F4F4F5] scale-[1.02]' : 'hover:opacity-90'
                        }`}
                        title={`Probabilidade ${p} × Severidade ${s} = Grau ${score} (${qty} desvio(s))`}
                      >
                        <span className="font-mono font-bold text-xs text-[#F4F4F5] leading-none">
                          {qty}
                        </span>
                        <span className="font-mono text-[9px] text-[#A1A1AA] leading-none mt-1">
                          {score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="grid grid-cols-6 gap-1.5 pt-1 text-center font-mono text-[10px] text-[#A1A1AA] font-semibold">
                <span />
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s}>S{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
                      onClick={() => {
                        setExpandedKey(isExpanded ? null : entry.key);
                        setSliderPos(50);
                      }}
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
                    {item.evidenceUrl && item.afterPhotoUrl && (
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[11px] text-[#A1A1AA]">Modo de visualização:</span>
                        <div className="flex items-center bg-[#0D0E10] border border-[#232429] rounded-lg p-0.5 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCompareMode('split')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                              compareMode === 'split'
                                ? 'bg-[#1E2025] text-[#F4F4F5] font-semibold'
                                : 'text-[#71717A] hover:text-[#F4F4F5]'
                            }`}
                          >
                            <Columns2 className="w-3 h-3" />
                            Lado a Lado
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompareMode('slider')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                              compareMode === 'slider'
                                ? 'bg-[#1E2025] text-[#34D399] font-semibold'
                                : 'text-[#71717A] hover:text-[#F4F4F5]'
                            }`}
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            Slider Interativo
                          </button>
                        </div>
                      </div>
                    )}

                    {item.evidenceUrl && item.afterPhotoUrl && compareMode === 'slider' ? (
                      <div className="bg-[#0D0E10] border border-[#232429] rounded-xl p-3 space-y-2.5">
                        <div className="relative w-full h-56 sm:h-72 rounded-lg overflow-hidden select-none bg-black/40 border border-[#232429]">
                          <img
                            src={sanitizeMediaUrl(item.afterPhotoUrl)}
                            alt="Depois da Correção"
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                          />
                          <div
                            className="absolute inset-0 overflow-hidden"
                            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                          >
                            <img
                              src={sanitizeMediaUrl(item.evidenceUrl)}
                              alt="Antes (Desvio)"
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          </div>

                          <div
                            className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)] pointer-events-none"
                            style={{ left: `${sliderPos}%` }}
                          >
                            <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#2EB88A] text-[#080A09] border-2 border-white shadow-lg flex items-center justify-center">
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/75 text-[#FB7185] border border-[#F43F5E]/40 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                            Antes
                          </span>
                          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 text-[#34D399] border border-[#2EB88A]/40 text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                            Depois
                          </span>

                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={sliderPos}
                            onChange={(e) => setSliderPos(Number(e.target.value))}
                            aria-label="Comparar imagem Antes e Depois"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#71717A] gap-2 flex-wrap">
                          <span>Arraste sobre a foto para comparar Antes e Depois</span>
                          <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-md text-[11px] font-medium cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>{uploadingKey === entry.key ? 'Enviando...' : 'Trocar Foto Depois'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleUploadAfterPhoto(entry, e)}
                            />
                          </label>
                        </div>
                      </div>
                    ) : (
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
                    )}

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
