// Serviço de Operações Complementares (Templates de Checklist, Agenda Recorrente e Inventário SST)
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';
import { isUuid } from './dataService';
import { safeLocalStorageGet, safeLocalStorageSet } from '../offline/offlineStore';

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
    safeLocalStorageSet(LS_TEMPLATES_KEY, nextList);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        const { data: userData } = (await client?.auth.getUser()) || {};
        const user = userData?.user;
        if (client && user) {
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
          if (!error && data?.id) {
            const reconciled = nextList.map((t) => (t.id === record.id ? { ...t, id: data.id } : t));
            safeLocalStorageSet(LS_TEMPLATES_KEY, reconciled);
            return reconciled;
          }
          if (error && !isMissingRelation(error)) {
            console.warn('Template salvo offline:', error.message);
          }
        }
      } catch {
        // segue offline
      }
    }

    return nextList;
  },

  async deleteTemplate(templateId) {
    const nextList = this.getTemplates().filter((t) => t.id !== templateId);
    safeLocalStorageSet(LS_TEMPLATES_KEY, nextList);

    if (isUuid(templateId) && isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        await client?.from('checklist_templates').delete().eq('id', templateId);
      } catch {
        // segue offline
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
      const localPending = this.getTemplates().filter((t) => !isUuid(t.id));
      const merged = [...localPending, ...mapped];
      safeLocalStorageSet(LS_TEMPLATES_KEY, merged);
      return merged;
    } catch {
      return this.getTemplates();
    }
  },

  // ---- AGENDA & RECORRÊNCIA DE VISTORIAS ----
  getSchedules() {
    return safeLocalStorageGet(LS_SCHEDULES_KEY, []);
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

    safeLocalStorageSet(LS_SCHEDULES_KEY, nextList);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        const { data: userData } = (await client?.auth.getUser()) || {};
        const user = userData?.user;
        if (client && user) {
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
          if (!error && data?.id) {
            const reconciled = nextList.map((s) => (s.id === record.id ? { ...s, id: data.id } : s));
            safeLocalStorageSet(LS_SCHEDULES_KEY, reconciled);
            return reconciled;
          }
        }
      } catch {
        // segue offline
      }
    }

    return nextList;
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
    safeLocalStorageSet(LS_SCHEDULES_KEY, nextList);

    if (isUuid(scheduleId) && isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        await client?.from('vistorias_agenda').delete().eq('id', scheduleId);
      } catch {
        // segue offline
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
      const localPending = this.getSchedules().filter((s) => !isUuid(s.id));
      const merged = [...localPending, ...mapped].sort((a, b) =>
        String(a.proximaData).localeCompare(String(b.proximaData))
      );
      safeLocalStorageSet(LS_SCHEDULES_KEY, merged);
      return merged;
    } catch {
      return this.getSchedules();
    }
  },

  // ---- INVENTÁRIO DE VENCIMENTOS SST POR UNIDADE ----
  getSstItems() {
    return safeLocalStorageGet(LS_SST_ITEMS_KEY, []);
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

    safeLocalStorageSet(LS_SST_ITEMS_KEY, nextList);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        const { data: userData } = (await client?.auth.getUser()) || {};
        const user = userData?.user;
        if (client && user) {
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
          if (!error && data?.id) {
            const reconciled = nextList.map((x) => (x.id === record.id ? { ...x, id: data.id } : x));
            safeLocalStorageSet(LS_SST_ITEMS_KEY, reconciled);
            return reconciled;
          }
        }
      } catch {
        // segue offline
      }
    }

    return nextList;
  },

  async deleteSstItem(itemId) {
    const nextList = this.getSstItems().filter((x) => x.id !== itemId);
    safeLocalStorageSet(LS_SST_ITEMS_KEY, nextList);

    if (isUuid(itemId) && isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        await client?.from('sst_vencimentos').delete().eq('id', itemId);
      } catch {
        // segue offline
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
      const localPending = this.getSstItems().filter((x) => !isUuid(x.id));
      const merged = [...localPending, ...mapped].sort((a, b) =>
        String(a.dataValidade).localeCompare(String(b.dataValidade))
      );
      safeLocalStorageSet(LS_SST_ITEMS_KEY, merged);
      return merged;
    } catch {
      return this.getSstItems();
    }
  }
};
