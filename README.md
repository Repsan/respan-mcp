# Keywords AI MCP Server

Model Context Protocol (MCP) server for Keywords AI - access logs, prompts, traces, and users data.

## Quick Start

### For Local Use (Stdio Mode)

```bash
npm install
npm run build
npm run dev
```

This runs the MCP server in stdio mode for use with CLI MCP clients like Claude Desktop.

### For Vercel Deployment (HTTP/SSE Mode)

The `api/mcp.ts` file is configured for Vercel deployment:

```bash
vercel deploy
```

After deployment, your MCP server will be available at:
```
https://your-project.vercel.app/api/mcp
```

## Configuration

Set your Keywords AI API key as an environment variable:

```bash
export KEYWORDS_API_KEY=your_api_key_here
```

For Vercel, add it in your project settings as an environment variable.

## Available Tools

### Logs
- `list_logs` - Get request logs with filtering
- `get_log_detail` - Get detailed log information

### Traces  
- `list_traces` - Get traces with filtering
- `get_trace_tree` - Get trace tree structure

### Users
- `list_customers` - Get customer list
- `get_customer_budget_detail` - Get customer details

### Prompts
- `list_prompts` - Get all prompts
- `get_prompt_detail` - Get prompt details
- `list_prompt_versions` - Get prompt versions
- `get_prompt_version_detail` - Get version details

## File Structure

```
lib/
  index.ts          - Stdio entry point (local development)
  observe/          - Log, trace, user tools
  develop/          - Prompt management tools
  shared/          - Shared utilities
api/
  mcp.ts           - HTTP entry point (Vercel deployment)
```

## Notes

- The `lib/index.ts` uses stdio transport for local CLI integration
- The `api/mcp.ts` uses mcp-handler for Vercel HTTP/SSE deployment
- For HTTP testing, deploy to Vercel - local HTTP servers are not supported by mcp-handler
