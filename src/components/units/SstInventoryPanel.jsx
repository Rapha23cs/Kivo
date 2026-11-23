import React, { useMemo, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit3,
  Trash2,
  Building2,
  Calendar,
  AlertTriangle,
  X,
  Check
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import { SST_INVENTORY_CATEGORIES } from '../../data/sstChecklistData';
import { getExpiryStatus } from '../../supabase/operationsService';

export default function SstInventoryPanel({
  items = [],
  units = [],
  onSaveItem,
  onDeleteItem
}) {
  const { confirm, toast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | ALERTA
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const openBlank = () => {
    const def = units[0] || null;
    setEditing({
      id: null,
      unidadeId: def?.id || '',
      unidadeNome: def?.nome || '',
      clienteNome: def?.clienteNome || '',
      categoria: SST_INVENTORY_CATEGORIES[0],
      itemNome: '',
      codigoPatrimonio: '',
      dataUltima: '',
      dataValidade: '',
      responsavel: '',
      observacoes: ''
    });
  };

  const handleSelectUnit = (unitId) => {
    const u = units.find((x) => x.id === unitId);
    if (!u) {
      setEditing((prev) => ({ ...prev, unidadeId: '' }));
      return;
    }
    setEditing((prev) => ({
      ...prev,
      unidadeId: u.id,
      unidadeNome: u.nome,
      clienteNome: u.clienteNome || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveItem(editing);
      toast.success({
        title: editing.id ? 'Item SST atualizado' : 'Item SST cadastrado',
        message: `${editing.itemNome} • ${editing.unidadeNome}`
      });
      setEditing(null);
    } catch (err) {
      toast.error({ title: 'Falha ao salvar item SST', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    let expired = 0;
    let dueSoon = 0;
    let ok = 0;
    items.forEach((it) => {
      const st = getExpiryStatus(it.dataValidade);
      if (st.status === 'vencido' || st.status === 'vence_hoje') expired += 1;
      else if (st.status === 'alerta_30' || st.status === 'alerta_60') dueSoon += 1;
      else ok += 1;
    });
    return { total: items.length, expired, dueSoon, ok };
  }, [items]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== 'ALL' && it.categoria !== categoryFilter) return false;
      if (statusFilter === 'ALERTA') {
        const st = getExpiryStatus(it.dataValidade);
        if (st.status === 'em_dia' || st.status === 'indefinido') return false;
      }
      if (!q) return true;
      return (
        it.itemNome?.toLowerCase().includes(q) ||
        it.unidadeNome?.toLowerCase().includes(q) ||
        it.clienteNome?.toLowerCase().includes(q) ||
        it.codigoPatrimonio?.toLowerCase().includes(q) ||
        it.categoria?.toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Banner + Botão */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141518] border border-[#232429] rounded-xl p-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-[#F4F4F5] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FBBF24]" />
            Inventário &amp; Vencimentos SST por Unidade
          </h3>
          <p className="text-[11px] text-[#71717A]">
            Controle validades de AVCB/CLCB, extintores, treinamentos (NRs), ASOs e laudos PGR/PCMSO com alertas automáticos de 30 e 60 dias.
          </p>
        </div>

        <button
          type="button"
          onClick={openBlank}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Novo Item / Vencimento
        </button>
      </div>

      {/* KPIs SST */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141518] border border-[#232429] p-3.5 rounded-xl">
          <span className="text-[#71717A] block">Itens Monitorados</span>
          <span className="text-xl font-bold font-mono text-[#F4F4F5] mt-0.5 block">{summary.total}</span>
        </div>
        <div className="bg-[#141518] border border-[#F43F5E]/30 p-3.5 rounded-xl">
          <span className="text-[#71717A] block">Vencidos / Hoje</span>
          <span className="text-xl font-bold font-mono text-[#FB7185] mt-0.5 block">{summary.expired}</span>
        </div>
        <div className="bg-[#141518] border border-[#F59E0B]/30 p-3.5 rounded-xl">
          <span className="text-[#71717A] block">Vencem em até 60d</span>
          <span className="text-xl font-bold font-mono text-[#FBBF24] mt-0.5 block">{summary.dueSoon}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-3.5 rounded-xl">
          <span className="text-[#71717A] block">Regulares</span>
          <span className="text-xl font-bold font-mono text-[#34D399] mt-0.5 block">{summary.ok}</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex flex-col sm:flex-row gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar extintor, AVCB, NR, unidade ou patrimônio..."
            className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg pl-9 pr-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
        >
          <option value="ALL">Todas as Categorias</option>
          {SST_INVENTORY_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
        >
          <option value="ALL">Todos os Prazos</option>
          <option value="ALERTA">Apenas Vencidos / Alerta (≤ 60d)</option>
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-10 text-center space-y-2 text-xs text-[#71717A]">
          <AlertTriangle className="w-8 h-8 text-[#FBBF24] mx-auto opacity-75" />
          <p className="text-sm font-semibold text-[#F4F4F5]">Nenhum registro de vencimento SST encontrado</p>
          <p>Cadastre extintores, AVCB/CLCB, ASOs ou laudos de PGR/PCMSO para monitorar vencimentos por unidade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((it) => {
            const st = getExpiryStatus(it.dataValidade);
            return (
              <div
                key={it.id}
                className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#A1A1AA]">
                      {it.categoria}
                    </span>
                    <Badge variant={st.variant} size="sm">{st.label}</Badge>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-[#F4F4F5] truncate">{it.itemNome}</h4>
                    {it.codigoPatrimonio && (
                      <span className="font-mono text-[10px] text-[#34D399] shrink-0">
                        #{it.codigoPatrimonio}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#71717A]">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {it.unidadeNome} {it.clienteNome ? `(${it.clienteNome})` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[#E4E4E7]">
                      <Calendar className="w-3.5 h-3.5 text-[#71717A]" />
                      Validade: {it.dataValidade ? new Date(`${it.dataValidade}T12:00:00`).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>

                  {it.observacoes && (
                    <p className="text-[11px] text-[#A1A1AA] bg-[#0D0E10] border border-[#232429] rounded px-2.5 py-1.5">
                      {it.observacoes}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#1F2024] flex items-center justify-between text-[11px]">
                  <span className="text-[#71717A] truncate">
                    {it.responsavel ? `Resp.: ${it.responsavel}` : 'Sem responsável'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(it)}
                      className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded hover:bg-[#1C1D22]"
                      title="Editar item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: 'Remover item do inventário SST',
                          message: 'Deseja remover este registro de controle de validade?',
                          detail: `${it.itemNome} • ${it.unidadeNome}`,
                          confirmLabel: 'Remover',
                          variant: 'danger'
                        });
                        if (ok) {
                          await onDeleteItem(it.id);
                          toast.success({ title: 'Item removido', message: it.itemNome });
                        }
                      }}
                      className="p-1.5 text-[#71717A] hover:text-[#FB7185] rounded hover:bg-[#221216]"
                      title="Remover item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Item SST */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-lg h-[100dvh] sm:h-auto rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FBBF24]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">
                  {editing.id ? 'Editar Vencimento SST' : 'Novo Controle de Validade SST'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
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
                    value={editing.unidadeId || ''}
                    onChange={(e) => handleSelectUnit(e.target.value)}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    <option value="">-- Digitar unidade manualmente --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.nome} ({u.clienteNome || 'Cliente'})</option>
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
                    value={editing.unidadeNome}
                    onChange={(e) => setEditing({ ...editing, unidadeNome: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Categoria *</label>
                  <select
                    value={editing.categoria}
                    onChange={(e) => setEditing({ ...editing, categoria: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    {SST_INVENTORY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#A1A1AA] font-medium mb-1">Item / Documento *</label>
                  <input
                    type="text"
                    required
                    value={editing.itemNome}
                    onChange={(e) => setEditing({ ...editing, itemNome: e.target.value })}
                    placeholder="Ex: Extintor PQS 6kg Recepção ou AVCB Geral"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Patrimônio / Nº</label>
                  <input
                    type="text"
                    value={editing.codigoPatrimonio}
                    onChange={(e) => setEditing({ ...editing, codigoPatrimonio: e.target.value })}
                    placeholder="EXT-01"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Última Inspeção/Emissão</label>
                  <input
                    type="date"
                    value={editing.dataUltima}
                    onChange={(e) => setEditing({ ...editing, dataUltima: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Data de Validade *</label>
                  <input
                    type="date"
                    required
                    value={editing.dataValidade}
                    onChange={(e) => setEditing({ ...editing, dataValidade: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Responsável / Fornecedor</label>
                <input
                  type="text"
                  value={editing.responsavel}
                  onChange={(e) => setEditing({ ...editing, responsavel: e.target.value })}
                  placeholder="Ex: Brigada / SESMT / Manutenção"
                  className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Observações</label>
                <input
                  type="text"
                  value={editing.observacoes}
                  onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })}
                  placeholder="Ex: Próximo teste hidrostático em 2028..."
                  className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                />
              </div>

              <div className="pt-3 border-t border-[#1F2024] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
