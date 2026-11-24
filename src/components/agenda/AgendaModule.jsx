import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Plus,
  Play,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  RefreshCw,
  X
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import { AGENDA_PERIODICITIES, getExpiryStatus } from '../../supabase/operationsService';
import { WORK_DISCIPLINES, getDisciplineMeta } from '../../data/workflowsConfig';

export default function AgendaModule({
  schedules = [],
  units = [],
  templates = [],
  onSaveSchedule,
  onDeleteSchedule,
  onStartOrderFromSchedule
}) {
  const { confirm, toast } = useFeedback();
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const openBlankSchedule = () => {
    const defaultUnit = units[0] || null;
    setEditingSchedule({
      id: null,
      unidadeId: defaultUnit?.id || '',
      unidadeNome: defaultUnit?.nome || '',
      clienteNome: defaultUnit?.clienteNome || '',
      regional: defaultUnit?.regional || '',
      municipio: defaultUnit?.municipio || '',
      disciplina: 'meio_ambiente',
      templateId: '',
      periodicidade: 'Mensal',
      proximaData: new Date().toISOString().split('T')[0],
      observacoes: '',
      ativo: true
    });
  };

  const handleSelectUnit = (unitId) => {
    const found = units.find((u) => u.id === unitId);
    if (!found) {
      setEditingSchedule((prev) => ({ ...prev, unidadeId: '' }));
      return;
    }
    setEditingSchedule((prev) => ({
      ...prev,
      unidadeId: found.id,
      unidadeNome: found.nome,
      clienteNome: found.clienteNome || '',
      regional: found.regional || '',
      municipio: found.municipio || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSchedule(editingSchedule);
      toast.success({
        title: editingSchedule.id ? 'Agendamento atualizado' : 'Vistoria programada',
        message: `${editingSchedule.unidadeNome} • ${editingSchedule.periodicidade}`
      });
      setEditingSchedule(null);
    } catch (err) {
      toast.error({ title: 'Não foi possível salvar agendamento', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const activeSchedules = useMemo(
    () => schedules.filter((s) => (showInactive ? true : s.ativo !== false)),
    [schedules, showInactive]
  );

  const stats = useMemo(() => {
    const active = schedules.filter((s) => s.ativo !== false);
    const overdue = active.filter((s) => {
      const st = getExpiryStatus(s.proximaData);
      return st.status === 'vencido' || st.status === 'vence_hoje';
    }).length;
    const next7 = active.filter((s) => {
      const st = getExpiryStatus(s.proximaData);
      return st.daysRemaining !== null && st.daysRemaining > 0 && st.daysRemaining <= 7;
    }).length;
    const recurring = active.filter((s) => s.periodicidade !== 'Única').length;
    return { totalActive: active.length, overdue, next7, recurring };
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F4F4F5] tracking-tight">
            Agenda &amp; Programação Recorrente de Vistorias
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Programe vistorias mensais, trimestrais ou anuais por unidade e inicie a execução em campo com 1 clique
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#141518] border border-[#232429] rounded-lg text-xs text-[#A1A1AA] cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-[#2EB88A]"
            />
            Mostrar concluídas/pausadas
          </label>
          <button
            type="button"
            onClick={openBlankSchedule}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Programar Vistoria
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Programações Ativas</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{stats.totalActive}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Para Hoje / Atrasadas</span>
          <span className="text-2xl font-bold font-mono text-[#FB7185] mt-1 block">{stats.overdue}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Próximos 7 dias</span>
          <span className="text-2xl font-bold font-mono text-[#FBBF24] mt-1 block">{stats.next7}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Ciclos Recorrentes</span>
          <span className="text-2xl font-bold font-mono text-[#34D399] mt-1 block">{stats.recurring}</span>
        </div>
      </div>

      {/* Lista de Programações */}
      {activeSchedules.length === 0 ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-12 text-center space-y-3">
          <Calendar className="w-10 h-10 text-[#71717A] mx-auto" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">Nenhuma vistoria agendada</h3>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            Defina visitas recorrentes (mensais, trimestrais ou semestrais) para suas unidades de Meio Ambiente ou Segurança do Trabalho.
          </p>
          <button
            type="button"
            onClick={openBlankSchedule}
            className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
          >
            + Programar 1ª Vistoria
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSchedules.map((sch) => {
            const due = getExpiryStatus(sch.proximaData);
            const isOverdue = due.status === 'vencido' || due.status === 'vence_hoje';
            const disc = getDisciplineMeta(sch.disciplina);
            const tplName = sch.templateId
              ? templates.find((t) => t.id === sch.templateId)?.nome || 'Modelo personalizado'
              : sch.disciplina === 'seguranca_trabalho'
                ? 'SST Modular (NRs)'
                : 'Checklist Padrão (63 itens)';

            return (
              <div
                key={sch.id}
                className={`bg-[#141518] border rounded-xl p-5 space-y-3.5 flex flex-col justify-between transition ${
                  isOverdue && sch.ativo !== false
                    ? 'border-[#F43F5E]/40'
                    : 'border-[#232429] hover:border-[#2D2F36]'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={due.variant} size="sm">
                        {sch.ativo === false ? 'Concluída' : due.label}
                      </Badge>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#0D0E10] border border-[#232429] text-[#34D399]">
                        <RefreshCw className="w-2.5 h-2.5" />
                        {sch.periodicidade}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#A1A1AA]">
                        {disc.shortLabel}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#F4F4F5]">
                      {sch.proximaData ? new Date(`${sch.proximaData}T12:00:00`).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#34D399] shrink-0" />
                      <span className="truncate">{sch.unidadeNome}</span>
                    </h3>
                    <p className="text-[11px] text-[#71717A] mt-0.5">
                      {sch.clienteNome || 'Cliente'} {sch.municipio ? `• ${sch.municipio}` : ''} • {tplName}
                    </p>
                  </div>

                  {sch.ultimaExecucao && (
                    <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399]" />
                      Última execução:{' '}
                      <span className="font-mono">
                        {new Date(`${sch.ultimaExecucao}T12:00:00`).toLocaleDateString('pt-BR')}
                      </span>
                    </p>
                  )}

                  {sch.observacoes && (
                    <p className="text-[11px] text-[#71717A] bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5">
                      {sch.observacoes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[#1F2024] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onStartOrderFromSchedule?.(sch)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar Vistoria Agora
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingSchedule(sch)}
                    className="p-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#2D2F36] rounded-lg transition"
                    title="Editar programação"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Remover agendamento',
                        message: 'Deseja excluir esta programação recorrente da agenda?',
                        detail: `${sch.unidadeNome} • ${sch.periodicidade}`,
                        confirmLabel: 'Excluir',
                        variant: 'danger'
                      });
                      if (ok) {
                        await onDeleteSchedule(sch.id);
                        toast.success({ title: 'Agendamento removido', message: sch.unidadeNome });
                      }
                    }}
                    className="p-2 bg-[#1C1D22] hover:bg-[#221216] text-[#71717A] hover:text-[#FB7185] border border-[#2D2F36] rounded-lg transition"
                    title="Excluir agendamento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Agendamento */}
      {editingSchedule &&
        (() => {
          const modal = (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
              <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#34D399]" />
                <div>
                  <h3 className="font-semibold text-[#F4F4F5] text-sm">
                    {editingSchedule.id ? 'Editar Agendamento' : 'Programar Vistoria Recorrente'}
                  </h3>
                  <p className="text-[11px] text-[#71717A]">Configure unidade, fluxo e periodicidade</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {units.length > 0 && (
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Unidade Cadastrada</label>
                  <select
                    value={editingSchedule.unidadeId || ''}
                    onChange={(e) => handleSelectUnit(e.target.value)}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    <option value="">-- Digitar unidade manualmente --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} {u.clienteNome ? `(${u.clienteNome})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Unidade *</label>
                  <input
                    type="text"
                    required
                    value={editingSchedule.unidadeNome}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, unidadeNome: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Cliente</label>
                  <input
                    type="text"
                    value={editingSchedule.clienteNome}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, clienteNome: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Fluxo de Trabalho *</label>
                  <select
                    value={editingSchedule.disciplina}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, disciplina: e.target.value, templateId: '' })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    {WORK_DISCIPLINES.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Modelo de Checklist</label>
                  <select
                    value={editingSchedule.templateId || ''}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, templateId: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    <option value="">
                      {editingSchedule.disciplina === 'seguranca_trabalho'
                        ? 'Padrão SST (NRs Modulares)'
                        : 'Padrão Ambiental (63 itens)'}
                    </option>
                    {templates
                      .filter((t) => t.disciplina === editingSchedule.disciplina)
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.nome}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Periodicidade *</label>
                  <select
                    value={editingSchedule.periodicidade}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, periodicidade: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    {AGENDA_PERIODICITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Próxima Data *</label>
                  <input
                    type="date"
                    required
                    value={editingSchedule.proximaData}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, proximaData: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Observações da visita</label>
                <textarea
                  rows={2}
                  value={editingSchedule.observacoes}
                  onChange={(e) => setEditingSchedule({ ...editingSchedule, observacoes: e.target.value })}
                  placeholder="Ex: Foco em validade de extintores e inspeção da ETE..."
                  className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg p-2.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#1F2024] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg"
                >
                  {saving ? 'Salvando...' : 'Salvar Programação'}
                </button>
              </div>
            </form>
          </div>
        </div>
          );
          return typeof document !== 'undefined' && document.body ? createPortal(modal, document.body) : modal;
        })()}
    </div>
  );
}
