export interface AuthConfig {
    apiKey: string;
    baseUrl: string;
}
/**
 * Validate that a path parameter is safe (alphanumeric, hyphens, underscores, dots, @).
 * Prevents path traversal attacks via user-supplied IDs.
 */
export declare function validatePathParam(value: string, name: string): string;
/**
 * Resolve auth config from environment variables (used in stdio mode).
 */
export declare function resolveAuthFromEnv(): AuthConfig;
export declare function respanRequest(endpoint: string, auth: AuthConfig, options?: {
    method?: "GET" | "POST";
    queryParams?: Record<string, any>;
    body?: any;
}): Promise<unknown>;
