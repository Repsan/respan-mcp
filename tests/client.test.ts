import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validatePathParam, resolveAuthFromEnv } from '../lib/shared/client.js';

describe('validatePathParam', () => {
  it('returns a valid alphanumeric ID unchanged', () => {
    expect(validatePathParam('abc123', 'id')).toBe('abc123');
  });

  it('passes IDs with hyphens, underscores, dots, and @', () => {
    const id = 'my-org_name.v2@prod';
    expect(validatePathParam(id, 'id')).toBe(id);
  });

  it('throws for ID containing ../', () => {
    expect(() => validatePathParam('../etc/passwd', 'id')).toThrow();
  });

  it('throws for ID containing a space', () => {
    expect(() => validatePathParam('bad id', 'id')).toThrow();
  });

  it('throws for ID containing /', () => {
    expect(() => validatePathParam('a/b', 'id')).toThrow();
  });
});

describe('resolveAuthFromEnv', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns correct apiKey and the default baseUrl when only RESPAN_API_KEY is set', () => {
    vi.stubEnv('RESPAN_API_KEY', 'test-key-123');
    vi.stubEnv('RESPAN_API_BASE_URL', '');
    const auth = resolveAuthFromEnv();
    expect(auth.apiKey).toBe('test-key-123');
    expect(auth.baseUrl).toBe('https://api.respan.ai/api');
  });

  it('returns custom baseUrl when both RESPAN_API_KEY and RESPAN_API_BASE_URL are set', () => {
    vi.stubEnv('RESPAN_API_KEY', 'test-key-456');
    vi.stubEnv('RESPAN_API_BASE_URL', 'https://custom.example.com/api');
    const auth = resolveAuthFromEnv();
    expect(auth.apiKey).toBe('test-key-456');
    expect(auth.baseUrl).toBe('https://custom.example.com/api');
  });

  it('throws when RESPAN_API_KEY is not set', () => {
    vi.stubEnv('RESPAN_API_KEY', '');
    expect(() => resolveAuthFromEnv()).toThrow();
  });
});
