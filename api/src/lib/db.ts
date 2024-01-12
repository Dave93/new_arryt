import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@api/drizzle/schema";

// for query purposes
const queryClient = postgres(process.env.DATABASE_URL!, {
  idle_timeout: 0,
  max_lifetime: 0
});
export const db = drizzle(queryClient, {
  schema,
});

export type DB = typeof db;
