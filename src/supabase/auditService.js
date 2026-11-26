// Trilha de Auditoria de Segurança do Kivo (Supabase audit_logs + fallback local)
import { getSupabaseClient, isSupabaseConfigured } from './supabaseConfig';
import { safeLocalStorageGet, safeLocalStorageSet } from '../offline/offlineStore';

const LS_AUDIT_KEY = 'kivo_local_audit_logs';
const MAX_LOCAL_LOGS = 50;

export const AuditService = {
  getLocalLogs() {
    const list = safeLocalStorageGet(LS_AUDIT_KEY, []);
    return Array.isArray(list) ? list : [];
  },

  clearLocalLogs() {
    try {
      localStorage.removeItem(LS_AUDIT_KEY);
    } catch {
      // ignora
    }
  },

  async log(action, entityType, entityId = '', metadata = {}) {
    if (!action || !entityType) return;
    const entry = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };

    const current = this.getLocalLogs();
    safeLocalStorageSet(LS_AUDIT_KEY, JSON.stringify([entry, ...current].slice(0, MAX_LOCAL_LOGS)));

    if (!isSupabaseConfigured() || navigator.onLine === false) return;
    try {
      const { client } = getSupabaseClient();
      if (!client) return;
      const { data: userData } = await client.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      await client.from('audit_logs').insert({
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata || {}
      });
    } catch {
      // fallback silencioso caso migration 011 ainda não tenha rodado
    }
  },

  async listRecent(limit = 30) {
    const local = this.getLocalLogs();
    if (!isSupabaseConfigured() || navigator.onLine === false) {
      return local.slice(0, limit);
    }
    try {
      const { client } = getSupabaseClient();
      if (!client) return local.slice(0, limit);
      const { data, error } = await client
        .from('audit_logs')
        .select('id, user_id, action, entity_type, entity_id, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error || !Array.isArray(data)) {
        return local.slice(0, limit);
      }
      return data;
    } catch {
      return local.slice(0, limit);
    }
  }
};
