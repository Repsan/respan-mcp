# Keywords AI MCP Server

Model Context Protocol (MCP) server for [Keywords AI](https://keywordsai.co) - access logs, prompts, traces, and customer data directly from your AI assistant.

## Features

- 📊 **Logs** - Query and filter LLM request logs with powerful filtering
- 🔍 **Traces** - View complete execution traces with span trees
- 👥 **Customers** - Access customer data and budget information  
- 📝 **Prompts** - Manage prompt templates and versions

## Installation

```bash
git clone https://github.com/Keywords-AI/keywordsai-mcp.git
cd keywordsai-mcp
npm install
npm run build
```

## Usage Modes

### Mode 1: Local Stdio (Recommended for Personal Use)

Run the MCP server locally via stdio - simplest setup for personal development.

**Step 1:** Build the project
```bash
npm run build
```

**Step 2:** Configure Cursor/Claude Desktop

Add to your MCP config file:
- **Cursor**: `~/.cursor/mcp.json`
- **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "keywords-ai": {
      "command": "node",
      "args": ["/absolute/path/to/keywordsai-mcp/dist/lib/index.js"],
      "env": {
        "KEYWORDS_API_KEY": "your_keywords_ai_api_key"
      }
    }
  }
}
```

---

### Mode 2: HTTP Streaming - Private Deployment

Deploy once to Vercel with your API key stored as environment variable. No client-side key needed.

**Step 1:** Deploy to Vercel
```bash
vercel deploy --prod
```

**Step 2:** Set environment variable in Vercel Dashboard
- Go to Settings → Environment Variables
- Add `KEYWORDS_API_KEY` = `your_keywords_ai_api_key`

**Step 3:** Configure Cursor/Claude Desktop
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

### Mode 3: HTTP Streaming - Public Service

Deploy as a shared service where each user provides their own API key via Authorization header.

**Step 1:** Deploy to Vercel (without environment variable)
```bash
vercel deploy --prod
```

**Step 2:** Configure Cursor/Claude Desktop with Authorization header
```json
{
  "mcpServers": {
    "keywords-ai": {
      "url": "https://your-project.vercel.app/mcp",
      "headers": {
        "Authorization": "Bearer your_keywords_ai_api_key"
      }
    }
  }
}
```

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
├── vercel.json             # Vercel configuration
├── tsconfig.json           # TypeScript configuration
└── package.json
```

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

## API Key

Get your Keywords AI API key from [platform.keywordsai.co](https://platform.keywordsai.co/platform/api/api-keys)

## License

MIT
