import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ClipboardList,
  FileBarChart2,
  Building2,
  Plus,
  Award,
  X,
  ArrowRight
} from 'lucide-react';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  orders = [],
  reports = [],
  units = [],
  isAdmin = false,
  onSelectOrder,
  onSelectReport,
  onNavigateTab,
  onNewOrder,
  onOpenProfile
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [];

    const quickActions = [
      ...(isAdmin
        ? []
        : [
            {
              id: 'act-new-order',
              group: 'Ações Rápidas',
              label: 'Nova Vistoria / Checklist',
              meta: 'Iniciar auditoria de 63 itens',
              icon: Plus,
              run: () => onNewOrder?.()
            }
          ]),
      {
        id: 'act-orders',
        group: 'Navegação',
        label: isAdmin ? 'Ir para Supervisão de Vistorias' : 'Ir para Vistorias & Checklists',
        meta: `${orders.length} vistoria(s)`,
        icon: ClipboardList,
        run: () => onNavigateTab?.('orders')
      },
      {
        id: 'act-reports',
        group: 'Navegação',
        label: isAdmin ? 'Ir para Supervisão de Relatórios' : 'Ir para Relatórios Técnicos',
        meta: `${reports.length} relatório(s)`,
        icon: FileBarChart2,
        run: () => onNavigateTab?.('reports')
      },
      {
        id: 'act-units',
        group: 'Navegação',
        label: isAdmin ? 'Ir para Unidades & Rotas (MA)' : 'Ir para Clientes & Unidades',
        meta: `${units.length} unidade(s)`,
        icon: Building2,
        run: () => onNavigateTab?.('units')
      },
      {
        id: 'act-profile',
        group: 'Navegação',
        label: isAdmin ? 'Administração & Usuários' : 'Minha Conta & Perfil RT',
        meta: isAdmin ? 'Gerenciar papéis e segurança do sistema' : 'Registro profissional, senha e cache offline',
        icon: Award,
        run: () => onOpenProfile?.()
      }
    ];

    quickActions.forEach((a) => {
      if (!q || a.label.toLowerCase().includes(q) || a.meta.toLowerCase().includes(q)) {
        list.push(a);
      }
    });

    units.forEach((u) => {
      const text = `${u.nome} ${u.clienteNome} ${u.municipio} ${u.regional} ${u.codigo}`.toLowerCase();
      if (!q || text.includes(q)) {
        list.push({
          id: `unit-${u.id}`,
          group: 'Unidades',
          label: u.nome,
          meta: `${u.clienteNome || 'Cliente'} • ${u.municipio}`,
          icon: Building2,
          run: () => onNavigateTab?.('units')
        });
      }
    });

    orders.forEach((o) => {
      const text = `${o.id} ${o.hospitalName} ${o.clientName} ${o.municipio}`.toLowerCase();
      if (!q || text.includes(q)) {
        list.push({
          id: `ord-${o.id}`,
          group: 'Vistorias & Checklists',
          label: `${o.id} — ${o.hospitalName}`,
          meta: `${o.clientName || 'Cliente'} • ${o.scheduledDate}`,
          icon: ClipboardList,
          run: () => onSelectOrder?.(o)
        });
      }
    });

    reports.forEach((r) => {
      const text = `${r.codigoRelatorio} ${r.unidade} ${r.clienteNome} ${r.cidade}`.toLowerCase();
      if (!q || text.includes(q)) {
        list.push({
          id: `rep-${r.codigoRelatorio}`,
          group: 'Relatórios Técnicos',
          label: `${r.codigoRelatorio} — ${r.unidade || 'Relatório'}`,
          meta: `${r.clienteNome || 'Cliente'} • ${Number(r.indiceConformidade || 0).toFixed(1)}%`,
          icon: FileBarChart2,
          run: () => onSelectReport?.(r)
        });
      }
    });

    return list.slice(0, 14);
  }, [query, orders, reports, units, onSelectOrder, onSelectReport, onNavigateTab, onNewOrder, onOpenProfile]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter' && items[selectedIndex]) {
        e.preventDefault();
        items[selectedIndex].run();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, items, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-[85] bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 sm:pt-20"
      onClick={onClose}
    >
      <div
        className="bg-[#111214] border border-[#232429] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#1F2024] flex items-center gap-3 bg-[#141518]">
          <Search className="w-4 h-4 text-[#34D399] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vistoria (OS-), relatório (REL-), unidade ou comando..."
            className="flex-1 bg-transparent text-xs sm:text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#71717A] hover:text-[#F4F4F5] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <p className="text-center text-xs text-[#71717A] py-8">
              Nenhum resultado encontrado para "{query}".
            </p>
          ) : (
            items.map((item, idx) => {
              const Icon = item.icon;
              const active = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition text-xs ${
                    active
                      ? 'bg-[#1A1C21] border border-[#2EB88A]/40 text-[#F4F4F5]'
                      : 'border border-transparent text-[#A1A1AA] hover:bg-[#16171B]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg border shrink-0 ${
                      active
                        ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                        : 'bg-[#0D0E10] text-[#71717A] border-[#232429]'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#F4F4F5] truncate">{item.label}</p>
                      <p className="text-[11px] text-[#71717A] truncate">
                        {item.group} • {item.meta}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#34D399]' : 'text-[#52525B]'}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#1F2024] bg-[#0D0E10] flex items-center justify-between text-[10px] text-[#71717A]">
          <span>↑↓ navegar • Enter abrir • Esc fechar</span>
          <span className="font-mono text-[#34D399]">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
