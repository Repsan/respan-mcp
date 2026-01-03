// lib/shared/client.ts
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";

/**
 * Get API Key from environment variable or request header
 * Priority: Authorization header > KEYWORDS_API_KEY environment variable
 */
function getApiKey(extra: RequestHandlerExtra<ServerRequest, ServerNotification>): string {
  // Try to get from request header (if MCP client passes through Authorization)
  const headers = extra.requestInfo?.headers;
  if (headers) {
    const authHeader = headers["authorization"] || headers["Authorization"];
    if (authHeader) {
      const authValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (authValue && authValue.startsWith("Bearer ")) {
        return authValue.substring(7);
      }
    }
  }

  // Get from environment variable
  const envApiKey = process.env.KEYWORDS_API_KEY;
  if (envApiKey) {
    return envApiKey;
  }

  throw new Error(
    "Missing Keywords AI API key. Please set KEYWORDS_API_KEY environment variable " +
    "or pass Authorization header through MCP connection."
  );
}

export async function keywordsRequest(
  endpoint: string, 
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>, 
  options: {
    method?: "GET" | "POST";
    queryParams?: Record<string, any>;
    body?: any;
  } = {}
) {
  const apiKey = getApiKey(extra);
  const { method = "GET", queryParams = {}, body } = options;
  
  // Filter out undefined values
  const filteredParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, v]) => v !== undefined)
  );
  
  const queryString = new URLSearchParams(filteredParams).toString();
  const url = `https://api.keywordsai.co/api/${endpoint}${queryString ? `?${queryString}` : ""}`;

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