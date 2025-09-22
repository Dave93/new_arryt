import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { Pool } from "pg";

console.error(`[MCP] Connecting to database: ${process.env.DATABASE_URL ? 'URL configured' : 'No DATABASE_URL'}`);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, {
  schema,
});

export type DB = typeof db;