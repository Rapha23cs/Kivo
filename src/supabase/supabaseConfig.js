// Supabase Configuration & Client Layer for Kivo (exclusivamente via variáveis .env)
import { createClient } from '@supabase/supabase-js';

export function getSupabaseConfig() {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  let normalizedUrl = rawUrl.replace(/\/+$/, '');
  try {
    if (rawUrl.startsWith('http')) {
      normalizedUrl = new URL(rawUrl).origin;
    }
  } catch {
    // manter rawUrl para validação falhar graciosamente
  }

  return {
    url: normalizedUrl,
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

let supabaseClientInstance = null;

export function getSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  if (!isSupabaseConfigured()) {
    return { client: null, isConfigured: false };
  }

  try {
    if (!supabaseClientInstance) {
      supabaseClientInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }
    return {
      client: supabaseClientInstance,
      isConfigured: true
    };
  } catch (err) {
    console.error('Falha ao inicializar o Supabase:', err);
    return { client: null, isConfigured: false, error: err.message };
  }
}
