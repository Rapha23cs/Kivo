import React, { useState } from 'react';
import { X, Check, User } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, userProfile, onSaveProfile }) {
  if (!isOpen) return null;

  const [profile, setProfile] = useState({ ...userProfile });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile(profile);
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#111214] border border-[#232429] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122620] text-[#34D399] rounded-xl border border-[#2EB88A]/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F4F4F5] text-base">Meu Perfil Profissional & Habilitação RT</h3>
              <p className="text-xs text-[#71717A]">Dados salvos na sua conta de auditor no Supabase</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Nome Completo do Auditor / RT *
              </label>
              <input
                type="text"
                required
                value={profile.name || ''}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Registro no Conselho de Classe (RT) *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: CRQ-IV 04291880 ou CREA-SP 506921"
                value={profile.registry || ''}
                onChange={(e) => setProfile({ ...profile, registry: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#34D399] font-mono focus:border-[#2EB88A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Título / Cargo Profissional
              </label>
              <input
                type="text"
                value={profile.title || ''}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Área de Especialidade
              </label>
              <input
                type="text"
                value={profile.specialty || ''}
                onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Nome da Consultoria / PJ (Opcional)
              </label>
              <input
                type="text"
                value={profile.consultancyName || ''}
                onChange={(e) => setProfile({ ...profile, consultancyName: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Telefone / WhatsApp Comercial
              </label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#1F2024] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1E2025] rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition flex items-center gap-1.5 text-xs"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Meu Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
