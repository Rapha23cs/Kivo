import React, { useState } from 'react';
import { X, Plus, Calendar, Building2, User, ClipboardList, AlertCircle } from 'lucide-react';
import { DataService } from '../../supabase/dataService';

export default function NewWorkOrderModal({ isOpen, onClose, onCreateOrder, clients = [], userProfile }) {
  if (!isOpen) return null;

  const [clientName, setClientName] = useState(clients[0]?.nome || 'EMSERH');
  const [hospitalName, setHospitalName] = useState('');
  const [regional, setRegional] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [inspectionType, setInspectionType] = useState('Programada');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hospitalName.trim() || !regional.trim() || !municipio.trim()) {
      alert('Preencha Unidade, Regional e Município para criar a inspeção.');
      return;
    }

    const baseItems = DataService.getBaseChecklistItems();
    const items = baseItems.map((i) => ({ ...i, status: null }));

    const newOrderData = {
      clientName: clientName.trim() || 'Cliente',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#111214] border border-[#232429] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between">
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
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[78vh]">
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
                onChange={(e) => setHospitalName(e.target.value)}
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

          <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 text-[#E4E4E7] flex items-center justify-between text-xs">
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
              Os 63 itens distribuídos nas 11 temáticas serão carregados automaticamente do banco de dados para preenchimento.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1F2024] flex items-center justify-end gap-2">
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
