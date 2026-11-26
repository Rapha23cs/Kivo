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
  ShieldAlert,
  ShieldCheck,
  Users,
  Calendar,
  Clock
} from 'lucide-react';
import { calculateInspectionSummary, calculateTopicBreakdown } from '../../data/emserhChecklistData';
import { getExpiryStatus } from '../../supabase/operationsService';
import { getOrderStatusMeta, sanitizeMediaUrl } from '../../utils/kivoHelpers';
import Badge from '../common/Badge';

export default function DashboardOverview({
  orders = [],
  reports = [],
  units = [],
  clients = [],
  schedules = [],
  sstItems = [],
  adminUsers = [],
  userProfile,
  onOpenOrder,
  onNewOrder,
  onNavigateTab,
  onOpenProfile,
  onOpenAdminPanel
}) {
  const isAdmin = userProfile?.role === 'admin';
  const [topicDiscipline, setTopicDiscipline] = useState('all');
  const [hoveredPointId, setHoveredPointId] = useState(null);
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
  const showOnboarding = !isAdmin && !onboardingDismissed && !allStepsDone;

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

  const clientLogoByName = React.useMemo(() => {
    const map = {};
    (clients || []).forEach((c) => {
      if (c?.nome && c?.logoUrl) map[c.nome.toLowerCase()] = c.logoUrl;
    });
    return map;
  }, [clients]);

  // Série temporal de conformidade das últimas vistorias + distribuição por severidade
  const timelineSeries = React.useMemo(() => {
    return [...orders]
      .filter((o) => (o.checklist || []).some((i) => i.status !== null && i.status !== undefined))
      .sort((a, b) => new Date(a.scheduledDate || a.createdAt || 0) - new Date(b.scheduledDate || b.createdAt || 0))
      .slice(-8)
      .map((o) => {
        const s = calculateInspectionSummary(o.checklist || []);
        const rawDate = o.scheduledDate || o.createdAt || '';
        const parsedDate = rawDate
          ? new Date(rawDate.length === 10 ? `${rawDate}T12:00:00` : rawDate)
          : null;
        const label = parsedDate
          ? parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : o.id.slice(-4);
        const fullDate = parsedDate ? parsedDate.toLocaleDateString('pt-BR') : 'Sem data';
        return {
          id: o.id,
          order: o,
          unit: o.hospitalName || o.id,
          client: o.clientName || '',
          label,
          fullDate,
          percent: Number(s.percentualConformidade) || 0,
          desvios: s.desviosCount || 0
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

  // Agregação dinâmica por Temática / NR / Categoria (Meio Ambiente + SST + Modelos)
  const topicRanking = React.useMemo(() => {
    const acc = {};
    orders.forEach((o) => {
      const disc = o.discipline || 'meio_ambiente';
      if (topicDiscipline !== 'all' && disc !== topicDiscipline) return;
      const tb = calculateTopicBreakdown(o.checklist || []);
      Object.values(tb).forEach((entry) => {
        if (!entry?.topic) return;
        if (!acc[entry.topic]) {
          acc[entry.topic] = { topic: entry.topic, sim: 0, nao: 0, avaliados: 0 };
        }
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
  }, [orders, topicDiscipline]);

  const upcomingRadar = React.useMemo(() => {
    const agendaAlerts = (schedules || [])
      .filter((s) => s.ativo !== false && s.proximaData)
      .map((s) => ({ ...s, due: getExpiryStatus(s.proximaData), kind: 'agenda' }))
      .filter((s) => s.due.status === 'vencido' || s.due.status === 'vence_hoje' || (s.due.daysRemaining !== null && s.due.daysRemaining <= 14))
      .sort((a, b) => (a.due.daysRemaining ?? 999) - (b.due.daysRemaining ?? 999));

    const sstAlerts = (sstItems || [])
      .filter((x) => x.dataValidade)
      .map((x) => ({ ...x, due: getExpiryStatus(x.dataValidade), kind: 'sst' }))
      .filter(
        (x) =>
          x.due.status === 'vencido' ||
          x.due.status === 'vence_hoje' ||
          x.due.status === 'alerta_30' ||
          x.due.status === 'alerta_60'
      )
      .sort((a, b) => (a.due.daysRemaining ?? 999) - (b.due.daysRemaining ?? 999));

    return { agendaAlerts: agendaAlerts.slice(0, 3), sstAlerts: sstAlerts.slice(0, 3) };
  }, [schedules, sstItems]);

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

  const auditorSummaries = React.useMemo(() => {
    if (!isAdmin) return [];
    const byKey = new Map();

    const ensureEntry = (key, meta = {}) => {
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          userId: meta.userId || null,
          name: meta.name || meta.email || 'Auditor',
          email: meta.email || '',
          role: meta.role || 'auditor',
          accessStatus: meta.accessStatus || 'approved',
          ordersCount: 0,
          reportsCount: 0,
          totalConf: 0,
          ratedOrders: 0
        });
      }
      return byKey.get(key);
    };

    (adminUsers || []).forEach((u) => {
      ensureEntry(u.user_id, {
        userId: u.user_id,
        name: u.full_name || u.email?.split('@')[0] || 'Usuário',
        email: u.email,
        role: u.role,
        accessStatus: u.access_status || 'approved'
      });
    });

    orders.forEach((o) => {
      const key = o.userId || o.technicianName || 'auditor-desconhecido';
      const entry = ensureEntry(key, {
        userId: o.userId,
        name: o.technicianName || 'Auditor Técnico'
      });
      entry.ordersCount += 1;
      const s = calculateInspectionSummary(o.checklist || []);
      if (s.totalAvaliados > 0) {
        entry.totalConf += Number(s.percentualConformidade) || 0;
        entry.ratedOrders += 1;
      }
    });

    reports.forEach((r) => {
      const key = r.userId || r.responsavel || 'auditor-desconhecido';
      const entry = ensureEntry(key, {
        userId: r.userId,
        name: r.responsavel || 'Auditor Técnico'
      });
      entry.reportsCount += 1;
    });

    return Array.from(byKey.values()).sort(
      (a, b) => b.ordersCount - a.ordersCount || b.reportsCount - a.reportsCount || a.name.localeCompare(b.name)
    );
  }, [isAdmin, adminUsers, orders, reports]);

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="kivo-card rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin ? (
              <span className="font-mono text-[11px] font-semibold text-[#FBBF24] bg-[#221A10] px-2.5 py-0.5 rounded border border-[#F59E0B]/40">
                ADMINISTRAÇÃO DO SISTEMA
              </span>
            ) : (
              <span className="font-mono text-[11px] font-medium text-[#A1A1AA] bg-[#1A1B20] px-2.5 py-0.5 rounded border border-[#27282E]">
                AUDITOR RT: {userProfile?.registry || 'RT Habilitado'}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
            {isAdmin
              ? `Painel Administrativo — ${userProfile?.name || 'Administrador'}`
              : `Olá, ${userProfile?.name || 'Auditor Técnico'}`}
          </h1>
          <p className="text-xs text-[#71717A] max-w-xl">
            {isAdmin
              ? 'Gestão central do sistema Kivo: administração de usuários, catálogo comum de unidades no Maranhão e supervisão global de vistorias e relatórios.'
              : 'Visão consolidada das vistorias técnicas (Meio Ambiente e Segurança do Trabalho), desvios identificados e relatórios salvos no Supabase.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin ? (
            <>
              <button
                onClick={() => onNavigateTab('units')}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1A1B20] hover:bg-[#23252C] text-[#F4F4F5] border border-[#2C2E36] rounded-lg text-xs font-medium transition"
              >
                <Building2 className="w-4 h-4 text-[#34D399]" />
                Unidades &amp; Rotas (MA)
              </button>
              <button
                onClick={onOpenAdminPanel || onOpenProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#080A09] rounded-lg text-xs font-bold transition"
              >
                <ShieldCheck className="w-4 h-4" />
                Gerenciar Usuários
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Resumo Executivo de Usuários / Auditores (Exclusivo Admin) */}
      {isAdmin && (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FBBF24]" />
              <div>
                <h2 className="text-sm font-semibold text-[#F4F4F5]">
                  Contas &amp; Atividade dos Auditores
                </h2>
                <p className="text-[11px] text-[#71717A]">
                  {adminUsers.length} conta(s) registrada(s) • {adminUsers.filter((u) => u.role === 'auditor').length} auditor(es) e {adminUsers.filter((u) => u.role === 'admin').length} admin(s)
                  {adminUsers.filter((u) => u.access_status === 'pending').length > 0 && (
                    <span className="text-[#FBBF24] font-semibold">
                      {' '}• {adminUsers.filter((u) => u.access_status === 'pending').length} aguardando autorização
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAdminPanel || onOpenProfile}
              className="text-xs font-medium text-[#FBBF24] hover:underline flex items-center gap-1 self-start sm:self-center"
            >
              Gerenciar papéis e acessos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {adminUsers.some((u) => u.access_status === 'pending') && (
            <div className="bg-[#221A10] border border-[#F59E0B]/40 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-[#FBBF24] font-medium">
                Há {adminUsers.filter((u) => u.access_status === 'pending').length} novo(s) usuário(s) aguardando sua autorização para acessar o sistema.
              </span>
              <button
                type="button"
                onClick={onOpenAdminPanel || onOpenProfile}
                className="px-3 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#FBBF24] text-[#080A09] font-bold text-[11px] transition shrink-0 self-start sm:self-auto"
              >
                Autorizar usuários
              </button>
            </div>
          )}

          {auditorSummaries.length === 0 ? (
            <p className="text-xs text-[#71717A] py-3">
              Nenhuma atividade ou conta sincronizada ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
              {auditorSummaries.map((aud) => {
                const avg = aud.ratedOrders > 0 ? Math.round(aud.totalConf / aud.ratedOrders) : null;
                return (
                  <div
                    key={aud.key}
                    className="bg-[#0E0F12] border border-[#232429] rounded-lg p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-[#F4F4F5] truncate">{aud.name}</span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                            aud.role === 'admin'
                              ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/40'
                              : 'bg-[#18191D] text-[#A1A1AA] border-[#27282E]'
                          }`}
                        >
                          {aud.role}
                        </span>
                        {aud.accessStatus === 'pending' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/40 shrink-0">
                            Pendente
                          </span>
                        )}
                        {aud.accessStatus === 'blocked' && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border bg-[#221216] text-[#FB7185] border-[#F43F5E]/40 shrink-0">
                            Bloqueado
                          </span>
                        )}
                      </div>
                      {aud.email && (
                        <p className="text-[11px] text-[#71717A] truncate">{aud.email}</p>
                      )}
                      <p className="text-[11px] text-[#A1A1AA] mt-1">
                        {aud.ordersCount} vistoria(s) • {aud.reportsCount} relatório(s)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-[#71717A] block">Média</span>
                      <span className="font-mono font-bold text-[#34D399]">
                        {avg !== null ? `${avg}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
        <div className="kivo-card kivo-card-interactive rounded-2xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Vistorias Ativas</span>
            <div className="w-8 h-8 rounded-xl bg-[#18191D] border border-[#232429] flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4 text-[#A1A1AA]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F4F4F5] font-mono kivo-tabular">{activeOrdersCount}</span>
            <span className="text-xs text-[#71717A] font-medium">de {orders.length}</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">{completedOrdersCount} vistoria(s) concluída(s)</p>
        </div>

        <div className="kivo-card kivo-card-interactive rounded-2xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Desvios em Checklists</span>
            <div className="w-8 h-8 rounded-xl bg-[#221216] border border-[#F43F5E]/30 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4 text-[#FB7185]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#FB7185] font-mono kivo-tabular">{totalDesvios}</span>
            <span className="text-xs text-[#71717A] font-medium">itens "Não"</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">Tratativa registrada na Regra 6</p>
        </div>

        <div className="kivo-card kivo-card-interactive rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2EB88A]" />
              <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider truncate">
                Média Conformidade
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#34D399] font-mono kivo-tabular">{conformityPercentage}%</span>
              <span className="text-xs text-[#71717A] font-medium kivo-tabular">({totalAvaliados})</span>
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Apuração nos checklists</p>
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
                stroke={conformityPercentage >= 80 ? 'var(--kivo-accent, #2EB88A)' : conformityPercentage >= 60 ? '#F59E0B' : '#F43F5E'}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(100, Math.max(0, conformityPercentage)) * 0.974} 100`}
              />
            </svg>
            <span className="absolute font-mono text-[10px] font-bold text-[#F4F4F5] kivo-tabular">
              {conformityPercentage}%
            </span>
          </div>
        </div>

        <div className="kivo-card kivo-card-interactive rounded-2xl p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Relatórios Técnicos</span>
            <div className="w-8 h-8 rounded-xl bg-[#122620] border border-[#2EB88A]/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#34D399]" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#F4F4F5] font-mono kivo-tabular">{reports.length}</span>
            <span className="text-xs text-[#71717A] font-medium">{finalizedReports} finalizado(s)</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">Com registros e aderência</p>
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

                const activePt = timelineSeries.find((pt) => pt.id === hoveredPointId) || null;
                return (
                  <div className="space-y-2 relative">
                    {activePt && (
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#0D0E10] border border-[#2EB88A]/40 text-[11px] animate-fade-in">
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-semibold text-[#34D399]">{activePt.id}</span>
                          <span className="text-[#71717A] mx-1.5">•</span>
                          <span className="text-[#F4F4F5] font-medium">{activePt.unit}</span>
                          <span className="text-[#71717A] ml-1.5 font-mono">({activePt.fullDate})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          {activePt.desvios > 0 && (
                            <span className="text-[#FB7185]">{activePt.desvios} desvio(s)</span>
                          )}
                          <span className="font-bold text-[#34D399]">{activePt.percent}%</span>
                        </div>
                      </div>
                    )}
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36 overflow-visible">
                      <defs>
                        <linearGradient id="kivoConformityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" style={{ stopColor: 'var(--kivo-accent, #2EB88A)', stopOpacity: 0.35 }} />
                          <stop offset="100%" style={{ stopColor: 'var(--kivo-accent, #2EB88A)', stopOpacity: 0.02 }} />
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
                              stroke={tick === 80 ? 'var(--kivo-accent, #2EB88A)' : '#232429'}
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
                        stroke="var(--kivo-accent, #2EB88A)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={linePoints}
                      />

                      {coords.map((c) => {
                        const isHovered = hoveredPointId === c.id;
                        return (
                          <g
                            key={c.id}
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPointId(c.id)}
                            onMouseLeave={() => setHoveredPointId(null)}
                            onClick={() => c.order && onOpenOrder?.(c.order)}
                          >
                            <circle cx={c.x} cy={c.y} r="12" fill="transparent" />
                            <circle
                              cx={c.x}
                              cy={c.y}
                              r={isHovered ? '6' : '4.5'}
                              fill="#141518"
                              stroke="var(--kivo-accent-light, #34D399)"
                              strokeWidth={isHovered ? '2.8' : '2.2'}
                            />
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
                        );
                      })}
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
              {isAdmin ? (
                'Nenhuma vistoria registrada pelos auditores ainda.'
              ) : (
                <>
                  Nenhuma inspeção registrada ainda. Clique em <strong className="text-[#F4F4F5]">Nova Vistoria</strong> para começar.
                </>
              )}
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
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#1A1B20] border border-[#27282E] text-[#E4E4E7]">
                            {clientLogoByName[order.clientName.toLowerCase()] && (
                              <img
                                src={sanitizeMediaUrl(clientLogoByName[order.clientName.toLowerCase()])}
                                alt={order.clientName}
                                className="w-3.5 h-3.5 rounded-sm object-contain bg-white p-[1px]"
                              />
                            )}
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
                        {isAdmin && order.technicianName ? ` • Auditor: ${order.technicianName}` : ''}
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
              <p>Nenhum relatório técnico emitido ainda.</p>
              {!isAdmin && (
                <button
                  onClick={() => onNavigateTab('reports')}
                  className="text-[#34D399] hover:underline font-medium"
                >
                  Criar ou importar de um checklist
                </button>
              )}
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

      {/* Radar de Agenda & Vencimentos SST */}
      {(upcomingRadar.agendaAlerts.length > 0 || upcomingRadar.sstAlerts.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {upcomingRadar.agendaAlerts.length > 0 && (
            <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FBBF24]" />
                  <h3 className="font-semibold text-[#F4F4F5] text-sm">Agenda Próxima / Atrasada</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('agenda')}
                  className="text-xs text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1 transition"
                >
                  Abrir Agenda <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {upcomingRadar.agendaAlerts.map((sch) => (
                  <div
                    key={sch.id}
                    onClick={() => onNavigateTab('agenda')}
                    className="bg-[#0E0F12] border border-[#232429] hover:border-[#32343C] rounded-lg px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F4F4F5] truncate">{sch.unidadeNome}</p>
                      <p className="text-[11px] text-[#71717A] truncate">
                        {sch.clienteNome || 'Cliente'} • {sch.periodicidade}
                      </p>
                    </div>
                    <Badge variant={sch.due.variant} size="sm">
                      {sch.due.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingRadar.sstAlerts.length > 0 && (
            <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#FB7185]" />
                  <h3 className="font-semibold text-[#F4F4F5] text-sm">Vencimentos SST Críticos</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('units')}
                  className="text-xs text-[#A1A1AA] hover:text-[#F4F4F5] flex items-center gap-1 transition"
                >
                  Ver Inventário <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {upcomingRadar.sstAlerts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateTab('units')}
                    className="bg-[#0E0F12] border border-[#232429] hover:border-[#32343C] rounded-lg px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#F4F4F5] truncate">{item.itemNome || item.titulo || item.categoria}</p>
                      <p className="text-[11px] text-[#71717A] truncate">
                        {item.unidadeNome || item.clienteNome || 'Unidade'} • {item.categoria}
                      </p>
                    </div>
                    <Badge variant={item.due.variant} size="sm">
                      {item.due.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Painéis Analíticos Visuais (Conformidade por Temática + Desvios Prioritários) */}
      {(topicRanking.length > 0 || priorityDeviations.length > 0 || orders.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temáticas com maior incidência de desvios */}
          <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#34D399]" />
                <h3 className="font-semibold text-[#F4F4F5] text-sm">Desempenho por Temática / NR</h3>
              </div>
              <div className="flex items-center gap-1 bg-[#0D0E10] border border-[#232429] rounded-lg p-0.5 text-[10px] font-medium">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'meio_ambiente', label: 'Ambiental' },
                  { id: 'seguranca_trabalho', label: 'SST' }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTopicDiscipline(opt.id)}
                    className={`px-2 py-1 rounded-md transition ${
                      topicDiscipline === opt.id
                        ? 'bg-[#1E2025] text-[#34D399] font-semibold'
                        : 'text-[#71717A] hover:text-[#F4F4F5]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
