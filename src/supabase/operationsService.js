// Serviço de Operações Complementares (Templates de Checklist, Agenda Recorrente e Inventário SST)
// 100% integrado à fila OfflineStore para sincronização garantida quando o sinal voltar.
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';
import { isUuid } from './dataService';
import { OfflineStore, safeLocalStorageGet, safeLocalStorageSet } from '../offline/offlineStore';

const LS_TEMPLATES_KEY = 'kivo_checklist_templates';
const LS_SCHEDULES_KEY = 'kivo_vistorias_agenda';
const LS_SST_ITEMS_KEY = 'kivo_sst_vencimentos';

export const AGENDA_PERIODICITIES = [
  'Única',
  'Semanal',
  'Quinzenal',
  'Mensal',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual'
];

export function computeNextScheduleDate(baseDateStr, periodicity) {
  const base = baseDateStr ? new Date(`${baseDateStr}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().split('T')[0];

  switch (periodicity) {
    case 'Semanal':
      base.setDate(base.getDate() + 7);
      break;
    case 'Quinzenal':
      base.setDate(base.getDate() + 15);
      break;
    case 'Mensal':
      base.setMonth(base.getMonth() + 1);
      break;
    case 'Bimestral':
      base.setMonth(base.getMonth() + 2);
      break;
    case 'Trimestral':
      base.setMonth(base.getMonth() + 3);
      break;
    case 'Semestral':
      base.setMonth(base.getMonth() + 6);
      break;
    case 'Anual':
      base.setFullYear(base.getFullYear() + 1);
      break;
    default:
      break;
  }
  return base.toISOString().split('T')[0];
}

export function getExpiryStatus(dateStr) {
  if (!dateStr) {
    return { status: 'indefinido', daysRemaining: null, label: 'Sem data', variant: 'neutral' };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { status: 'indefinido', daysRemaining: null, label: 'Data inválida', variant: 'neutral' };
  }
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { status: 'vencido', daysRemaining: diffDays, label: `Vencido há ${Math.abs(diffDays)}d`, variant: 'danger' };
  }
  if (diffDays === 0) {
    return { status: 'vence_hoje', daysRemaining: 0, label: 'Vence hoje', variant: 'danger' };
  }
  if (diffDays <= 30) {
    return { status: 'alerta_30', daysRemaining: diffDays, label: `Vence em ${diffDays}d`, variant: 'warning' };
  }
  if (diffDays <= 60) {
    return { status: 'alerta_60', daysRemaining: diffDays, label: `Vence em ${diffDays}d`, variant: 'warning' };
  }
  return { status: 'em_dia', daysRemaining: diffDays, label: `Em dia (${diffDays}d)`, variant: 'success' };
}

function isMissingRelation(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205';
}

function mergePendingRemoteList(remoteMapped, localList, dirtyIds, deletedIds, sortFn) {
  const delSet = new Set(deletedIds || []);
  const dirtySet = new Set(dirtyIds || []);
  const localById = new Map(localList.map((item) => [item.id, item]));

  const mergedRemote = remoteMapped
    .filter((item) => !delSet.has(item.id))
    .map((item) => (dirtySet.has(item.id) && localById.has(item.id) ? localById.get(item.id) : item));

  const seenIds = new Set(mergedRemote.map((item) => item.id));
  const localPending = localList.filter((item) => (dirtySet.has(item.id) || !isUuid(item.id)) && !seenIds.has(item.id) && !delSet.has(item.id));
  const result = [...localPending, ...mergedRemote];
  return sortFn ? result.sort(sortFn) : result;
}

export const OperationsService = {
  clearLocalCaches() {
    localStorage.removeItem(LS_TEMPLATES_KEY);
    localStorage.removeItem(LS_SCHEDULES_KEY);
    localStorage.removeItem(LS_SST_ITEMS_KEY);
  },

  // ---- TEMPLATES DE CHECKLIST PERSONALIZADOS ----
  getTemplates() {
    return safeLocalStorageGet(LS_TEMPLATES_KEY, []);
  },

  async syncTemplateToSupabase(record) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return null;
    const { client } = getSupabaseClient();
    const { data: userData } = (await client?.auth.getUser()) || {};
    const user = userData?.user;
    if (!client || !user) return null;

    const payload = {
      user_id: user.id,
      nome: record.nome,
      disciplina: record.disciplina,
      descricao: record.descricao || null,
      itens: record.itens
    };
    const query = isUuid(record.id)
      ? client.from('checklist_templates').update(payload).eq('id', record.id).select('*').single()
      : client.from('checklist_templates').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) {
      if (isMissingRelation(error)) return null;
      throw new Error(error.message);
    }
    return data || null;
  },

  async saveTemplate(template) {
    const nome = (template.nome || '').trim();
    if (!nome) throw new Error('Informe o nome do modelo de checklist.');

    const normalizedItems = (template.itens || [])
      .filter((it) => it?.question?.trim())
      .map((it, idx) => ({
        id: it.id || `tpl-item-${Date.now()}-${idx + 1}`,
        number: idx + 1,
        topic: (it.topic || 'Geral').trim(),
        nrCode: it.nrCode || '',
        question: it.question.trim()
      }));

    if (normalizedItems.length === 0) {
      throw new Error('Adicione pelo menos 1 item de verificação no modelo.');
    }

    const list = this.getTemplates();
    const record = {
      id: template.id || `local-tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nome,
      disciplina: template.disciplina === 'seguranca_trabalho' ? 'seguranca_trabalho' : 'meio_ambiente',
      descricao: (template.descricao || '').trim(),
      itens: normalizedItems,
      updatedAt: new Date().toISOString()
    };

    const exists = list.some((t) => t.id === record.id);
    const nextList = exists
      ? list.map((t) => (t.id === record.id ? record : t))
      : [record, ...list];
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueTemplateUpsert(record.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const data = await this.syncTemplateToSupabase(record);
        if (data?.id) {
          const reconciled = this.getTemplates().map((t) => (t.id === record.id ? { ...t, id: data.id } : t));
          safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(reconciled));
          await OfflineStore.dequeueTemplateUpsert(record.id);
          OfflineStore.clearSyncError('template', record.id);
          return reconciled;
        }
      } catch (err) {
        OfflineStore.recordSyncError('template', record.id, err?.message || err);
        console.warn('Template salvo offline:', err?.message || err);
      }
    }

    return nextList;
  },

  async flushPendingTemplate(templateId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const rec = this.getTemplates().find((t) => t.id === templateId);
    if (!rec) {
      await OfflineStore.dequeueTemplateUpsert(templateId);
      return true;
    }
    const data = await this.syncTemplateToSupabase(rec);
    if (!data?.id) return false;
    const reconciled = this.getTemplates().map((t) => (t.id === templateId ? { ...t, id: data.id } : t));
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(reconciled));
    await OfflineStore.dequeueTemplateUpsert(templateId);
    OfflineStore.clearSyncError('template', templateId);
    return true;
  },

  async flushPendingTemplateDelete(templateId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    if (!isUuid(templateId)) {
      await OfflineStore.dequeueTemplateDelete(templateId);
      return true;
    }
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from('checklist_templates').delete().eq('id', templateId);
    if (error && !isMissingRelation(error)) return false;
    await OfflineStore.dequeueTemplateDelete(templateId);
    OfflineStore.clearSyncError('template', templateId);
    return true;
  },

  async deleteTemplate(templateId) {
    const nextList = this.getTemplates().filter((t) => t.id !== templateId);
    safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueTemplateDelete(templateId);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        await this.flushPendingTemplateDelete(templateId);
      } catch (err) {
        OfflineStore.recordSyncError('template', templateId, err?.message || err);
      }
    }
    return nextList;
  },

  async loadTemplatesFromSupabase() {
    if (!isSupabaseConfigured() || navigator.onLine === false) return this.getTemplates();
    try {
      const { client } = getSupabaseClient();
      const { data: userData } = (await client?.auth.getUser()) || {};
      if (!client || !userData?.user) return this.getTemplates();
      const { data, error } = await client
        .from('checklist_templates')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) return this.getTemplates();
      const mapped = (data || []).map((row) => ({
        id: row.id,
        nome: row.nome,
        disciplina: row.disciplina || 'meio_ambiente',
        descricao: row.descricao || '',
        itens: Array.isArray(row.itens) ? row.itens : [],
        updatedAt: row.updated_at
      }));
      const pending = OfflineStore.getPendingIndex();
      const merged = mergePendingRemoteList(
        mapped,
        this.getTemplates(),
        pending.upsertTemplates,
        pending.deleteTemplates
      );
      safeLocalStorageSet(LS_TEMPLATES_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return this.getTemplates();
    }
  },

  // ---- AGENDA & RECORRÊNCIA DE VISTORIAS ----
  getSchedules() {
    return safeLocalStorageGet(LS_SCHEDULES_KEY, []);
  },

  async syncScheduleToSupabase(record) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return null;
    const { client } = getSupabaseClient();
    const { data: userData } = (await client?.auth.getUser()) || {};
    const user = userData?.user;
    if (!client || !user) return null;

    const payload = {
      user_id: user.id,
      unidade_id: record.unidadeId,
      unidade_nome: record.unidadeNome,
      cliente_nome: record.clienteNome || null,
      regional: record.regional || null,
      municipio: record.municipio || null,
      disciplina: record.disciplina,
      template_id: record.templateId || null,
      nr_modules: record.nrModules,
      periodicidade: record.periodicidade,
      proxima_data: record.proximaData,
      ultima_execucao: record.ultimaExecucao || null,
      observacoes: record.observacoes || null,
      ativo: record.ativo
    };
    const query = isUuid(record.id)
      ? client.from('vistorias_agenda').update(payload).eq('id', record.id).select('*').single()
      : client.from('vistorias_agenda').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) {
      if (isMissingRelation(error)) return null;
      throw new Error(error.message);
    }
    return data || null;
  },

  async saveSchedule(schedule) {
    const unidadeNome = (schedule.unidadeNome || '').trim();
    if (!unidadeNome || !schedule.proximaData) {
      throw new Error('Informe a Unidade e a Próxima Data agendada.');
    }

    const list = this.getSchedules();
    const record = {
      id: schedule.id || `local-ag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      unidadeId: isUuid(schedule.unidadeId) ? schedule.unidadeId : null,
      unidadeNome,
      clienteNome: (schedule.clienteNome || '').trim(),
      regional: (schedule.regional || '').trim(),
      municipio: (schedule.municipio || '').trim(),
      disciplina: schedule.disciplina === 'seguranca_trabalho' ? 'seguranca_trabalho' : 'meio_ambiente',
      templateId: schedule.templateId || '',
      nrModules: Array.isArray(schedule.nrModules) ? schedule.nrModules : null,
      periodicidade: schedule.periodicidade || 'Mensal',
      proximaData: String(schedule.proximaData).slice(0, 10),
      ultimaExecucao: schedule.ultimaExecucao ? String(schedule.ultimaExecucao).slice(0, 10) : '',
      observacoes: (schedule.observacoes || '').trim(),
      ativo: schedule.ativo !== false,
      updatedAt: new Date().toISOString()
    };

    const exists = list.some((s) => s.id === record.id);
    const nextList = (exists
      ? list.map((s) => (s.id === record.id ? record : s))
      : [record, ...list]
    ).sort((a, b) => String(a.proximaData).localeCompare(String(b.proximaData)));

    safeLocalStorageSet(LS_SCHEDULES_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueScheduleUpsert(record.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const data = await this.syncScheduleToSupabase(record);
        if (data?.id) {
          const reconciled = this.getSchedules().map((s) => (s.id === record.id ? { ...s, id: data.id } : s));
          safeLocalStorageSet(LS_SCHEDULES_KEY, JSON.stringify(reconciled));
          await OfflineStore.dequeueScheduleUpsert(record.id);
          OfflineStore.clearSyncError('schedule', record.id);
          return reconciled;
        }
      } catch (err) {
        OfflineStore.recordSyncError('schedule', record.id, err?.message || err);
        console.warn('Agendamento salvo offline:', err?.message || err);
      }
    }

    return nextList;
  },

  async flushPendingSchedule(scheduleId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const rec = this.getSchedules().find((s) => s.id === scheduleId);
    if (!rec) {
      await OfflineStore.dequeueScheduleUpsert(scheduleId);
      return true;
    }
    const data = await this.syncScheduleToSupabase(rec);
    if (!data?.id) return false;
    const reconciled = this.getSchedules().map((s) => (s.id === scheduleId ? { ...s, id: data.id } : s));
    safeLocalStorageSet(LS_SCHEDULES_KEY, JSON.stringify(reconciled));
    await OfflineStore.dequeueScheduleUpsert(scheduleId);
    OfflineStore.clearSyncError('schedule', scheduleId);
    return true;
  },

  async flushPendingScheduleDelete(scheduleId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    if (!isUuid(scheduleId)) {
      await OfflineStore.dequeueScheduleDelete(scheduleId);
      return true;
    }
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from('vistorias_agenda').delete().eq('id', scheduleId);
    if (error && !isMissingRelation(error)) return false;
    await OfflineStore.dequeueScheduleDelete(scheduleId);
    OfflineStore.clearSyncError('schedule', scheduleId);
    return true;
  },

  async advanceScheduleAfterExecution(schedule, executedDateStr) {
    if (!schedule) return this.getSchedules();
    const execDate = executedDateStr || new Date().toISOString().split('T')[0];
    if (schedule.periodicidade === 'Única') {
      return this.saveSchedule({
        ...schedule,
        ultimaExecucao: execDate,
        ativo: false
      });
    }
    const nextDate = computeNextScheduleDate(schedule.proximaData || execDate, schedule.periodicidade);
    return this.saveSchedule({
      ...schedule,
      ultimaExecucao: execDate,
      proximaData: nextDate
    });
  },

  async deleteSchedule(scheduleId) {
    const nextList = this.getSchedules().filter((s) => s.id !== scheduleId);
    safeLocalStorageSet(LS_SCHEDULES_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueScheduleDelete(scheduleId);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        await this.flushPendingScheduleDelete(scheduleId);
      } catch (err) {
        OfflineStore.recordSyncError('schedule', scheduleId, err?.message || err);
      }
    }
    return nextList;
  },

  async loadSchedulesFromSupabase() {
    if (!isSupabaseConfigured() || navigator.onLine === false) return this.getSchedules();
    try {
      const { client } = getSupabaseClient();
      const { data: userData } = (await client?.auth.getUser()) || {};
      if (!client || !userData?.user) return this.getSchedules();
      const { data, error } = await client
        .from('vistorias_agenda')
        .select('*')
        .order('proxima_data', { ascending: true });
      if (error) return this.getSchedules();
      const mapped = (data || []).map((row) => ({
        id: row.id,
        unidadeId: row.unidade_id || null,
        unidadeNome: row.unidade_nome,
        clienteNome: row.cliente_nome || '',
        regional: row.regional || '',
        municipio: row.municipio || '',
        disciplina: row.disciplina || 'meio_ambiente',
        templateId: row.template_id || '',
        nrModules: Array.isArray(row.nr_modules) ? row.nr_modules : null,
        periodicidade: row.periodicidade || 'Mensal',
        proximaData: row.proxima_data,
        ultimaExecucao: row.ultima_execucao || '',
        observacoes: row.observacoes || '',
        ativo: row.ativo !== false,
        updatedAt: row.updated_at
      }));
      const pending = OfflineStore.getPendingIndex();
      const merged = mergePendingRemoteList(
        mapped,
        this.getSchedules(),
        pending.upsertSchedules,
        pending.deleteSchedules,
        (a, b) => String(a.proximaData).localeCompare(String(b.proximaData))
      );
      safeLocalStorageSet(LS_SCHEDULES_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return this.getSchedules();
    }
  },

  // ---- INVENTÁRIO DE VENCIMENTOS SST POR UNIDADE ----
  getSstItems() {
    return safeLocalStorageGet(LS_SST_ITEMS_KEY, []);
  },

  async syncSstItemToSupabase(record) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return null;
    const { client } = getSupabaseClient();
    const { data: userData } = (await client?.auth.getUser()) || {};
    const user = userData?.user;
    if (!client || !user) return null;

    const payload = {
      user_id: user.id,
      unidade_id: record.unidadeId,
      unidade_nome: record.unidadeNome,
      cliente_nome: record.clienteNome || null,
      categoria: record.categoria,
      item_nome: record.itemNome,
      codigo_patrimonio: record.codigoPatrimonio || null,
      data_ultima: record.dataUltima || null,
      data_validade: record.dataValidade,
      responsavel: record.responsavel || null,
      observacoes: record.observacoes || null
    };
    const query = isUuid(record.id)
      ? client.from('sst_vencimentos').update(payload).eq('id', record.id).select('*').single()
      : client.from('sst_vencimentos').insert(payload).select('*').single();
    const { data, error } = await query;
    if (error) {
      if (isMissingRelation(error)) return null;
      throw new Error(error.message);
    }
    return data || null;
  },

  async saveSstItem(item) {
    const itemNome = (item.itemNome || '').trim();
    const unidadeNome = (item.unidadeNome || '').trim();
    if (!itemNome || !unidadeNome || !item.dataValidade) {
      throw new Error('Informe Unidade, Item/Documento e Data de Validade.');
    }

    const list = this.getSstItems();
    const record = {
      id: item.id || `local-sst-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      unidadeId: isUuid(item.unidadeId) ? item.unidadeId : null,
      unidadeNome,
      clienteNome: (item.clienteNome || '').trim(),
      categoria: item.categoria || 'Extintor de Incêndio',
      itemNome,
      codigoPatrimonio: (item.codigoPatrimonio || '').trim(),
      dataUltima: item.dataUltima ? String(item.dataUltima).slice(0, 10) : '',
      dataValidade: String(item.dataValidade).slice(0, 10),
      responsavel: (item.responsavel || '').trim(),
      observacoes: (item.observacoes || '').trim(),
      updatedAt: new Date().toISOString()
    };

    const exists = list.some((x) => x.id === record.id);
    const nextList = (exists
      ? list.map((x) => (x.id === record.id ? record : x))
      : [record, ...list]
    ).sort((a, b) => String(a.dataValidade).localeCompare(String(b.dataValidade)));

    safeLocalStorageSet(LS_SST_ITEMS_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueSstUpsert(record.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const data = await this.syncSstItemToSupabase(record);
        if (data?.id) {
          const reconciled = this.getSstItems().map((x) => (x.id === record.id ? { ...x, id: data.id } : x));
          safeLocalStorageSet(LS_SST_ITEMS_KEY, JSON.stringify(reconciled));
          await OfflineStore.dequeueSstUpsert(record.id);
          OfflineStore.clearSyncError('sst', record.id);
          return reconciled;
        }
      } catch (err) {
        OfflineStore.recordSyncError('sst', record.id, err?.message || err);
        console.warn('Item SST salvo offline:', err?.message || err);
      }
    }

    return nextList;
  },

  async flushPendingSstItem(itemId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const rec = this.getSstItems().find((x) => x.id === itemId);
    if (!rec) {
      await OfflineStore.dequeueSstUpsert(itemId);
      return true;
    }
    const data = await this.syncSstItemToSupabase(rec);
    if (!data?.id) return false;
    const reconciled = this.getSstItems().map((x) => (x.id === itemId ? { ...x, id: data.id } : x));
    safeLocalStorageSet(LS_SST_ITEMS_KEY, JSON.stringify(reconciled));
    await OfflineStore.dequeueSstUpsert(itemId);
    OfflineStore.clearSyncError('sst', itemId);
    return true;
  },

  async flushPendingSstItemDelete(itemId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    if (!isUuid(itemId)) {
      await OfflineStore.dequeueSstDelete(itemId);
      return true;
    }
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from('sst_vencimentos').delete().eq('id', itemId);
    if (error && !isMissingRelation(error)) return false;
    await OfflineStore.dequeueSstDelete(itemId);
    OfflineStore.clearSyncError('sst', itemId);
    return true;
  },

  async deleteSstItem(itemId) {
    const nextList = this.getSstItems().filter((x) => x.id !== itemId);
    safeLocalStorageSet(LS_SST_ITEMS_KEY, JSON.stringify(nextList));
    await OfflineStore.enqueueSstDelete(itemId);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        await this.flushPendingSstItemDelete(itemId);
      } catch (err) {
        OfflineStore.recordSyncError('sst', itemId, err?.message || err);
      }
    }
    return nextList;
  },

  async loadSstItemsFromSupabase() {
    if (!isSupabaseConfigured() || navigator.onLine === false) return this.getSstItems();
    try {
      const { client } = getSupabaseClient();
      const { data: userData } = (await client?.auth.getUser()) || {};
      if (!client || !userData?.user) return this.getSstItems();
      const { data, error } = await client
        .from('sst_vencimentos')
        .select('*')
        .order('data_validade', { ascending: true });
      if (error) return this.getSstItems();
      const mapped = (data || []).map((row) => ({
        id: row.id,
        unidadeId: row.unidade_id || null,
        unidadeNome: row.unidade_nome,
        clienteNome: row.cliente_nome || '',
        categoria: row.categoria,
        itemNome: row.item_nome,
        codigoPatrimonio: row.codigo_patrimonio || '',
        dataUltima: row.data_ultima || '',
        dataValidade: row.data_validade,
        responsavel: row.responsavel || '',
        observacoes: row.observacoes || '',
        updatedAt: row.updated_at
      }));
      const pending = OfflineStore.getPendingIndex();
      const merged = mergePendingRemoteList(
        mapped,
        this.getSstItems(),
        pending.upsertSstItems,
        pending.deleteSstItems,
        (a, b) => String(a.dataValidade).localeCompare(String(b.dataValidade))
      );
      safeLocalStorageSet(LS_SST_ITEMS_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      return this.getSstItems();
    }
  }
};
