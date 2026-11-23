// Data Service for Kivo — 100% persistido no Supabase Cloud
import { DEFAULT_USER_PROFILE } from '../data/mockInitialData';
import { EMSERH_BASE_ITEMS } from '../data/emserhChecklistData';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';
import { OfflineStore, safeLocalStorageGet, safeLocalStorageSet } from '../offline/offlineStore';

const LS_PROFILE_KEY = 'kivo_user_profile';
const LS_ORDERS_KEY = 'kivo_work_orders';
const LS_CLIENTS_KEY = 'kivo_clients_cache';
const LS_UNITS_KEY = 'kivo_units_cache';
const LS_CATALOG_ITEMS_KEY = 'kivo_supabase_catalog_items';
const LS_ACTIVE_UID_KEY = 'kivo_active_supabase_uid';

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

const VALID_CLASSIFICATIONS = new Set(['Leve', 'Médio', 'Grave', 'Crítico']);

function normalizeChecklistStatus(item) {
  const raw = item?.status || item?.response;
  if (raw === 'sim' || raw === 'conforme') return 'sim';
  if (raw === 'nao' || raw === 'nao_conforme') return 'nao';
  if (raw === 'na' || raw === 'nao_aplicavel' || raw === 'n/a') return 'na';
  return null;
}

const MAX_IMAGE_FILE_BYTES = 25 * 1024 * 1024;
const SIGNED_MEDIA_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias (renovado ao sincronizar)

export function extractStoragePathFromUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return null;
  const match = rawUrl.match(/\/relatorios-midia\/([^?#]+)/);
  if (!match || !match[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function refreshSignedMediaUrls(client, urls = [], ttlSeconds = SIGNED_MEDIA_TTL_SECONDS) {
  const urlMap = new Map();
  if (!client || !Array.isArray(urls) || urls.length === 0) return urlMap;

  const pathToRawUrls = new Map();
  urls.forEach((u) => {
    const path = extractStoragePathFromUrl(u);
    if (!path) return;
    if (!pathToRawUrls.has(path)) pathToRawUrls.set(path, []);
    pathToRawUrls.get(path).push(u);
  });

  const uniquePaths = Array.from(pathToRawUrls.keys());
  if (uniquePaths.length === 0) return urlMap;

  try {
    const bucket = client.storage.from('relatorios-midia');
    if (typeof bucket.createSignedUrls === 'function') {
      const { data, error } = await bucket.createSignedUrls(uniquePaths, ttlSeconds);
      if (!error && Array.isArray(data)) {
        data.forEach((entry) => {
          if (entry?.path && entry?.signedUrl) {
            const originals = pathToRawUrls.get(entry.path) || [];
            originals.forEach((raw) => urlMap.set(raw, entry.signedUrl));
          }
        });
        return urlMap;
      }
    }

    const results = await Promise.all(
      uniquePaths.map(async (path) => {
        const { data } = await bucket.createSignedUrl(path, ttlSeconds);
        return { path, signedUrl: data?.signedUrl || null };
      })
    );
    results.forEach(({ path, signedUrl }) => {
      if (!signedUrl) return;
      const originals = pathToRawUrls.get(path) || [];
      originals.forEach((raw) => urlMap.set(raw, signedUrl));
    });
  } catch {
    // fallback silencioso mantendo URL atual
  }

  return urlMap;
}

export async function removeStorageFilesByUrls(urls = []) {
  if (!isSupabaseConfigured() || navigator.onLine === false) return;
  const paths = Array.from(
    new Set((urls || []).map(extractStoragePathFromUrl).filter(Boolean))
  );
  if (paths.length === 0) return;

  try {
    const { client } = getSupabaseClient();
    if (!client) return;
    await client.storage.from('relatorios-midia').remove(paths);
  } catch (err) {
    console.warn('Falha ao limpar arquivos no Storage:', err?.message);
  }
}

export function compressImageToDataUrl(file, maxWidth = 1280, quality = 0.78, stampText = '') {
  return new Promise((resolve, reject) => {
    if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
      reject(new Error('Tipo de arquivo inválido. Selecione uma imagem válida (JPG, PNG ou WebP).'));
      return;
    }
    if (typeof file.size === 'number' && file.size > MAX_IMAGE_FILE_BYTES) {
      reject(new Error('Imagem excede o tamanho máximo permitido de 25 MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Arquivo não é uma imagem decodificável.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (stampText) {
          const fontSize = Math.max(12, Math.round(canvas.width * 0.018));
          const paddingX = Math.round(fontSize * 0.8);
          const barHeight = Math.round(fontSize * 1.9);
          ctx.fillStyle = 'rgba(11, 11, 13, 0.72)';
          ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
          ctx.fillStyle = '#34D399';
          ctx.fillRect(0, canvas.height - barHeight, 4, barHeight);
          ctx.font = `600 ${fontSize}px sans-serif`;
          ctx.fillStyle = '#F4F4F5';
          ctx.textBaseline = 'middle';
          ctx.fillText(stampText, paddingX + 4, canvas.height - barHeight / 2, canvas.width - paddingX * 2);
        }

        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadDataUrlToStorage(dataUrl, relativePath) {
  if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return dataUrl;
  if (!isSupabaseConfigured() || navigator.onLine === false) return null;

  try {
    const { client } = getSupabaseClient();
    if (!client) return null;
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const filePath = `${user.id}/${relativePath}`;

    const { error: uploadError } = await client.storage
      .from('relatorios-midia')
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      console.warn('Falha ao subir mídia para Storage:', uploadError.message);
      return null;
    }

    const { data: signed } = await client.storage
      .from('relatorios-midia')
      .createSignedUrl(filePath, SIGNED_MEDIA_TTL_SECONDS);

    return signed?.signedUrl || null;
  } catch {
    return null;
  }
}

let ordersMemoryCache = null;
let profileMemoryCache = null;
let clientsMemoryCache = null;
let unitsMemoryCache = null;
let catalogMemoryCache = null;

function persistOrdersCache(list) {
  ordersMemoryCache = list;
  safeLocalStorageSet(LS_ORDERS_KEY, JSON.stringify(list));
  OfflineStore.saveCache('orders', list);
}

function persistClientsCache(list) {
  clientsMemoryCache = list;
  safeLocalStorageSet(LS_CLIENTS_KEY, JSON.stringify(list));
  OfflineStore.saveCache('clients', list);
}

function persistUnitsCache(list) {
  unitsMemoryCache = list;
  safeLocalStorageSet(LS_UNITS_KEY, JSON.stringify(list));
  OfflineStore.saveCache('units', list);
}

function persistProfileCache(profile) {
  profileMemoryCache = profile;
  safeLocalStorageSet(LS_PROFILE_KEY, JSON.stringify(profile));
  OfflineStore.saveCache('profile', profile);
}

export const DataService = {
  async hydrateFromIndexedDb() {
    const [ordersIdb, clientsIdb, unitsIdb, catalogIdb, profileIdb] = await Promise.all([
      OfflineStore.loadCache('orders', null),
      OfflineStore.loadCache('clients', null),
      OfflineStore.loadCache('units', null),
      OfflineStore.loadCache('catalog', null),
      OfflineStore.loadCache('profile', null)
    ]);

    if (Array.isArray(ordersIdb) && (!ordersMemoryCache || ordersIdb.length >= ordersMemoryCache.length)) {
      ordersMemoryCache = ordersIdb;
      safeLocalStorageSet(LS_ORDERS_KEY, JSON.stringify(ordersIdb));
    }
    if (Array.isArray(clientsIdb) && (!clientsMemoryCache || clientsIdb.length >= clientsMemoryCache.length)) {
      clientsMemoryCache = clientsIdb;
      safeLocalStorageSet(LS_CLIENTS_KEY, JSON.stringify(clientsIdb));
    }
    if (Array.isArray(unitsIdb) && (!unitsMemoryCache || unitsIdb.length >= unitsMemoryCache.length)) {
      unitsMemoryCache = unitsIdb;
      safeLocalStorageSet(LS_UNITS_KEY, JSON.stringify(unitsIdb));
    }
    if (Array.isArray(catalogIdb) && catalogIdb.length > 0) {
      catalogMemoryCache = catalogIdb;
      safeLocalStorageSet(LS_CATALOG_ITEMS_KEY, JSON.stringify(catalogIdb));
    }
    if (profileIdb && !profileMemoryCache) {
      profileMemoryCache = profileIdb;
      safeLocalStorageSet(LS_PROFILE_KEY, JSON.stringify(profileIdb));
    }

    return {
      orders: this.getOrders(),
      clients: this.getClients(),
      units: this.getUnits(),
      profile: this.getUserProfile()
    };
  },

  // ---- CATÁLOGO BASE DE CHECKLIST (public.checklist_itens_modelo + public.tematicas) ----
  getBaseChecklistItems() {
    if (Array.isArray(catalogMemoryCache) && catalogMemoryCache.length > 0) {
      return catalogMemoryCache;
    }
    const cached = safeLocalStorageGet(LS_CATALOG_ITEMS_KEY, null);
    if (Array.isArray(cached) && cached.length > 0) {
      catalogMemoryCache = cached;
      return cached;
    }
    return EMSERH_BASE_ITEMS;
  },

  // ---- SESSÃO MULTI-USUÁRIO & PERFIL PERSISTIDO NO SUPABASE AUTH ----
  syncSessionUser(user) {
    if (!user) {
      ordersMemoryCache = null;
      profileMemoryCache = null;
      clientsMemoryCache = null;
      unitsMemoryCache = null;
      localStorage.removeItem(LS_ACTIVE_UID_KEY);
      localStorage.removeItem(LS_ORDERS_KEY);
      localStorage.removeItem(LS_CLIENTS_KEY);
      localStorage.removeItem(LS_UNITS_KEY);
      localStorage.removeItem(LS_PROFILE_KEY);
      OfflineStore.clearAllDataCaches();
      return null;
    }

    const previousUid = localStorage.getItem(LS_ACTIVE_UID_KEY);
    if (previousUid && previousUid !== user.id) {
      ordersMemoryCache = null;
      profileMemoryCache = null;
      clientsMemoryCache = null;
      unitsMemoryCache = null;
      localStorage.removeItem(LS_ORDERS_KEY);
      localStorage.removeItem(LS_CLIENTS_KEY);
      localStorage.removeItem(LS_UNITS_KEY);
      localStorage.removeItem(LS_PROFILE_KEY);
      OfflineStore.clearAllDataCaches();
    }
    localStorage.setItem(LS_ACTIVE_UID_KEY, user.id);

    const pending = OfflineStore.getPendingIndex();
    if (pending.updateProfile) {
      return this.getUserProfile();
    }

    const meta = user.user_metadata || {};
    const syncedProfile = {
      name: meta.full_name || user.email?.split('@')[0] || DEFAULT_USER_PROFILE.name,
      email: user.email || '',
      registry: meta.registry || DEFAULT_USER_PROFILE.registry,
      title: meta.title || DEFAULT_USER_PROFILE.title,
      specialty: meta.specialty || DEFAULT_USER_PROFILE.specialty,
      consultancyName: meta.consultancy_name || '',
      phone: meta.phone || '',
      avatarUrl: meta.avatar_url || '',
      signatureUrl: meta.signature_url || ''
    };

    persistProfileCache(syncedProfile);
    return syncedProfile;
  },

  getUserProfile() {
    if (profileMemoryCache) return profileMemoryCache;
    const stored = safeLocalStorageGet(LS_PROFILE_KEY, DEFAULT_USER_PROFILE);
    profileMemoryCache = stored;
    return stored;
  },

  async saveUserProfile(profile) {
    persistProfileCache(profile);
    await OfflineStore.enqueueProfileUpdate();

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client.auth.updateUser({
            data: {
              full_name: profile.name,
              registry: profile.registry,
              title: profile.title,
              specialty: profile.specialty,
              consultancy_name: profile.consultancyName,
              phone: profile.phone,
              avatar_url: profile.avatarUrl || '',
              signature_url: profile.signatureUrl || ''
            }
          });
          if (error) {
            throw new Error(`Erro ao salvar perfil no Supabase: ${error.message}`);
          }
          await OfflineStore.dequeueProfileUpdate();
        }
      } catch (err) {
        if (navigator.onLine !== false && !String(err?.message || '').toLowerCase().includes('fetch')) {
          throw err;
        }
        console.warn('Perfil salvo offline e enfileirado para sincronização.');
      }
    }
    return profile;
  },

  // ---- CLIENTES (public.clientes) ----
  getClients() {
    if (clientsMemoryCache) return clientsMemoryCache;
    const stored = safeLocalStorageGet(LS_CLIENTS_KEY, []);
    clientsMemoryCache = stored;
    return stored;
  },

  async saveClient(clientData) {
    const nome = (clientData.nome || '').trim();
    if (!nome) throw new Error('Informe o nome do cliente.');

    const list = this.getClients();
    const existingIdx = list.findIndex(
      (c) => (clientData.id && c.id === clientData.id) || c.nome.toLowerCase() === nome.toLowerCase()
    );
    const localId = clientData.id || `local-client-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record = {
      id: localId,
      nome,
      codigo: (clientData.codigo || '').trim(),
      segmento: (clientData.segmento || 'Hospitalar / Saúde').trim(),
      logoUrl: clientData.logoUrl || '',
      ativo: true,
      updatedAt: new Date().toISOString()
    };

    const nextList = existingIdx >= 0
      ? list.map((c, idx) => (idx === existingIdx ? { ...c, ...record, id: c.id } : c))
      : [...list, record].sort((a, b) => a.nome.localeCompare(b.nome));

    const persistedRecord = nextList.find((c) => c.nome === nome) || record;
    persistClientsCache(nextList);
    await OfflineStore.enqueueClientUpsert(persistedRecord.nome);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const synced = await this.syncClientToSupabase(persistedRecord);
        if (synced?.id) {
          const reconciled = this.getClients().map((c) =>
            c.nome === synced.nome
              ? { ...c, ...synced, logoUrl: synced.logo_url ?? c.logoUrl ?? '' }
              : c
          );
          persistClientsCache(reconciled);
          await OfflineStore.dequeueClientUpsert(persistedRecord.nome);
          return reconciled;
        }
      } catch (err) {
        console.warn('Cliente salvo offline; aguardando sincronização:', err.message);
      }
    }

    return nextList;
  },

  async deleteClient(clientRow) {
    const nextList = this.getClients().filter(
      (c) => c.id !== clientRow.id && c.nome !== clientRow.nome
    );
    persistClientsCache(nextList);
    await OfflineStore.enqueueClientDelete(clientRow.nome);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        if (await this.flushPendingClientDelete(clientRow.nome)) {
          return nextList;
        }
      } catch (err) {
        console.warn('Exclusão de cliente aguardando conexão:', err.message);
      }
    }
    return nextList;
  },

  async syncClientToSupabase(clientRecord) {
    if (!isSupabaseConfigured()) return null;
    const { client } = getSupabaseClient();
    if (!client) return null;
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    const basePayload = {
      user_id: user.id,
      nome: clientRecord.nome,
      codigo: clientRecord.codigo || null,
      segmento: clientRecord.segmento || 'Hospitalar / Saúde',
      ativo: true
    };

    let { data, error } = await client
      .from('clientes')
      .upsert(
        {
          ...basePayload,
          ...(clientRecord.logoUrl !== undefined ? { logo_url: clientRecord.logoUrl || null } : {})
        },
        { onConflict: 'user_id,nome' }
      )
      .select('id, nome, codigo, segmento, logo_url')
      .single();

    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('logo_url'))) {
      const retry = await client
        .from('clientes')
        .upsert(basePayload, { onConflict: 'user_id,nome' })
        .select('id, nome, codigo, segmento')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async flushPendingClient(clientName) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const rec = this.getClients().find((c) => c.nome === clientName);
    if (!rec) {
      await OfflineStore.dequeueClientUpsert(clientName);
      return true;
    }
    const synced = await this.syncClientToSupabase(rec);
    if (!synced?.id) return false;
    const updated = this.getClients().map((c) => (c.nome === clientName ? { ...c, ...synced } : c));
    persistClientsCache(updated);
    await OfflineStore.dequeueClientUpsert(clientName);
    return true;
  },

  async flushPendingClientDelete(clientName) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;
    const { error } = await client
      .from('clientes')
      .delete()
      .eq('user_id', userData.user.id)
      .eq('nome', clientName);
    if (error) return false;
    await OfflineStore.dequeueClientDelete(clientName);
    return true;
  },

  // ---- UNIDADES ATENDIDAS (public.unidades) ----
  getUnits() {
    if (unitsMemoryCache) return unitsMemoryCache;
    const stored = safeLocalStorageGet(LS_UNITS_KEY, []);
    unitsMemoryCache = stored;
    return stored;
  },

  async saveUnit(unitData) {
    const nome = (unitData.nome || '').trim();
    const regional = (unitData.regional || '').trim();
    const municipio = (unitData.municipio || '').trim();
    if (!nome || !regional || !municipio) {
      throw new Error('Preencha Nome da Unidade, Regional e Município.');
    }

    const clienteNome = (unitData.clienteNome || '').trim();
    const list = this.getUnits();
    const existingIdx = list.findIndex(
      (u) =>
        (unitData.id && u.id === unitData.id) ||
        (u.nome.toLowerCase() === nome.toLowerCase() &&
          (u.clienteNome || '').toLowerCase() === clienteNome.toLowerCase())
    );

    const localId =
      existingIdx >= 0
        ? list[existingIdx].id
        : unitData.id || `local-unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const record = {
      id: localId,
      clienteId: unitData.clienteId || (existingIdx >= 0 ? list[existingIdx].clienteId : null),
      clienteNome,
      codigo: (unitData.codigo || '').trim(),
      nome,
      tipo: (unitData.tipo || 'Hospital').trim(),
      regional,
      municipio,
      uf: (unitData.uf || 'MA').trim().toUpperCase(),
      endereco: (unitData.endereco || '').trim(),
      responsavelLocal: (unitData.responsavelLocal || '').trim(),
      contatoLocal: (unitData.contatoLocal || '').trim(),
      ativo: true,
      updatedAt: new Date().toISOString()
    };

    const nextList =
      existingIdx >= 0
        ? list.map((u, idx) => (idx === existingIdx ? { ...u, ...record } : u))
        : [...list, record].sort((a, b) => a.nome.localeCompare(b.nome));

    persistUnitsCache(nextList);

    // Garantir que o cliente exista na lista local de clientes
    if (clienteNome && !this.getClients().some((c) => c.nome.toLowerCase() === clienteNome.toLowerCase())) {
      await this.saveClient({ nome: clienteNome });
    }

    await OfflineStore.enqueueUnitUpsert(record.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const synced = await this.syncUnitToSupabase(record);
        if (synced?.id) {
          const reconciled = this.getUnits().map((u) =>
            u.id === record.id
              ? {
                  ...u,
                  id: synced.id,
                  supabaseId: synced.id,
                  clienteId: synced.cliente_id || u.clienteId
                }
              : u
          );
          persistUnitsCache(reconciled);
          await OfflineStore.dequeueUnitUpsert(record.id);
          return reconciled;
        }
      } catch (err) {
        console.warn('Unidade salva offline; aguardando sincronização:', err.message);
      }
    }

    return nextList;
  },

  async deleteUnit(unit) {
    const nextList = this.getUnits().filter((u) => u.id !== unit.id);
    persistUnitsCache(nextList);
    await OfflineStore.enqueueUnitDelete(unit.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        if (await this.flushPendingUnitDelete(unit.id)) {
          return nextList;
        }
      } catch (err) {
        console.warn('Exclusão de unidade aguardando conexão:', err.message);
      }
    }
    return nextList;
  },

  async syncUnitToSupabase(unitRecord) {
    if (!isSupabaseConfigured()) return null;
    const { client } = getSupabaseClient();
    if (!client) return null;
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return null;

    let clienteId = isUuid(unitRecord.clienteId) ? unitRecord.clienteId : null;
    if (!clienteId && unitRecord.clienteNome) {
      try {
        const cSynced = await this.syncClientToSupabase({ nome: unitRecord.clienteNome });
        clienteId = cSynced?.id || null;
      } catch {
        // segue sem FK se tabela clientes indisponível
      }
    }

    const payload = {
      user_id: user.id,
      cliente_id: clienteId,
      cliente_nome: unitRecord.clienteNome || '',
      codigo: unitRecord.codigo || null,
      nome: unitRecord.nome,
      tipo: unitRecord.tipo || 'Hospital',
      regional: unitRecord.regional,
      municipio: unitRecord.municipio,
      uf: unitRecord.uf || 'MA',
      endereco: unitRecord.endereco || null,
      responsavel_local: unitRecord.responsavelLocal || null,
      contato_local: unitRecord.contatoLocal || null,
      ativo: true
    };

    if (isUuid(unitRecord.id)) {
      const { data, error } = await client
        .from('unidades')
        .update(payload)
        .eq('id', unitRecord.id)
        .select('id, cliente_id')
        .single();
      if (!error && data) return data;
    }

    const { data, error } = await client
      .from('unidades')
      .upsert(payload, { onConflict: 'user_id,cliente_nome,nome' })
      .select('id, cliente_id')
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205') return null;
      throw new Error(error.message);
    }
    return data;
  },

  async flushPendingUnit(unitKey) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const rec = this.getUnits().find((u) => u.id === unitKey);
    if (!rec) {
      await OfflineStore.dequeueUnitUpsert(unitKey);
      return true;
    }
    const synced = await this.syncUnitToSupabase(rec);
    if (!synced?.id) return false;
    const updated = this.getUnits().map((u) =>
      u.id === unitKey ? { ...u, id: synced.id, supabaseId: synced.id, clienteId: synced.cliente_id || u.clienteId } : u
    );
    persistUnitsCache(updated);
    await OfflineStore.dequeueUnitUpsert(unitKey);
    return true;
  },

  async flushPendingUnitDelete(unitKey) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    if (!isUuid(unitKey)) {
      await OfflineStore.dequeueUnitDelete(unitKey);
      return true;
    }
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { error } = await client.from('unidades').delete().eq('id', unitKey);
    if (error && error.code !== '42P01' && error.code !== 'PGRST205') return false;
    await OfflineStore.dequeueUnitDelete(unitKey);
    return true;
  },

  async importUnitsFromOrders(orders = []) {
    let current = this.getUnits();
    for (const ord of orders) {
      const nome = (ord.hospitalName || '').trim();
      if (!nome) continue;
      const clienteNome = (ord.clientName || '').trim();
      const exists = current.some(
        (u) =>
          u.nome.toLowerCase() === nome.toLowerCase() &&
          (u.clienteNome || '').toLowerCase() === clienteNome.toLowerCase()
      );
      if (!exists) {
        current = await this.saveUnit({
          clienteNome,
          nome,
          regional: ord.regional || 'Regional',
          municipio: ord.municipio || 'Município',
          tipo: 'Hospital'
        });
      }
    }
    return current;
  },

  // ---- INSPEÇÕES & CHECKLISTS (public.inspecoes + public.inspecao_respostas) ----
  getOrders() {
    if (Array.isArray(ordersMemoryCache)) return ordersMemoryCache;
    const stored = safeLocalStorageGet(LS_ORDERS_KEY, []);
    ordersMemoryCache = stored;
    return stored;
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

    persistOrdersCache(newOrders);
    OfflineStore.enqueueOrderUpsert(mergedOrder.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      this.syncOrderWithMedia(mergedOrder)
        .then(async ({ inspecaoRow, resolvedOrder }) => {
          if (!inspecaoRow?.id) return;
          const latest = this.getOrders();
          const patched = latest.map((o) =>
            o.id === mergedOrder.id
              ? { ...o, ...resolvedOrder, supabaseId: inspecaoRow.id }
              : o
          );
          persistOrdersCache(patched);
          await OfflineStore.dequeueOrderUpsert(mergedOrder.id);
          if (typeof onSynced === 'function') {
            onSynced(inspecaoRow.id, patched);
          }
        })
        .catch((err) => {
          console.warn('Inspeção salva offline; aguardando sincronização:', err.message);
        });
    }

    return newOrders;
  },

  async syncOrderWithMedia(order) {
    let resolvedOrder = order;
    const checklist = order.checklist || [];
    let mediaChanged = false;

    if (navigator.onLine !== false && isSupabaseConfigured()) {
      const cleanOrderId = String(order.id || 'os').replace(/[^A-Za-z0-9-_]/g, '');
      const updatedChecklist = await Promise.all(
        checklist.map(async (item) => {
          if (!item?.evidenceUrl || !String(item.evidenceUrl).startsWith('data:image/')) {
            return item;
          }
          const cleanItemId = String(item.id || `item-${item.number}`).replace(/[^A-Za-z0-9-_]/g, '');
          const uploadedUrl = await uploadDataUrlToStorage(
            item.evidenceUrl,
            `checklists/${cleanOrderId}/${cleanItemId}-${Date.now()}.jpg`
          );
          if (uploadedUrl) {
            mediaChanged = true;
            return { ...item, evidenceUrl: uploadedUrl };
          }
          return item;
        })
      );

      if (mediaChanged) {
        resolvedOrder = { ...order, checklist: updatedChecklist };
      }
    }

    const inspecaoRow = await this.syncOrderToSupabase(resolvedOrder, { silentAuth: true });
    return { inspecaoRow, resolvedOrder };
  },

  async flushPendingProfile() {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const profile = this.getUserProfile();
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;

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
    if (error) return false;
    await OfflineStore.dequeueProfileUpdate();
    return true;
  },

  async flushPendingOrder(orderId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const order = this.getOrderById(orderId);
    if (!order) {
      await OfflineStore.dequeueOrderUpsert(orderId);
      return true;
    }

    const { inspecaoRow, resolvedOrder } = await this.syncOrderWithMedia(order);
    if (!inspecaoRow?.id) return false;

    const latest = this.getOrders();
    const patched = latest.map((o) =>
      o.id === orderId ? { ...o, ...resolvedOrder, supabaseId: inspecaoRow.id } : o
    );
    persistOrdersCache(patched);
    await OfflineStore.dequeueOrderUpsert(orderId);
    return true;
  },

  async flushPendingOrderDelete(orderId) {
    if (!isSupabaseConfigured() || navigator.onLine === false) return false;
    const { client } = getSupabaseClient();
    if (!client) return false;
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;

    const { error } = await client
      .from('inspecoes')
      .delete()
      .eq('codigo_kivo', orderId);
    if (error) return false;
    await OfflineStore.dequeueOrderDelete(orderId);
    return true;
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

  async uploadChecklistEvidence(file, orderId, itemId, stampText = '') {
    const compressedDataUrl = await compressImageToDataUrl(file, 1280, 0.78, stampText);
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return compressedDataUrl;
    }

    const cleanOrderId = String(orderId || 'os').replace(/[^A-Za-z0-9-_]/g, '');
    const cleanItemId = String(itemId || 'item').replace(/[^A-Za-z0-9-_]/g, '');
    const uploadedUrl = await uploadDataUrlToStorage(
      compressedDataUrl,
      `checklists/${cleanOrderId}/${cleanItemId}-${Date.now()}.jpg`
    );

    return uploadedUrl || compressedDataUrl;
  },

  async deleteOrder(order) {
    const mediaUrls = (order?.checklist || []).map((item) => item?.evidenceUrl).filter(Boolean);
    const nextOrders = this.getOrders().filter((o) => o.id !== order.id);
    persistOrdersCache(nextOrders);
    await OfflineStore.enqueueOrderDelete(order.id);

    if (isSupabaseConfigured() && navigator.onLine !== false) {
      try {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client
            .from('inspecoes')
            .delete()
            .eq('codigo_kivo', order.id);
          if (!error) {
            await OfflineStore.dequeueOrderDelete(order.id);
            await removeStorageFilesByUrls(mediaUrls);
          } else {
            console.warn('Erro ao excluir inspeção no Supabase:', error.message);
          }
        }
      } catch (err) {
        console.warn('Exclusão de inspeção aguardando conexão:', err.message);
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
      catalogMemoryCache = baseItems;
      safeLocalStorageSet(LS_CATALOG_ITEMS_KEY, JSON.stringify(baseItems));
      OfflineStore.saveCache('catalog', baseItems);
    }

    return { byCode, byNumber, byId, baseItems };
  },

  async loadFromSupabase() {
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return {
        orders: this.getOrders(),
        baseItems: this.getBaseChecklistItems(),
        clients: this.getClients(),
        units: this.getUnits()
      };
    }
    const { client } = getSupabaseClient();
    if (!client) return null;

    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return null;

    const modelMap = await this.getChecklistModelMap(client);
    const canonicalBase = modelMap.baseItems.length > 0 ? modelMap.baseItems : EMSERH_BASE_ITEMS;
    const pending = OfflineStore.getPendingIndex();

    // Carregar clientes reais se a tabela existir (preservando pendências offline)
    let clients = this.getClients();
    try {
      let { data: cData, error: cErr } = await client
        .from('clientes')
        .select('id, nome, codigo, segmento, logo_url')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (cErr && (cErr.code === '42703' || cErr.code === 'PGRST204' || cErr.message?.includes('logo_url'))) {
        const retry = await client
          .from('clientes')
          .select('id, nome, codigo, segmento')
          .eq('ativo', true)
          .order('nome', { ascending: true });
        cData = retry.data;
        cErr = retry.error;
      }
      if (!cErr && Array.isArray(cData)) {
        const mappedClients = cData.map((c) => ({
          ...c,
          logoUrl: c.logo_url || ''
        }));
        const delClients = new Set(pending.deleteClients || []);
        const dirtyClients = new Set(pending.upsertClients || []);
        const localByClient = new Map(clients.map((c) => [c.nome, c]));
        const mergedClients = mappedClients
          .filter((c) => !delClients.has(c.nome))
          .map((c) => (dirtyClients.has(c.nome) && localByClient.has(c.nome) ? localByClient.get(c.nome) : c));
        const seenClientNames = new Set(mergedClients.map((c) => c.nome));
        const localOnlyClients = clients.filter((c) => dirtyClients.has(c.nome) && !seenClientNames.has(c.nome));
        clients = [...mergedClients, ...localOnlyClients].sort((a, b) => a.nome.localeCompare(b.nome));
        persistClientsCache(clients);
      }
    } catch {
      // ignora se migration 002 não foi aplicada
    }

    // Carregar unidades reais se migration 004 estiver aplicada (preservando pendências offline)
    let units = this.getUnits();
    try {
      const { data: uData, error: uErr } = await client
        .from('unidades')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (!uErr && Array.isArray(uData)) {
        const mappedRemoteUnits = uData.map((u) => ({
          id: u.id,
          supabaseId: u.id,
          clienteId: u.cliente_id || null,
          clienteNome: u.cliente_nome || '',
          codigo: u.codigo || '',
          nome: u.nome,
          tipo: u.tipo || 'Hospital',
          regional: u.regional,
          municipio: u.municipio,
          uf: u.uf || 'MA',
          endereco: u.endereco || '',
          responsavelLocal: u.responsavel_local || '',
          contatoLocal: u.contato_local || '',
          ativo: u.ativo !== false,
          updatedAt: u.updated_at
        }));
        const delUnits = new Set(pending.deleteUnits || []);
        const dirtyUnits = new Set(pending.upsertUnits || []);
        const localByUnit = new Map(units.map((u) => [u.id, u]));
        const mergedUnits = mappedRemoteUnits
          .filter((u) => !delUnits.has(u.id))
          .map((u) => (dirtyUnits.has(u.id) && localByUnit.has(u.id) ? localByUnit.get(u.id) : u));
        const seenUnitIds = new Set(mergedUnits.map((u) => u.id));
        const localOnlyUnits = units.filter((u) => dirtyUnits.has(u.id) && !seenUnitIds.has(u.id));
        units = [...mergedUnits, ...localOnlyUnits].sort((a, b) => a.nome.localeCompare(b.nome));
        persistUnitsCache(units);
      }
    } catch {
      // ignora se migration 004 não foi aplicada ainda
    }

    let { data: inspecoes, error } = await client
      .from('inspecoes')
      .select(`
        id,
        codigo_kivo,
        cliente_id,
        cliente_nome,
        unidade_id,
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

    if (error && (error.code === 'PGRST204' || error.message?.includes('cliente_') || error.message?.includes('unidade_id'))) {
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
        unidadeId: insp.unidade_id || null,
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

    // Renovar URLs assinadas das evidências (7 dias de validade) ao carregar do Supabase
    if (navigator.onLine !== false) {
      const allEvidenceUrls = [];
      mappedOrders.forEach((ord) => {
        (ord.checklist || []).forEach((item) => {
          if (item.evidenceUrl) allEvidenceUrls.push(item.evidenceUrl);
        });
      });
      const refreshedMap = await refreshSignedMediaUrls(client, allEvidenceUrls);
      if (refreshedMap.size > 0) {
        mappedOrders.forEach((ord) => {
          ord.checklist.forEach((item) => {
            if (item.evidenceUrl && refreshedMap.has(item.evidenceUrl)) {
              item.evidenceUrl = refreshedMap.get(item.evidenceUrl);
            }
          });
        });
      }
    }

    // Preservar edições/exclusões feitas offline que ainda não foram enviadas para o Supabase
    const deletedSet = new Set(pending.deleteOrders);
    const dirtySet = new Set(pending.upsertOrders);
    const localOrders = this.getOrders();
    const localById = new Map(localOrders.map((o) => [o.id, o]));

    const mergedRemote = mappedOrders
      .filter((remoteOrd) => !deletedSet.has(remoteOrd.id))
      .map((remoteOrd) => (dirtySet.has(remoteOrd.id) && localById.has(remoteOrd.id)
        ? localById.get(remoteOrd.id)
        : remoteOrd));

    const seenIds = new Set(mergedRemote.map((o) => o.id));
    const localOnlyPending = localOrders.filter((o) => dirtySet.has(o.id) && !seenIds.has(o.id));
    const finalOrders = [...localOnlyPending, ...mergedRemote];

    persistOrdersCache(finalOrders);
    return {
      orders: finalOrders,
      baseItems: canonicalBase,
      clients,
      units
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

    const unidadeId = isUuid(order.unidadeId) ? order.unidadeId : null;

    const upsertInspecao = async (payload) => {
      let result = await client
        .from('inspecoes')
        .upsert(payload, { onConflict: 'user_id,codigo_kivo' })
        .select('id')
        .single();

      if (result.error?.code === '42P10') {
        // Fallback caso a migration 005 ainda não tenha sido executada
        result = await client
          .from('inspecoes')
          .upsert(payload, { onConflict: 'codigo_kivo' })
          .select('id')
          .single();
      }
      return result;
    };

    let { data: inspecaoRow, error: inspecaoError } = await upsertInspecao({
      ...basePayload,
      ...(clientName ? { cliente_nome: clientName } : {}),
      ...(clienteId ? { cliente_id: clienteId } : {}),
      ...(unidadeId ? { unidade_id: unidadeId } : {})
    });

    if (inspecaoError && (inspecaoError.code === 'PGRST204' || inspecaoError.message?.includes('cliente_') || inspecaoError.message?.includes('unidade_id'))) {
      const retry = await upsertInspecao({
        ...basePayload,
        ...(clientName ? { cliente_nome: clientName } : {}),
        ...(clienteId ? { cliente_id: clienteId } : {})
      });
      inspecaoRow = retry.data;
      inspecaoError = retry.error;

      if (inspecaoError && (inspecaoError.code === 'PGRST204' || inspecaoError.message?.includes('cliente_'))) {
        const retry2 = await upsertInspecao(basePayload);
        inspecaoRow = retry2.data;
        inspecaoError = retry2.error;
      }
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
