// Armazenamento Offline-First do Kivo (IndexedDB + índice síncrono de pendências + diagnóstico)

const DB_NAME = 'kivo_offline_db';
const DB_VERSION = 1;
const STORE_KV = 'kv_cache';
const STORE_QUEUE = 'pending_ops';

const LS_QUEUE_INDEX_KEY = 'kivo_pending_sync_index';
const LS_SYNC_ERRORS_KEY = 'kivo_sync_errors';

const EMPTY_INDEX = {
  upsertOrders: [],
  deleteOrders: [],
  upsertReports: [],
  deleteReports: [],
  upsertUnits: [],
  deleteUnits: [],
  upsertClients: [],
  deleteClients: [],
  upsertTemplates: [],
  deleteTemplates: [],
  upsertSchedules: [],
  deleteSchedules: [],
  upsertSstItems: [],
  deleteSstItems: [],
  updateProfile: false
};

const listeners = new Set();

function notifyListeners() {
  const count = OfflineStore.getPendingCount();
  listeners.forEach((fn) => {
    try {
      fn(count);
    } catch {
      // ignora erro em listener de UI
    }
  });
}

export function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage cheio para "${key}"; usando IndexedDB:`, err?.message || err);
    return false;
  }
}

export function safeLocalStorageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getIndex() {
  const raw = safeLocalStorageGet(LS_QUEUE_INDEX_KEY, null);
  if (!raw || typeof raw !== 'object') return { ...EMPTY_INDEX };
  const resolved = {};
  for (const key of Object.keys(EMPTY_INDEX)) {
    if (key === 'updateProfile') {
      resolved[key] = Boolean(raw[key]);
    } else {
      resolved[key] = Array.isArray(raw[key]) ? raw[key] : [];
    }
  }
  return resolved;
}

function saveIndex(idx) {
  safeLocalStorageSet(LS_QUEUE_INDEX_KEY, JSON.stringify(idx));
  notifyListeners();
}

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORE_QUEUE)) {
          db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

async function idbPut(storeName, record) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbGet(storeName, key) {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbDelete(storeName, key) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbGetAll(storeName) {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

async function idbClear(storeName) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function enqueueListOp(addField, removeField, addPrefix, removePrefix, entityKey) {
  if (!entityKey) return;
  const idx = getIndex();
  idx[removeField] = idx[removeField].filter((k) => k !== entityKey);
  if (!idx[addField].includes(entityKey)) idx[addField].push(entityKey);
  saveIndex(idx);
  await idbDelete(STORE_QUEUE, `${removePrefix}:${entityKey}`);
  await idbPut(STORE_QUEUE, {
    id: `${addPrefix}:${entityKey}`,
    kind: addPrefix,
    entityKey,
    updatedAt: new Date().toISOString()
  });
}

async function dequeueListOp(field, prefix, entityKey) {
  if (!entityKey) return;
  const idx = getIndex();
  idx[field] = idx[field].filter((k) => k !== entityKey);
  saveIndex(idx);
  await idbDelete(STORE_QUEUE, `${prefix}:${entityKey}`);
}

export const OfflineStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  getPendingIndex() {
    return getIndex();
  },

  getPendingCount() {
    const idx = getIndex();
    return (
      idx.upsertOrders.length +
      idx.deleteOrders.length +
      idx.upsertReports.length +
      idx.deleteReports.length +
      idx.upsertUnits.length +
      idx.deleteUnits.length +
      idx.upsertClients.length +
      idx.deleteClients.length +
      idx.upsertTemplates.length +
      idx.deleteTemplates.length +
      idx.upsertSchedules.length +
      idx.deleteSchedules.length +
      idx.upsertSstItems.length +
      idx.deleteSstItems.length +
      (idx.updateProfile ? 1 : 0)
    );
  },

  // ---- DIAGNÓSTICO DE ERROS DE SINCRONIZAÇÃO ----
  getSyncErrors() {
    const list = safeLocalStorageGet(LS_SYNC_ERRORS_KEY, []);
    return Array.isArray(list) ? list : [];
  },

  recordSyncError(entity, entityKey, message) {
    if (!entity || !entityKey) return;
    const next = this.getSyncErrors().filter(
      (e) => !(e.entity === entity && e.entityKey === entityKey)
    );
    next.unshift({
      entity,
      entityKey,
      message: String(message || 'Falha de sincronização'),
      at: new Date().toISOString()
    });
    safeLocalStorageSet(LS_SYNC_ERRORS_KEY, JSON.stringify(next.slice(0, 20)));
  },

  clearSyncError(entity, entityKey) {
    const current = this.getSyncErrors();
    const next = current.filter(
      (e) => !(e.entity === entity && e.entityKey === entityKey)
    );
    if (next.length !== current.length) {
      safeLocalStorageSet(LS_SYNC_ERRORS_KEY, JSON.stringify(next));
    }
  },

  clearSyncErrors() {
    try {
      localStorage.removeItem(LS_SYNC_ERRORS_KEY);
    } catch {
      // ignora
    }
  },

  // ---- CACHE GRANDE NO INDEXEDDB ----
  async saveCache(key, value) {
    await idbPut(STORE_KV, { key, value, updatedAt: new Date().toISOString() });
  },

  async loadCache(key, fallback = null) {
    const rec = await idbGet(STORE_KV, key);
    return rec ? rec.value : fallback;
  },

  async clearAllDataCaches() {
    await idbClear(STORE_KV);
    await idbClear(STORE_QUEUE);
    this.clearSyncErrors();
    saveIndex({ ...EMPTY_INDEX });
  },

  // ---- FILA DE OPERAÇÕES PENDENTES ----
  enqueueOrderUpsert: (id) => enqueueListOp('upsertOrders', 'deleteOrders', 'upsert_order', 'delete_order', id),
  dequeueOrderUpsert: (id) => dequeueListOp('upsertOrders', 'upsert_order', id),
  enqueueOrderDelete: (id) => enqueueListOp('deleteOrders', 'upsertOrders', 'delete_order', 'upsert_order', id),
  dequeueOrderDelete: (id) => dequeueListOp('deleteOrders', 'delete_order', id),

  enqueueReportUpsert: (code) => enqueueListOp('upsertReports', 'deleteReports', 'upsert_report', 'delete_report', code),
  dequeueReportUpsert: (code) => dequeueListOp('upsertReports', 'upsert_report', code),
  enqueueReportDelete: (code) => enqueueListOp('deleteReports', 'upsertReports', 'delete_report', 'upsert_report', code),
  dequeueReportDelete: (code) => dequeueListOp('deleteReports', 'delete_report', code),

  enqueueUnitUpsert: (key) => enqueueListOp('upsertUnits', 'deleteUnits', 'upsert_unit', 'delete_unit', key),
  dequeueUnitUpsert: (key) => dequeueListOp('upsertUnits', 'upsert_unit', key),
  enqueueUnitDelete: (key) => enqueueListOp('deleteUnits', 'upsertUnits', 'delete_unit', 'upsert_unit', key),
  dequeueUnitDelete: (key) => dequeueListOp('deleteUnits', 'delete_unit', key),

  enqueueClientUpsert: (key) => enqueueListOp('upsertClients', 'deleteClients', 'upsert_client', 'delete_client', key),
  dequeueClientUpsert: (key) => dequeueListOp('upsertClients', 'upsert_client', key),
  enqueueClientDelete: (key) => enqueueListOp('deleteClients', 'upsertClients', 'delete_client', 'upsert_client', key),
  dequeueClientDelete: (key) => dequeueListOp('deleteClients', 'delete_client', key),

  enqueueTemplateUpsert: (id) => enqueueListOp('upsertTemplates', 'deleteTemplates', 'upsert_template', 'delete_template', id),
  dequeueTemplateUpsert: (id) => dequeueListOp('upsertTemplates', 'upsert_template', id),
  enqueueTemplateDelete: (id) => enqueueListOp('deleteTemplates', 'upsertTemplates', 'delete_template', 'upsert_template', id),
  dequeueTemplateDelete: (id) => dequeueListOp('deleteTemplates', 'delete_template', id),

  enqueueScheduleUpsert: (id) => enqueueListOp('upsertSchedules', 'deleteSchedules', 'upsert_schedule', 'delete_schedule', id),
  dequeueScheduleUpsert: (id) => dequeueListOp('upsertSchedules', 'upsert_schedule', id),
  enqueueScheduleDelete: (id) => enqueueListOp('deleteSchedules', 'upsertSchedules', 'delete_schedule', 'upsert_schedule', id),
  dequeueScheduleDelete: (id) => dequeueListOp('deleteSchedules', 'delete_schedule', id),

  enqueueSstUpsert: (id) => enqueueListOp('upsertSstItems', 'deleteSstItems', 'upsert_sst', 'delete_sst', id),
  dequeueSstUpsert: (id) => dequeueListOp('upsertSstItems', 'upsert_sst', id),
  enqueueSstDelete: (id) => enqueueListOp('deleteSstItems', 'upsertSstItems', 'delete_sst', 'upsert_sst', id),
  dequeueSstDelete: (id) => dequeueListOp('deleteSstItems', 'delete_sst', id),

  async enqueueProfileUpdate() {
    const idx = getIndex();
    idx.updateProfile = true;
    saveIndex(idx);
    await idbPut(STORE_QUEUE, {
      id: 'update_profile:current',
      kind: 'update_profile',
      entityKey: 'current',
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueProfileUpdate() {
    const idx = getIndex();
    idx.updateProfile = false;
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, 'update_profile:current');
  },

  async listQueuedOps() {
    return idbGetAll(STORE_QUEUE);
  }
};
