import { describe, it, expect } from 'vitest';
import {
  generateSecureUuid,
  hashPinSha256,
  sha256HexFallback,
  getUserPinSalt,
  validateStrongPassword,
  getPasswordScore
} from '../utils/securityHelpers';

describe('Security helpers', () => {
  it('generates valid v4 UUIDs without Math.random fallback', () => {
    const u1 = generateSecureUuid();
    const u2 = generateSecureUuid();
    expect(u1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(u1).not.toBe(u2);
  });

  it('hashes PIN consistently with SHA-256 and matches pure-JS SHA-256 fallback', async () => {
    const h1 = await hashPinSha256('4829');
    const h2 = await hashPinSha256('4829');
    const h3 = await hashPinSha256('1234');
    const fallbackH1 = sha256HexFallback('kivo-session-pin-v1:4829');
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).toBe(h2);
    expect(h1).toBe(fallbackH1);
    expect(h1).not.toBe(h3);
    expect(await hashPinSha256('')).toBe('');
  });

  it('binds PIN salt to userId when available', async () => {
    const saltA = getUserPinSalt('user-a');
    const saltB = getUserPinSalt('user-b');
    expect(saltA).toBe('kivo-session-pin-v2:user-a');
    expect(getUserPinSalt('')).toBe('kivo-session-pin-v1');
    const hashA = await hashPinSha256('4829', saltA);
    const hashB = await hashPinSha256('4829', saltB);
    expect(hashA).not.toBe(hashB);
  });

  it('enforces strong password policy (min 8 chars + letter + digit/symbol)', () => {
    expect(validateStrongPassword('123456').valid).toBe(false);
    expect(validateStrongPassword('abcdefgh').valid).toBe(false);
    expect(validateStrongPassword('12345678').valid).toBe(false);
    expect(validateStrongPassword('Kivo2026').valid).toBe(true);
    expect(validateStrongPassword('kivo!segura').valid).toBe(true);
    expect(getPasswordScore('Kivo2026!#')).toBe(4);
  });
});
