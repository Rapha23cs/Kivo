// Armazenamento Offline-First do Kivo (IndexedDB + índice síncrono de pendências)

const DB_NAME = 'kivo_offline_db';
const DB_VERSION = 1;
const STORE_KV = 'kv_cache';
const STORE_QUEUE = 'pending_ops';

const LS_QUEUE_INDEX_KEY = 'kivo_pending_sync_index';

const EMPTY_INDEX = {
  upsertOrders: [],
  deleteOrders: [],
  upsertReports: [],
  deleteReports: [],
  upsertUnits: [],
  deleteUnits: [],
  upsertClients: [],
  deleteClients: [],
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
  return {
    upsertOrders: Array.isArray(raw.upsertOrders) ? raw.upsertOrders : [],
    deleteOrders: Array.isArray(raw.deleteOrders) ? raw.deleteOrders : [],
    upsertReports: Array.isArray(raw.upsertReports) ? raw.upsertReports : [],
    deleteReports: Array.isArray(raw.deleteReports) ? raw.deleteReports : [],
    upsertUnits: Array.isArray(raw.upsertUnits) ? raw.upsertUnits : [],
    deleteUnits: Array.isArray(raw.deleteUnits) ? raw.deleteUnits : [],
    upsertClients: Array.isArray(raw.upsertClients) ? raw.upsertClients : [],
    deleteClients: Array.isArray(raw.deleteClients) ? raw.deleteClients : [],
    updateProfile: Boolean(raw.updateProfile)
  };
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
      (idx.updateProfile ? 1 : 0)
    );
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
    saveIndex({ ...EMPTY_INDEX });
  },

  // ---- FILA DE OPERAÇÕES PENDENTES ----
  async enqueueOrderUpsert(orderId) {
    if (!orderId) return;
    const idx = getIndex();
    idx.deleteOrders = idx.deleteOrders.filter((k) => k !== orderId);
    if (!idx.upsertOrders.includes(orderId)) idx.upsertOrders.push(orderId);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_order:${orderId}`);
    await idbPut(STORE_QUEUE, {
      id: `upsert_order:${orderId}`,
      kind: 'upsert_order',
      entityKey: orderId,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueOrderUpsert(orderId) {
    if (!orderId) return;
    const idx = getIndex();
    idx.upsertOrders = idx.upsertOrders.filter((k) => k !== orderId);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_order:${orderId}`);
  },

  async enqueueOrderDelete(orderId) {
    if (!orderId) return;
    const idx = getIndex();
    idx.upsertOrders = idx.upsertOrders.filter((k) => k !== orderId);
    if (!idx.deleteOrders.includes(orderId)) idx.deleteOrders.push(orderId);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_order:${orderId}`);
    await idbPut(STORE_QUEUE, {
      id: `delete_order:${orderId}`,
      kind: 'delete_order',
      entityKey: orderId,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueOrderDelete(orderId) {
    if (!orderId) return;
    const idx = getIndex();
    idx.deleteOrders = idx.deleteOrders.filter((k) => k !== orderId);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_order:${orderId}`);
  },

  async enqueueReportUpsert(codigoRelatorio) {
    if (!codigoRelatorio) return;
    const idx = getIndex();
    idx.deleteReports = idx.deleteReports.filter((k) => k !== codigoRelatorio);
    if (!idx.upsertReports.includes(codigoRelatorio)) idx.upsertReports.push(codigoRelatorio);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_report:${codigoRelatorio}`);
    await idbPut(STORE_QUEUE, {
      id: `upsert_report:${codigoRelatorio}`,
      kind: 'upsert_report',
      entityKey: codigoRelatorio,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueReportUpsert(codigoRelatorio) {
    if (!codigoRelatorio) return;
    const idx = getIndex();
    idx.upsertReports = idx.upsertReports.filter((k) => k !== codigoRelatorio);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_report:${codigoRelatorio}`);
  },

  async enqueueReportDelete(codigoRelatorio) {
    if (!codigoRelatorio) return;
    const idx = getIndex();
    idx.upsertReports = idx.upsertReports.filter((k) => k !== codigoRelatorio);
    if (!idx.deleteReports.includes(codigoRelatorio)) idx.deleteReports.push(codigoRelatorio);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_report:${codigoRelatorio}`);
    await idbPut(STORE_QUEUE, {
      id: `delete_report:${codigoRelatorio}`,
      kind: 'delete_report',
      entityKey: codigoRelatorio,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueReportDelete(codigoRelatorio) {
    if (!codigoRelatorio) return;
    const idx = getIndex();
    idx.deleteReports = idx.deleteReports.filter((k) => k !== codigoRelatorio);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_report:${codigoRelatorio}`);
  },

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

  async enqueueUnitUpsert(unitKey) {
    if (!unitKey) return;
    const idx = getIndex();
    idx.deleteUnits = idx.deleteUnits.filter((k) => k !== unitKey);
    if (!idx.upsertUnits.includes(unitKey)) idx.upsertUnits.push(unitKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_unit:${unitKey}`);
    await idbPut(STORE_QUEUE, {
      id: `upsert_unit:${unitKey}`,
      kind: 'upsert_unit',
      entityKey: unitKey,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueUnitUpsert(unitKey) {
    if (!unitKey) return;
    const idx = getIndex();
    idx.upsertUnits = idx.upsertUnits.filter((k) => k !== unitKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_unit:${unitKey}`);
  },

  async enqueueUnitDelete(unitKey) {
    if (!unitKey) return;
    const idx = getIndex();
    idx.upsertUnits = idx.upsertUnits.filter((k) => k !== unitKey);
    if (!idx.deleteUnits.includes(unitKey)) idx.deleteUnits.push(unitKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_unit:${unitKey}`);
    await idbPut(STORE_QUEUE, {
      id: `delete_unit:${unitKey}`,
      kind: 'delete_unit',
      entityKey: unitKey,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueUnitDelete(unitKey) {
    if (!unitKey) return;
    const idx = getIndex();
    idx.deleteUnits = idx.deleteUnits.filter((k) => k !== unitKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_unit:${unitKey}`);
  },

  async enqueueClientUpsert(clientKey) {
    if (!clientKey) return;
    const idx = getIndex();
    idx.deleteClients = idx.deleteClients.filter((k) => k !== clientKey);
    if (!idx.upsertClients.includes(clientKey)) idx.upsertClients.push(clientKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_client:${clientKey}`);
    await idbPut(STORE_QUEUE, {
      id: `upsert_client:${clientKey}`,
      kind: 'upsert_client',
      entityKey: clientKey,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueClientUpsert(clientKey) {
    if (!clientKey) return;
    const idx = getIndex();
    idx.upsertClients = idx.upsertClients.filter((k) => k !== clientKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_client:${clientKey}`);
  },

  async enqueueClientDelete(clientKey) {
    if (!clientKey) return;
    const idx = getIndex();
    idx.upsertClients = idx.upsertClients.filter((k) => k !== clientKey);
    if (!idx.deleteClients.includes(clientKey)) idx.deleteClients.push(clientKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `upsert_client:${clientKey}`);
    await idbPut(STORE_QUEUE, {
      id: `delete_client:${clientKey}`,
      kind: 'delete_client',
      entityKey: clientKey,
      updatedAt: new Date().toISOString()
    });
  },

  async dequeueClientDelete(clientKey) {
    if (!clientKey) return;
    const idx = getIndex();
    idx.deleteClients = idx.deleteClients.filter((k) => k !== clientKey);
    saveIndex(idx);
    await idbDelete(STORE_QUEUE, `delete_client:${clientKey}`);
  },

  async listQueuedOps() {
    return idbGetAll(STORE_QUEUE);
  }
};
