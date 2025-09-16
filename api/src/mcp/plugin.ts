import { mcp } from 'elysia-mcp';
// @ts-ignore - elysia-mcp типы не полностью совместимы
import type { McpServer } from 'elysia-mcp';
import { registerTerminalOperationsTool } from './tools/terminal-operations.js';

export const mcpPlugin = mcp({
  basePath: '/sse',
  serverInfo: {
    name: 'arryt-mcp-server',
    version: '1.0.0'
  },
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
    logging: {}
  },
  enableLogging: process.env.NODE_ENV === 'development',
  setupServer: async (server: McpServer) => {
    // Регистрируем инструмент для работы с терминалами
    await registerTerminalOperationsTool(server);

    // TODO: Здесь можно добавить другие инструменты:
    // await registerOrderManagementTool(server);
    // await registerCourierManagementTool(server);
    // await registerPricingCalculatorTool(server);

    console.log('✅ Arryt MCP tools registered successfully');
  }
});