// lib/shared/client.ts
const DEFAULT_BASE_URL = "https://api.respan.ai/api";
const REQUEST_TIMEOUT_MS = 180_000;
/**
 * Validate that a path parameter is safe (alphanumeric, hyphens, underscores, dots, @).
 * Prevents path traversal attacks via user-supplied IDs.
 */
export function validatePathParam(value, name) {
    if (!/^[\w.@-]+$/.test(value)) {
        throw new Error(`Invalid ${name}: contains disallowed characters`);
    }
    return value;
}
/**
 * Resolve auth config from environment variables (used in stdio mode).
 */
export function resolveAuthFromEnv() {
    const apiKey = process.env.RESPAN_API_KEY;
    if (!apiKey) {
        throw new Error("Missing API key. Set the RESPAN_API_KEY environment variable.");
    }
    return {
        apiKey,
        baseUrl: process.env.RESPAN_API_BASE_URL || DEFAULT_BASE_URL,
    };
}
export async function respanRequest(endpoint, auth, options = {}) {
    const { method = "GET", queryParams = {}, body } = options;
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== undefined));
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = `${auth.baseUrl}/${endpoint}${queryString ? `?${queryString}` : ""}`;
    console.log(`[MCP] ${method} ${url}`);
    const start = Date.now();
    const response = await fetch(url, {
        method,
        headers: {
            "Authorization": `Bearer ${auth.apiKey}`,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const elapsed = Date.now() - start;
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error(`[MCP] ${method} ${endpoint} -> ${response.status} (${elapsed}ms)`, err);
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(err)}`);
    }
    const data = await response.json();
    const summary = Array.isArray(data) ? `array[${data.length}]` : typeof data === 'object' ? `object` : typeof data;
    console.log(`[MCP] ${method} ${endpoint} -> ${response.status} (${elapsed}ms) ${summary}`);
    return data;
}
