import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Plus,
  ClipboardCheck,
  Search,
  Printer,
  Edit3,
  Trash2,
  Camera,
  AlertOctagon,
  Building2,
  Calendar,
  Link2
} from 'lucide-react';
import Badge from '../common/Badge';
import ReportEditorModal from './ReportEditorModal';
import ReportPrintView from './ReportPrintView';
import { createBlankReport, calculateAdherenceLevel } from '../../data/reportTemplateData';
import { ReportService } from '../../supabase/reportService';

export default function ReportsModule({
  reports,
  orders,
  hospitals,
  userProfile,
  onSaveReport,
  onDeleteReport,
  initialEditingReport,
  onClearInitialEditingReport,
  onOpenOrderByCode
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingReport, setEditingReport] = useState(null);
  const [printingReport, setPrintingReport] = useState(null);
  const [showImportPicker, setShowImportPicker] = useState(false);

  useEffect(() => {
    if (initialEditingReport) {
      setEditingReport(initialEditingReport);
      onClearInitialEditingReport?.();
    }
  }, [initialEditingReport]);

  const findLinkedOrder = (rep) => {
    if (!rep) return null;
    return (orders || []).find(
      (o) =>
        (rep.inspecaoId && o.supabaseId === rep.inspecaoId) ||
        (rep.inspecaoCodigo && o.id === rep.inspecaoCodigo)
    ) || null;
  };

  const findExistingReportForOrder = (ord) => {
    if (!ord) return null;
    return (reports || []).find(
      (r) =>
        (ord.supabaseId && r.inspecaoId === ord.supabaseId) ||
        r.inspecaoCodigo === ord.id
    ) || null;
  };

  const filteredReports = (reports || []).filter((r) => {
    const q = searchTerm.toLowerCase();
    return (
      !q ||
      r.codigoRelatorio?.toLowerCase().includes(q) ||
      r.unidade?.toLowerCase().includes(q) ||
      r.clienteNome?.toLowerCase().includes(q) ||
      r.cidade?.toLowerCase().includes(q)
    );
  });

  const finalizedCount = (reports || []).filter((r) => r.status === 'finalizado').length;
  const avgConformity =
    reports?.length > 0
      ? (reports.reduce((acc, r) => acc + (Number(r.indiceConformidade) || 0), 0) / reports.length).toFixed(1)
      : '0.0';
  const totalDesvios = (reports || []).reduce((acc, r) => acc + (r.desvios?.length || 0), 0);

  const handleNewBlank = () => {
    const blank = createBlankReport({ userProfile, hospitals });
    setEditingReport(blank);
  };

  const handleCreateFromOrder = (order) => {
    const existing = findExistingReportForOrder(order);
    const built = existing
      ? ReportService.syncFromOrder(existing, order, userProfile)
      : ReportService.buildFromOrder(order, userProfile);
    setShowImportPicker(false);
    setEditingReport(built);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F4F4F5] tracking-tight">
            Relatórios Técnicos de Inspeção Ambiental
          </h2>
          <p className="text-xs text-[#71717A] mt-0.5">
            Capa, Resultados Consolidados (8 métricas), Tabela de Desvios, 56 Registros Fotográficos, Aderência e Conclusão
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {orders?.length > 0 && (
            <button
              type="button"
              onClick={() => setShowImportPicker(!showImportPicker)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#141518] hover:bg-[#1C1D22] text-[#E4E4E7] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
            >
              <ClipboardCheck className="w-4 h-4 text-[#34D399]" />
              Gerar de um Checklist
            </button>
          )}
          <button
            type="button"
            onClick={handleNewBlank}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            Novo Relatório
          </button>
        </div>
      </div>

      {/* Seletor rápido para importar de um Checklist existente */}
      {showImportPicker && (
        <div className="bg-[#141518] border border-[#2EB88A]/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#F4F4F5]">
                Selecione uma Inspeção/Checklist para preencher automaticamente o Relatório
              </h3>
              <p className="text-[11px] text-[#71717A]">
                O Kivo calcula Itens Avaliados, Conformidades, Índice %, Desvios e Conclusão automaticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowImportPicker(false)}
              className="text-xs text-[#71717A] hover:text-[#F4F4F5]"
            >
              Fechar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {orders.map((ord) => {
              const existingRep = findExistingReportForOrder(ord);
              return (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => handleCreateFromOrder(ord)}
                  className="text-left bg-[#0D0E10] hover:bg-[#1A1B20] border border-[#232429] hover:border-[#2EB88A]/50 rounded-lg p-3 transition space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-[#34D399]">{ord.id}</span>
                    {existingRep ? (
                      <span className="text-[10px] text-[#34D399] bg-[#122620] px-1.5 py-0.5 rounded border border-[#2EB88A]/30">
                        Sincronizar existente
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#71717A]">{ord.scheduledDate}</span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[#F4F4F5] truncate">{ord.hospitalName}</p>
                  <p className="text-[11px] text-[#71717A] truncate">{ord.clientName || 'Cliente'} • {ord.municipio}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Relatórios Criados</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{reports?.length || 0}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Finalizados</span>
          <span className="text-2xl font-bold font-mono text-[#34D399] mt-1 block">{finalizedCount}</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Média de Conformidade</span>
          <span className="text-2xl font-bold font-mono text-[#F4F4F5] mt-1 block">{avgConformity}%</span>
        </div>
        <div className="bg-[#141518] border border-[#232429] p-4 rounded-xl">
          <span className="text-[#71717A] block">Desvios Mapeados</span>
          <span className="text-2xl font-bold font-mono text-[#FB7185] mt-1 block">{totalDesvios}</span>
        </div>
      </div>

      {/* Busca */}
      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-[#71717A] shrink-0" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar relatório por código, cliente, unidade ou cidade..."
          className="w-full bg-transparent text-xs text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
        />
      </div>

      {/* Lista de Relatórios */}
      {filteredReports.length === 0 ? (
        <div className="bg-[#141518] border border-[#232429] rounded-xl p-12 text-center space-y-3">
          <FileBarChart2 className="w-10 h-10 text-[#71717A] mx-auto" />
          <h3 className="text-sm font-semibold text-[#F4F4F5]">Nenhum relatório criado ainda</h3>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            Crie um relatório em branco ou gere automaticamente a partir de um checklist existente com todas as seções fotográficas e cálculo de aderência.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleNewBlank}
              className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg text-xs font-semibold transition"
            >
              + Novo Relatório
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map((rep) => {
            const aderencia = rep.nivelAderencia || calculateAdherenceLevel(rep.indiceConformidade);
            const photosCount = (rep.registrosFotograficos || []).filter((f) => Boolean(f.fotoUrl)).length;
            const linkedOrder = findLinkedOrder(rep);
            const linkedCode = linkedOrder?.id || rep.inspecaoCodigo;

            return (
              <div
                key={rep.codigoRelatorio}
                className="bg-[#141518] border border-[#232429] hover:border-[#2D2F36] rounded-xl p-5 space-y-4 flex flex-col justify-between transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-semibold text-[#34D399] bg-[#0D0E10] px-2.5 py-0.5 rounded border border-[#232429]">
                        {rep.codigoRelatorio}
                      </span>
                      <Badge variant={rep.status === 'finalizado' ? 'success' : 'warning'} size="sm">
                        {rep.status === 'finalizado' ? 'Finalizado' : 'Rascunho'}
                      </Badge>
                      {linkedCode && (
                        <button
                          type="button"
                          onClick={() => onOpenOrderByCode?.(linkedOrder?.id || linkedCode)}
                          title="Abrir Checklist vinculado"
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-[#34D399] bg-[#122620] hover:bg-[#17322A] px-2 py-0.5 rounded border border-[#2EB88A]/30 transition"
                        >
                          <Link2 className="w-2.5 h-2.5" />
                          {linkedCode}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[#71717A] flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {rep.dataHora ? new Date(rep.dataHora).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#F4F4F5] text-sm leading-snug">
                      {rep.unidade || 'Unidade sem nome'}
                    </h3>
                    <p className="text-xs text-[#71717A] flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      {rep.clienteNome || 'Cliente'} • {rep.cidade || 'Cidade não informada'}
                    </p>
                  </div>

                  {/* Mini métricas do relatório */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Conformidade</span>
                      <span className="font-mono font-bold text-[#34D399]">
                        {Number(rep.indiceConformidade || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Desvios</span>
                      <span className="font-mono font-bold text-[#FB7185] flex items-center justify-center gap-1">
                        <AlertOctagon className="w-3 h-3" />
                        {rep.desvios?.length || 0}
                      </span>
                    </div>
                    <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2">
                      <span className="text-[10px] text-[#71717A] block">Fotos</span>
                      <span className="font-mono font-bold text-[#E4E4E7] flex items-center justify-center gap-1">
                        <Camera className="w-3 h-3 text-[#71717A]" />
                        {photosCount}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] pt-1">
                    <span>Aderência: <strong className="text-[#F4F4F5]">{aderencia}</strong></span>
                    <span>Maturidade: <strong className="text-[#F4F4F5]">{rep.nivelMaturidade || 'Em Desenvolvimento'}</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1F2024] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingReport(rep)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg text-xs font-medium transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#34D399]" />
                    Abrir / Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintingReport(rep)}
                    className="px-3 py-2 bg-[#1C1D22] hover:bg-[#25272E] text-[#A1A1AA] hover:text-[#F4F4F5] border border-[#2D2F36] rounded-lg text-xs transition"
                    title="Imprimir / Exportar PDF"
                  >
                    <Printer className="w-4 h-4 text-[#34D399]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Deseja excluir o relatório ${rep.codigoRelatorio}?`)) {
                        onDeleteReport(rep);
                      }
                    }}
                    className="px-3 py-2 bg-[#1C1D22] hover:bg-[#221216] text-[#71717A] hover:text-[#FB7185] border border-[#2D2F36] rounded-lg text-xs transition"
                    title="Excluir relatório"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingReport && (
        <ReportEditorModal
          report={editingReport}
          isOpen={Boolean(editingReport)}
          linkedOrder={findLinkedOrder(editingReport)}
          userProfile={userProfile}
          onClose={() => setEditingReport(null)}
          onSaveReport={async (saved) => {
            await onSaveReport(saved);
          }}
        />
      )}

      {printingReport && (
        <ReportPrintView report={printingReport} onClose={() => setPrintingReport(null)} />
      )}
    </div>
  );
}
