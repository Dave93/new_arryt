import {
  brands,
  delivery_pricing,
  organization,
  organization_system_type,
  terminals,
  work_schedules,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const BrandsController = (
  app: Elysia<
    "",
    {
      store: {
        redis: Redis;
      };
      bearer: string;
      request: {};
      schema: {};
    }
  >
) =>
  app
    .get(
      "/api/brands",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, brands, {});
        }
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
          whereClause = parseFilterFields(filters, brands, {});
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(brands)
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(brands)
          .where(and(...whereClause))
          .limit(+limit)
          .offset(+offset)
          .execute();
        return {
          total: rolesCount[0].count,
          data: rolesList,
        };
      },
      {
        query: t.Object({
          limit: t.String(),
          offset: t.String(),
          sort: t.Optional(t.String()),
          filters: t.Optional(t.String()),
          fields: t.Optional(t.String()),
        }),
      }
    )
    .get("/api/brands/cached", async ({ store: { redis } }) => {
      const res = await redis.get(`${process.env.PROJECT_PREFIX}_brands`);
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/brands/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(brands)
          .where(eq(brands.id, id))
          .execute();
        return {
          data: permissionsRecord[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )
    .post(
      "/api/brands",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, brands, {});
        }
        const result = await db
          .insert(brands)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(brands) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/brands/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, brands, {});
        }
        const result = await db
          .update(brands)
          .set(data)
          .where(eq(brands.id, id))
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
        body: t.Object({
          data: createInsertSchema(brands) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );
