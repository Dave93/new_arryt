#!/usr/bin/env bun

import { ArrytMCPServer } from './index.js';

async function main() {
  const server = new ArrytMCPServer();
  await server.start();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error in MCP server:', error);
    process.exit(1);
  });
}