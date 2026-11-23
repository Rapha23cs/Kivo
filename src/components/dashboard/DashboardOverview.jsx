import React, { useState } from 'react';
import {
  ClipboardCheck,
  Building2,
  Activity,
  Plus,
  MapPin,
  ArrowRight,
  FileText,
  FileBarChart2,
  AlertOctagon,
  CheckCircle2,
  Award,
  X,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import { calculateInspectionSummary, calculateTopicBreakdown, EMSERH_TOPICS } from '../../data/emserhChecklistData';
import { getOrderStatusMeta } from '../../utils/kivoHelpers';
import Badge from '../common/Badge';

export default function DashboardOverview({
  orders = [],
  reports = [],
  units = [],
  userProfile,
  onOpenOrder,
  onNewOrder,
  onNavigateTab,
  onOpenProfile
}) {
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try {
      return localStorage.getItem('kivo_onboarding_dismissed') === '1';
    } catch {
      return false;
    }
  });

  const hasProfileConfigured = Boolean(
    userProfile?.registry && userProfile.registry !== 'RT Habilitado'
  );
  const hasUnitsConfigured = units.length > 0;
  const hasOrdersCreated = orders.length > 0;
  const allStepsDone = hasProfileConfigured && hasUnitsConfigured && hasOrdersCreated;
  const showOnboarding = !onboardingDismissed && !allStepsDone;

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      localStorage.setItem('kivo_onboarding_dismissed', '1');
    } catch {
      // ignora
    }
  };
  const activeOrdersCount = orders.filter((o) => o.status === 'open' || o.status === 'in_progress').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;

  let totalAvaliados = 0;
  let totalSim = 0;
  let totalDesvios = 0;

  orders.forEach((o) => {
    const s = calculateInspectionSummary(o.checklist || []);
    totalAvaliados += s.totalAvaliados;
    totalSim += s.totalSim;
    totalDesvios += s.desviosCount;
  });

  const conformityPercentage = totalAvaliados > 0 ? Math.round((totalSim / totalAvaliados) * 100) : 0;
  const finalizedReports = reports.filter((r) => r.status === 'finalizado').length;

  // Série temporal de conformidade das últimas vistorias + distribuição por severidade
  const timelineSeries = React.useMemo(() => {
    return [...orders]
      .filter((o) => (o.checklist || []).some((i) => i.status !== null && i.status !== undefined))
      .sort((a, b) => new Date(a.scheduledDate || a.createdAt || 0) - new Date(b.scheduledDate || b.createdAt || 0))
      .slice(-8)
      .map((o) => {
        const s = calculateInspectionSummary(o.checklist || []);
        const rawDate = o.scheduledDate || o.createdAt || '';
        const label = rawDate
          ? new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit'
            })
          : o.id.slice(-4);
        return {
          id: o.id,
          unit: o.hospitalName || o.id,
          label,
          percent: Number(s.percentualConformidade) || 0
        };
      });
  }, [orders]);

  const severityDistribution = React.useMemo(() => {
    const counts = { Crítico: 0, Grave: 0, Médio: 0, Leve: 0, Outros: 0 };
    orders.forEach((o) => {
      (o.checklist || []).forEach((item) => {
        if (item.status === 'nao' || item.status === 'nao_conforme') {
          if (Object.prototype.hasOwnProperty.call(counts, item.classification)) {
            counts[item.classification] += 1;
          } else {
            counts.Outros += 1;
          }
        }
      });
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [orders]);

  // Agregação por Temática (11 áreas) e lista de desvios prioritários (Crítico / Grave)
  const topicRanking = React.useMemo(() => {
    const acc = {};
    EMSERH_TOPICS.forEach((t) => {
      acc[t] = { topic: t, sim: 0, nao: 0, avaliados: 0 };
    });
    orders.forEach((o) => {
      const tb = calculateTopicBreakdown(o.checklist || []);
      Object.values(tb).forEach((entry) => {
        if (!acc[entry.topic]) return;
        acc[entry.topic].sim += entry.sim;
        acc[entry.topic].nao += entry.nao;
        acc[entry.topic].avaliados += entry.totalAvaliados;
      });
    });
    return Object.values(acc)
      .filter((t) => t.avaliados > 0)
      .map((t) => ({
        ...t,
        percent: t.avaliados > 0 ? Math.round((t.sim / t.avaliados) * 100) : 100
      }))
      .sort((a, b) => b.nao - a.nao || a.percent - b.percent);
  }, [orders]);

  const priorityDeviations = React.useMemo(() => {
    const rank = { 'Crítico': 4, 'Grave': 3, 'Médio': 2, 'Leve': 1 };
    const list = [];
    orders.forEach((o) => {
      (o.checklist || []).forEach((item) => {
        if (item.status === 'nao' || item.status === 'nao_conforme') {
          list.push({
            order: o,
            item,
            weight: rank[item.classification] || 0
          });
        }
      });
    });
    return list.sort((a, b) => b.weight - a.weight).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-medium text-[#A1A1AA] bg-[#1A1B20] px-2.5 py-0.5 rounded border border-[#27282E]">
              AUDITOR RT: {userProfile?.registry || 'RT Habilitado'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
            Olá, {userProfile?.name || 'Auditor Técnico'}
          </h1>
          <p className="text-xs text-[#71717A] max-w-xl">
            Visão consolidada das vistorias técnicas (Meio Ambiente e Segurança do Trabalho), desvios identificados e relatórios salvos no Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateTab('reports')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1B20] hover:bg-[#23252C] text-[#F4F4F5] border border-[#2C2E36] rounded-lg text-xs font-medium transition"
          >
            <FileBarChart2 className="w-4 h-4 text-[#A1A1AA]" />
            Relatórios Técnicos
          </button>
          <button
            onClick={onNewOrder}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#080A09] rounded-lg text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            Nova Vistoria
          </button>
        </div>
      </div>

      {/* Onboarding Rápido (Fluxo inicial de conta + unidades + 1ª vistoria) */}
      {showOnboarding && (
        <div className="bg-[#141518] border border-[#2EB88A]/30 rounded-xl p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#F4F4F5]">
                Primeiros passos no Kivo
              </h2>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Configure seu registro RT e cadastre suas unidades para agilizar as auditorias em campo.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissOnboarding}
              className="p-1 text-[#71717A] hover:text-[#F4F4F5] rounded"
              title="Ocultar guia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <button
              type="button"
              onClick={() => onOpenProfile?.()}
              className={`text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                hasProfileConfigured
                  ? 'bg-[#122620]/60 border-[#2EB88A]/40 text-[#34D399]'
                  : 'bg-[#0D0E10] border-[#232429] hover:border-[#32343C] text-[#F4F4F5]'
              }`}
            >
              {hasProfileConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              ) : (
                <Award className="w-4 h-4 text-[#34D399] shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-semibold block truncate">1. Perfil & Conselho RT</span>
                <span className="text-[10px] text-[#71717A] block truncate">
                  {hasProfileConfigured ? userProfile.registry : 'Definir CRQ / CREA'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('units')}
              className={`text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                hasUnitsConfigured
                  ? 'bg-[#122620]/60 border-[#2EB88A]/40 text-[#34D399]'
                  : 'bg-[#0D0E10] border-[#232429] hover:border-[#32343C] text-[#F4F4F5]'
              }`}
            >
              {hasUnitsConfigured ? (
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              ) : (
                <Building2 className="w-4 h-4 text-[#34D399] shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-semibold block truncate">2. Clientes & Unidades</span>
                <span className="text-[10px] text-[#71717A] block truncate">
                  {hasUnitsConfigured ? `${units.length} unidade(s) ativa(s)` : 'Cadastrar 1ª unidade'}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onNewOrder}
              className={`text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                hasOrdersCreated
                  ? 'bg-[#122620]/60 border-[#2EB88A]/40 text-[#34D399]'
                  : 'bg-[#0D0E10] border-[#232429] hover:border-[#32343C] text-[#F4F4F5]'
              }`}
            >
              {hasOrdersCreated ? (
                <CheckCircle2 className="w-4 h-4 text-[#34D399] shrink-0" />
              ) : (
                <Plus className="w-4 h-4 text-[#34D399] shrink-0" />
              )}
              <div className="min-w-0">
                <span className="font-semibold block truncate">3. Iniciar 1ª Vistoria</span>
                <span className="text-[10px] text-[#71717A] block truncate">
                  {hasOrdersCreated ? `${orders.length} vistoria(s) iniciada(s)` : 'Abrir checklist de campo'}
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* KPI Metrics (100% dados reais do Supabase) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">Vistorias Ativas</span>
            <ClipboardCheck className="w-4 h-4 text-[#71717A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F4F4F5] font-mono">{activeOrdersCount}</span>
            <span className="text-xs text-[#71717A] font-medium">de {orders.length} totais</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">{completedOrdersCount} vistoria(s) concluída(s)</p>
        </div>

        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">Desvios em Checklists</span>
            <AlertOctagon className="w-4 h-4 text-[#FB7185]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#FB7185] font-mono">{totalDesvios}</span>
            <span className="text-xs text-[#71717A] font-medium">itens marcados "Não"</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">Tratativa registrada na Regra 6</p>
        </div>

        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 flex items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2EB88A]" />
              <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider truncate">
                Média Conformidade
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#34D399] font-mono">{conformityPercentage}%</span>
              <span className="text-xs text-[#71717A] font-medium">({totalAvaliados})</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Apuração automática nos checklists</p>
          </div>

          {/* Medidor Circular SVG (Gauge) */}
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#232429"
                strokeWidth="3.2"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke={conformityPercentage >= 80 ? '#2EB88A' : conformityPercentage >= 60 ? '#F59E0B' : '#F43F5E'}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(100, Math.max(0, conformityPercentage)) * 0.974} 100`}
              />
            </svg>
            <span className="absolute font-mono text-[10px] font-bold text-[#F4F4F5]">
              {conformityPercentage}%
            </span>
          </div>
        </div>

        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">Relatórios Técnicos</span>
            <FileText className="w-4 h-4 text-[#71717A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F4F4F5] font-mono">{reports.length}</span>
            <span className="text-xs text-[#71717A] font-medium">{finalizedReports} finalizado(s)</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">Com registros fotográficos e aderência</p>
        </div>
      </div>

      {/* Gráficos Analíticos Leves (Evolução Temporal + Severidade dos Desvios) */}
      {(timelineSeries.length >= 2 || severityDistribution.total > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Evolução Temporal de Conformidade */}
          <div className="lg:col-span-7 bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#34D399]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Evolução da Conformidade</h3>
              </div>
              <span className="text-[11px] text-[#71717A] font-mono">
                Últimas {timelineSeries.length} vistoria(s)
              </span>
            </div>

            {timelineSeries.length < 2 ? (
              <p className="text-xs text-[#71717A] py-8 text-center">
                Conclua ao menos 2 vistorias avaliadas para visualizar a curva de evolução temporal.
              </p>
            ) : (
              (() => {
                const W = 520;
                const H = 140;
                const padX = 28;
                const padY = 18;
                const innerW = W - padX * 2;
                const innerH = H - padY * 2;
                const coords = timelineSeries.map((pt, i) => {
                  const x = padX + (timelineSeries.length === 1 ? innerW / 2 : (i / (timelineSeries.length - 1)) * innerW);
                  const y = padY + innerH - (pt.percent / 100) * innerH;
                  return { ...pt, x, y };
                });
                const linePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
                const areaPath = `M ${coords[0].x.toFixed(1)},${(H - padY).toFixed(1)} L ${coords
                  .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
                  .join(' L ')} L ${coords[coords.length - 1].x.toFixed(1)},${(H - padY).toFixed(1)} Z`;

                return (
                  <div className="space-y-2">
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36 overflow-visible">
                      <defs>
                        <linearGradient id="kivoConformityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2EB88A" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#2EB88A" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {[0, 50, 80, 100].map((tick) => {
                        const y = padY + innerH - (tick / 100) * innerH;
                        return (
                          <g key={tick}>
                            <line
                              x1={padX}
                              y1={y}
                              x2={W - padX}
                              y2={y}
                              stroke={tick === 80 ? '#2EB88A' : '#232429'}
                              strokeOpacity={tick === 80 ? 0.35 : 0.9}
                              strokeDasharray={tick === 80 ? '4 4' : undefined}
                              strokeWidth="1"
                            />
                            <text
                              x={4}
                              y={y + 3}
                              fill="#71717A"
                              fontSize="9"
                              fontFamily="monospace"
                            >
                              {tick}%
                            </text>
                          </g>
                        );
                      })}

                      <path d={areaPath} fill="url(#kivoConformityGrad)" />
                      <polyline
                        fill="none"
                        stroke="#2EB88A"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={linePoints}
                      />

                      {coords.map((c) => (
                        <g key={c.id}>
                          <circle cx={c.x} cy={c.y} r="4.5" fill="#141518" stroke="#34D399" strokeWidth="2.2" />
                          <text
                            x={c.x}
                            y={Math.max(10, c.y - 9)}
                            textAnchor="middle"
                            fill="#F4F4F5"
                            fontSize="9.5"
                            fontWeight="700"
                            fontFamily="monospace"
                          >
                            {c.percent}%
                          </text>
                          <text
                            x={c.x}
                            y={H - 2}
                            textAnchor="middle"
                            fill="#71717A"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {c.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()
            )}
          </div>

          {/* Distribuição de Desvios por Severidade */}
          <div className="lg:col-span-5 bg-[#141518] border border-[#232429] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-[#FB7185]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Severidade dos Desvios</h3>
              </div>
              <span className="font-mono text-xs font-bold text-[#FB7185]">
                {severityDistribution.total} registro(s)
              </span>
            </div>

            {severityDistribution.total === 0 ? (
              <p className="text-xs text-[#71717A] py-8 text-center">
                Nenhum item classificado como "Não" até o momento.
              </p>
            ) : (
              <div className="space-y-4 my-auto">
                <div className="w-full h-4 rounded-full overflow-hidden bg-[#0D0E10] border border-[#232429] flex">
                  {[
                    { key: 'Crítico', color: '#E11D48' },
                    { key: 'Grave', color: '#F59E0B' },
                    { key: 'Médio', color: '#6366F1' },
                    { key: 'Leve', color: '#2EB88A' },
                    { key: 'Outros', color: '#71717A' }
                  ].map(({ key, color }) => {
                    const qty = severityDistribution.counts[key] || 0;
                    if (qty <= 0) return null;
                    const pct = (qty / severityDistribution.total) * 100;
                    return (
                      <div
                        key={key}
                        style={{ width: `${pct}%`, backgroundColor: color }}
                        title={`${key}: ${qty} (${Math.round(pct)}%)`}
                        className="h-full transition-all duration-500"
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: 'Crítico', dot: 'bg-[#E11D48]' },
                    { key: 'Grave', dot: 'bg-[#F59E0B]' },
                    { key: 'Médio', dot: 'bg-[#6366F1]' },
                    { key: 'Leve', dot: 'bg-[#2EB88A]' }
                  ].map(({ key, dot }) => {
                    const qty = severityDistribution.counts[key] || 0;
                    const pct = severityDistribution.total > 0 ? Math.round((qty / severityDistribution.total) * 100) : 0;
                    return (
                      <div key={key} className="bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[#E4E4E7]">
                          <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                          {key}
                        </span>
                        <span className="font-mono font-bold text-[#F4F4F5]">
                          {qty} <span className="text-[10px] text-[#71717A] font-normal">({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Listas Recentes Reais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vistorias Recentes (2 Cols) */}
        <div className="lg:col-span-2 bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[#A1A1AA]" />
              <h3 className="font-semibold text-[#F4F4F5] text-sm">Inspeções & Checklists Recentes</h3>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1 transition"
            >
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#71717A] border border-dashed border-[#232429] rounded-lg">
              Nenhuma inspeção registrada ainda. Clique em <strong className="text-[#F4F4F5]">Nova Vistoria</strong> para começar.
            </div>
          ) : (
            <div className="space-y-2.5">
              {orders.slice(0, 5).map((order) => {
                const s = calculateInspectionSummary(order.checklist || []);
                return (
                  <div
                    key={order.id}
                    onClick={() => onOpenOrder(order)}
                    className="bg-[#0E0F12] border border-[#232429] hover:border-[#32343C] hover:bg-[#191A1F] p-3.5 rounded-lg cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#F4F4F5]">{order.id}</span>
                        {order.clientName && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#E4E4E7]">
                            {order.clientName}
                          </span>
                        )}
                        <span className="text-[11px] text-[#71717A] font-mono">{order.scheduledDate}</span>
                      </div>
                      <h4 className="text-xs font-medium text-[#E4E4E7] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#71717A]" />
                        {order.hospitalName}
                      </h4>
                      <p className="text-[11px] text-[#71717A] flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#71717A]" />
                        {order.regional} • {order.municipio}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                      <span className="text-xs font-mono font-semibold text-[#34D399]">
                        {s.percentualConformidade}%
                      </span>
                      <Badge variant={getOrderStatusMeta(order.status).variant} size="sm">
                        {getOrderStatusMeta(order.status).label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Relatórios Recentes (1 Col) */}
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart2 className="w-4 h-4 text-[#A1A1AA]" />
              <h3 className="font-semibold text-[#F4F4F5] text-sm">Últimos Relatórios</h3>
            </div>
            <button
              onClick={() => onNavigateTab('reports')}
              className="text-xs text-[#A1A1AA] hover:text-[#F4F4F5] font-medium transition"
            >
              Abrir
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#71717A] border border-dashed border-[#232429] rounded-lg space-y-2">
              <p>Nenhum relatório técnico criado.</p>
              <button
                onClick={() => onNavigateTab('reports')}
                className="text-[#34D399] hover:underline font-medium"
              >
                Criar ou importar de um checklist
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.slice(0, 4).map((rep) => (
                <div
                  key={rep.codigoRelatorio}
                  onClick={() => onNavigateTab('reports')}
                  className="bg-[#0E0F12] border border-[#232429] hover:border-[#32343C] rounded-lg p-3 cursor-pointer transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-[#34D399]">{rep.codigoRelatorio}</span>
                    <span className="font-mono text-xs font-bold text-[#F4F4F5]">
                      {Number(rep.indiceConformidade || 0).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[#E4E4E7] truncate">{rep.unidade}</p>
                  <p className="text-[11px] text-[#71717A] truncate">
                    {rep.clienteNome || 'Cliente'} • {rep.nivelAderencia}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Painéis Analíticos Visuais (Conformidade por Temática + Desvios Prioritários) */}
      {(topicRanking.length > 0 || priorityDeviations.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temáticas com maior incidência de desvios */}
          <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#34D399]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Desempenho por Temática</h3>
              </div>
              <span className="text-[11px] text-[#71717A]">
                {topicRanking.length} área(s) avaliada(s)
              </span>
            </div>

            {topicRanking.length === 0 ? (
              <p className="text-xs text-[#71717A] py-6 text-center">
                Avalie itens nos checklists para visualizar o gráfico de conformidade por área.
              </p>
            ) : (
              <div className="space-y-3">
                {topicRanking.slice(0, 6).map((t) => (
                  <div key={t.topic} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#E4E4E7] truncate font-medium">{t.topic}</span>
                      <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                        {t.nao > 0 && (
                          <span className="text-[#FB7185]">{t.nao} desvio(s)</span>
                        )}
                        <span className={t.percent >= 80 ? 'text-[#34D399] font-semibold' : 'text-[#F4F4F5] font-semibold'}>
                          {t.percent}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#0D0E10] rounded-full overflow-hidden border border-[#232429]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          t.percent >= 85 ? 'bg-[#2EB88A]' : t.percent >= 70 ? 'bg-[#F59E0B]' : 'bg-[#F43F5E]'
                        }`}
                        style={{ width: `${t.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Desvios Prioritários para Ação */}
          <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#FB7185]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Desvios Prioritários em Aberto</h3>
              </div>
              <span className="text-[11px] font-mono text-[#FB7185]">
                {totalDesvios} total
              </span>
            </div>

            {priorityDeviations.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#71717A] border border-dashed border-[#232429] rounded-lg">
                Nenhum desvio crítico ou não conformidade registrada nos checklists ativos.
              </div>
            ) : (
              <div className="space-y-2.5">
                {priorityDeviations.map(({ order, item }, idx) => (
                  <button
                    key={`${order.id}-${item.id || idx}`}
                    type="button"
                    onClick={() => onOpenOrder(order)}
                    className="w-full text-left bg-[#0E0F12] hover:bg-[#18191D] border border-[#232429] hover:border-[#F43F5E]/40 rounded-lg p-3 transition space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase border ${
                          item.classification === 'Crítico' || item.classification === 'Grave'
                            ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40'
                            : 'bg-[#1A1B20] text-[#E4E4E7] border-[#2D2F36]'
                        }`}
                      >
                        {item.classification || 'Desvio'}
                      </span>
                      <span className="font-mono text-[10px] text-[#71717A] truncate">
                        {order.hospitalName} • Prazo: {item.deadline || 'A definir'}
                      </span>
                    </div>
                    <p className="text-xs text-[#F4F4F5] line-clamp-1 font-medium">
                      #{item.number} — {item.observation || item.question}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
