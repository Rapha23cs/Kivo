import React from 'react';
import { Building2, Plus, Menu } from 'lucide-react';

export default function Header({
  clientNames = [],
  selectedClient,
  onSelectClient,
  onOpenNewOrder,
  onOpenProfile,
  onOpenMenu,
  userProfile
}) {
  return (
    <header className="no-print h-14 sm:h-16 border-b border-[#1F2024] bg-[#0D0E10]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shrink-0">
      {/* Menu mobile/tablet + Filtro por Cliente */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            className="lg:hidden p-2 -ml-1 text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 bg-[#141518] border border-[#232429] rounded-lg px-2.5 sm:px-3 py-1.5 text-xs text-[#E4E4E7] min-w-0 max-w-full">
          <Building2 className="w-4 h-4 text-[#71717A] shrink-0" />
          <select
            value={selectedClient}
            onChange={(e) => onSelectClient(e.target.value)}
            className="bg-transparent text-[#F4F4F5] font-medium focus:outline-none cursor-pointer w-[135px] sm:w-auto sm:max-w-[260px] truncate"
          >
            <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Clientes</option>
            {clientNames.map((name) => (
              <option key={name} value={name} className="bg-[#141518] text-[#F4F4F5]">
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Controles à direita */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenNewOrder}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] rounded-lg text-xs font-semibold transition border border-[#2D2F36]"
          title="Nova Vistoria"
        >
          <Plus className="w-3.5 h-3.5 text-[#34D399]" />
          <span className="hidden xs:inline sm:inline">Nova Vistoria</span>
          <span className="xs:hidden sm:hidden">Nova</span>
        </button>

        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-2 border-l border-[#1F2024] cursor-pointer hover:opacity-90 transition group"
          title="Editar perfil do responsável técnico"
        >
          <div className="w-8 h-8 rounded-full bg-[#1C1D22] border border-[#2D2F36] text-[#F4F4F5] font-bold flex items-center justify-center text-xs shrink-0">
            {userProfile?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden lg:block text-left text-xs">
            <span className="font-semibold text-[#F4F4F5] group-hover:text-white transition block leading-tight">
              {userProfile?.name || 'Auditor Técnico'}
            </span>
            <span className="text-[10px] text-[#71717A] font-mono">
              {userProfile?.registry?.split('/')[0] || 'RT Habilitado'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
