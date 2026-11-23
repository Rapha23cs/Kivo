import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Building2, User, ClipboardList, AlertCircle, Leaf, HardHat, Settings2 } from 'lucide-react';
import { DataService } from '../../supabase/dataService';
import { useFeedback } from '../common/FeedbackProvider';
import { WORK_DISCIPLINES, getDisciplineMeta } from '../../data/workflowsConfig';
import { SST_NR_MODULES, buildSstChecklist } from '../../data/sstChecklistData';

export default function NewWorkOrderModal({
  isOpen,
  onClose,
  onCreateOrder,
  onSaveUnit,
  clients = [],
  units = [],
  templates = [],
  onOpenTemplates = null,
  initialUnit = null,
  userProfile
}) {
  if (!isOpen) return null;

  const { toast } = useFeedback();
  const [discipline, setDiscipline] = useState('meio_ambiente');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedNrModules, setSelectedNrModules] = useState(['nr01', 'nr06', 'nr23']);
  const [selectedUnitId, setSelectedUnitId] = useState(initialUnit?.id || '');
  const [clientName, setClientName] = useState(
    initialUnit?.clienteNome || clients[0]?.nome || ''
  );
  const [hospitalName, setHospitalName] = useState(initialUnit?.nome || '');
  const [regional, setRegional] = useState(initialUnit?.regional || '');
  const [municipio, setMunicipio] = useState(initialUnit?.municipio || '');
  const [inspectionType, setInspectionType] = useState('Programada');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveUnitToCatalog, setSaveUnitToCatalog] = useState(true);

  const selectedDisciplineMeta = getDisciplineMeta(discipline);
  const disciplineTemplates = templates.filter((t) => t.disciplina === discipline);
  const chosenTemplate = disciplineTemplates.find((t) => t.id === selectedTemplateId) || null;

  const toggleNrModule = (id) => {
    setSelectedNrModules((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id]
    );
  };

  useEffect(() => {
    if (initialUnit) {
      setSelectedUnitId(initialUnit.id || '');
      setClientName(initialUnit.clienteNome || clients[0]?.nome || '');
      setHospitalName(initialUnit.nome || '');
      setRegional(initialUnit.regional || '');
      setMunicipio(initialUnit.municipio || '');
    }
  }, [initialUnit]);

  const handleSelectExistingUnit = (unitId) => {
    setSelectedUnitId(unitId);
    if (!unitId) return;
    const found = units.find((u) => u.id === unitId);
    if (found) {
      setClientName(found.clienteNome || '');
      setHospitalName(found.nome || '');
      setRegional(found.regional || '');
      setMunicipio(found.municipio || '');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hospitalName.trim() || !regional.trim() || !municipio.trim()) {
      toast.warning({
        title: 'Campos obrigatórios',
        message: 'Preencha Unidade, Regional e Município para criar a vistoria.'
      });
      return;
    }

    let resolvedUnitId = selectedUnitId || null;

    if (!resolvedUnitId && saveUnitToCatalog && onSaveUnit) {
      try {
        const updatedUnits = await onSaveUnit({
          clienteNome: clientName.trim(),
          nome: hospitalName.trim(),
          regional: regional.trim(),
          municipio: municipio.trim(),
          tipo: 'Hospital'
        });
        const match = (updatedUnits || []).find(
          (u) =>
            u.nome.toLowerCase() === hospitalName.trim().toLowerCase() &&
            (u.clienteNome || '').toLowerCase() === clientName.trim().toLowerCase()
        );
        if (match?.id) resolvedUnitId = match.id;
      } catch {
        // segue criação da OS mesmo se unidade já existir
      }
    }

    let items = [];
    if (chosenTemplate) {
      items = (chosenTemplate.itens || []).map((it, idx) => ({
        id: it.id || `tpl-${chosenTemplate.id}-${idx + 1}`,
        number: idx + 1,
        topic: it.topic || 'Geral',
        nrCode: it.nrCode || '',
        question: it.question,
        status: null,
        classification: '',
        riskProbability: 3,
        riskSeverity: 3,
        responsible: '',
        deadline: '',
        observation: '',
        evidenceUrl: '',
        afterPhotoUrl: '',
        resolutionNote: '',
        actionStatus: 'Em Aberto'
      }));
    } else if (discipline === 'seguranca_trabalho') {
      items = buildSstChecklist(selectedNrModules);
    } else {
      const baseItems = DataService.getBaseChecklistItems();
      items = baseItems.map((i) => ({
        ...i,
        status: null,
        afterPhotoUrl: '',
        resolutionNote: '',
        actionStatus: 'Em Aberto'
      }));
    }

    const newOrderData = {
      discipline,
      templateId: chosenTemplate?.id || '',
      nrModules: !chosenTemplate && discipline === 'seguranca_trabalho' ? selectedNrModules : null,
      clientName: clientName.trim() || 'Cliente',
      unidadeId: resolvedUnitId,
      title: `Vistoria (${selectedDisciplineMeta.label}) — ${hospitalName.trim()}`,
      hospitalName: hospitalName.trim(),
      regional: regional.trim(),
      municipio: municipio.trim(),
      inspectionType,
      scheduledDate,
      technicianName: userProfile?.name || 'Auditor Técnico',
      checklist: items
    };

    onCreateOrder(newOrderData);
    toast.success({
      title: 'Vistoria criada',
      message: `${selectedDisciplineMeta.label} • ${newOrderData.hospitalName} (${items.length} itens).`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-xl h-[100dvh] sm:h-auto sm:max-h-[92dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F4F4F5]">Iniciar Nova Vistoria</h3>
              <p className="text-xs text-[#71717A]">Escolha o fluxo de trabalho, modelo de checklist e unidade</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Seletor Obrigatório de Fluxo de Trabalho */}
          <div className="space-y-2">
            <label className="block font-semibold text-[#F4F4F5] text-xs">
              1. Fluxo de Trabalho (Área da Vistoria) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WORK_DISCIPLINES.map((flow) => {
                const selected = discipline === flow.id;
                const Icon = flow.id === 'meio_ambiente' ? Leaf : HardHat;
                return (
                  <button
                    key={flow.id}
                    type="button"
                    onClick={() => {
                      setDiscipline(flow.id);
                      setSelectedTemplateId('');
                    }}
                    className={`text-left rounded-xl p-3 border transition space-y-1.5 ${
                      selected
                        ? flow.id === 'meio_ambiente'
                          ? 'bg-[#122620] border-[#2EB88A] shadow-sm'
                          : 'bg-[#221A10] border-[#F59E0B]/70 shadow-sm'
                        : 'bg-[#141518] border-[#232429] hover:border-[#32343C]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-[#F4F4F5] text-xs">
                        <Icon
                          className={`w-4 h-4 ${
                            flow.id === 'meio_ambiente' ? 'text-[#34D399]' : 'text-[#FBBF24]'
                          }`}
                        />
                        {flow.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                          flow.id === 'meio_ambiente'
                            ? 'bg-[#0D0E10] text-[#34D399] border-[#2EB88A]/30'
                            : 'bg-[#17140F] text-[#FBBF24] border-[#F59E0B]/30'
                        }`}
                      >
                        {flow.statusBadge}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] leading-snug">{flow.checklistSummary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Modelo (Padrão ou Personalizado) */}
          <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="font-semibold text-[#F4F4F5]">
                2. Modelo de Checklist
              </label>
              {onOpenTemplates && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTemplates();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[#34D399] hover:underline font-medium"
                >
                  <Settings2 className="w-3 h-3" />
                  Gerenciar Modelos
                </button>
              )}
            </div>

            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
            >
              <option value="">
                {discipline === 'seguranca_trabalho'
                  ? 'Padrão SST — Seleção Modular por Normas (NRs)'
                  : 'Padrão Meio Ambiente — 11 Temáticas (63 itens)'}
              </option>
              {disciplineTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  Personalizado: {tpl.nome} ({tpl.itens?.length || 0} itens)
                </option>
              ))}
            </select>

            {discipline === 'seguranca_trabalho' && !selectedTemplateId && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#A1A1AA]">Selecione as NRs aplicáveis à unidade:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedNrModules(SST_NR_MODULES.map((m) => m.id))}
                    className="text-[#34D399] hover:underline"
                  >
                    Marcar todas ({SST_NR_MODULES.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {SST_NR_MODULES.map((mod) => {
                    const checked = selectedNrModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition text-[11px] ${
                          checked
                            ? 'bg-[#221A10] border-[#F59E0B]/40 text-[#F4F4F5]'
                            : 'bg-[#0D0E10] border-[#232429] text-[#A1A1AA]'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleNrModule(mod.id)}
                            className="accent-[#F59E0B]"
                          />
                          <span className="truncate font-medium">{mod.shortName}</span>
                        </span>
                        <span className="font-mono text-[10px] text-[#71717A] shrink-0">
                          {mod.items.length}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {units.length > 0 && (
            <div className="bg-[#141518] border border-[#2EB88A]/30 rounded-xl p-3 space-y-1.5">
              <label className="block font-medium text-[#34D399] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Selecionar Unidade Cadastrada (Opcional)
              </label>
              <select
                value={selectedUnitId}
                onChange={(e) => handleSelectExistingUnit(e.target.value)}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
              >
                <option value="">-- Digitar uma nova unidade manualmente --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} {u.clienteNome ? `(${u.clienteNome})` : ''} — {u.municipio}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5 text-[#34D399]" />
                Cliente Contratante *
              </label>
              <input
                type="text"
                required
                list="kivo-clients-list"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex: EMSERH, Rede Privada..."
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
              />
              <datalist id="kivo-clients-list">
                {clients.map((c) => (
                  <option key={c.id || c.nome} value={c.nome} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-[#34D399]" />
                Unidade Inspecionada *
              </label>
              <input
                type="text"
                required
                value={hospitalName}
                onChange={(e) => {
                  setHospitalName(e.target.value);
                  if (selectedUnitId) setSelectedUnitId('');
                }}
                placeholder="Ex: Hospital Dr. Carlos Macieira"
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#141518] border border-[#232429] rounded-xl">
            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">
                Regional / Polo *
              </label>
              <input
                type="text"
                required
                value={regional}
                onChange={(e) => setRegional(e.target.value)}
                placeholder="Ex: Regional Metropolitana"
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">
                Município *
              </label>
              <input
                type="text"
                required
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ex: São Luís"
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-1.5 text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#34D399]" />
                Data da Inspeção *
              </label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A] font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-[#A1A1AA] mb-1">
                Tipo de Inspeção *
              </label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-1.5 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A] font-medium"
              >
                <option value="Programada" className="bg-[#141518] text-[#F4F4F5]">Programada</option>
                <option value="Não Programada" className="bg-[#141518] text-[#F4F4F5]">Não Programada</option>
              </select>
            </div>
          </div>

          {!selectedUnitId && onSaveUnit && (
            <label className="flex items-center gap-2 text-[11px] text-[#A1A1AA] cursor-pointer px-1">
              <input
                type="checkbox"
                checked={saveUnitToCatalog}
                onChange={(e) => setSaveUnitToCatalog(e.target.checked)}
                className="accent-[#2EB88A]"
              />
              Salvar esta unidade em <strong className="text-[#F4F4F5]">Clientes & Unidades</strong> para próximas inspeções
            </label>
          )}

          <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 text-[#E4E4E7] flex items-center justify-between text-xs gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[#71717A]">
              <User className="w-4 h-4 text-[#34D399]" />
              Responsável pela Inspeção:
            </span>
            <span className="font-semibold text-[#34D399]">
              {userProfile?.name || 'Auditor Técnico'} ({userProfile?.registry?.split('/')[0] || 'RT'})
            </span>
          </div>

          <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 text-[#71717A] text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#34D399] shrink-0 mt-0.5" />
            <span>
              Os itens selecionados para <strong className="text-[#E4E4E7]">{selectedDisciplineMeta.label}</strong> serão carregados automaticamente para preenchimento online ou offline.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1F2024] flex items-center justify-end gap-2 pb-safe">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1E2025] rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Vistoria ({selectedDisciplineMeta.label})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
