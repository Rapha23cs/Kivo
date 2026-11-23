import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Edit3,
  Trash2,
  ClipboardList,
  FileBarChart2,
  Users,
  Phone,
  History,
  X,
  Check,
  Sparkles,
  ExternalLink,
  Upload
} from 'lucide-react';
import Badge from '../common/Badge';
import { useFeedback } from '../common/FeedbackProvider';
import { calculateInspectionSummary } from '../../data/emserhChecklistData';
import { compressImageToDataUrl } from '../../supabase/dataService';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

const UNIT_TYPES = [
  'Hospital',
  'UPA',
  'UBS',
  'Policlínica',
  'Clínica',
  'Laboratório',
  'Indústria',
  'Outro'
];

const BLANK_UNIT = {
  id: null,
  clienteNome: '',
  codigo: '',
  nome: '',
  tipo: 'Hospital',
  regional: '',
  municipio: '',
  uf: 'MA',
  endereco: '',
  responsavelLocal: '',
  contatoLocal: ''
};

export default function UnitsModule({
  units = [],
  clients = [],
  orders = [],
  reports = [],
  onSaveUnit,
  onDeleteUnit,
  onSaveClient,
  onDeleteClient,
  onImportUnitsFromOrders,
  onNewOrderForUnit,
  onOpenOrder,
  onNavigateTab
}) {
  const { confirm, toast } = useFeedback();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [editingUnit, setEditingUnit] = useState(null);
  const [savingUnit, setSavingUnit] = useState(false);

  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    id: null,
    nome: '',
    codigo: '',
    segmento: 'Hospitalar / Saúde',
    logoUrl: ''
  });
  const [savingClient, setSavingClient] = useState(false);

  const [historyUnit, setHistoryUnit] = useState(null);

  const matchesUnit = (unit, entityUnitName, entityClientName, entityUnitId) => {
    if (entityUnitId && unit.id === entityUnitId) return true;
    const sameName = (entityUnitName || '').trim().toLowerCase() === (unit.nome || '').trim().toLowerCase();
    if (!sameName) return false;
    if (!unit.clienteNome) return true;
    return (entityClientName || '').trim().toLowerCase() === unit.clienteNome.trim().toLowerCase();
  };

  const unimportedOrdersCount = useMemo(() => {
    const existingKeys = new Set(
      units.map((u) => `${(u.clienteNome || '').toLowerCase()}::${(u.nome || '').toLowerCase()}`)
    );
    const seen = new Set();
    orders.forEach((o) => {
      if (!o.hospitalName) return;
      const key = `${(o.clientName || '').toLowerCase()}::${o.hospitalName.toLowerCase()}`;
      if (!existingKeys.has(key)) seen.add(key);
    });
    return seen.size;
  }, [units, orders]);

  const filteredUnits = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return units.filter((u) => {
      if (typeFilter !== 'ALL' && u.tipo !== typeFilter) return false;
      if (!q) return true;
      return (
        u.nome?.toLowerCase().includes(q) ||
        u.codigo?.toLowerCase().includes(q) ||
        u.clienteNome?.toLowerCase().includes(q) ||
        u.regional?.toLowerCase().includes(q) ||
        u.municipio?.toLowerCase().includes(q) ||
        u.responsavelLocal?.toLowerCase().includes(q)
      );
    });
  }, [units, searchTerm, typeFilter]);

  const handleOpenNewUnit = () => {
    setEditingUnit({
      ...BLANK_UNIT,
      clienteNome: clients[0]?.nome || ''
    });
  };

  const handleSubmitUnit = async (e) => {
    e.preventDefault();
    setSavingUnit(true);
    try {
      const isEdit = Boolean(editingUnit?.id);
      const savedName = editingUnit?.nome;
      await onSaveUnit(editingUnit);
      setEditingUnit(null);
      toast.success({
        title: isEdit ? 'Unidade atualizada' : 'Unidade cadastrada',
        message: savedName
      });
    } catch (err) {
      toast.error({ title: 'Não foi possível salvar a unidade', message: err.message });
    } finally {
      setSavingUnit(false);
    }
  };

  const handleSubmitClient = async (e) => {
    e.preventDefault();
    setSavingClient(true);
    try {
      const isEdit = Boolean(newClientForm?.id);
      const savedName = newClientForm?.nome;
      await onSaveClient(newClientForm);
      setNewClientForm({ id: null, nome: '', codigo: '', segmento: 'Hospitalar / Saúde', logoUrl: '' });
      toast.success({
        title: isEdit ? 'Cliente atualizado' : 'Cliente adicionado',
        message: savedName
      });
    } catch (err) {
      toast.error({ title: 'Não foi possível salvar o cliente', message: err.message });
    } finally {
      setSavingClient(false);
    }
  };

  const historyOrders = historyUnit
    ? orders.filter((o) => matchesUnit(historyUnit, o.hospitalName, o.clientName, o.unidadeId))
    : [];
  const historyReports = historyUnit
    ? reports.filter((r) => matchesUnit(historyUnit, r.unidade, r.clienteNome, r.unidadeId))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F4F4F5] tracking-tight">
            Clientes & Unidades Atendidas
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Cadastre hospitais, clínicas e unidades para agilizar novas vistorias, relatórios e acompanhar o histórico por local
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {unimportedOrdersCount > 0 && onImportUnitsFromOrders && (
            <button
              type="button"
              onClick={onImportUnitsFromOrders}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg text-xs font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Importar {unimportedOrdersCount} das Vistorias
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsClientsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141518] hover:bg-[#1C1D22] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
          >
            <Users className="w-4 h-4 text-[#34D399]" />
            Clientes ({clients.length})
          </button>
          <button
            type="button"
            onClick={handleOpenNewUnit}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Nova Unidade
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Clientes Ativos</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{clients.length}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Unidades Cadastradas</span>
          <span className="text-2xl font-bold font-mono text-[#34D399] mt-1 block">{units.length}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Vistorias Registradas</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{orders.length}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Relatórios Técnicos</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{reports.length}</span>
        </div>
      </div>

      {/* Busca e Filtro */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar unidade por nome, código, cliente, regional ou município..."
            className="w-full bg-[#0D0E10] border border-[#232429] rounded-lg pl-9 pr-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5 text-[#E4E4E7] focus:outline-none focus:border-[#2EB88A]"
        >
          <option value="ALL">Todos os Tipos</option>
          {UNIT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Lista de Unidades */}
      {filteredUnits.length === 0 ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-10 text-center space-y-3">
          <Building2 className="w-10 h-10 text-[#71717A] mx-auto" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">Nenhuma unidade cadastrada ainda</h3>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            Cadastre suas unidades atendidas para preencher novas vistorias e relatórios em 1 clique e acompanhar o histórico de conformidade por estabelecimento.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            {unimportedOrdersCount > 0 && onImportUnitsFromOrders && (
              <button
                type="button"
                onClick={onImportUnitsFromOrders}
                className="px-4 py-2 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg text-xs font-medium transition"
              >
                Importar das Vistorias ({unimportedOrdersCount})
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenNewUnit}
              className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
            >
              + Nova Unidade
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUnits.map((unit) => {
            const unitOrders = orders.filter((o) =>
              matchesUnit(unit, o.hospitalName, o.clientName, o.unidadeId)
            );
            const unitReports = reports.filter((r) =>
              matchesUnit(unit, r.unidade, r.clienteNome, r.unidadeId)
            );
            const latestOrder = unitOrders[0] || null;
            const latestSummary = latestOrder ? calculateInspectionSummary(latestOrder.checklist || []) : null;

            return (
              <div
                key={unit.id}
                className="bg-[#141518] border border-[#232429] hover:border-[#2D2F36] rounded-xl p-5 space-y-4 flex flex-col justify-between transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="info" size="sm">{unit.tipo || 'Unidade'}</Badge>
                      {unit.codigo && (
                        <span className="font-mono text-[10px] text-[#34D399] bg-[#0D0E10] px-2 py-0.5 rounded border border-[#232429]">
                          {unit.codigo}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingUnit({ ...unit })}
                        className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition"
                        title="Editar unidade"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Excluir unidade',
                            message: 'Deseja remover esta unidade do seu catálogo? As vistorias e relatórios já emitidos serão mantidos.',
                            detail: `${unit.nome}${unit.clienteNome ? ` • ${unit.clienteNome}` : ''}`,
                            confirmLabel: 'Excluir Unidade',
                            variant: 'danger'
                          });
                          if (ok) {
                            await onDeleteUnit(unit);
                            toast.success({
                              title: 'Unidade removida',
                              message: unit.nome
                            });
                          }
                        }}
                        className="p-1.5 text-[#71717A] hover:text-[#FB7185] hover:bg-[#221216] rounded-lg transition"
                        title="Excluir unidade"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#F4F4F5] text-sm leading-snug">{unit.nome}</h3>
                    <p className="text-xs text-[#34D399] font-medium mt-0.5">
                      {unit.clienteNome || 'Cliente não vinculado'}
                    </p>
                    <p className="text-[11px] text-[#71717A] flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {unit.regional} • {unit.municipio}{unit.uf ? `/${unit.uf}` : ''}
                      </span>
                    </p>
                    {unit.responsavelLocal && (
                      <p className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-1 truncate">
                        <Phone className="w-3 h-3 text-[#71717A] shrink-0" />
                        {unit.responsavelLocal}{unit.contatoLocal ? ` • ${unit.contatoLocal}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Vistorias</span>
                      <span className="font-mono font-bold text-[#F4F4F5]">{unitOrders.length}</span>
                    </div>
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Últ. Conf.</span>
                      <span className="font-mono font-bold text-[#34D399]">
                        {latestSummary ? `${latestSummary.percentualConformidade}%` : '—'}
                      </span>
                    </div>
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Relatórios</span>
                      <span className="font-mono font-bold text-[#E4E4E7]">{unitReports.length}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1F2024] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNewOrderForUnit(unit)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Vistoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryUnit(unit)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
                  >
                    <History className="w-3.5 h-3.5 text-[#34D399]" />
                    Histórico
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CRIAR / EDITAR UNIDADE */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base">
                    {editingUnit.id ? 'Editar Unidade' : 'Cadastrar Nova Unidade'}
                  </h3>
                  <p className="text-[11px] text-[#71717A]">
                    Vinculada ao seu catálogo de unidades no Supabase
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUnit} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Cliente Contratante</label>
                  <input
                    type="text"
                    list="kivo-unit-clients-list"
                    value={editingUnit.clienteNome || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, clienteNome: e.target.value })}
                    placeholder="Ex: EMSERH, Rede Privada..."
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                  <datalist id="kivo-unit-clients-list">
                    {clients.map((c) => (
                      <option key={c.id || c.nome} value={c.nome} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Tipo de Estabelecimento *</label>
                  <select
                    value={editingUnit.tipo || 'Hospital'}
                    onChange={(e) => setEditingUnit({ ...editingUnit, tipo: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  >
                    {UNIT_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#A1A1AA] font-medium mb-1">Nome da Unidade *</label>
                  <input
                    type="text"
                    required
                    value={editingUnit.nome || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, nome: e.target.value })}
                    placeholder="Ex: Hospital de Alta Complexidade Dr. Carlos Macieira"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Código Interno (Opcional)</label>
                  <input
                    type="text"
                    value={editingUnit.codigo || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, codigo: e.target.value })}
                    placeholder="Ex: HCM-01"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Regional / Polo *</label>
                  <input
                    type="text"
                    required
                    value={editingUnit.regional || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, regional: e.target.value })}
                    placeholder="Ex: Regional Metropolitana"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Município *</label>
                  <input
                    type="text"
                    required
                    value={editingUnit.municipio || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, municipio: e.target.value })}
                    placeholder="Ex: São Luís"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">UF</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editingUnit.uf || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, uf: e.target.value.toUpperCase() })}
                    placeholder="MA"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono uppercase focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[#A1A1AA] font-medium mb-1">Endereço (Opcional)</label>
                  <input
                    type="text"
                    value={editingUnit.endereco || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, endereco: e.target.value })}
                    placeholder="Rua, número, bairro..."
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Ponto Focal na Unidade (SCIH / Direção)</label>
                  <input
                    type="text"
                    value={editingUnit.responsavelLocal || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, responsavelLocal: e.target.value })}
                    placeholder="Ex: Coordenação SCIH"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Contato / Telefone Local</label>
                  <input
                    type="text"
                    value={editingUnit.contatoLocal || ''}
                    onChange={(e) => setEditingUnit({ ...editingUnit, contatoLocal: e.target.value })}
                    placeholder="(98) 99999-9999"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#1F2024] flex items-center justify-end gap-2 pb-safe">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1E2025] rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUnit}
                  className="px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-4 h-4" />
                  {savingUnit ? 'Salvando...' : 'Salvar Unidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERENCIAR CLIENTES */}
      {isClientsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[88dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#34D399]" />
                <div>
                  <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base">Clientes Contratantes</h3>
                  <p className="text-[11px] text-[#71717A]">Redes hospitalares, órgãos e empresas atendidas</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsClientsModalOpen(false)}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <form onSubmit={handleSubmitClient} className="bg-[#141518] border border-[#232429] rounded-xl p-3.5 space-y-3">
                <span className="font-semibold text-[#F4F4F5] block">
                  {newClientForm.id ? 'Editar Cliente' : 'Adicionar Cliente'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required
                    value={newClientForm.nome}
                    onChange={(e) => setNewClientForm({ ...newClientForm, nome: e.target.value })}
                    placeholder="Nome (ex: EMSERH)"
                    className="sm:col-span-2 bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newClientForm.codigo}
                    onChange={(e) => setNewClientForm({ ...newClientForm, codigo: e.target.value })}
                    placeholder="Sigla / Código"
                    className="bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] font-mono focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    value={newClientForm.segmento}
                    onChange={(e) => setNewClientForm({ ...newClientForm, segmento: e.target.value })}
                    placeholder="Segmento (ex: Hospitalar / Saúde)"
                    className="flex-1 bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0D0E10] hover:bg-[#1C1D22] border border-[#27282E] rounded-lg text-[11px] text-[#E4E4E7] cursor-pointer transition shrink-0">
                    <Upload className="w-3.5 h-3.5 text-[#34D399]" />
                    <span>{newClientForm.logoUrl ? 'Logo anexada ✓' : 'Logo White-label'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (!file) return;
                        try {
                          const dataUrl = await compressImageToDataUrl(file, 320, 0.85);
                          setNewClientForm((prev) => ({ ...prev, logoUrl: dataUrl }));
                        } catch (err) {
                          toast.error({ title: 'Logo inválida', message: err.message });
                        }
                      }}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={savingClient}
                    className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition shrink-0"
                  >
                    {savingClient ? 'Salvando...' : newClientForm.id ? 'Atualizar' : '+ Adicionar'}
                  </button>
                </div>
                {newClientForm.logoUrl && (
                  <div className="flex items-center justify-between gap-2 bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={sanitizeMediaUrl(newClientForm.logoUrl)}
                        alt="Logo do Cliente"
                        className="h-7 w-auto max-w-[100px] object-contain bg-white rounded px-1"
                      />
                      <span className="text-[11px] text-[#34D399]">Logomarca pronta para cabeçalho dos PDFs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewClientForm((prev) => ({ ...prev, logoUrl: '' }))}
                      className="text-[11px] text-[#FB7185] hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </form>

              <div className="space-y-2">
                {clients.length === 0 ? (
                  <p className="text-center text-[#71717A] py-6">Nenhum cliente cadastrado ainda.</p>
                ) : (
                  clients.map((c) => (
                    <div
                      key={c.id || c.nome}
                      className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {c.logoUrl && (
                          <img
                            src={sanitizeMediaUrl(c.logoUrl)}
                            alt={c.nome}
                            className="h-7 w-9 object-contain bg-white rounded px-1 border border-[#232429] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#F4F4F5] truncate">{c.nome}</span>
                            {c.codigo && (
                              <span className="font-mono text-[10px] text-[#34D399] bg-[#122620] px-1.5 py-0.5 rounded">
                                {c.codigo}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#71717A]">{c.segmento || 'Hospitalar / Saúde'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setNewClientForm({
                            id: c.id,
                            nome: c.nome,
                            codigo: c.codigo || '',
                            segmento: c.segmento || 'Hospitalar / Saúde',
                            logoUrl: c.logoUrl || ''
                          })}
                          className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded hover:bg-[#1C1D22]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Remover cliente',
                              message: 'Deseja remover este cliente da sua carteira?',
                              detail: c.nome,
                              confirmLabel: 'Remover Cliente',
                              variant: 'danger'
                            });
                            if (ok) {
                              await onDeleteClient(c);
                              toast.success({
                                title: 'Cliente removido',
                                message: c.nome
                              });
                            }
                          }}
                          className="p-1.5 text-[#71717A] hover:text-[#FB7185] rounded hover:bg-[#221216]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DA UNIDADE */}
      {historyUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
            <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base truncate">
                  Histórico — {historyUnit.nome}
                </h3>
                <p className="text-[11px] text-[#71717A] truncate">
                  {historyUnit.clienteNome || 'Cliente'} • {historyUnit.regional} • {historyUnit.municipio}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryUnit(null)}
                className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              <div className="space-y-2.5">
                <h4 className="font-semibold text-[#E4E4E7] flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#34D399]" />
                  Vistorias & Checklists ({historyOrders.length})
                </h4>
                {historyOrders.length === 0 ? (
                  <p className="text-[#71717A] bg-[#0D0E10] border border-[#232429] rounded-lg p-4 text-center">
                    Nenhuma vistoria registrada para esta unidade ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyOrders.map((ord) => {
                      const s = calculateInspectionSummary(ord.checklist || []);
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            setHistoryUnit(null);
                            onOpenOrder(ord);
                          }}
                          className="w-full text-left bg-[#0D0E10] hover:bg-[#18191D] border border-[#232429] rounded-lg p-3 flex items-center justify-between gap-3 transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-[#F4F4F5]">{ord.id}</span>
                              <span className="text-[10px] text-[#71717A] font-mono">{ord.scheduledDate}</span>
                            </div>
                            <span className="text-[11px] text-[#A1A1AA] block truncate">
                              RT: {ord.technicianName} • {s.totalAvaliados}/63 avaliados
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-[#34D399]">{s.percentualConformidade}%</span>
                            <ExternalLink className="w-3.5 h-3.5 text-[#71717A]" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <h4 className="font-semibold text-[#E4E4E7] flex items-center gap-2">
                  <FileBarChart2 className="w-4 h-4 text-[#34D399]" />
                  Relatórios Técnicos ({historyReports.length})
                </h4>
                {historyReports.length === 0 ? (
                  <p className="text-[#71717A] bg-[#0D0E10] border border-[#232429] rounded-lg p-4 text-center">
                    Nenhum relatório emitido para esta unidade ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {historyReports.map((rep) => (
                      <button
                        key={rep.codigoRelatorio}
                        type="button"
                        onClick={() => {
                          setHistoryUnit(null);
                          onNavigateTab('reports');
                        }}
                        className="w-full text-left bg-[#0D0E10] hover:bg-[#18191D] border border-[#232429] rounded-lg p-3 flex items-center justify-between gap-3 transition"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-semibold text-[#34D399] block">
                            {rep.codigoRelatorio}
                          </span>
                          <span className="text-[11px] text-[#A1A1AA]">
                            {rep.status === 'finalizado' ? 'Finalizado' : 'Rascunho'} • {rep.desvios?.length || 0} desvio(s)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-[#F4F4F5]">
                          {Number(rep.indiceConformidade || 0).toFixed(1)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#1F2024] bg-[#141518] flex items-center justify-between gap-2 shrink-0 pb-safe">
              <button
                type="button"
                onClick={() => {
                  const u = historyUnit;
                  setHistoryUnit(null);
                  onNewOrderForUnit(u);
                }}
                className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Vistoria Nesta Unidade
              </button>
              <button
                type="button"
                onClick={() => setHistoryUnit(null)}
                className="px-4 py-2 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
