import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../drizzle/schema";
import { Pool } from "pg";
console.log(`process.env.DATABASE_URL: ${process.env.DATABASE_URL}`);
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle(pool, {
  schema,
});

export type DB = typeof db;