// Data Service for Kivo — 100% persistido no Supabase Cloud
import { DEFAULT_USER_PROFILE } from '../data/mockInitialData';
import { EMSERH_BASE_ITEMS } from '../data/emserhChecklistData';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';

const LS_PROFILE_KEY = 'kivo_user_profile';
const LS_ORDERS_KEY = 'kivo_work_orders';
const LS_CLIENTS_KEY = 'kivo_clients_cache';
const LS_CATALOG_ITEMS_KEY = 'kivo_supabase_catalog_items';
const LS_ACTIVE_UID_KEY = 'kivo_active_supabase_uid';

const VALID_CLASSIFICATIONS = new Set(['Leve', 'Médio', 'Grave', 'Crítico']);

function getStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeChecklistStatus(item) {
  const raw = item?.status || item?.response;
  if (raw === 'sim' || raw === 'conforme') return 'sim';
  if (raw === 'nao' || raw === 'nao_conforme') return 'nao';
  if (raw === 'na' || raw === 'nao_aplicavel' || raw === 'n/a') return 'na';
  return null;
}

export function compressImageToDataUrl(file, maxWidth = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => resolve(ev.target.result);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export const DataService = {
  // ---- CATÁLOGO BASE DE CHECKLIST (public.checklist_itens_modelo + public.tematicas) ----
  getBaseChecklistItems() {
    const cached = getStoredJson(LS_CATALOG_ITEMS_KEY, null);
    if (Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
    return EMSERH_BASE_ITEMS;
  },

  // ---- SESSÃO MULTI-USUÁRIO & PERFIL PERSISTIDO NO SUPABASE AUTH ----
  syncSessionUser(user) {
    if (!user) {
      localStorage.removeItem(LS_ACTIVE_UID_KEY);
      localStorage.removeItem(LS_ORDERS_KEY);
      localStorage.removeItem(LS_CLIENTS_KEY);
      localStorage.removeItem(LS_PROFILE_KEY);
      return null;
    }

    const previousUid = localStorage.getItem(LS_ACTIVE_UID_KEY);
    if (previousUid && previousUid !== user.id) {
      localStorage.removeItem(LS_ORDERS_KEY);
      localStorage.removeItem(LS_CLIENTS_KEY);
      localStorage.removeItem(LS_PROFILE_KEY);
    }
    localStorage.setItem(LS_ACTIVE_UID_KEY, user.id);

    const meta = user.user_metadata || {};
    const syncedProfile = {
      name: meta.full_name || user.email?.split('@')[0] || DEFAULT_USER_PROFILE.name,
      email: user.email || '',
      registry: meta.registry || DEFAULT_USER_PROFILE.registry,
      title: meta.title || DEFAULT_USER_PROFILE.title,
      specialty: meta.specialty || DEFAULT_USER_PROFILE.specialty,
      consultancyName: meta.consultancy_name || '',
      phone: meta.phone || ''
    };

    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(syncedProfile));
    return syncedProfile;
  },

  getUserProfile() {
    return getStoredJson(LS_PROFILE_KEY, DEFAULT_USER_PROFILE);
  },

  async saveUserProfile(profile) {
    localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(profile));
    if (isSupabaseConfigured()) {
      const { client } = getSupabaseClient();
      if (client) {
        const { error } = await client.auth.updateUser({
          data: {
            full_name: profile.name,
            registry: profile.registry,
            title: profile.title,
            specialty: profile.specialty,
            consultancy_name: profile.consultancyName,
            phone: profile.phone
          }
        });
        if (error) {
          throw new Error(`Erro ao salvar perfil no Supabase: ${error.message}`);
        }
      }
    }
    return profile;
  },

  // ---- CLIENTES (public.clientes) ----
  getClients() {
    return getStoredJson(LS_CLIENTS_KEY, []);
  },

  // ---- INSPEÇÕES & CHECKLISTS (public.inspecoes + public.inspecao_respostas) ----
  getOrders() {
    return getStoredJson(LS_ORDERS_KEY, []);
  },

  getOrderById(id) {
    return this.getOrders().find((o) => o.id === id) || null;
  },

  saveOrder(updatedOrder, onSynced) {
    const orders = this.getOrders();
    const index = orders.findIndex((o) => o.id === updatedOrder.id);
    let newOrders;
    let mergedOrder = updatedOrder;

    if (index >= 0) {
      newOrders = [...orders];
      mergedOrder = { ...newOrders[index], ...updatedOrder, updatedAt: new Date().toISOString() };
      newOrders[index] = mergedOrder;
    } else {
      newOrders = [updatedOrder, ...orders];
    }

    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(newOrders));

    this.syncOrderToSupabase(mergedOrder, { silentAuth: true })
      .then((inspecaoRow) => {
        if (!inspecaoRow?.id) return;
        const latest = this.getOrders();
        const patched = latest.map((o) =>
          o.id === mergedOrder.id ? { ...o, supabaseId: inspecaoRow.id } : o
        );
        localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(patched));
        if (typeof onSynced === 'function') {
          onSynced(inspecaoRow.id, patched);
        }
      })
      .catch((err) => {
        console.warn('Erro ao salvar inspeção no Supabase:', err.message);
      });

    return newOrders;
  },

  createOrder(orderData, onSynced) {
    const profile = this.getUserProfile();
    const year = new Date().getFullYear();
    const randomTag = Math.random().toString(36).slice(2, 6).toUpperCase();
    const timeSuffix = String(Date.now()).slice(-3);
    const newId = `OS-${year}-${randomTag}${timeSuffix}`;

    const newOrder = {
      id: newId,
      createdAt: new Date().toISOString(),
      status: 'in_progress',
      technicianName: orderData.technicianName || profile.name,
      ...orderData
    };

    return this.saveOrder(newOrder, onSynced);
  },

  async uploadChecklistEvidence(file, orderId, itemId) {
    const compressedDataUrl = await compressImageToDataUrl(file);
    if (!isSupabaseConfigured()) return compressedDataUrl;

    try {
      const { client } = getSupabaseClient();
      const { data: userData } = await client.auth.getUser();
      const user = userData?.user;
      if (!user) return compressedDataUrl;

      const res = await fetch(compressedDataUrl);
      const blob = await res.blob();
      const cleanOrderId = String(orderId || 'os').replace(/[^A-Za-z0-9-_]/g, '');
      const cleanItemId = String(itemId || 'item').replace(/[^A-Za-z0-9-_]/g, '');
      const filePath = `${user.id}/checklists/${cleanOrderId}/${cleanItemId}-${Date.now()}.jpg`;

      const { error: uploadError } = await client.storage
        .from('relatorios-midia')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.warn('Fallback para imagem local (checklists):', uploadError.message);
        return compressedDataUrl;
      }

      const { data: signed } = await client.storage
        .from('relatorios-midia')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      return signed?.signedUrl || compressedDataUrl;
    } catch {
      return compressedDataUrl;
    }
  },

  async deleteOrder(order) {
    const nextOrders = this.getOrders().filter((o) => o.id !== order.id);
    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(nextOrders));

    if (isSupabaseConfigured()) {
      const { client } = getSupabaseClient();
      if (client) {
        const { error } = await client
          .from('inspecoes')
          .delete()
          .eq('codigo_kivo', order.id);
        if (error) {
          console.warn('Erro ao excluir inspeção no Supabase:', error.message);
        }
      }
    }

    return nextOrders;
  },

  // ---- LEITURA E ESCRITA NO SUPABASE CLOUD ----
  async getChecklistModelMap(client) {
    const { data, error } = await client
      .from('checklist_itens_modelo')
      .select('id, codigo, numero, pergunta, tematicas ( id, nome, ordem )')
      .eq('ativo', true)
      .order('numero', { ascending: true });

    if (error) {
      throw new Error(`Erro ao carregar checklist_itens_modelo: ${error.message}`);
    }

    const byCode = new Map();
    const byNumber = new Map();
    const byId = new Map();
    const baseItems = [];

    (data || []).forEach((row) => {
      if (row.codigo) byCode.set(row.codigo, row.id);
      if (row.numero != null) byNumber.set(Number(row.numero), row.id);
      byId.set(row.id, row);

      baseItems.push({
        id: row.codigo || `item-${row.numero}`,
        number: row.numero,
        topic: row.tematicas?.nome || 'Geral',
        question: row.pergunta,
        status: null,
        classification: '',
        responsible: '',
        deadline: '',
        observation: '',
        evidenceUrl: ''
      });
    });

    if (baseItems.length > 0) {
      localStorage.setItem(LS_CATALOG_ITEMS_KEY, JSON.stringify(baseItems));
    }

    return { byCode, byNumber, byId, baseItems };
  },

  async loadFromSupabase() {
    if (!isSupabaseConfigured()) return null;
    const { client } = getSupabaseClient();
    if (!client) return null;

    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return null;

    const modelMap = await this.getChecklistModelMap(client);
    const canonicalBase = modelMap.baseItems.length > 0 ? modelMap.baseItems : EMSERH_BASE_ITEMS;

    // Carregar clientes reais se a tabela existir
    let clients = [];
    try {
      const { data: cData, error: cErr } = await client
        .from('clientes')
        .select('id, nome, codigo, segmento')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (!cErr && Array.isArray(cData)) {
        clients = cData;
        localStorage.setItem(LS_CLIENTS_KEY, JSON.stringify(clients));
      }
    } catch {
      // ignora se migration 002 não foi aplicada
    }

    let { data: inspecoes, error } = await client
      .from('inspecoes')
      .select(`
        id,
        codigo_kivo,
        cliente_id,
        cliente_nome,
        unidade,
        regional,
        municipio,
        data_inspecao,
        responsavel_inspecao,
        tipo_inspecao,
        status,
        created_at,
        updated_at,
        inspecao_respostas (
          item_modelo_id,
          status,
          classificacao,
          responsavel,
          prazo,
          observacao,
          evidencia_path
        )
      `)
      .order('data_inspecao', { ascending: false })
      .order('created_at', { ascending: false });

    if (error && (error.code === 'PGRST204' || error.message?.includes('cliente_'))) {
      const retry = await client
        .from('inspecoes')
        .select(`
          id,
          codigo_kivo,
          unidade,
          regional,
          municipio,
          data_inspecao,
          responsavel_inspecao,
          tipo_inspecao,
          status,
          created_at,
          updated_at,
          inspecao_respostas (
            item_modelo_id,
            status,
            classificacao,
            responsavel,
            prazo,
            observacao,
            evidencia_path
          )
        `)
        .order('data_inspecao', { ascending: false })
        .order('created_at', { ascending: false });
      inspecoes = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(`Erro ao carregar inspeções do Supabase: ${error.message}`);
    }

    const mappedOrders = (inspecoes || []).map((insp) => {
      const respostasPorModelo = new Map();
      (insp.inspecao_respostas || []).forEach((resp) => {
        respostasPorModelo.set(resp.item_modelo_id, resp);
      });

      const checklist = canonicalBase.map((baseItem) => {
        const modeloId =
          modelMap.byCode.get(baseItem.id) ||
          modelMap.byNumber.get(Number(baseItem.number));
        const resp = modeloId ? respostasPorModelo.get(modeloId) : null;

        return {
          ...baseItem,
          status: resp?.status ?? null,
          classification: resp?.classificacao || '',
          responsible: resp?.responsavel || '',
          deadline: resp?.prazo || '',
          observation: resp?.observacao || '',
          evidenceUrl: resp?.evidencia_path || ''
        };
      });

      return {
        id: insp.codigo_kivo,
        supabaseId: insp.id,
        clientName: insp.cliente_nome || '',
        title: `Inspeção Ambiental — ${insp.unidade}`,
        hospitalName: insp.unidade,
        regional: insp.regional,
        municipio: insp.municipio,
        inspectionType: insp.tipo_inspecao,
        status: insp.status,
        technicianName: insp.responsavel_inspecao,
        scheduledDate: insp.data_inspecao,
        createdAt: insp.created_at,
        updatedAt: insp.updated_at,
        checklist
      };
    });

    localStorage.setItem(LS_ORDERS_KEY, JSON.stringify(mappedOrders));
    return {
      orders: mappedOrders,
      baseItems: canonicalBase,
      clients
    };
  },

  async syncOrderToSupabase(order, options = {}) {
    if (!isSupabaseConfigured()) return null;
    const { client } = getSupabaseClient();
    if (!client) return null;

    const { data: userData, error: userError } = await client.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      if (options.silentAuth) {
        return null;
      }
      throw new Error('Usuário não autenticado no Supabase.');
    }

    const clientName = order.clientName?.trim() || null;

    const basePayload = {
      codigo_kivo: order.id,
      user_id: user.id,
      unidade: order.hospitalName || 'Unidade Atendida',
      regional: order.regional || 'Regional',
      municipio: order.municipio || 'Município',
      data_inspecao: order.scheduledDate || new Date().toISOString().split('T')[0],
      responsavel_inspecao: order.technicianName || this.getUserProfile()?.name || 'Auditor Técnico',
      tipo_inspecao: order.inspectionType === 'Não Programada' ? 'Não Programada' : 'Programada',
      status: ['open', 'in_progress', 'completed'].includes(order.status) ? order.status : 'in_progress'
    };

    let clienteId = null;
    if (clientName) {
      try {
        const { data: clienteRow } = await client
          .from('clientes')
          .upsert({ user_id: user.id, nome: clientName }, { onConflict: 'user_id,nome' })
          .select('id')
          .single();
        clienteId = clienteRow?.id || null;
      } catch {
        // segue caso migration 002 não esteja aplicada
      }
    }

    let { data: inspecaoRow, error: inspecaoError } = await client
      .from('inspecoes')
      .upsert(
        {
          ...basePayload,
          ...(clientName ? { cliente_nome: clientName } : {}),
          ...(clienteId ? { cliente_id: clienteId } : {})
        },
        { onConflict: 'codigo_kivo' }
      )
      .select('id')
      .single();

    if (inspecaoError && (inspecaoError.code === 'PGRST204' || inspecaoError.message?.includes('cliente_'))) {
      const retry = await client
        .from('inspecoes')
        .upsert(basePayload, { onConflict: 'codigo_kivo' })
        .select('id')
        .single();
      inspecaoRow = retry.data;
      inspecaoError = retry.error;
    }

    if (inspecaoError) {
      throw new Error(`Erro ao gravar inspeção ${order.id}: ${inspecaoError.message}`);
    }

    const checklist = order.checklist || [];
    if (checklist.length > 0) {
      const modelMap = options.modelMap || (await this.getChecklistModelMap(client));
      const respostasPayload = [];

      for (const item of checklist) {
        const itemModeloId =
          modelMap.byCode.get(item.id) ||
          modelMap.byNumber.get(Number(item.number ?? item.item));

        if (!itemModeloId) continue;

        const normalizedStatus = normalizeChecklistStatus(item);
        const isNao = normalizedStatus === 'nao';
        const classificacao = isNao && VALID_CLASSIFICATIONS.has(item.classification)
          ? item.classification
          : null;

        respostasPayload.push({
          inspecao_id: inspecaoRow.id,
          item_modelo_id: itemModeloId,
          status: normalizedStatus,
          classificacao,
          responsavel: isNao ? (item.responsible || null) : null,
          prazo: isNao ? (item.deadline || null) : null,
          observacao: item.observation || null,
          evidencia_path: item.evidenceUrl || item.photoEvidence || null
        });
      }

      if (respostasPayload.length > 0) {
        const { error: respostasError } = await client
          .from('inspecao_respostas')
          .upsert(respostasPayload, { onConflict: 'inspecao_id,item_modelo_id' });

        if (respostasError) {
          throw new Error(`Erro ao gravar respostas da OS ${order.id}: ${respostasError.message}`);
        }
      }
    }

    return inspecaoRow;
  }
};
