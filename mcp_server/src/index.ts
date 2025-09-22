
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHttpServerTransport } from "@modelcontextprotocol/sdk/server/streamable-http.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { terminalOperationsTool } from "./tools/terminal-operations.js";

// Создаем MCP сервер
const server = new Server(
  {
    name: "arryt-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      logging: {},
    },
  }
);

// Регистрируем обработчик списка инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "arryt_terminal_operations",
        description: "Управление терминалами (ресторанами) в системе Arryt. Позволяет получать списки терминалов, детальную информацию, обновлять статусы и получать статистику.",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["list", "get_details", "update_status", "get_statistics"],
              description: "Действие для выполнения с терминалами"
            },
            terminal_id: {
              type: "string",
              description: "UUID терминала (требуется для get_details, update_status)"
            },
            filters: {
              type: "object",
              properties: {
                organization_id: {
                  type: "string",
                  description: "UUID организации для фильтрации"
                },
                is_active: {
                  type: "boolean",
                  description: "Фильтр по активности терминала"
                },
                city: {
                  type: "string",
                  description: "Название города для фильтрации"
                }
              },
              additionalProperties: false,
              description: "Фильтры для поиска терминалов"
            }
          },
          required: ["action"],
          additionalProperties: false
        }
      }
    ]
  };
});

// Регистрируем обработчик вызова инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "arryt_terminal_operations") {
    return await terminalOperationsTool.handler(args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Обработка ошибок
process.on('SIGINT', async () => {
  console.error('Received SIGINT, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

// Запускаем HTTP сервер
async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

  const transport = new StreamableHttpServerTransport({
    port: port,
    hostname: '0.0.0.0',
    path: '/mcp'
  });

  await server.connect(transport);

  console.error(`Arryt MCP Server started on http://0.0.0.0:${port}/mcp`);
  console.error('Available tools: arryt_terminal_operations');
}

main().catch((error) => {
  console.error("Fatal error in MCP server:", error);
  process.exit(1);
});