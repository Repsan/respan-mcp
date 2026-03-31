import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { RespanClient } from '@respan/respan-api';

export interface AuthConfig {
  token: string;
  baseUrl?: string;
}

export function createClient(auth: AuthConfig): RespanClient {
  return new RespanClient({
    token: auth.token,
    ...(auth.baseUrl ? { environment: auth.baseUrl } : {}),
  });
}

/**
 * Read credentials from ~/.respan/credentials.json (written by `respan login`).
 * Returns the active profile's token and baseUrl, or null if not available.
 */
function resolveAuthFromCredentialFile(): AuthConfig | null {
  try {
    const configDir = join(homedir(), '.respan');

    // Read active profile from config.json
    let activeProfile = 'default';
    try {
      const configRaw = readFileSync(join(configDir, 'config.json'), 'utf-8');
      const config = JSON.parse(configRaw);
      if (config.activeProfile) {
        activeProfile = config.activeProfile;
      }
    } catch {
      // No config file or invalid — use default profile
    }

    // Read credentials.json
    const credsRaw = readFileSync(join(configDir, 'credentials.json'), 'utf-8');
    const creds = JSON.parse(credsRaw);
    const credential = creds[activeProfile];
    if (!credential) return null;

    // Support both api_key and jwt credential types
    let token: string | undefined;
    if (credential.type === 'api_key' && credential.apiKey) {
      token = credential.apiKey;
    } else if (credential.type === 'jwt' && credential.accessToken) {
      token = credential.accessToken;
    }

    if (!token) return null;

    return {
      token,
      baseUrl: credential.baseUrl || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve auth from environment variables or credential file.
 * Priority: env var > credential file
 */
export function resolveAuthFromEnv(): AuthConfig | null {
  // 1. Environment variable (highest priority)
  const envToken = process.env.RESPAN_API_KEY;
  if (envToken) {
    return {
      token: envToken,
      baseUrl: process.env.RESPAN_API_BASE_URL || undefined,
    };
  }

  // 2. Credential file (~/.respan/credentials.json, written by `respan login`)
  return resolveAuthFromCredentialFile();
}

export function requireClient(client: RespanClient | null): RespanClient {
  if (!client) {
    throw new Error(
      'This tool requires authentication. Set RESPAN_API_KEY or run `respan login` to authenticate.'
    );
  }
  return client;
}
