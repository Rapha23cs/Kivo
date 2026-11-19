// Logger utilitário com carimbo de data e hora para visualização no Coolify

function formatTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  info: (msg, ...args) => {
    console.log(`[KIVO-SYNC] [${formatTime()}] [INFO] ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[KIVO-SYNC] [${formatTime()}] [WARN] ⚠️ ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`[KIVO-SYNC] [${formatTime()}] [ERROR] ❌ ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`[KIVO-SYNC] [${formatTime()}] [SUCCESS] ✓ ${msg}`, ...args);
  }
};

