import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CLIENT_REG_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getKey(): Buffer {
  const secret = process.env.OAUTH_SECRET;
  if (!secret) {
    throw new Error('OAUTH_SECRET environment variable is required');
  }
  return createHash('sha256').update(secret).digest();
}

export function encrypt(payload: Record<string, unknown>): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv + tag + ciphertext, base64url encoded
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64url');
}

export function decrypt(token: string): Record<string, unknown> {
  const key = getKey();
  const combined = Buffer.from(token, 'base64url');
  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid token');
  }
  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function createAuthCode(
  jwt: string,
  codeChallenge: string,
  redirectUri: string,
  clientId: string,
): string {
  return encrypt({
    type: 'auth_code',
    jwt,
    codeChallenge,
    redirectUri,
    clientId,
    exp: Date.now() + AUTH_CODE_TTL_MS,
  });
}

export function verifyAuthCode(code: string): {
  jwt: string;
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
} {
  const payload = decrypt(code);
  if (payload.type !== 'auth_code') {
    throw new Error('Invalid auth code type');
  }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    throw new Error('Auth code expired');
  }
  return {
    jwt: payload.jwt as string,
    codeChallenge: payload.codeChallenge as string,
    redirectUri: payload.redirectUri as string,
    clientId: payload.clientId as string,
  };
}

export function createClientRegistration(
  clientId: string,
  redirectUris: string[],
): string {
  return encrypt({
    type: 'client_reg',
    clientId,
    redirectUris,
    exp: Date.now() + CLIENT_REG_TTL_MS,
  });
}

export function verifyClientRegistration(token: string): {
  clientId: string;
  redirectUris: string[];
} {
  const payload = decrypt(token);
  if (payload.type !== 'client_reg') {
    throw new Error('Invalid client registration');
  }
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    throw new Error('Client registration expired');
  }
  return {
    clientId: payload.clientId as string,
    redirectUris: payload.redirectUris as string[],
  };
}
