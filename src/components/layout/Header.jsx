import React from 'react';
import { Building2, Plus, Menu, WifiOff, RefreshCw, Cloud, Search, Sun, Moon } from 'lucide-react';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

export default function Header({
  clientNames = [],
  selectedClient,
  onSelectClient,
  onOpenNewOrder,
  onOpenProfile,
  onOpenMenu,
  onOpenCommandPalette,
  userProfile,
  isOnline = true,
  pendingSyncCount = 0,
  isSyncing = false,
  onSyncNow,
  theme = 'dark',
  onToggleTheme
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
            className="bg-transparent text-[#F4F4F5] font-medium focus:outline-none cursor-pointer w-[120px] sm:w-auto sm:max-w-[260px] truncate"
          >
            <option value="all" className="bg-[#141518] text-[#F4F4F5]">Todos os Clientes</option>
            {clientNames.map((name) => (
              <option key={name} value={name} className="bg-[#141518] text-[#F4F4F5]">
                {name}
              </option>
            ))}
          </select>
        </div>

        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-[#141518] hover:bg-[#1C1D22] border border-[#232429] rounded-lg text-xs text-[#71717A] hover:text-[#F4F4F5] transition shrink-0"
            title="Busca rápida global (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-[#34D399]" />
            <span className="hidden md:inline">Buscar...</span>
            <kbd className="hidden lg:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#0D0E10] border border-[#27282E] text-[#A1A1AA]">
              Ctrl K
            </kbd>
          </button>
        )}
      </div>

      {/* Controles à direita */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Status de Conexão & Sincronização Offline -> Nuvem */}
        {!isOnline ? (
          <span
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/30 shrink-0"
            title="Sem conexão. Suas alterações estão sendo salvas localmente no aparelho e serão enviadas automaticamente quando a internet voltar."
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Offline</span>
            {pendingSyncCount > 0 && (
              <span className="font-mono text-[10px] bg-[#332614] px-1.5 py-0.2 rounded">
                {pendingSyncCount}
              </span>
            )}
          </span>
        ) : isSyncing ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#122620] text-[#34D399] border border-[#2EB88A]/30 shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span className="hidden sm:inline">Sincronizando...</span>
          </span>
        ) : pendingSyncCount > 0 ? (
          <button
            type="button"
            onClick={onSyncNow}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 transition shrink-0"
            title="Clique para enviar as alterações offline pendentes para o Supabase agora"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Sincronizar</span>
            <span className="font-mono text-[10px] bg-[#2EB88A] text-[#080A09] px-1.5 rounded-full font-bold">
              {pendingSyncCount}
            </span>
          </button>
        ) : (
          <span
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-[#141518] text-[#A1A1AA] border border-[#232429] shrink-0"
            title="Dados sincronizados com o Supabase Cloud"
          >
            <Cloud className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Nuvem</span>
          </span>
        )}

        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 bg-[#141518] hover:bg-[#1C1D22] border border-[#232429] rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] transition shrink-0"
            title={theme === 'light' ? 'Mudar para modo escuro' : 'Mudar para modo claro (Campo / Dia)'}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#34D399]" />
            ) : (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenNewOrder}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] rounded-lg text-xs font-semibold transition border border-[#2D2F36]"
          title="Nova Vistoria"
        >
          <Plus className="w-3.5 h-3.5 text-[#34D399]" />
          <span className="hidden sm:inline">Nova Vistoria</span>
          <span className="sm:hidden">Nova</span>
        </button>

        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-2 border-l border-[#1F2024] cursor-pointer hover:opacity-90 transition group"
          title="Editar perfil do responsável técnico"
        >
          {userProfile?.avatarUrl ? (
            <img
              src={sanitizeMediaUrl(userProfile.avatarUrl)}
              alt={userProfile?.name || 'Auditor Técnico'}
              className="w-8 h-8 rounded-full object-cover border border-[#2EB88A]/50 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1C1D22] border border-[#2D2F36] text-[#F4F4F5] font-bold flex items-center justify-center text-xs shrink-0">
              {userProfile?.name?.charAt(0) || 'A'}
            </div>
          )}
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
