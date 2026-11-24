// Helpers criptográficos e validação de políticas de segurança no cliente (Web Crypto API)

export function generateSecureUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  throw new Error('Ambiente sem suporte a gerador criptográfico seguro (Web Crypto API).');
}

export async function hashPinSha256(pin, salt = 'kivo-session-pin-v1') {
  const clean = String(pin || '').trim();
  if (!clean) return '';
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const data = new TextEncoder().encode(`${salt}:${clean}`);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback determinístico caso subtle esteja indisponível em http local não-localhost
  let h = 2166136261;
  const input = `${salt}:${clean}`;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv-${(h >>> 0).toString(16)}`;
}

export function validateStrongPassword(password = '') {
  const pwd = String(password || '');
  const minLength = pwd.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>_\-+=]/.test(pwd);
  return {
    valid: minLength && hasLetter && hasNumberOrSymbol,
    minLength,
    hasLetter,
    hasNumberOrSymbol
  };
}

export function getPasswordScore(password = '') {
  const pwd = String(password || '');
  return (
    (pwd.length >= 8 ? 1 : 0) +
    (pwd.length >= 10 ? 1 : 0) +
    (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd) ? 1 : 0) +
    (/[0-9!@#$%^&*(),.?":{}|<>_\-+=]/.test(pwd) ? 1 : 0)
  );
}
