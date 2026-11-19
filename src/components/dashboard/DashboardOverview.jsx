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
  X
} from 'lucide-react';
import { calculateInspectionSummary } from '../../data/emserhChecklistData';

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
            Visão consolidada das suas inspeções ambientais, desvios identificados e relatórios técnicos salvos no Supabase.
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

        <div className="bg-[#141518] border border-[#232429] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-wider">Média de Conformidade</span>
            <Activity className="w-4 h-4 text-[#2EB88A]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-[#34D399] font-mono">{conformityPercentage}%</span>
            <span className="text-xs text-[#71717A] font-medium">({totalAvaliados} itens)</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA]">Apuração automática nos checklists</p>
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
                      <span
                        className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 border ${
                          order.status === 'completed'
                            ? 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                            : 'bg-[#1A1C21] text-[#F4F4F5] border-[#2D2F36]'
                        }`}
                      >
                        {order.status === 'completed' ? 'Concluída' : 'Em Andamento'}
                      </span>
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
    </div>
  );
}
