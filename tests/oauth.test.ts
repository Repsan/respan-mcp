import { describe, it, expect, beforeAll, vi } from 'vitest';
import {
  encrypt,
  decrypt,
  createAuthCode,
  verifyAuthCode,
  createClientRegistration,
  verifyClientRegistration,
} from '../lib/shared/oauth.js';

beforeAll(() => {
  vi.stubEnv('OAUTH_SECRET', 'test-secret-for-oauth-roundtrip-tests');
});

describe('encrypt/decrypt', () => {
  it('roundtrips correctly', () => {
    const payload = { hello: 'world', num: 42 };
    const token = encrypt(payload);
    const result = decrypt(token);
    expect(result).toEqual(payload);
  });

  it('throws Invalid token for fewer than 28 bytes', () => {
    // base64url of 10 bytes (less than IV_LENGTH=12 + TAG_LENGTH=16 = 28)
    const shortToken = Buffer.alloc(10).toString('base64url');
    expect(() => decrypt(shortToken)).toThrow('Invalid token');
  });
});

describe('createAuthCode / verifyAuthCode', () => {
  it('roundtrip preserves jwt, codeChallenge, redirectUri, clientId', () => {
    const code = createAuthCode('jwt-value', 'challenge-abc', 'https://example.com/cb', 'client-1');
    const result = verifyAuthCode(code);
    expect(result.jwt).toBe('jwt-value');
    expect(result.codeChallenge).toBe('challenge-abc');
    expect(result.redirectUri).toBe('https://example.com/cb');
    expect(result.clientId).toBe('client-1');
  });

  it('throws Auth code expired when exp is in the past', () => {
    // Encrypt a payload with exp already in the past
    const expired = encrypt({
      type: 'auth_code',
      jwt: 'j',
      codeChallenge: 'c',
      redirectUri: 'r',
      clientId: 'id',
      exp: Date.now() - 1000,
    });
    expect(() => verifyAuthCode(expired)).toThrow('Auth code expired');
  });

  it('throws when called with a client registration token (wrong type)', () => {
    const regToken = createClientRegistration('client-x', ['https://example.com']);
    expect(() => verifyAuthCode(regToken)).toThrow();
  });
});

describe('createClientRegistration / verifyClientRegistration', () => {
  it('roundtrip preserves clientId and redirectUris', () => {
    const uris = ['https://app.example.com/cb', 'https://localhost:3000/cb'];
    const token = createClientRegistration('my-client', uris);
    const result = verifyClientRegistration(token);
    expect(result.clientId).toBe('my-client');
    expect(result.redirectUris).toEqual(uris);
  });
});
