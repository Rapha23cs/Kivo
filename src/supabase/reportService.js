// Serviço de Relatórios Técnicos de Inspeção Ambiental (Supabase + Cache Local)
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';
import {
  REPORT_PHOTO_SLOTS,
  CHECKLIST_TO_REPORT_PHOTO_SLOT,
  mapTopicToPhotoSection,
  calculateAdherenceLevel,
  calculateConformityIndex,
  suggestMaturityLevel,
  summarizeDeviationsByClass,
  buildDefaultConclusionText,
  createBlankReport
} from '../data/reportTemplateData';
import { calculateInspectionSummary } from '../data/emserhChecklistData';
import { compressImageToDataUrl, uploadDataUrlToStorage, isUuid } from './dataService';
import { OfflineStore, safeLocalStorageGet, safeLocalStorageSet } from '../offline/offlineStore';

const LS_REPORTS_KEY = 'kivo_environmental_reports';
const LS_ACTIVE_UID_KEY = 'kivo_active_supabase_uid';

let reportsMemoryCache = null;

function getStoredReports() {
  if (Array.isArray(reportsMemoryCache)) return reportsMemoryCache;
  const stored = safeLocalStorageGet(LS_REPORTS_KEY, []);
  reportsMemoryCache = stored;
  return stored;
}

function saveStoredReports(list) {
  reportsMemoryCache = list;
  safeLocalStorageSet(LS_REPORTS_KEY, JSON.stringify(list));
  OfflineStore.saveCache('reports', list);
}

function mapClassificationFromChecklist(item) {
  const c = item?.classification;
  if (c === 'Crítico' || c === 'Grave') return 'Não Conformidade Ambiental';
  return 'Desvio Pontual';
}

function buildChecklistDerivedPayload(order) {
  const summary = calculateInspectionSummary(order?.checklist || []);
  const checklist = order?.checklist || [];

  const desvios = summary.desvios.map((item, idx) => {
    const classificacao = mapClassificationFromChecklist(item);
    const num = item.number || idx + 1;
    return {
      numero: idx + 1,
      checklistItemNumber: num,
      descricao: `Item #${num} (${item.topic || 'Geral'}): ${item.observation || item.question}`,
      classificacao,
      severidadeNc: item.classification === 'Crítico' ? 'Maior' : item.classification === 'Grave' ? 'Menor' : '',
      tratativa:
        classificacao === 'Não Conformidade Ambiental'
          ? 'Registro e Tratativa de Não Conformidade Ambiental'
          : 'Plano de Ação Corretiva',
      responsavel: item.responsible || 'Responsável da Unidade',
      prazo: item.deadline || '',
      status: 'Em Aberto'
    };
  });

  const classCounts = summarizeDeviationsByClass(desvios);
  const indiceConformidade = calculateConformityIndex(summary.totalSim, summary.totalAvaliados);
  const nivelAderencia = calculateAdherenceLevel(indiceConformidade);
  const nivelMaturidade = suggestMaturityLevel(desvios);

  const positivosTopics = Array.from(
    new Set(
      checklist
        .filter((i) => i.status === 'sim' || i.status === 'conforme')
        .map((i) => i.topic)
        .filter(Boolean)
    )
  ).slice(0, 4);

  const desviosTopics = Array.from(
    new Set(summary.desvios.map((i) => i.topic).filter(Boolean))
  );

  const pontosPositivos = positivosTopics.length > 0
    ? `os controles conformes verificados em ${positivosTopics.join(', ')}`
    : '';

  const sinteseDesvios = desviosTopics.length > 0
    ? desviosTopics.join(', ')
    : '';

  // Mapear evidências do checklist usando o mapa exato Item -> Slot (1..56) e enviando os demais para extras
  const slotMatchByOrder = new Map();
  const extraChecklistPhotos = [];

  checklist.forEach((ci) => {
    if (!ci?.evidenceUrl) return;
    const itemNum = Number(ci.number);
    const targetSlotOrder = CHECKLIST_TO_REPORT_PHOTO_SLOT[itemNum];
    if (targetSlotOrder && !slotMatchByOrder.has(targetSlotOrder)) {
      slotMatchByOrder.set(targetSlotOrder, ci);
    } else {
      extraChecklistPhotos.push({
        checklistItemNumber: itemNum,
        secao: mapTopicToPhotoSection(ci.topic),
        legenda: `Item #${itemNum || 'Extra'} — ${ci.question || ci.topic || 'Registro do Checklist'}`,
        fotoUrl: ci.evidenceUrl,
        observacao: ci.observation || '',
        incluirNoRelatorio: true
      });
    }
  });

  return {
    summary,
    desvios,
    classCounts,
    indiceConformidade,
    nivelAderencia,
    nivelMaturidade,
    pontosPositivos,
    sinteseDesvios,
    slotMatchByOrder,
    extraChecklistPhotos
  };
}

export const ReportService = {
  getReports() {
    return getStoredReports();
  },

  clearLocalCache() {
    reportsMemoryCache = null;
    localStorage.removeItem(LS_REPORTS_KEY);
  },

  buildFromOrder(order, userProfile) {
    const derived = buildChecklistDerivedPayload(order);

    const baseSlots = REPORT_PHOTO_SLOTS.map((slot) => {
      const matched = derived.slotMatchByOrder.get(slot.ordem);
      return {
        ...slot,
        fotoUrl: matched?.evidenceUrl || '',
        observacao: matched?.observation || '',
        incluirNoRelatorio: true
      };
    });

    const extraSlots = derived.extraChecklistPhotos.map((extra, idx) => ({
      ...extra,
      ordem: REPORT_PHOTO_SLOTS.length + idx + 1
    }));

    const base = createBlankReport({ userProfile });
    const year = new Date().getFullYear();
    const cleanOrderId = String(order.id || 'OS').replace(/[^A-Za-z0-9-]/g, '');

    return {
      ...base,
      codigoRelatorio: `REL-${cleanOrderId}-${year}-${String(Date.now()).slice(-3)}`,
      clienteNome: order.clientName || 'Cliente',
      unidade: order.hospitalName || '',
      dataHora: `${order.scheduledDate || new Date().toISOString().split('T')[0]}T09:00`,
      cidade: order.municipio || '',
      regional: order.regional || '',
      tipoInspecao: order.inspectionType || 'Programada',
      responsavel: order.technicianName || userProfile?.name || 'Auditor Técnico',
      unidadeId: order.unidadeId || null,
      inspecaoId: order.supabaseId || null,
      inspecaoCodigo: order.id || '',
      itensAvaliados: derived.summary.totalAvaliados,
      conformidades: derived.summary.totalSim,
      ...derived.classCounts,
      indiceConformidade: derived.indiceConformidade,
      desvios: derived.desvios,
      registrosFotograficos: [...baseSlots, ...extraSlots],
      nivelAderencia: derived.nivelAderencia,
      nivelMaturidade: derived.nivelMaturidade,
      pontosPositivos: derived.pontosPositivos,
      sinteseDesvios: derived.sinteseDesvios,
      conclusaoTexto: buildDefaultConclusionText({
        indiceConformidade: derived.indiceConformidade,
        nivelAderencia: derived.nivelAderencia,
        nivelMaturidade: derived.nivelMaturidade,
        pontosPositivos: derived.pontosPositivos,
        sinteseDesvios: derived.sinteseDesvios
      })
    };
  },

  syncFromOrder(existingReport, order, userProfile) {
    if (!existingReport || !order) return existingReport;
    const derived = buildChecklistDerivedPayload(order);

    // Preservar status/tratativa de desvios já editados no relatório (pelo prefixo "Item #N ") e desvios manuais
    const prevByPrefix = new Map();
    const manualDeviations = [];
    (existingReport.desvios || []).forEach((d) => {
      const m = String(d.descricao || '').match(/^Item #(\d+)\b/);
      if (m) {
        prevByPrefix.set(Number(m[1]), d);
      } else if (d.descricao?.trim()) {
        manualDeviations.push(d);
      }
    });

    const syncedChecklistDeviations = derived.desvios.map((d) => {
      const prev = prevByPrefix.get(d.checklistItemNumber);
      if (!prev) return d;
      return {
        ...d,
        status: prev.status || d.status,
        tratativa: prev.tratativa || d.tratativa,
        responsavel: d.responsavel || prev.responsavel,
        prazo: d.prazo || prev.prazo
      };
    });

    const mergedDesvios = [...syncedChecklistDeviations, ...manualDeviations].map((d, idx) => ({
      ...d,
      numero: idx + 1
    }));

    const mergedCounts = summarizeDeviationsByClass(mergedDesvios);
    const mergedMaturity = suggestMaturityLevel(mergedDesvios);

    // Mesclar fotos: atualiza slots com foto do checklist sem apagar fotos já enviadas diretamente no relatório
    const currentPhotos = existingReport.registrosFotograficos || [];
    const currentByOrder = new Map(currentPhotos.map((p) => [p.ordem, p]));

    const updatedBaseSlots = REPORT_PHOTO_SLOTS.map((slot) => {
      const existingSlot = currentByOrder.get(slot.ordem) || { ...slot, fotoUrl: '', observacao: '', incluirNoRelatorio: true };
      const matched = derived.slotMatchByOrder.get(slot.ordem);
      if (!matched) return existingSlot;
      return {
        ...existingSlot,
        fotoUrl: matched.evidenceUrl || existingSlot.fotoUrl,
        observacao: matched.observation || existingSlot.observacao,
        incluirNoRelatorio: existingSlot.incluirNoRelatorio ?? true
      };
    });

    const existingExtras = currentPhotos.filter((p) => p.ordem > REPORT_PHOTO_SLOTS.length);
    const existingExtraUrls = new Set(existingExtras.map((e) => e.fotoUrl).filter(Boolean));
    let nextExtraOrder = Math.max(REPORT_PHOTO_SLOTS.length, ...existingExtras.map((e) => e.ordem));
    const newExtras = derived.extraChecklistPhotos
      .filter((ex) => ex.fotoUrl && !existingExtraUrls.has(ex.fotoUrl))
      .map((ex) => {
        nextExtraOrder += 1;
        return { ...ex, ordem: nextExtraOrder };
      });

    const isAutoConclusion =
      !existingReport.conclusaoTexto?.trim() ||
      existingReport.conclusaoTexto.startsWith('Com base na inspeção ambiental realizada,');

    return {
      ...existingReport,
      clienteNome: order.clientName || existingReport.clienteNome,
      unidade: order.hospitalName || existingReport.unidade,
      cidade: order.municipio || existingReport.cidade,
      regional: order.regional || existingReport.regional,
      tipoInspecao: order.inspectionType || existingReport.tipoInspecao,
      responsavel: order.technicianName || existingReport.responsavel || userProfile?.name || 'Auditor Técnico',
      unidadeId: order.unidadeId || existingReport.unidadeId || null,
      inspecaoId: order.supabaseId || existingReport.inspecaoId || null,
      inspecaoCodigo: order.id || existingReport.inspecaoCodigo || '',
      itensAvaliados: derived.summary.totalAvaliados,
      conformidades: derived.summary.totalSim,
      ...mergedCounts,
      indiceConformidade: derived.indiceConformidade,
      nivelAderencia: derived.nivelAderencia,
      nivelMaturidade: mergedMaturity,
      desvios: mergedDesvios,
      registrosFotograficos: [...updatedBaseSlots, ...existingExtras, ...newExtras],
      pontosPositivos: derived.pontosPositivos || existingReport.pontosPositivos,
      sinteseDesvios: derived.sinteseDesvios || existingReport.sinteseDesvios,
      conclusaoTexto: isAutoConclusion
        ? buildDefaultConclusionText({
            indiceConformidade: derived.indiceConformidade,
            nivelAderencia: derived.nivelAderencia,
            nivelMaturidade: mergedMaturity,
            pontosPositivos: derived.pontosPositivos || existingReport.pontosPositivos,
            sinteseDesvios: derived.sinteseDesvios || existingReport.sinteseDesvios
          })
        : existingReport.conclusaoTexto
    };
  },

  async uploadImage(file, codigoRelatorio, prefix = 'foto', stampText = '') {
    const compressedDataUrl = await compressImageToDataUrl(file, 1280, 0.78, stampText);
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return compressedDataUrl;
    }

    const uploaded = await uploadDataUrlToStorage(
      compressedDataUrl,
      `${codigoRelatorio}/${prefix}-${Date.now()}.jpg`
    );
    return uploaded || compressedDataUrl;
  },

  async syncReportWithMedia(report) {
    let resolvedReport = report;

    if (navigator.onLine !== false && isSupabaseConfigured()) {
      let fachadaUrl = report.fachadaUrl;
      let changed = false;

      if (fachadaUrl && String(fachadaUrl).startsWith('data:image/')) {
        const upFacade = await uploadDataUrlToStorage(
          fachadaUrl,
          `${report.codigoRelatorio}/fachada-${Date.now()}.jpg`
        );
        if (upFacade) {
          fachadaUrl = upFacade;
          changed = true;
        }
      }

      const nextPhotos = await Promise.all(
        (report.registrosFotograficos || []).map(async (slot) => {
          if (!slot?.fotoUrl || !String(slot.fotoUrl).startsWith('data:image/')) {
            return slot;
          }
          const upSlot = await uploadDataUrlToStorage(
            slot.fotoUrl,
            `${report.codigoRelatorio}/item-${slot.ordem}-${Date.now()}.jpg`
          );
          if (upSlot) {
            changed = true;
            return { ...slot, fotoUrl: upSlot };
          }
          return slot;
        })
      );

      if (changed) {
        resolvedReport = {
          ...report,
          fachadaUrl,
          registrosFotograficos: nextPhotos
        };
      }
    }

    const synced = await this.syncReportToSupabase(resolvedReport);
    return { synced, resolvedReport };
  },

  async hydrateFromIndexedDb() {
    const idbReports = await OfflineStore.loadCache('reports', null);
    if (Array.isArray(idbReports) && (!reportsMemoryCache || idbReports.length >= reportsMemoryCache.length)) {
      reportsMemoryCache = idbReports;
      safeLocalStorageSet(LS_REPORTS_KEY, JSON.stringify(idbReports));
    }
    return this.getReports();
  },

  saveDraftLocal(report) {
    const updated = {
      ...report,
      updatedAt: new Date().toISOString()
    };

    const current = getStoredReports();
    const idx = current.findIndex((r) => r.id === updated.id || r.codigoRelatorio === updated.codigoRelatorio);
    let nextList;
    if (idx >= 0) {
      nextList = [...current];
      nextList[idx] = { ...nextList[idx], ...updated };
    } else {
      nextList = [updated, ...current];
    }
    saveStoredReports(nextList);
    OfflineStore.enqueueReportUpsert(updated.codigoRelatorio);
    return { updated, nextList };
  },

  async saveReport(report) {
    const { updated, nextList: localList } = this.saveDraftLocal(report);
    let nextList = localList;

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { synced, resolvedReport } = await this.syncReportWithMedia(updated);
        if (synced?.id) {
          nextList = nextList.map((r) =>
            r.codigoRelatorio === updated.codigoRelatorio
              ? {
                  ...r,
                  ...resolvedReport,
                  id: synced.id,
                  supabaseId: synced.id,
                  inspecaoId: synced.inspecao_id ?? r.inspecaoId
                }
              : r
          );
          saveStoredReports(nextList);
          await OfflineStore.dequeueReportUpsert(updated.codigoRelatorio);
        }
      } catch (err) {
        console.warn('Relatório salvo offline; aguardando sincronização:', err.message);
      }
    }

    return nextList;
  },

  async flushPendingReport(codigoRelatorio) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const list = getStoredReports();
    const report = list.find((r) => r.codigoRelatorio === codigoRelatorio);
    if (!report) {
      await OfflineStore.dequeueReportUpsert(codigoRelatorio);
      return true;
    }

    const { synced, resolvedReport } = await this.syncReportWithMedia(report);
    if (!synced?.id) return false;

    const nextList = getStoredReports().map((r) =>
      r.codigoRelatorio === codigoRelatorio
        ? {
            ...r,
            ...resolvedReport,
            id: synced.id,
            supabaseId: synced.id,
            inspecaoId: synced.inspecao_id ?? r.inspecaoId
          }
        : r
    );
    saveStoredReports(nextList);
    await OfflineStore.dequeueReportUpsert(codigoRelatorio);
    return true;
  },

  async flushPendingReportDelete(codigoRelatorio) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;

    const { error } = await client
      .from('relatorios_inspecao')
      .delete()
      .eq('codigo_relatorio', codigoRelatorio);
    if (error) return false;
    await OfflineStore.dequeueReportDelete(codigoRelatorio);
    return true;
  },

  async deleteReport(report) {
    const nextList = getStoredReports().filter(
      (r) => r.id !== report.id && r.codigoRelatorio !== report.codigoRelatorio
    );
    saveStoredReports(nextList);
    await OfflineStore.enqueueReportDelete(report.codigoRelatorio);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client
            .from('relatorios_inspecao')
            .delete()
            .eq('codigo_relatorio', report.codigoRelatorio);
          if (!error) {
            await OfflineStore.dequeueReportDelete(report.codigoRelatorio);
          }
        }
      } catch (err) {
        console.warn('Exclusão de relatório aguardando conexão:', err.message);
      }
    }

    return nextList;
  },

  async loadFromSupabase() {
    if (!isSupabaseConfigured() || navigator.onLine === false) return getStoredReports();
    const { client } = getSupabaseClient();
    if (!client) return getStoredReports();

    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return getStoredReports();

    const activeUid = localStorage.getItem(LS_ACTIVE_UID_KEY);
    if (activeUid && activeUid !== userData.user.id) {
      reportsMemoryCache = null;
      this.clearLocalCache();
    }

    let { data, error } = await client
      .from('relatorios_inspecao')
      .select(`
        *,
        inspecoes ( codigo_kivo ),
        relatorio_desvios (*),
        relatorio_registros_fotograficos (*)
      `)
      .order('data_hora', { ascending: false });

    if (error && error.message?.includes('inspecoes')) {
      const retry = await client
        .from('relatorios_inspecao')
        .select(`
          *,
          relatorio_desvios (*),
          relatorio_registros_fotograficos (*)
        `)
        .order('data_hora', { ascending: false });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') {
        // Migration 003 ainda não executada no SQL Editor
        return getStoredReports();
      }
      throw new Error(`Erro ao carregar relatórios: ${error.message}`);
    }

    const mapped = (data || []).map((row) => {
      const savedPhotos = row.relatorio_registros_fotograficos || [];
      const photoByOrder = new Map(savedPhotos.map((p) => [p.ordem, p]));

      const baseSlots = REPORT_PHOTO_SLOTS.map((slot) => {
        const found = photoByOrder.get(slot.ordem);
        return {
          ordem: slot.ordem,
          secao: found?.secao || slot.secao,
          legenda: found?.legenda || slot.legenda,
          fotoUrl: found?.foto_url || '',
          observacao: found?.observacao || '',
          incluirNoRelatorio: found?.incluir_no_relatorio ?? true
        };
      });

      const extras = savedPhotos
        .filter((p) => p.ordem > REPORT_PHOTO_SLOTS.length)
        .sort((a, b) => a.ordem - b.ordem)
        .map((p) => ({
          ordem: p.ordem,
          secao: p.secao,
          legenda: p.legenda,
          fotoUrl: p.foto_url || '',
          observacao: p.observacao || '',
          incluirNoRelatorio: p.incluir_no_relatorio ?? true
        }));

      return {
        id: row.id,
        supabaseId: row.id,
        codigoRelatorio: row.codigo_relatorio,
        clienteNome: row.cliente_nome || '',
        unidade: row.unidade,
        dataHora: row.data_hora ? row.data_hora.slice(0, 16) : '',
        cidade: row.cidade || '',
        regional: row.regional || '',
        tipoInspecao: row.tipo_inspecao || 'Programada',
        objetivo: row.objetivo || '',
        responsavel: row.responsavel,
        gerencia: row.gerencia || '',
        fachadaUrl: row.fachada_url || '',
        itensAvaliados: row.itens_avaliados ?? 0,
        conformidades: row.conformidades ?? 0,
        desviosPlanoAcao: row.desvios_plano_acao ?? 0,
        naoConformidades: row.nao_conformidades ?? 0,
        ocorrenciasAmbientais: row.ocorrencias_ambientais ?? 0,
        notificacoes: row.notificacoes ?? 0,
        interdicoes: row.interdicoes ?? 0,
        indiceConformidade: Number(row.indice_conformidade ?? 0),
        nivelAderencia: row.nivel_aderencia || calculateAdherenceLevel(row.indice_conformidade),
        nivelMaturidade: row.nivel_maturidade || 'Em Desenvolvimento',
        pontosPositivos: row.pontos_positivos || '',
        sinteseDesvios: row.sintese_desvios || '',
        conclusaoTexto: row.conclusao_texto || '',
        status: row.status || 'rascunho',
        unidadeId: row.unidade_id || null,
        inspecaoId: row.inspecao_id || null,
        inspecaoCodigo: row.inspecoes?.codigo_kivo || '',
        desvios: (row.relatorio_desvios || [])
          .sort((a, b) => a.numero - b.numero)
          .map((d) => ({
            numero: d.numero,
            descricao: d.descricao,
            classificacao: d.classificacao,
            severidadeNc: d.severidade_nc || '',
            tratativa: d.tratativa || '',
            responsavel: d.responsavel || '',
            prazo: d.prazo || '',
            status: d.status || 'Em Aberto'
          })),
        registrosFotograficos: [...baseSlots, ...extras],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    // Preservar relatórios alterados/excluídos offline até o envio ser concluído
    const pending = OfflineStore.getPendingIndex();
    const deletedSet = new Set(pending.deleteReports);
    const dirtySet = new Set(pending.upsertReports);
    const localReports = getStoredReports();
    const localByCode = new Map(localReports.map((r) => [r.codigoRelatorio, r]));

    const mergedRemote = mapped
      .filter((remoteRep) => !deletedSet.has(remoteRep.codigoRelatorio))
      .map((remoteRep) =>
        dirtySet.has(remoteRep.codigoRelatorio) && localByCode.has(remoteRep.codigoRelatorio)
          ? localByCode.get(remoteRep.codigoRelatorio)
          : remoteRep
      );

    const seenCodes = new Set(mergedRemote.map((r) => r.codigoRelatorio));
    const localOnlyPending = localReports.filter(
      (r) => dirtySet.has(r.codigoRelatorio) && !seenCodes.has(r.codigoRelatorio)
    );
    const finalReports = [...localOnlyPending, ...mergedRemote];

    saveStoredReports(finalReports);
    return finalReports;
  },

  async syncReportToSupabase(report) {
    if (!isSupabaseConfigured()) return null;
    const { client } = getSupabaseClient();
    if (!client) return null;

    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    let clienteId = null;
    if (report.clienteNome) {
      try {
        const { data: cRow } = await client
          .from('clientes')
          .upsert({ user_id: user.id, nome: report.clienteNome }, { onConflict: 'user_id,nome' })
          .select('id')
          .single();
        clienteId = cRow?.id || null;
      } catch {
        // segue mesmo sem tabela clientes
      }
    }

    let inspecaoId = report.inspecaoId || null;
    if (!inspecaoId && report.inspecaoCodigo) {
      try {
        const { data: inspRow } = await client
          .from('inspecoes')
          .select('id')
          .eq('codigo_kivo', report.inspecaoCodigo)
          .maybeSingle();
        inspecaoId = inspRow?.id || null;
      } catch {
        // segue caso não localize ainda
      }
    }

    const headerPayload = {
      user_id: user.id,
      cliente_id: clienteId,
      inspecao_id: inspecaoId,
      ...(isUuid(report.unidadeId) ? { unidade_id: report.unidadeId } : {}),
      codigo_relatorio: report.codigoRelatorio,
      cliente_nome: report.clienteNome || null,
      unidade: report.unidade || 'Unidade Atendida',
      data_hora: report.dataHora ? new Date(report.dataHora).toISOString() : new Date().toISOString(),
      cidade: report.cidade || null,
      regional: report.regional || null,
      tipo_inspecao: report.tipoInspecao || 'Programada',
      objetivo: report.objetivo || null,
      responsavel: report.responsavel || 'Auditor Técnico',
      gerencia: report.gerencia || null,
      fachada_url: report.fachadaUrl || null,
      itens_avaliados: Number(report.itensAvaliados) || 0,
      conformidades: Number(report.conformidades) || 0,
      desvios_plano_acao: Number(report.desviosPlanoAcao) || 0,
      nao_conformidades: Number(report.naoConformidades) || 0,
      ocorrencias_ambientais: Number(report.ocorrenciasAmbientais) || 0,
      notificacoes: Number(report.notificacoes) || 0,
      interdicoes: Number(report.interdicoes) || 0,
      indice_conformidade: Number(report.indiceConformidade) || 0,
      nivel_aderencia: report.nivelAderencia || calculateAdherenceLevel(report.indiceConformidade),
      nivel_maturidade: report.nivelMaturidade || 'Em Desenvolvimento',
      pontos_positivos: report.pontosPositivos || null,
      sintese_desvios: report.sinteseDesvios || null,
      conclusao_texto: report.conclusaoTexto || null,
      status: report.status === 'finalizado' ? 'finalizado' : 'rascunho'
    };

    let { data: savedHeader, error: headerError } = await client
      .from('relatorios_inspecao')
      .upsert(headerPayload, { onConflict: 'codigo_relatorio' })
      .select('id')
      .single();

    if (headerError && (headerError.code === 'PGRST204' || headerError.message?.includes('unidade_id'))) {
      const { unidade_id: _ignored, ...fallbackHeader } = headerPayload;
      const retry = await client
        .from('relatorios_inspecao')
        .upsert(fallbackHeader, { onConflict: 'codigo_relatorio' })
        .select('id')
        .single();
      savedHeader = retry.data;
      headerError = retry.error;
    }

    if (headerError) {
      throw new Error(headerError.message);
    }

    const relatorioId = savedHeader.id;

    // Substituir desvios da tabela do relatório
    await client.from('relatorio_desvios').delete().eq('relatorio_id', relatorioId);
    const desvios = (report.desvios || []).filter((d) => d.descricao?.trim());
    if (desvios.length > 0) {
      const { error: desvErr } = await client.from('relatorio_desvios').insert(
        desvios.map((d, idx) => ({
          relatorio_id: relatorioId,
          numero: idx + 1,
          descricao: d.descricao.trim(),
          classificacao: d.classificacao || 'Desvio Pontual',
          severidade_nc: d.classificacao === 'Não Conformidade Ambiental' ? (d.severidadeNc || 'Menor') : null,
          tratativa: d.tratativa || null,
          responsavel: d.responsavel || null,
          prazo: d.prazo || null,
          status: d.status || 'Em Aberto'
        }))
      );
      if (desvErr) throw new Error(desvErr.message);
    }

    // Salvar registros fotográficos preenchidos ou customizados
    await client.from('relatorio_registros_fotograficos').delete().eq('relatorio_id', relatorioId);
    const photosToPersist = (report.registrosFotograficos || []).filter(
      (f) => f.fotoUrl || f.observacao?.trim() || f.ordem > REPORT_PHOTO_SLOTS.length
    );
    if (photosToPersist.length > 0) {
      const { error: fotoErr } = await client.from('relatorio_registros_fotograficos').insert(
        photosToPersist.map((f) => ({
          relatorio_id: relatorioId,
          ordem: f.ordem,
          secao: f.secao,
          legenda: f.legenda,
          foto_url: f.fotoUrl || null,
          observacao: f.observacao || null,
          incluir_no_relatorio: f.incluirNoRelatorio !== false
        }))
      );
      if (fotoErr) throw new Error(fotoErr.message);
    }

    return { ...savedHeader, inspecao_id: inspecaoId };
  }
};
