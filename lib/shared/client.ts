// lib/shared/client.ts

const DEFAULT_BASE_URL = "https://api.keywordsai.co/api";
const REQUEST_TIMEOUT_MS = 30_000;

export interface AuthConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Validate that a path parameter is safe (alphanumeric, hyphens, underscores, dots, @).
 * Prevents path traversal attacks via user-supplied IDs.
 */
export function validatePathParam(value: string, name: string): string {
  if (!/^[\w.@-]+$/.test(value)) {
    throw new Error(`Invalid ${name}: contains disallowed characters`);
  }
  return value;
}

/**
 * Resolve auth config from environment variables (used in stdio mode).
 */
export function resolveAuthFromEnv(): AuthConfig {
  const apiKey = process.env.KEYWORDS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key. Set the KEYWORDS_API_KEY environment variable."
    );
  }
  return {
    apiKey,
    baseUrl: process.env.KEYWORDS_API_BASE_URL || DEFAULT_BASE_URL,
  };
}

export async function keywordsRequest(
  endpoint: string,
  auth: AuthConfig,
  options: {
    method?: "GET" | "POST";
    queryParams?: Record<string, any>;
    body?: any;
  } = {}
) {
  const { method = "GET", queryParams = {}, body } = options;

  const filteredParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, v]) => v !== undefined)
  );

  const queryString = new URLSearchParams(filteredParams).toString();
  const url = `${auth.baseUrl}/${endpoint}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${auth.apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(err)}`);
  }
  return await response.json();
}
