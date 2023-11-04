import {
  organization,
  organization_system_type,
  terminals,
} from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { parseFilterFields } from "@api/src/lib/parseFilterFields";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SQLWrapper, and, eq, sql } from "drizzle-orm";
import { SelectedFields } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-typebox";
import Elysia, { t } from "elysia";
import Redis from "ioredis";

export const TerminalsController = (
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
      "/api/terminals",
      async ({ query: { limit, offset, sort, filters, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, terminals, {
            organization,
          });
        }
        let whereClause: (SQLWrapper | undefined)[] = [];
        if (filters) {
          whereClause = parseFilterFields(filters, terminals, {
            organization,
          });
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(terminals)
          .where(and(...whereClause))
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(terminals)
          .leftJoin(
            organization,
            eq(terminals.organization_id, organization.id)
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
    .get("/api/terminals/cached", async ({ store: { redis } }) => {
      const res = await redis.get(`${process.env.PROJECT_PREFIX}_terminals`);
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/terminals/:id",
      async ({ params: { id } }) => {
        const permissionsRecord = await db
          .select()
          .from(terminals)
          .where(eq(terminals.id, id))
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
      "/api/terminals",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, terminals, {});
        }
        const result = await db
          .insert(terminals)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: createInsertSchema(terminals) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/terminals/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, terminals, {});
        }
        const result = await db
          .update(terminals)
          .set(data)
          .where(eq(terminals.id, id))
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
          data: createInsertSchema(terminals) as any,
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );
