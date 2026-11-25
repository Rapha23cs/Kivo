import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  List,
  MapPin,
  Calendar,
  CheckCircle2,
  Eye,
  Building2,
  Trash2,
  ClipboardList
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import { calculateInspectionSummary } from '../../data/emserhChecklistData';
import { ORDER_STATUS_META, getOrderStatusMeta, sanitizeMediaUrl } from '../../utils/kivoHelpers';
import { WORK_DISCIPLINES, getDisciplineMeta } from '../../data/workflowsConfig';

export default function WorkOrderList({
  orders,
  clients = [],
  isAdmin = false,
  onOpenOrder,
  onNewOrder,
  onDeleteOrder,
  onUpdateOrderStatus,
  onRestoreOrder,
  onOpenTemplates
}) {
  const { confirm, toast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState('all');
  const [auditorFilter, setAuditorFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [draggingOrderId, setDraggingOrderId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const statusBadges = ORDER_STATUS_META;

  const handleDeleteWithUndo = async (order) => {
    const ok = await confirm({
      title: 'Excluir inspeção',
      message: 'Deseja excluir esta inspeção e todas as respostas registradas no checklist? Você poderá desfazer logo após pela notificação.',
      detail: `${order.id} • ${order.hospitalName}`,
      confirmLabel: 'Excluir Inspeção',
      variant: 'danger'
    });
    if (!ok) return;
    await onDeleteOrder(order);
    toast.success({
      title: 'Inspeção excluída',
      message: `${order.id} foi removida.`,
      duration: 6000,
      action: onRestoreOrder
        ? {
            label: 'Desfazer',
            onClick: () => onRestoreOrder(order)
          }
        : undefined
    });
  };

  const auditorOptions = Array.from(
    new Set((orders || []).map((o) => o.technicianName).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const filteredOrders = orders.filter((order) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      (order.clientName || '').toLowerCase().includes(q) ||
      (order.hospitalName || '').toLowerCase().includes(q) ||
      (order.regional || '').toLowerCase().includes(q) ||
      (order.municipio || '').toLowerCase().includes(q) ||
      (order.technicianName || '').toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesDiscipline =
      disciplineFilter === 'all' || (order.discipline || 'meio_ambiente') === disciplineFilter;
    const matchesInspectionType =
      inspectionTypeFilter === 'all' || (order.inspectionType || 'Programada') === inspectionTypeFilter;
    const matchesAuditor =
      auditorFilter === 'all' || (order.technicianName || '') === auditorFilter;

    return matchesSearch && matchesStatus && matchesDiscipline && matchesInspectionType && matchesAuditor;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#F4F4F5] tracking-tight">
            {isAdmin ? 'Supervisão de Vistorias & Checklists' : 'Vistorias & Checklists'}
          </h2>
          <p className="text-xs text-[#71717A]">
            {isAdmin
              ? 'Acompanhamento administrativo das auditorias realizadas em campo pelos usuários'
              : 'Vistorias técnicas por fluxo de trabalho (Meio Ambiente e Segurança do Trabalho)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#141518] border border-[#232429] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition ${viewMode === 'list' ? 'bg-[#1E2025] text-[#F4F4F5]' : 'text-[#71717A] hover:text-[#F4F4F5]'}`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition ${viewMode === 'kanban' ? 'bg-[#1E2025] text-[#F4F4F5]' : 'text-[#71717A] hover:text-[#F4F4F5]'}`}
              title="Visualização em Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {onOpenTemplates && (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#141518] hover:bg-[#1C1D22] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
              title="Criar ou duplicar modelos de checklist"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#34D399]" />
              <span className="hidden sm:inline">Modelos</span>
            </button>
          )}

          {!isAdmin && (
            <button
              onClick={onNewOrder}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#080A09] rounded-lg text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              Nova Vistoria
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#71717A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código, cliente, unidade, regional ou município..."
            className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg pl-9 pr-3 py-2 text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#34D399] transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-[#71717A]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[#E4E4E7] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Status</option>
              <option value="open" className="bg-[#141518] text-[#F4F4F5]">Agendadas</option>
              <option value="in_progress" className="bg-[#141518] text-[#F4F4F5]">Em Andamento</option>
              <option value="completed" className="bg-[#141518] text-[#F4F4F5]">Concluídas</option>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5">
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="bg-transparent text-[#E4E4E7] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Fluxos</option>
              {WORK_DISCIPLINES.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#141518] text-[#F4F4F5]">
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5">
            <select
              value={inspectionTypeFilter}
              onChange={(e) => setInspectionTypeFilter(e.target.value)}
              className="bg-transparent text-[#E4E4E7] focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Tipos</option>
              <option value="Programada" className="bg-[#141518] text-[#F4F4F5]">Programadas</option>
              <option value="Não Programada" className="bg-[#141518] text-[#F4F4F5]">Não Programadas</option>
            </select>
          </div>

          {isAdmin && auditorOptions.length > 0 && (
            <div className="flex items-center gap-1 bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5">
              <select
                value={auditorFilter}
                onChange={(e) => setAuditorFilter(e.target.value)}
                className="bg-transparent text-[#E4E4E7] focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Auditores</option>
                {auditorOptions.map((name) => (
                  <option key={name} value={name} className="bg-[#141518] text-[#F4F4F5]">
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Lista ou Kanban */}
      {viewMode === 'list' ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl overflow-hidden">
          {/* Mobile & Portrait Tablet Card List (< md) */}
          <div className="md:hidden divide-y divide-[#1F2024]">
            {filteredOrders.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[#71717A]">
                {isAdmin ? (
                  'Nenhuma inspeção encontrada para os filtros selecionados.'
                ) : (
                  <>
                    Nenhuma inspeção encontrada. Clique em <strong className="text-[#F4F4F5]">Nova Vistoria</strong> para criar uma.
                  </>
                )}
              </div>
            ) : (
              filteredOrders.map((order) => {
                const summary = calculateInspectionSummary(order.checklist || []);
                const percent = summary.percentualConformidade;

                return (
                  <div
                    key={order.id}
                    onClick={() => onOpenOrder(order)}
                    className="p-4 space-y-2.5 active:bg-[#191A1E] cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-[#F4F4F5]">
                          {order.id}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                            (order.discipline || 'meio_ambiente') === 'seguranca_trabalho'
                              ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30'
                              : 'bg-[#181A20] text-[#A1A1AA] border-[#2D2F36]'
                          }`}
                        >
                          {getDisciplineMeta(order.discipline).shortLabel}
                        </span>
                        {order.inspectionType && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                              order.inspectionType === 'Programada'
                                ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                                : 'bg-[#1A1B20] text-[#CBD5E1] border-[#2E3038]'
                            }`}
                          >
                            {order.inspectionType}
                          </span>
                        )}
                      </div>
                      <Badge variant={getOrderStatusMeta(order.status).variant} size="sm">
                        {getOrderStatusMeta(order.status).label}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#F4F4F5] leading-snug">{order.hospitalName}</p>
                      <p className="text-[11px] text-[#71717A]">
                        {order.clientName || 'Cliente não informado'}
                        {isAdmin && order.technicianName ? ` • Auditor: ${order.technicianName}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#A1A1AA] flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-[#71717A] shrink-0" />
                        <span className="truncate">{order.regional} • {order.municipio}</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono shrink-0">
                        <Calendar className="w-3 h-3 text-[#71717A]" />
                        {order.scheduledDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 max-w-[120px] h-1.5 bg-[#232429] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              percent >= 80 ? 'bg-[#2EB88A]' : percent >= 50 ? 'bg-[#94A3B8]' : 'bg-[#F43F5E]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-[#E4E4E7] text-xs font-semibold">{percent}%</span>
                        {summary.desviosCount > 0 && (
                          <span className="text-[10px] text-[#FB7185] font-medium">
                            ({summary.desviosCount} desvios)
                          </span>
                        )}
                      </div>

                      {onDeleteOrder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWithUndo(order);
                          }}
                          className="p-2 text-[#71717A] hover:text-[#FB7185] rounded-lg hover:bg-[#221216] transition shrink-0"
                          title="Excluir Inspeção"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Landscape Table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111214] text-[#71717A] uppercase font-medium border-b border-[#232429]">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente & Unidade</th>
                  <th className="py-3 px-4">Regional / Município</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Conformidade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2024]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#71717A]">
                      {isAdmin ? (
                        'Nenhuma inspeção encontrada para os filtros selecionados.'
                      ) : (
                        <>
                          Nenhuma inspeção encontrada. Clique em <strong className="text-[#F4F4F5]">Nova Vistoria</strong> para criar uma.
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const summary = calculateInspectionSummary(order.checklist || []);
                    const percent = summary.percentualConformidade;

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#191A1E] transition cursor-pointer group"
                        onClick={() => onOpenOrder(order)}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-[#F4F4F5]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{order.id}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-medium border ${
                                (order.discipline || 'meio_ambiente') === 'seguranca_trabalho'
                                  ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30'
                                  : 'bg-[#181A20] text-[#A1A1AA] border-[#2D2F36]'
                              }`}
                            >
                              {getDisciplineMeta(order.discipline).shortLabel}
                            </span>
                            {order.inspectionType && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-medium border ${
                                  order.inspectionType === 'Programada'
                                    ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                                    : 'bg-[#1A1B20] text-[#CBD5E1] border-[#2E3038]'
                                }`}
                              >
                                {order.inspectionType}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#F4F4F5]">{order.hospitalName}</p>
                          <p className="text-[#71717A] text-[11px] flex items-center gap-1.5 mt-0.5">
                            {(() => {
                              const logo = (clients || []).find(
                                (c) => c?.nome && order.clientName && c.nome.toLowerCase() === order.clientName.toLowerCase()
                              )?.logoUrl;
                              return logo ? (
                                <img
                                  src={sanitizeMediaUrl(logo)}
                                  alt={order.clientName}
                                  className="w-3.5 h-3.5 rounded-sm object-contain bg-white p-[1px] shrink-0"
                                />
                              ) : null;
                            })()}
                            <span>{order.clientName || 'Cliente não informado'}</span>
                            {isAdmin && order.technicianName && (
                              <span className="text-[#A1A1AA]">• {order.technicianName}</span>
                            )}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-[#A1A1AA]">
                          <span className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-[#71717A]" />
                            {order.regional} • {order.municipio}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A1A1AA]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#71717A]" />
                            {order.scheduledDate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1 bg-[#232429] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    percent >= 80 ? 'bg-[#2EB88A]' : percent >= 50 ? 'bg-[#94A3B8]' : 'bg-[#F43F5E]'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="font-mono text-[#E4E4E7] text-[11px] font-semibold">{percent}%</span>
                            </div>
                            {summary.desviosCount > 0 && (
                              <span className="text-[10px] text-[#FB7185] font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                                {summary.desviosCount} desvio(s)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={statusBadges[order.status]?.variant || 'neutral'}>
                            {statusBadges[order.status]?.label || order.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenOrder(order);
                              }}
                              className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#232429] transition"
                              title="Abrir Checklist"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {onDeleteOrder && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWithUndo(order);
                                }}
                                className="p-1.5 text-[#71717A] hover:text-[#FB7185] rounded-lg hover:bg-[#221216] transition"
                                title="Excluir Inspeção"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'open', label: 'Agendadas', dot: 'bg-[#71717A]' },
            { key: 'in_progress', label: 'Em Andamento', dot: 'bg-[#2EB88A]' },
            { key: 'completed', label: 'Concluídas', dot: 'bg-[#34D399]' }
          ].map((col) => {
            const colOrders = filteredOrders.filter((o) => o.status === col.key);
            const isOver = dragOverCol === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.key);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  const ord = orders.find((o) => o.id === draggingOrderId);
                  setDraggingOrderId(null);
                  if (ord && ord.status !== col.key && onUpdateOrderStatus) {
                    onUpdateOrderStatus(ord, col.key);
                    toast.success({
                      title: 'Status atualizado',
                      message: `${ord.id} movida para ${col.label}.`
                    });
                  }
                }}
                className={`bg-[#141518] border rounded-xl p-3.5 flex flex-col space-y-3 transition ${
                  isOver ? 'border-[#2EB88A] bg-[#141D1A]' : 'border-[#232429]'
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#232429] pb-2">
                  <span className="font-semibold text-xs uppercase tracking-wider text-[#A1A1AA] flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />
                    {col.label}
                  </span>
                  <span className="text-xs bg-[#0D0E10] px-2 py-0.5 rounded text-[#A1A1AA] font-mono border border-[#232429]">
                    {colOrders.length}
                  </span>
                </div>
                <div className="space-y-2.5 overflow-y-auto md:max-h-[600px]">
                  {colOrders.map((order) => {
                    const s = calculateInspectionSummary(order.checklist || []);
                    return (
                      <div
                        key={order.id}
                        draggable={Boolean(onUpdateOrderStatus)}
                        onDragStart={() => setDraggingOrderId(order.id)}
                        onDragEnd={() => {
                          setDraggingOrderId(null);
                          setDragOverCol(null);
                        }}
                        onClick={() => onOpenOrder(order)}
                        className="bg-[#0E0F12] border border-[#232429] hover:border-[#32343C] p-3.5 rounded-lg cursor-pointer transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-[#F4F4F5]">{order.id}</span>
                          <span className="text-[11px] font-mono text-[#34D399]">{s.percentualConformidade}%</span>
                        </div>
                        <p className="text-xs font-medium text-[#E4E4E7] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                          <span className="truncate">{order.hospitalName}</span>
                        </p>
                        <p className="text-[11px] text-[#71717A] truncate">
                          {order.clientName || 'Cliente'} • {order.regional} • {order.municipio}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#232429] text-[11px] text-[#71717A]">
                          <span className="font-mono">{order.scheduledDate}</span>
                          {onUpdateOrderStatus ? (
                            <select
                              value={order.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                const nextSt = e.target.value;
                                onUpdateOrderStatus(order, nextSt);
                                toast.success({
                                  title: 'Status atualizado',
                                  message: `${order.id} → ${getOrderStatusMeta(nextSt).label}`
                                });
                              }}
                              className="bg-[#141518] border border-[#27282E] rounded px-1.5 py-0.5 text-[10px] text-[#E4E4E7] focus:outline-none"
                            >
                              <option value="open">Agendada</option>
                              <option value="in_progress">Em Andamento</option>
                              <option value="completed">Concluída</option>
                            </select>
                          ) : col.key === 'completed' ? (
                            <span className="flex items-center gap-1 text-[#34D399]">
                              <CheckCircle2 className="w-3 h-3" /> Concluída
                            </span>
                          ) : (
                            <span className="text-[#34D399] font-medium">Abrir Checklist</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
