import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  dialect: "postgres",
  driver: "pg",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  introspect: {
    casing: "preserve",
  },
} satisfies Config;
