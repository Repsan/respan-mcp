# Keywords AI MCP Server

Model Context Protocol (MCP) server for [Keywords AI](https://keywordsai.co) - access logs, prompts, traces, and customer data directly from your AI assistant.

## Features

- **Logs** - Query and filter LLM request logs with powerful filtering
- **Traces** - View complete execution traces with span trees
- **Customers** - Access customer data and budget information  
- **Prompts** - Manage prompt templates and versions

---

## Quick Start

### Option 1: Public HTTP (Recommended)

The fastest way to get started - no installation required.

1. Get your API key from [platform.keywordsai.co](https://platform.keywordsai.co/platform/api/api-keys)

2. Add to your MCP config file:

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://mcp.keywordsai.co/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

**Claude Desktop** (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://mcp.keywordsai.co/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

**Claude Desktop** (Windows: `%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://mcp.keywordsai.co/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

3. Restart Cursor/Claude Desktop

---

### Option 2: Local Stdio

Run the MCP server locally - for personal development or offline use.

**Prerequisites:** Node.js v18+, Git

```bash
# 1. Clone and build
git clone https://github.com/Keywords-AI/keywordsai-mcp.git
cd keywordsai-mcp
npm install
npm run build
```

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "command": "node",
      "args": ["/absolute/path/to/keywordsai-mcp/dist/lib/index.js"],
      "env": {
        "KEYWORDS_API_KEY": "YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

**Claude Desktop** (macOS):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "command": "node",
      "args": ["/Users/yourname/keywordsai-mcp/dist/lib/index.js"],
      "env": {
        "KEYWORDS_API_KEY": "YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

**Claude Desktop** (Windows):
```json
{
  "mcpServers": {
    "keywords-ai": {
      "command": "node",
      "args": ["C:/Users/yourname/keywordsai-mcp/dist/lib/index.js"],
      "env": {
        "KEYWORDS_API_KEY": "YOUR_KEYWORDS_AI_API_KEY"
      }
    }
  }
}
```

> **Note:** Replace the path with your actual installation path. After updating code, run `npm run build` again.

---

### Option 3: Private HTTP (Teams)

Deploy your own instance to Vercel - perfect for teams sharing a single deployment.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Keywords-AI/keywordsai-mcp&env=KEYWORDS_API_KEY&envDescription=Your%20Keywords%20AI%20API%20key&envLink=https://platform.keywordsai.co/platform/api/api-keys)

Or deploy manually:
```bash
git clone https://github.com/Keywords-AI/keywordsai-mcp.git
cd keywordsai-mcp
vercel deploy --prod
```

Then set `KEYWORDS_API_KEY` in Vercel Dashboard → Settings → Environment Variables.

Share this config with your team:
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://your-project.vercel.app/mcp"
    }
  }
}
```

---

## Enterprise Configuration

For enterprise users with a custom API endpoint, override the default base URL:

### HTTP Mode

Add the `KEYWORDS_API_BASE_URL` header:
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://mcp.keywordsai.co/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY",
        "KEYWORDS_API_BASE_URL": "https://endpoint.keywordsai.co/api"
      }
    }
  }
}
```

### Stdio Mode

Add the `KEYWORDS_API_BASE_URL` environment variable:
```json
{
  "mcpServers": {
    "keywords-ai": {
      "command": "node",
      "args": ["/path/to/keywordsai-mcp/dist/lib/index.js"],
      "env": {
        "KEYWORDS_API_KEY": "YOUR_API_KEY",
        "KEYWORDS_API_BASE_URL": "https://endpoint.keywordsai.co/api"
      }
    }
  }
}
```

### Supported Endpoints

| Endpoint | URL |
|----------|-----|
| Default (Cloud) | `https://api.keywordsai.co/api` |
| Enterprise | `https://endpoint.keywordsai.co/api` |
| Local development | `http://localhost:8000/api` |

---

## Available Tools

### Logs

| Tool | Description |
|------|-------------|
| `list_logs` | List and filter LLM request logs with powerful query capabilities |
| `get_log_detail` | Retrieve complete details of a single log by unique ID |

**Filter Examples:**
```json
{
  "cost": {"operator": "gt", "value": [0.01]},
  "model": {"operator": "", "value": ["gpt-4"]},
  "customer_identifier": {"operator": "contains", "value": ["user"]},
  "metadata__session_id": {"operator": "", "value": ["abc123"]}
}
```

**Filter Operators:** `""` (equal), `not`, `lt`, `lte`, `gt`, `gte`, `contains`, `icontains`, `startswith`, `endswith`, `in`, `isnull`

### Traces

| Tool | Description |
|------|-------------|
| `list_traces` | List and filter traces with sorting and pagination |
| `get_trace_tree` | Retrieve complete hierarchical span tree of a trace |

### Customers

| Tool | Description |
|------|-------------|
| `list_customers` | List customers with pagination and sorting |
| `get_customer_detail` | Get customer details including budget usage |

### Prompts

| Tool | Description |
|------|-------------|
| `list_prompts` | List all prompts in your organization |
| `get_prompt_detail` | Get detailed prompt information |
| `list_prompt_versions` | List all versions of a prompt |
| `get_prompt_version_detail` | Get specific version details |

---

## Project Structure

```
keywordsai-mcp/
├── api/
│   └── mcp.ts              # HTTP entry point (Vercel deployment)
├── lib/
│   ├── index.ts            # Stdio entry point (local development)
│   ├── observe/
│   │   ├── logs.ts         # Log tools
│   │   ├── traces.ts       # Trace tools
│   │   └── users.ts        # Customer tools
│   ├── develop/
│   │   └── prompts.ts      # Prompt tools
│   └── shared/
│       └── client.ts       # API client utilities
├── public/
│   └── index.html          # Landing page (redirects to docs)
├── vercel.json             # Vercel configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

---

## Local Development

```bash
# Build the project
npm run build

# Run in stdio mode (for testing with MCP clients)
npm run stdio

# Run Vercel dev server (for HTTP testing)
npx vercel dev
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Then connect to `http://localhost:3000/mcp` with your Authorization header.

---

## Troubleshooting

### MCP server not showing up

1. Verify your config file path is correct
2. Check JSON syntax (trailing commas, missing quotes)
3. Restart your AI tool completely
4. For stdio: ensure the path to `index.js` is absolute and correct

### Authentication errors

1. Verify your API key at [platform.keywordsai.co](https://platform.keywordsai.co/platform/api/api-keys)
2. HTTP mode: ensure format is `Authorization: Bearer YOUR_KEY`
3. Stdio mode: check `KEYWORDS_API_KEY` is set in the `env` section

### Connection issues

1. Check internet connection
2. For enterprise: verify `KEYWORDS_API_BASE_URL` is correct
3. For private deployment: check Vercel logs for errors

---

## Documentation

Full documentation available at [docs.keywordsai.co/documentation/resources/mcp](https://docs.keywordsai.co/documentation/resources/mcp)

## License

MIT
