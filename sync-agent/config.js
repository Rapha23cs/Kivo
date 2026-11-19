import dotenv from 'dotenv';
dotenv.config();

export const config = {
  supabase: {
    url: (process.env.SUPABASE_URL || '').trim(),
    serviceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  },
  environmentalApi: {
    url: process.env.ENVIRONMENTAL_API_URL || 'http://gerenciamento-ambiental:8000/api/vistorias',
    token: process.env.ENVIRONMENTAL_API_TOKEN || '',
    timeoutMs: parseInt(process.env.ENVIRONMENTAL_API_TIMEOUT_MS, 10) || 15000
  },
  sync: {
    intervalMinutes: Math.max(1, parseInt(process.env.SYNC_INTERVAL_MINUTES, 10) || 10),
    dryRun: process.env.DRY_RUN === 'true'
  }
};
