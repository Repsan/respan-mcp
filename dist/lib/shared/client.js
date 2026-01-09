// Store API key and base URL from HTTP headers for the current request
let requestApiKey = null;
let requestBaseUrl = null;
export function setRequestApiKey(apiKey) {
    requestApiKey = apiKey;
}
export function setRequestBaseUrl(baseUrl) {
    requestBaseUrl = baseUrl;
}
/**
 * Get API Key from multiple sources
 * Priority: Query parameter (HTTP mode) > KEYWORDS_API_KEY environment variable (stdio mode)
 */
function getApiKey(extra) {
    // 1. Try to get from query parameter (set by api/mcp.ts in HTTP mode)
    if (requestApiKey) {
        return requestApiKey;
    }
    // 2. Get from environment variable (used in stdio mode or as fallback)
    const envApiKey = process.env.KEYWORDS_API_KEY;
    if (envApiKey) {
        return envApiKey;
    }
    throw new Error("Missing Keywords AI API key. Please provide it via:\n" +
        "- HTTP mode: URL query parameter (?apikey=YOUR_KEY)\n" +
        "- Stdio mode: KEYWORDS_API_KEY environment variable");
}
/**
 * Get base URL for Keywords AI API
 * Priority: X-Keywords-Base-URL header (HTTP mode) > KEYWORDS_API_BASE_URL env var > default
 * Default: https://api.keywordsai.co/api
 * Examples:
 *   - Enterprise: https://endpoint.keywordsai.co/api
 *   - Local dev:  http://localhost:8000/api
 */
function getBaseUrl() {
    // 1. From HTTP header (set by api/mcp.ts)
    if (requestBaseUrl) {
        return requestBaseUrl;
    }
    // 2. From environment variable (stdio mode or server default)
    return process.env.KEYWORDS_API_BASE_URL || "https://api.keywordsai.co/api";
}
export async function keywordsRequest(endpoint, extra, options = {}) {
    const apiKey = getApiKey(extra);
    const baseUrl = getBaseUrl();
    const { method = "GET", queryParams = {}, body } = options;
    // Filter out undefined values
    const filteredParams = Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v !== undefined));
    const queryString = new URLSearchParams(filteredParams).toString();
    const url = `${baseUrl}/${endpoint}${queryString ? `?${queryString}` : ""}`;
    const response = await fetch(url, {
        method,
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(err)}`);
    }
    return await response.json();
}
