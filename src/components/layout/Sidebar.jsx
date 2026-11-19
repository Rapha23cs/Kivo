import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileBarChart2,
  Building2,
  Activity,
  Award,
  LogOut,
  X
} from 'lucide-react';

export default function Sidebar({
  activeTab,
  onSelectTab,
  openOrdersCount = 0,
  reportsCount = 0,
  unitsCount = 0,
  userProfile,
  onSignOut,
  onOpenLegalModal,
  isOpen = false,
  onClose
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Meu Painel',
      shortLabel: 'Painel',
      icon: LayoutDashboard
    },
    {
      id: 'orders',
      label: 'Vistorias & Checklists',
      shortLabel: 'Vistorias',
      icon: ClipboardList,
      badge: openOrdersCount > 0 ? openOrdersCount : null,
      badgeColor: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
    },
    {
      id: 'reports',
      label: 'Relatórios Técnicos',
      shortLabel: 'Relatórios',
      icon: FileBarChart2,
      badge: reportsCount > 0 ? reportsCount : null,
      badgeColor: 'bg-[#1D1F26] text-[#CBD5E1] border-[#2D2F36]'
    },
    {
      id: 'units',
      label: 'Clientes & Unidades',
      shortLabel: 'Unidades',
      icon: Building2,
      badge: unitsCount > 0 ? unitsCount : null,
      badgeColor: 'bg-[#1D1F26] text-[#CBD5E1] border-[#2D2F36]'
    },
    {
      id: 'profile',
      label: 'Minha Conta & RT',
      shortLabel: 'Conta',
      icon: Award
    }
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  const sidebarBody = (
    <>
      <div>
        {/* Brand Logo */}
        <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-[#1F2024]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E2025] border border-[#2D2F36] text-[#F4F4F5] flex items-center justify-center font-black text-base">
              K
            </div>
            <div>
              <h1 className="font-bold text-[#F4F4F5] text-base tracking-tight font-sans leading-tight">
                KIVO{' '}
                <span className="text-[10px] font-medium text-[#71717A] uppercase tracking-widest block font-mono">
                  Inspeções Ambientais
                </span>
              </h1>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22] transition"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 mt-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
            Menu
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 lg:py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#1E2025] text-[#F4F4F5] font-semibold'
                    : 'text-[#8E9299] hover:text-[#F4F4F5] hover:bg-[#17181B]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F4F4F5]' : 'text-[#71717A]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      item.badgeColor || 'bg-[#1A1B20] text-[#CBD5E1] border-[#27282E]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Compliance Footer */}
      <div className="p-3 border-t border-[#1F2024] space-y-2.5 pb-safe">
        <div className="bg-[#151619] border border-[#232429] rounded-lg p-3 space-y-1 text-[#A1A1AA] text-[11px]">
          <div className="flex items-center gap-1.5 text-[#34D399] font-semibold">
            <Activity className="w-3.5 h-3.5 text-[#2EB88A]" />
            Auditoria & Conformidade
          </div>
          <p className="text-[10px] text-[#71717A] leading-tight">
            Dados sincronizados diretamente na sua conta Supabase.
          </p>
        </div>

        <div className="px-2.5 py-2 rounded-lg hover:bg-[#18191D] flex items-center justify-between gap-2 transition">
          <div
            onClick={() => handleSelect('profile')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden flex-1"
          >
            <div className="w-7 h-7 rounded-full bg-[#1E2025] border border-[#2E3038] text-[#F4F4F5] font-bold flex items-center justify-center text-xs shrink-0">
              {userProfile?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-[#F4F4F5] text-xs block truncate leading-tight">
                {userProfile?.name || 'Auditor Técnico'}
              </span>
              <span className="text-[10px] text-[#71717A] font-mono block truncate">
                {userProfile?.registry?.split('/')[0] || 'RT Habilitado'}
              </span>
            </div>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 text-[#71717A] hover:text-[#FB7185] hover:bg-[#221216] rounded-md transition shrink-0"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {onOpenLegalModal && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-[#71717A] pt-0.5">
            <button
              type="button"
              onClick={() => onOpenLegalModal('privacidade')}
              className="hover:text-[#D4D4D8] transition"
            >
              Privacidade
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal('termos')}
              className="hover:text-[#D4D4D8] transition"
            >
              Termos
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal('suporte')}
              className="hover:text-[#D4D4D8] transition"
            >
              Suporte
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex w-64 bg-[#111214] border-r border-[#1F2024] flex-col justify-between shrink-0 min-h-[100dvh]">
        {sidebarBody}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#111214] border-r border-[#1F2024] flex flex-col justify-between h-[100dvh] shadow-2xl">
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Bottom Tab Navigation (Mobile & Portrait Tablets < lg) */}
      <nav
        aria-label="Navegação rápida"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111214]/95 backdrop-blur-md border-t border-[#1F2024] pb-safe"
      >
        <div className="grid grid-cols-5 gap-1 px-1.5 pt-1.5 pb-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg text-[10px] font-medium transition ${
                  isActive
                    ? 'text-[#34D399] bg-[#181A1F] font-semibold'
                    : 'text-[#8E9299] hover:text-[#F4F4F5]'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#2EB88A] text-[#080A09] font-mono text-[9px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-full">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
