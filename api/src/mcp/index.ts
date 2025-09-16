import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { terminalOperationsTool } from "./tools/terminal-operations.js";

class ArrytMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "arryt-mcp-server",
        version: "1.0.0",
        description: "MCP Server for Arryt food delivery platform",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          terminalOperationsTool.definition,
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "arryt_terminal_operations":
          return await terminalOperationsTool.handler(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Arryt MCP server running on stdio");
  }
}

export { ArrytMCPServer };