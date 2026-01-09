import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
export declare function setRequestApiKey(apiKey: string | null): void;
export declare function setRequestBaseUrl(baseUrl: string | null): void;
export declare function keywordsRequest(endpoint: string, extra: RequestHandlerExtra<ServerRequest, ServerNotification>, options?: {
    method?: "GET" | "POST";
    queryParams?: Record<string, any>;
    body?: any;
}): Promise<unknown>;
