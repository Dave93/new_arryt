# Arryt MCP Server

MCP (Model Context Protocol) server for the Arryt food delivery platform. This server provides AI agents with tools to interact with Arryt's terminal management system.

## Features

- **Terminal Operations**: List, view details, update status, and get statistics for restaurant terminals
- **HTTP Protocol**: Streamable HTTP transport with SSE support for web compatibility
- **Direct Database Access**: Connects directly to PostgreSQL database using Drizzle ORM
- **Type Safety**: Full TypeScript implementation with Zod validation
- **High Performance**: No HTTP overhead, direct database queries

## Installation

```bash
cd mcp_server
bun install
```

## Configuration

Copy the environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` to set the correct database URL and port:

```bash
# For local development (same as main API)
DATABASE_URL=postgresql://username:password@localhost:5432/arryt_db
PORT=3001

# For production
DATABASE_URL=postgresql://username:password@production-host:5432/arryt_db
PORT=3001
```

## Development

Start the MCP server in development mode:

```bash
bun run dev
```

## Building

Build for production:

```bash
bun run build
```

## Usage with Claude Desktop

Add this server to your Claude Desktop configuration in `claude_desktop_config.json`:

### For local development:

```json
{
  "mcpServers": {
    "arryt": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:3001/mcp"
      ]
    }
  }
}
```

### For production (if deployed):

```json
{
  "mcpServers": {
    "arryt": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-mcp-server.domain.com/mcp"
      ]
    }
  }
}
```

## Available Tools

### arryt_terminal_operations

Manage terminals (restaurants) in the Arryt system.

**Actions:**
- `list` - Get list of terminals with optional filters
- `get_details` - Get detailed information about a specific terminal
- `update_status` - Toggle terminal active/inactive status
- `get_statistics` - Get statistics for terminals

**Example usage in Claude:**
- "Show me all active terminals"
- "Get details for terminal xyz-123"
- "Disable terminal abc-456"
- "What's the statistics for all terminals?"

## Architecture

```
Claude Desktop → MCP Server (HTTP) → PostgreSQL Database
```

The MCP server runs as an HTTP service on port 3001 and connects directly to the PostgreSQL database, providing high-performance access to terminal data.

## Error Handling

The server includes comprehensive error handling:
- API connection errors
- Invalid parameters
- Missing terminals
- Network timeouts

All errors are returned in a standardized format for easy debugging.

## Logging

Logs are written to stderr to avoid interfering with the stdio MCP protocol. This includes:
- API request/response logging
- Error tracking
- Server startup/shutdown events