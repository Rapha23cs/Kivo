import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  FileBarChart2,
  Building2,
  Activity,
  Award,
  LogOut,
  X,
  AlertOctagon,
  Calendar,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import KivoLogo from '../common/KivoLogo';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

export default function Sidebar({
  activeTab,
  onSelectTab,
  openOrdersCount = 0,
  openActionsCount = 0,
  dueAgendaCount = 0,
  reportsCount = 0,
  unitsCount = 0,
  templatesCount = 0,
  userProfile,
  onSignOut,
  onOpenLegalModal,
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Meu Painel',
      shortLabel: 'Painel',
      icon: LayoutDashboard,
      mobileBar: true
    },
    {
      id: 'orders',
      label: 'Vistorias & Checklists',
      shortLabel: 'Vistorias',
      icon: ClipboardList,
      badge: openOrdersCount > 0 ? openOrdersCount : null,
      badgeColor: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30',
      mobileBar: true
    },
    {
      id: 'actions',
      label: 'Planos de Ação',
      shortLabel: 'Ações',
      icon: AlertOctagon,
      badge: openActionsCount > 0 ? openActionsCount : null,
      badgeColor: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/30',
      mobileBar: true
    },
    {
      id: 'agenda',
      label: 'Agenda & Recorrência',
      shortLabel: 'Agenda',
      icon: Calendar,
      badge: dueAgendaCount > 0 ? dueAgendaCount : null,
      badgeColor: 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30',
      mobileBar: true
    },
    {
      id: 'reports',
      label: 'Relatórios Técnicos',
      shortLabel: 'Relatórios',
      icon: FileBarChart2,
      badge: reportsCount > 0 ? reportsCount : null,
      badgeColor: 'bg-[#1D1F26] text-[#CBD5E1] border-[#2D2F36]',
      mobileBar: true
    },
    {
      id: 'units',
      label: 'Clientes, Unidades & SST',
      shortLabel: 'Unidades',
      icon: Building2,
      badge: unitsCount > 0 ? unitsCount : null,
      badgeColor: 'bg-[#1D1F26] text-[#CBD5E1] border-[#2D2F36]',
      mobileBar: false
    },
    {
      id: 'templates',
      label: 'Modelos de Checklist',
      shortLabel: 'Modelos',
      icon: SlidersHorizontal,
      badge: templatesCount > 0 ? templatesCount : null,
      badgeColor: 'bg-[#1D1F26] text-[#CBD5E1] border-[#2D2F36]',
      mobileBar: false
    },
    {
      id: 'profile',
      label: 'Minha Conta & RT',
      shortLabel: 'Conta',
      icon: Award,
      mobileBar: false
    }
  ];

  const handleSelect = (id) => {
    onSelectTab(id);
    if (onClose) onClose();
  };

  const renderSidebarBody = (isRail = false) => (
    <>
      <div>
        {/* Brand Logo */}
        <div
          className={`h-16 flex items-center border-b border-[#1F2024] ${
            isRail ? 'justify-center px-2' : 'justify-between gap-2 px-4'
          }`}
        >
          <KivoLogo
            size={isRail ? 'sm' : 'md'}
            showText={!isRail}
            subtitle={userProfile?.consultancyName || 'Vistorias & Relatórios'}
          />

          <div className="flex items-center gap-1">
            {onToggleCollapse && !isRail && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:inline-flex p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22] transition"
                title="Recolher menu lateral"
                aria-label="Recolher menu lateral"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}

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
        </div>

        {/* Navigation Items */}
        <nav className={`${isRail ? 'p-2' : 'p-3'} space-y-1 mt-1`}>
          {isRail && onToggleCollapse ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="w-full flex items-center justify-center p-2 mb-1 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#17181B] rounded-lg transition"
              title="Expandir menu lateral"
              aria-label="Expandir menu lateral"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-3 py-1.5 text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">
              Menu
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                title={isRail ? `${item.label}${item.badge ? ` (${item.badge})` : ''}` : undefined}
                className={`relative w-full flex items-center ${
                  isRail ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5 lg:py-2'
                } rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#1E2025] text-[#F4F4F5] font-semibold border border-[#2EB88A]/35'
                    : 'text-[#8E9299] hover:text-[#F4F4F5] hover:bg-[#17181B] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#34D399]' : 'text-[#71717A]'}`} />
                  {!isRail && <span className="truncate">{item.label}</span>}
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  isRail ? (
                    <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#2EB88A] text-[#080A09] font-mono text-[9px] font-bold flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                        item.badgeColor || 'bg-[#1A1B20] text-[#CBD5E1] border-[#27282E]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Compliance Footer */}
      <div className={`${isRail ? 'p-2' : 'p-3'} border-t border-[#1F2024] space-y-2.5 pb-safe`}>
        {!isRail && (
          <div className="bg-[#151619] border border-[#232429] rounded-lg p-3 space-y-1 text-[#A1A1AA] text-[11px]">
            <div className="flex items-center gap-1.5 text-[#34D399] font-semibold">
              <Activity className="w-3.5 h-3.5 text-[#2EB88A]" />
              Auditoria & Conformidade
            </div>
            <p className="text-[10px] text-[#71717A] leading-tight">
              Dados sincronizados diretamente na sua conta Supabase.
            </p>
          </div>
        )}

        <div
          className={`${
            isRail ? 'flex-col py-1.5 px-1' : 'px-2.5 py-2 justify-between'
          } rounded-lg hover:bg-[#18191D] flex items-center gap-2 transition`}
        >
          <div
            onClick={() => handleSelect('profile')}
            title={isRail ? `${userProfile?.name || 'Auditor Técnico'} — Perfil RT` : undefined}
            className={`flex items-center gap-2.5 cursor-pointer overflow-hidden ${isRail ? 'justify-center' : 'flex-1'}`}
          >
            {userProfile?.avatarUrl ? (
              <img
                src={sanitizeMediaUrl(userProfile.avatarUrl)}
                alt={userProfile?.name || 'Auditor Técnico'}
                className="w-7 h-7 rounded-full object-cover border border-[#2EB88A]/50 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#1E2025] border border-[#2E3038] text-[#F4F4F5] font-bold flex items-center justify-center text-xs shrink-0">
                {userProfile?.name?.charAt(0) || 'A'}
              </div>
            )}
            {!isRail && (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#F4F4F5] text-xs block truncate leading-tight">
                    {userProfile?.name || 'Auditor Técnico'}
                  </span>
                  {userProfile?.role === 'admin' && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/40 shrink-0">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#71717A] font-mono block truncate">
                  {userProfile?.registry?.split('/')[0] || 'RT Habilitado'}
                </span>
              </div>
            )}
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

        {!isRail && onOpenLegalModal && (
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
      <aside
        className={`no-print hidden lg:flex ${
          collapsed ? 'w-[72px]' : 'w-64'
        } bg-[#111214] border-r border-[#1F2024] flex-col justify-between shrink-0 min-h-[100dvh] transition-all duration-200`}
      >
        {renderSidebarBody(collapsed)}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer */}
      {isOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#111214] border-r border-[#1F2024] flex flex-col justify-between h-[100dvh] shadow-2xl">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}

      {/* Bottom Tab Navigation (Mobile & Portrait Tablets < lg) */}
      <nav
        aria-label="Navegação rápida"
        className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#111214]/95 backdrop-blur-md border-t border-[#1F2024] pb-safe"
      >
        <div className="grid grid-cols-5 gap-1 px-1.5 pt-1.5 pb-1">
          {menuItems.filter((item) => item.mobileBar).map((item) => {
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
