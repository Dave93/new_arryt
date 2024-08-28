import { drizzle } from "drizzle-orm/node-postgres";
import postgres from "postgres";
import * as schema from "@api/drizzle/schema";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, {
  schema,
});

export type DB = typeof db;
