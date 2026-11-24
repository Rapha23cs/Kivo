import { describe, it, expect } from 'vitest';
import {
  generateSecureUuid,
  hashPinSha256,
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

  it('hashes PIN consistently with SHA-256 and distinguishes different PINs', async () => {
    const h1 = await hashPinSha256('4829');
    const h2 = await hashPinSha256('4829');
    const h3 = await hashPinSha256('1234');
    expect(h1).toBeTruthy();
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(await hashPinSha256('')).toBe('');
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
