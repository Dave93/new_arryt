import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  driver: "pg",
  out: "./drizzle/generated",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  introspect: {
    casing: "preserve",
  },
} satisfies Config;
