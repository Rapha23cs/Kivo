import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Building2, User, ClipboardList, AlertCircle } from 'lucide-react';
import { DataService } from '../../supabase/dataService';

export default function NewWorkOrderModal({
  isOpen,
  onClose,
  onCreateOrder,
  onSaveUnit,
  clients = [],
  units = [],
  initialUnit = null,
  userProfile
}) {
  if (!isOpen) return null;

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
      alert('Preencha Unidade, Regional e Município para criar a inspeção.');
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

    const baseItems = DataService.getBaseChecklistItems();
    const items = baseItems.map((i) => ({ ...i, status: null }));

    const newOrderData = {
      clientName: clientName.trim() || 'Cliente',
      unidadeId: resolvedUnitId,
      title: `Inspeção Ambiental — ${hospitalName.trim()}`,
      hospitalName: hospitalName.trim(),
      regional: regional.trim(),
      municipio: municipio.trim(),
      inspectionType,
      scheduledDate,
      technicianName: userProfile?.name || 'Auditor Técnico',
      checklist: items
    };

    onCreateOrder(newOrderData);
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
              <h3 className="font-semibold text-[#F4F4F5]">Nova Inspeção Ambiental</h3>
              <p className="text-xs text-[#71717A]">Checklist com 11 temáticas e 63 itens salvos no Supabase</p>
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
              Os 63 itens distribuídos nas 11 temáticas serão carregados automaticamente para preenchimento online ou offline.
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
              Criar Inspeção
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
