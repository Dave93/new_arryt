import { roles } from "@api/drizzle/schema";
import { db } from "@api/src/lib/db";
import { eq, sql } from "drizzle-orm";
import Elysia, { t } from "elysia";
import Redis from "ioredis";
import { parseSelectFields } from "@api/src/lib/parseSelectFields";
import { SelectedFields } from "drizzle-orm/pg-core";

export const RolesController = (
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
      "/api/roles",
      async ({ query: { limit, offset, sort, filter, fields } }) => {
        let selectFields: SelectedFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, roles, {});
        }
        const rolesCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(roles)
          .execute();
        const rolesList = await db
          .select(selectFields)
          .from(roles)
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
          filter: t.Optional(
            t.Object({
              id: t.Number(),
              name: t.String(),
              email: t.String(),
              address: t.String(),
              phone: t.String(),
            })
          ),
          fields: t.Optional(t.String()),
        }),
      }
    )
    .get("/api/roles/cached", async ({ store: { redis } }) => {
      const res = await redis.get(`${process.env.PROJECT_PREFIX}_roles`);
      return JSON.parse(res || "[]");
    })
    .get(
      "/api/roles/:id",
      async ({ params: { id } }) => {
        const rolesRecord = await db
          .select()
          .from(roles)
          .where(eq(roles.id, id))
          .execute();
        return {
          data: rolesRecord[0],
        };
      },
      {
        params: t.Object({
          id: t.String(),
        }),
      }
    )
    .post(
      "/api/roles",
      async ({ body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, roles, {});
        }
        const result = await db
          .insert(roles)
          .values(data)
          .returning(selectFields);

        return {
          data: result[0],
        };
      },
      {
        body: t.Object({
          data: t.Object({
            name: t.String(),
            code: t.String(),
            active: t.Optional(t.Boolean()),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    )
    .put(
      "/api/roles/:id",
      async ({ params: { id }, body: { data, fields } }) => {
        let selectFields = {};
        if (fields) {
          selectFields = parseSelectFields(fields, roles, {});
        }
        const result = await db
          .update(roles)
          .set(data)
          .where(eq(roles.id, id))
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
          data: t.Object({
            name: t.String(),
            code: t.String(),
            active: t.Optional(t.Boolean()),
          }),
          fields: t.Optional(t.Array(t.String())),
        }),
      }
    );
