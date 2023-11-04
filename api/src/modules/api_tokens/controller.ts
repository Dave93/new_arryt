import {
  api_tokens,
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

export const ApiTokensController = (
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
      "/api/api_tokens",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, api_tokens, {
            organization,
          });
        }
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
          whereClause = parseFilterFields(filters, api_tokens, {
            organization,
          });
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(api_tokens)
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(api_tokens)
          .leftJoin(
            organization,
            eq(api_tokens.organization_id, organization.id)
          )
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
    .get("/api/api_tokens/cached", async ({ store: { redis } }) => {
      const res = await redis.get(`${process.env.PROJECT_PREFIX}_api_tokens`);
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/api_tokens/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(api_tokens)
          .where(eq(api_tokens.id, id))
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
      "/api/api_tokens",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, api_tokens, {});
        }
        const result = await db
          .insert(api_tokens)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(api_tokens) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/api_tokens/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, api_tokens, {});
        }
        const result = await db
          .update(api_tokens)
          .set(data)
          .where(eq(api_tokens.id, id))
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
          data: createInsertSchema(api_tokens) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );
